const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { Pool } = require('pg');
const Typesense = require('typesense');
const { v4: uuidv4 } = require('uuid');
const flags = require('../config/flags');

class IngestionService {
  constructor() {
    // Initialize database connection
    if (flags.RAG_ENABLED && flags.DATABASE_URL) {
      this.db = new Pool({
        connectionString: flags.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });
    }

    // Initialize Typesense client
    if (flags.RAG_ENABLED) {
      this.typesense = new Typesense.Client({
        nodes: [{
          host: flags.TYPESENSE_HOST,
          port: parseInt(flags.TYPESENSE_PORT),
          protocol: flags.TYPESENSE_PROTOCOL
        }],
        apiKey: flags.TYPESENSE_API_KEY,
        connectionTimeoutSeconds: 10
      });
    }

    console.log('[INGESTION] Service initialized with flags:', flags.toString());
  }

  async initialize() {
    if (!flags.RAG_ENABLED) {
      console.log('[INGESTION] RAG disabled, skipping initialization');
      return;
    }

    console.log('[INGESTION] Initializing RAG ingestion service...');
    
    try {
      // Initialize database schema
      await this.initializeDatabase();
      
      // Initialize Typesense collection
      await this.initializeTypesense();
      
      console.log('[INGESTION] Service initialized successfully');
    } catch (error) {
      console.error('[INGESTION] Initialization failed:', error);
      throw error;
    }
  }

  async initializeDatabase() {
    if (!this.db) return;

    console.log('[INGESTION] Setting up database schema...');
    
    const embeddingDimension = flags.USE_EMBEDDINGS ? flags.EMBEDDINGS_DIM : null;
    
    await this.db.query('CREATE EXTENSION IF NOT EXISTS vector');
    
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS rag_chunks (
        id UUID PRIMARY KEY,
        course_id TEXT NOT NULL,
        file_id TEXT NOT NULL,
        title TEXT,
        content TEXT NOT NULL,
        heading TEXT,
        heading_path TEXT[],
        page INT,
        chunk_index INT DEFAULT 0,
        kind TEXT DEFAULT 'unknown',
        source_platform TEXT,
        ${embeddingDimension ? `embedding VECTOR(${embeddingDimension}),` : ''}
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `;
    
    await this.db.query(createTableQuery);
    
    // Create index metadata table
    const createIndexMetaTableQuery = `
      CREATE TABLE IF NOT EXISTS rag_index_meta (
        course_id TEXT NOT NULL,
        last_indexed TIMESTAMPTZ DEFAULT now(),
        doc_counts JSONB DEFAULT '{}',
        status TEXT DEFAULT 'pending',
        PRIMARY KEY (course_id)
      )
    `;
    
    await this.db.query(createIndexMetaTableQuery);
    
    // Create indexes
    await this.db.query('CREATE INDEX IF NOT EXISTS rag_chunks_course_id_idx ON rag_chunks(course_id)');
    await this.db.query('CREATE INDEX IF NOT EXISTS rag_chunks_file_id_idx ON rag_chunks(file_id)');
    await this.db.query('CREATE INDEX IF NOT EXISTS rag_chunks_kind_idx ON rag_chunks(kind)');
    
    if (embeddingDimension) {
      await this.db.query(`
        CREATE INDEX IF NOT EXISTS rag_chunks_embed_idx 
        ON rag_chunks USING ivfflat (embedding vector_cosine_ops) 
        WITH (lists=100)
      `);
    }
    
    console.log('[INGESTION] Database schema ready');
  }

  async initializeTypesense() {
    if (!this.typesense) return;

    console.log('[INGESTION] Setting up Typesense collection...');
    
    try {
      // Try to get existing collection
      await this.typesense.collections('rag_chunks').retrieve();
      console.log('[INGESTION] Typesense collection already exists');
    } catch (error) {
      // Create collection if it doesn't exist
      await this.typesense.collections().create({
        name: 'rag_chunks',
        fields: [
          { name: 'id', type: 'string' },
          { name: 'course_id', type: 'string', facet: true },
          { name: 'file_id', type: 'string', facet: true },
          { name: 'title', type: 'string', optional: true },
          { name: 'content', type: 'string' },
          { name: 'heading', type: 'string', optional: true },
          { name: 'heading_path', type: 'string[]', optional: true },
          { name: 'page', type: 'int32', optional: true },
          { name: 'chunk_index', type: 'int32', optional: true },
          { name: 'kind', type: 'string', facet: true },
          { name: 'source_platform', type: 'string', facet: true }
        ],
        default_sorting_field: 'page'
      });
      console.log('[INGESTION] Typesense collection created');
    }
  }

  async ingestDocument(request) {
    if (!flags.RAG_ENABLED) {
      return { status: 'disabled', message: 'RAG is disabled' };
    }

    const { courseId, materialId, gcsPath, localFilePath, fileName, fileType, contentHash, force = false, buffer, source, metadata } = request;
    
    console.log(`[INGESTION] Starting ingestion for ${fileName} (${fileType})`);
    
    try {
      // Check if already processed (idempotency)
      let bufferHash = null;
      if (buffer) {
        bufferHash = crypto.createHash('sha256').update(buffer).digest('hex');
        console.log(`[INGESTION] Buffer hash: ${bufferHash.substring(0, 8)}...`);
      }
      
      if (!force) {
        const existingChunks = await this.getChunksByFile(courseId, materialId);
        if (existingChunks.length > 0) {
          // If we have a buffer hash, check if content has changed
          if (bufferHash) {
            const existingHash = existingChunks[0]?.content_hash;
            if (existingHash === bufferHash) {
              console.log(`[INGESTION] Document ${materialId} already indexed with same content, skipping`);
              return {
                status: 'skipped',
                reason: 'Content unchanged',
                chunkCount: existingChunks.length,
                hash: bufferHash,
                hasPdf: true,
                bytesProcessed: buffer.length
              };
            } else {
              console.log(`[INGESTION] Document ${materialId} content changed, re-indexing`);
            }
          } else {
            console.log(`[INGESTION] Document ${materialId} already indexed, skipping`);
            return {
              status: 'skipped',
              reason: 'Already indexed',
              chunkCount: existingChunks.length,
              hash: contentHash,
              hasPdf: true
            };
          }
        }
      }

      let tempFilePath;
      let fileData;

      // Handle different input types
      if (buffer) {
        // Size guard: stream large files to disk
        const MAX_BUFFER_SIZE = 50 * 1024 * 1024; // 50MB
        if (buffer.length > MAX_BUFFER_SIZE) {
          console.log(`[INGESTION] Buffer too large (${buffer.length} bytes), streaming to disk`);
          const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'ingest-'));
          tempFilePath = path.join(tempDir, fileName);
          await fs.promises.writeFile(tempFilePath, buffer, { mode: 0o600 });
        } else {
          // Content sniffing: verify PDF magic bytes
          const magicBytes = buffer.slice(0, 4).toString();
          if (magicBytes !== '%PDF') {
            console.warn(`[INGESTION] Not a PDF file (magic bytes: ${magicBytes}), skipping`);
            return {
              status: 'skipped',
              reason: 'Not a PDF file',
              chunkCount: 0,
              hasPdf: false
            };
          }
          
          // Use in-memory buffer directly (preferred for auto-ingestion)
          console.log(`[INGESTION] Using in-memory buffer (${buffer.length} bytes)`);
          fileData = buffer;
          // Create a temporary file for processing with proper permissions
          const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'ingest-'));
          tempFilePath = path.join(tempDir, fileName);
          await fs.promises.writeFile(tempFilePath, buffer, { mode: 0o600 });
        }
      } else {
        // Fallback to file path handling
        const filePath = localFilePath || gcsPath;
        if (!filePath) {
          throw new Error('Either buffer, gcsPath, or localFilePath must be provided');
        }

        // Handle file path (local for dev, GCS for prod)
        if (gcsPath && gcsPath.startsWith('gs://')) {
          // For now, skip GCS download and log a warning
          console.warn(`[INGESTION] GCS download not implemented, skipping: ${gcsPath}`);
          return {
            status: 'skipped',
            reason: 'GCS download not implemented',
            chunkCount: 0
          };
        } else {
          tempFilePath = filePath;
        }
      }
      
      try {
        // Verify file exists
        if (!fs.existsSync(tempFilePath)) {
          throw new Error(`File not found: ${tempFilePath}`);
        }

        // Parse document with Unstructured
        const blocks = await this.parseWithUnstructured(tempFilePath, fileName, fileType);
        console.log(`[INGESTION] Parsed ${blocks.length} blocks`);

        // Only mark success if parsing actually produced chunks
        if (!Array.isArray(blocks) || blocks.length === 0) {
          console.error(`[INGESTION] Parsing failed for ${fileName}: no blocks generated`);
          return { 
            status: 'error', 
            error: 'Document parsing failed - no content extracted',
            hasPdf: buffer ? buffer.slice(0, 4).toString() === '%PDF' : false,
            bytesProcessed: buffer ? buffer.length : 0,
            reason: 'Parsing failed'
          };
        }

        // Chunk document
        const chunks = this.chunkBlocks(courseId, materialId, blocks, request.title || fileName, request.kind || 'unknown', request.sourcePlatform || null);
        console.log(`[INGESTION] Created ${chunks.length} chunks`);

        if (chunks.length === 0) {
          console.error(`[INGESTION] No chunks created from document ${fileName}`);
          return { 
            status: 'error', 
            error: 'No chunks created from document',
            hasPdf: buffer ? buffer.slice(0, 4).toString() === '%PDF' : false,
            bytesProcessed: buffer ? buffer.length : 0,
            reason: 'No chunks created'
          };
        }

        // Generate embeddings if enabled
        if (flags.USE_EMBEDDINGS) {
          await this.addEmbeddings(chunks);
        }

        // Clear existing chunks for this file
        await this.deleteChunksByFile(courseId, materialId);

        // Store in databases
        await this.storeChunks(chunks);

        console.log(`[INGESTION] Successfully ingested ${fileName} with ${chunks.length} chunks`);
        
        return {
          status: 'success',
          chunkCount: chunks.length,
          parser: 'unstructured',
          hash: bufferHash || contentHash,
          hasPdf: true,
          bytesProcessed: buffer ? buffer.length : 0,
          reason: 'Successfully processed'
        };

      } finally {
        // Clean up temp file/directory if it was created from buffer
        if (buffer && tempFilePath) {
          try {
            if (fs.existsSync(tempFilePath)) {
              fs.unlinkSync(tempFilePath);
              // Also remove the temp directory if it's empty
              const tempDir = path.dirname(tempFilePath);
              if (tempDir.includes('ingest-') && fs.existsSync(tempDir)) {
                const files = fs.readdirSync(tempDir);
                if (files.length === 0) {
                  fs.rmdirSync(tempDir);
                }
              }
            }
          } catch (cleanupError) {
            console.warn(`[INGESTION] Failed to cleanup temp file: ${cleanupError.message}`);
          }
        }
      }

    } catch (error) {
      console.error(`[INGESTION] Error ingesting ${fileName}:`, error);
      return {
        status: 'error',
        error: error.message,
        hasPdf: buffer ? buffer.slice(0, 4).toString() === '%PDF' : false,
        bytesProcessed: buffer ? buffer.length : 0,
        reason: 'Processing failed'
      };
    }
  }

  async parseWithUnstructured(filePath, fileName, fileType) {
    console.log(`[INGESTION] Parsing with Unstructured: ${fileName}`);
    
    try {
      // Use form-data package for Node.js multipart requests
      const FormData = require('form-data');
      const formData = new FormData();
      const fileBuffer = fs.readFileSync(filePath);
      
      formData.append('files', fileBuffer, {
        filename: fileName,
        contentType: this.getMimeType(fileType)
      });
      formData.append('strategy', flags.OCR_STRATEGY);                   // 'hi_res' or 'ocr_only'
      formData.append('coordinates', 'true');
      formData.append('pdf_infer_table_structure', 'true');
      formData.append('ocr_languages', flags.OCR_LANGUAGES);
      // Note: Removed custom 'ocr' flag as it's not documented in Unstructured API

      const response = await axios.post(`${flags.UNSTRUCTURED_URL}/general/v0/general`, formData, {
        headers: { 
          ...formData.getHeaders(),
          'Content-Type': 'multipart/form-data' 
        },
        timeout: 240000
      });

      return this.normalizeUnstructuredOutput(response.data);
      
    } catch (error) {
      console.error('[INGESTION] Unstructured parsing failed:', error.message);
      console.log('[INGESTION] Falling back to pdf-parse...');
      
      // Fallback 1: pdf-parse
      try {
        const pdfParse = require('pdf-parse');
        const fileBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(fileBuffer);
        
        if (data.text && data.text.trim().length >= 100) {
          console.log(`[INGESTION] pdf-parse extracted ${data.text.length} chars`);
          return this.normalizePdfParseOutput(data);
        } else {
          console.log('[INGESTION] pdf-parse yielded insufficient text, trying OCR...');
        }
      } catch (pdfError) {
        console.error('[INGESTION] pdf-parse fallback failed:', pdfError.message);
      }
      
      // Fallback 2: Tesseract OCR
      try {
        const ocrService = require('../services/ocr.service');
        const ocrText = await ocrService.extractTextFromPDF(filePath, 'eng');
        
        if (ocrText && ocrText.trim().length >= 100) {
          console.log(`[INGESTION] OCR extracted ${ocrText.length} chars`);
          return this.normalizeOcrOutput(ocrText);
        } else {
          console.log('[INGESTION] OCR yielded insufficient text');
        }
      } catch (ocrError) {
        console.error('[INGESTION] OCR fallback failed:', ocrError.message);
      }
      
      throw new Error(`Document parsing failed: ${error.message}`);
    }
  }

  normalizeUnstructuredOutput(elements) {
    const blocks = [];
    let currentHeadingPath = [];

    for (const element of elements) {
      if (element.type === 'Title' || element.type === 'Header') {
        // Update heading path
        const level = this.inferHeadingLevel(element);
        currentHeadingPath = currentHeadingPath.slice(0, level - 1);
        currentHeadingPath[level - 1] = element.text;
      } else if (element.text && element.text.trim()) {
        blocks.push({
          text: element.text.trim(),
          page: element.metadata?.page_number || null,
          heading_path: [...currentHeadingPath],
          type: this.mapElementType(element.type)
        });
      }
    }

    return blocks;
  }

  normalizePdfParseOutput(data) {
    // Convert pdf-parse output to same format as Unstructured
    const text = data.text.trim();
    if (!text) return [];
    
    return [{
      text: text,
      page: 1, // pdf-parse doesn't provide page info
      heading_path: [],
      type: 'text'
    }];
  }

  normalizeOcrOutput(text) {
    // Convert OCR output to same format as Unstructured
    const cleanText = text.trim();
    if (!cleanText) return [];
    
    return [{
      text: cleanText,
      page: 1, // OCR doesn't provide page info
      heading_path: [],
      type: 'text'
    }];
  }

  inferHeadingLevel(element) {
    // Simple heuristic for heading levels
    if (element.type === 'Title') return 1;
    return 2; // Default for headers
  }

  mapElementType(elementType) {
    const typeMap = {
      'NarrativeText': 'text',
      'Text': 'text',
      'Table': 'table',
      'Image': 'figure',
      'Figure': 'figure',
      'ListItem': 'text'
    };
    return typeMap[elementType] || 'text';
  }

  chunkBlocks(courseId, fileId, blocks, title = null, kind = 'unknown', sourcePlatform = null) {
    const chunks = [];
    const maxChars = 1300;  // Page-aware chunking: 1100-1400 chars
    const overlapPercent = 0.12;  // ~10-15% overlap

    // Group blocks by heading for better chunking
    const groups = this.groupBlocksByHeading(blocks);
    
    // Sanity log - preview first few blocks
    const preview = blocks.slice(0, 3).map(b => (b.text || '').slice(0, 120));
    console.log(`[INGESTION] Content previews:`, preview);

    for (const group of groups) {
      // Handle tables as single chunks
      const tables = group.filter(b => b.type === 'table');
      for (const table of tables) {
        chunks.push({
          id: uuidv4(),
          course_id: courseId,
          file_id: fileId,
          title: title,
          content: table.text,
          text: table.text,
          heading: table.heading_path?.[table.heading_path.length - 1] || null,
          heading_path: table.heading_path,
          page: table.page,
          chunk_index: chunks.length,
          kind: kind,
          source_platform: sourcePlatform
        });
      }

      // Chunk text blocks
      const textBlocks = group.filter(b => b.type !== 'table');
      if (textBlocks.length > 0) {
        const textChunks = this.chunkTextBlocks(courseId, fileId, textBlocks, maxChars, overlapPercent, title, kind, sourcePlatform);
        chunks.push(...textChunks);
      }
    }

    return chunks;
  }

  groupBlocksByHeading(blocks) {
    const groups = [];
    let currentGroup = [];
    let currentHeadingPath = [];

    for (const block of blocks) {
      const blockHeadingPath = block.heading_path || [];
      
      if (!this.arraysEqual(currentHeadingPath, blockHeadingPath)) {
        if (currentGroup.length > 0) {
          groups.push(currentGroup);
        }
        currentGroup = [];
        currentHeadingPath = blockHeadingPath;
      }
      
      currentGroup.push(block);
    }
    
    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }
    
    return groups;
  }

  chunkTextBlocks(courseId, fileId, blocks, maxChars, overlapPercent, title = null, kind = 'unknown', sourcePlatform = null) {
    const chunks = [];
    const combinedText = blocks.map(b => b.text).join('\n\n');
    const sentences = this.splitIntoSentences(combinedText);
    
    const firstBlock = blocks[0];
    const headingPath = firstBlock.heading_path;
    const page = firstBlock.page;
    
    // Extract question labels (e.g., "Q2", "Problem 3", etc.)
    const questionLabel = this.extractQuestionLabel(combinedText, title);
    
    let currentChunk = '';
    let currentCharCount = 0;
    let chunkIndex = 0;
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const sentenceChars = sentence.length;
      
      // Avoid splitting mid-equation or table
      if (this.isMidEquation(sentence) || this.isTableRow(sentence)) {
        currentChunk += (currentChunk.length > 0 ? ' ' : '') + sentence;
        currentCharCount += sentenceChars;
        continue;
      }
      
      if (currentCharCount + sentenceChars > maxChars && currentChunk.length > 0) {
        const content = currentChunk.trim();
        // Ensure content is not empty
        if (content) {
          chunks.push({
            id: uuidv4(),
            course_id: courseId,
            file_id: fileId,
            title: title,
            content: content,
            text: content,
            heading: headingPath?.[headingPath.length - 1] || null,
            heading_path: headingPath,
            page,
            chunk_index: chunkIndex++,
            kind: kind,
            source_platform: sourcePlatform,
            question_label: questionLabel
          });
        }
        
        // Start new chunk with overlap
        const overlapChars = Math.floor(maxChars * overlapPercent);
        currentChunk = this.getOverlapText(currentChunk, overlapChars);
        currentCharCount = currentChunk.length;
      }
      
      currentChunk += (currentChunk.length > 0 ? ' ' : '') + sentence;
      currentCharCount += sentenceChars;
    }
    
    const finalContent = currentChunk.trim();
    if (finalContent) {
      chunks.push({
        id: uuidv4(),
        course_id: courseId,
        file_id: fileId,
        title: title,
        content: finalContent,
        text: finalContent,
        heading: headingPath?.[headingPath.length - 1] || null,
        heading_path: headingPath,
        page,
        chunk_index: chunkIndex++,
        kind: kind,
        source_platform: sourcePlatform,
        question_label: questionLabel
      });
    }
    
    return chunks;
  }

  async addEmbeddings(chunks) {
    if (!flags.USE_EMBEDDINGS || (!flags.JINA_API_KEY && !flags.OPENAI_API_KEY)) {
      return;
    }

    console.log(`[INGESTION] Generating embeddings for ${chunks.length} chunks`);
    
    const texts = chunks.map(c => c.text);
    const embeddings = await this.generateEmbeddings(texts);
    
    chunks.forEach((chunk, index) => {
      chunk.embedding = embeddings[index];
    });
  }

  async generateEmbeddings(texts) {
    const batchSize = 100;
    const embeddings = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      
      if (flags.EMBEDDINGS_PROVIDER === 'google' && flags.GOOGLE_API_KEY) {
        const batchEmbeddings = await this.generateGoogleEmbeddings(batch);
        embeddings.push(...batchEmbeddings);
      } else if (flags.EMBEDDINGS_PROVIDER === 'jina' && flags.JINA_API_KEY) {
        const batchEmbeddings = await this.generateJinaEmbeddings(batch);
        embeddings.push(...batchEmbeddings);
      } else if (flags.OPENAI_API_KEY) {
        const batchEmbeddings = await this.generateOpenAIEmbeddings(batch);
        embeddings.push(...batchEmbeddings);
      }

      // Rate limiting
      if (i + batchSize < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return embeddings;
  }

  async generateGoogleEmbeddings(texts) {
    const embeddings = [];
    
    // Google API requires individual requests for each text
    for (const text of texts) {
      const response = await axios.post('https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent', {
        model: 'text-embedding-004',
        content: {
          parts: [{ text }]
        }
      }, {
        headers: {
          'X-Goog-Api-Key': flags.GOOGLE_API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      embeddings.push(response.data.embedding.values);
    }

    return embeddings;
  }

  async generateJinaEmbeddings(texts) {
    const response = await axios.post('https://api.jina.ai/v1/embeddings', {
      model: 'jina-embeddings-v3',
      input: texts,
      encoding_format: 'float'
    }, {
      headers: {
        'Authorization': `Bearer ${flags.JINA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    return response.data.data.map(item => item.embedding);
  }

  async generateOpenAIEmbeddings(texts) {
    const response = await axios.post('https://api.openai.com/v1/embeddings', {
      model: 'text-embedding-3-large',
      input: texts,
      encoding_format: 'float'
    }, {
      headers: {
        'Authorization': `Bearer ${flags.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    return response.data.data.map(item => item.embedding);
  }

  async storeChunks(chunks) {
    // Store in Postgres
    if (this.db) {
      await this.storeInPostgres(chunks);
    }

    // Store in Typesense
    if (this.typesense) {
      await this.storeInTypesense(chunks);
    }
  }

  async storeInPostgres(chunks) {
    console.log(`[INGESTION] Storing ${chunks.length} chunks in Postgres`);
    
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      for (const chunk of chunks) {
        const embeddingValue = chunk.embedding ? `[${chunk.embedding.join(',')}]` : null;
        
        const query = flags.USE_EMBEDDINGS
          ? `INSERT INTO rag_chunks (id, course_id, file_id, title, content, heading, heading_path, page, chunk_index, kind, source_platform, embedding) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`
          : `INSERT INTO rag_chunks (id, course_id, file_id, title, content, heading, heading_path, page, chunk_index, kind, source_platform) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`;
        
        const values = flags.USE_EMBEDDINGS
          ? [chunk.id, chunk.course_id, chunk.file_id, chunk.title || null, chunk.content, chunk.heading || null, chunk.heading_path || [], chunk.page || null, chunk.chunk_index || 0, chunk.kind || 'unknown', chunk.source_platform || null, embeddingValue]
          : [chunk.id, chunk.course_id, chunk.file_id, chunk.title || null, chunk.content, chunk.heading || null, chunk.heading_path || [], chunk.page || null, chunk.chunk_index || 0, chunk.kind || 'unknown', chunk.source_platform || null];
        
        await client.query(query, values);
      }

      await client.query('COMMIT');
      console.log('[INGESTION] Postgres storage complete');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async storeInTypesense(chunks) {
    console.log(`[INGESTION] Storing ${chunks.length} chunks in Typesense`);
    
    const documents = chunks.map(chunk => {
      // Ensure both content and text are set to the same value for compatibility
      const body = chunk.content || chunk.text || '';
      return {
        id: chunk.id,
        course_id: chunk.course_id,
        file_id: chunk.file_id,
        title: chunk.title || '',
        content: body,
        text: body, // Set both content and text to same value
        heading: chunk.heading || '',
        heading_path: chunk.heading_path || [],
        page: chunk.page || 0,
        chunk_index: chunk.chunk_index || 0,
        kind: chunk.kind || 'unknown',
        source_platform: chunk.source_platform || ''
      };
    });

    const batchSize = 100;
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      await this.typesense.collections('rag_chunks').documents().import(batch, {
        action: 'upsert'
      });
    }

    console.log('[INGESTION] Typesense storage complete');
  }

  async deleteChunksByFile(courseId, fileId) {
    // Delete from Postgres
    if (this.db) {
      const result = await this.db.query(
        'DELETE FROM rag_chunks WHERE course_id = $1 AND file_id = $2',
        [courseId, fileId]
      );
      console.log(`[INGESTION] Deleted ${result.rowCount} chunks from Postgres`);
    }

    // Delete from Typesense
    if (this.typesense) {
      await this.typesense.collections('rag_chunks').documents().delete({
        filter_by: `course_id:${courseId} && file_id:${fileId}`
      });
      console.log(`[INGESTION] Deleted chunks from Typesense`);
    }
  }

  async getChunksByFile(courseId, fileId) {
    if (!this.db) return [];

    const result = await this.db.query(
      'SELECT id, course_id, file_id, page, heading_path, content as text FROM rag_chunks WHERE course_id = $1 AND file_id = $2',
      [courseId, fileId]
    );

    return result.rows;
  }

  async healthCheck() {
    const services = {};

    // Check Postgres
    try {
      if (this.db) {
        await this.db.query('SELECT 1');
      services.postgres = true;
      } else {
        services.postgres = false;
      }
    } catch (error) {
      services.postgres = false;
    }

    // Check Typesense
    try {
      if (this.typesense) {
        await this.typesense.collections('rag_chunks').retrieve();
        services.typesense = true;
      } else {
        services.typesense = false;
      }
    } catch (error) {
      services.typesense = false;
    }

    // Check Unstructured
    try {
      const response = await axios.get(`${flags.UNSTRUCTURED_URL}/healthcheck`, { timeout: 5000 });
      services.unstructured = response.status === 200;
    } catch (error) {
      services.unstructured = false;
    }

    const allHealthy = Object.values(services).every(status => status);
    
    return {
      status: allHealthy ? 'healthy' : 'degraded',
      services
    };
  }

  async getChunksByCourse(courseId) {
    if (!flags.RAG_ENABLED || !this.db) {
      return [];
    }

    try {
      const query = `
        SELECT id, course_id, file_id, title, content, heading, heading_path, page, chunk_index, created_at, kind, source_platform
        FROM rag_chunks 
        WHERE course_id = $1
        ORDER BY created_at DESC
      `;
      
      const result = await this.db.query(query, [courseId]);
      return result.rows;
    } catch (error) {
      console.error('[INGESTION] Error getting chunks by course:', error);
      return [];
    }
  }

  async getIndexMeta(courseId) {
    if (!flags.RAG_ENABLED || !this.db) {
      return null;
    }

    try {
      const query = `
        SELECT course_id, last_indexed, doc_counts, status
        FROM rag_index_meta 
        WHERE course_id = $1
      `;
      
      const result = await this.db.query(query, [courseId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('[INGESTION] Error getting index meta:', error);
      return null;
    }
  }

  async updateIndexMeta(courseId, meta) {
    if (!flags.RAG_ENABLED || !this.db) {
      return;
    }

    try {
      const query = `
        INSERT INTO rag_index_meta (course_id, last_indexed, doc_counts, status)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (course_id)
        DO UPDATE SET 
          last_indexed = EXCLUDED.last_indexed,
          doc_counts = EXCLUDED.doc_counts,
          status = EXCLUDED.status
      `;
      
      await this.db.query(query, [
        courseId,
        meta.lastIndexed || new Date(),
        JSON.stringify(meta.docCounts || {}),
        meta.status || 'completed'
      ]);
    } catch (error) {
      console.error('[INGESTION] Error updating index meta:', error);
    }
  }

  // Update assignment status for locked/failed items
  async updateAssignmentStatus(assignmentId, statusData) {
    if (!flags.RAG_ENABLED || !this.db) {
      console.log('[INGESTION] RAG disabled or no database, skipping assignment status update');
      return;
    }

    try {
      const query = `
        INSERT INTO assignment_index_status (
          assignment_id, status, reason, evidence, last_checked_at, 
          gs_course_id, gs_assignment_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        ON CONFLICT (assignment_id) DO UPDATE SET
          status = EXCLUDED.status,
          reason = EXCLUDED.reason,
          evidence = EXCLUDED.evidence,
          last_checked_at = EXCLUDED.last_checked_at,
          gs_course_id = EXCLUDED.gs_course_id,
          gs_assignment_id = EXCLUDED.gs_assignment_id,
          updated_at = NOW()
      `;
      
      await this.db.query(query, [
        assignmentId,
        statusData.status,
        statusData.reason,
        statusData.evidence,
        statusData.lastCheckedAt || new Date(),
        statusData.gsCourseId,
        statusData.gsAssignmentId
      ]);
      
      console.log(`[INGESTION] Updated assignment status: ${assignmentId} -> ${statusData.status}`);
    } catch (error) {
      console.error('[INGESTION] Error updating assignment status:', error);
    }
  }

  // Helper methods
  getMimeType(fileType) {
    const mimeTypes = {
      'pdf': 'application/pdf',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'html': 'text/html',
      'txt': 'text/plain'
    };
    return mimeTypes[fileType.toLowerCase()] || 'application/octet-stream';
  }

  splitIntoSentences(text) {
    return text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => s + '.');
  }

  estimateTokens(text) {
    return Math.ceil(text.length / 4);
  }

  getOverlapText(text, maxTokens) {
    const words = text.split(/\s+/);
    const estimatedWordsPerToken = 0.75;
    const maxWords = Math.floor(maxTokens / estimatedWordsPerToken);
    
    if (words.length <= maxWords) return text;
    return words.slice(-maxWords).join(' ');
  }

  arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    return a.every((val, i) => val === b[i]);
  }

  async downloadFromGCS(gcsPath, fileName) {
    // Placeholder for GCS download - implement if needed
    throw new Error('GCS download not implemented yet');
  }

  // Helper methods for improved chunking
  extractQuestionLabel(text, title) {
    // Look for question patterns: Q1, Q2, Problem 1, Question 2, etc.
    const patterns = [
      /Q(\d+)/i,
      /Problem\s+(\d+)/i,
      /Question\s+(\d+)/i,
      /Part\s+(\d+)/i,
      /Exercise\s+(\d+)/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern) || title?.match(pattern);
      if (match) {
        return `Q${match[1]}`;
      }
    }
    
    return null;
  }

  isMidEquation(sentence) {
    // Detect if sentence is part of an equation (contains math symbols)
    return /[=+\-*/^(){}[\]]/.test(sentence) && sentence.length < 50;
  }

  isTableRow(sentence) {
    // Detect if sentence is a table row (contains multiple | or tabs)
    return (sentence.includes('|') && sentence.split('|').length > 2) || 
           (sentence.includes('\t') && sentence.split('\t').length > 2);
  }
}

// Singleton instance
let ingestionService = null;

function getIngestionService() {
  if (!ingestionService) {
    ingestionService = new IngestionService();
  }
  return ingestionService;
}

module.exports = {
  IngestionService,
  getIngestionService
};