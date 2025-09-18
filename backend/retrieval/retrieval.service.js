const axios = require('axios');
const { Pool } = require('pg');
const Typesense = require('typesense');
const fetch = require('node-fetch');
const flags = require('../config/flags');
const { expandQueries } = require('./mqe');
const { rerank } = require('./rerankers');
const { embed } = require('./embeddings');

class RetrievalService {
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
      try {
        this.typesense = new Typesense.Client({
          nodes: [{
            host: flags.TYPESENSE_HOST,
            port: parseInt(flags.TYPESENSE_PORT),
            protocol: flags.TYPESENSE_PROTOCOL
          }],
          apiKey: flags.TYPESENSE_API_KEY,
          connectionTimeoutSeconds: 10
        });
        console.log('[RETRIEVAL] Typesense client initialized successfully');
      } catch (error) {
        console.error('[RETRIEVAL] Failed to initialize Typesense client:', error.message);
        this.typesense = null;
      }
    }

    // Cache for retrieval results
    this.cache = new Map();
    this.cacheTTL = 120000; // 2 minutes

    console.log('[RETRIEVAL] Service initialized');
  }

  cleanQuery(q) {
    if (!q) return '';
    
    // keep letters, numbers, spaces; drop stray punctuation but preserve digits
    const normalized = q.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();

    // preserve key noun phrases like "problem set 5", "exam 2", "worksheet 3"
    const ps = normalized.match(/\b(problem\s*set\s*\d+)\b/gi) || [];
    const ex = normalized.match(/\b(exam\s*\d+)\b/gi) || [];
    const ws = normalized.match(/\b(worksheet\s*\d+)\b/gi) || [];

    // conservative stopwords (DO NOT remove "problem", "set", "exam", "worksheet", numbers)
    const stop = new Set(['the','a','an','of','and','or','to','for','in','on','at','is','are','be','can','you','see','how','many','do','does','please']);
    const tokens = normalized.split(' ').filter(t => t && !stop.has(t));

    // if we found key phrases, prioritize them and add remaining tokens
    if (ps.length > 0 || ex.length > 0 || ws.length > 0) {
      const phrases = [...ps, ...ex, ...ws];
      const remainingTokens = tokens.filter(t => !phrases.some(p => p.includes(t)));
      return [...phrases, ...remainingTokens].join(' ');
    }

    // fallback to token-based cleaning
    return tokens.join(' ');
  }

  /**
   * Unify score field names across different sources
   */
  unifyScore(chunk) {
    return chunk.score ?? chunk.semanticScore ?? chunk.rankScore ?? 0;
  }

  /**
   * Check if Cohere reranking is available and properly configured
   */
  canUseCohereRerank() {
    const { ENABLE_RERANKER, USE_RERANK, RERANKER_PROVIDER, COHERE_API_KEY } = process.env;
    return ENABLE_RERANKER === 'true'
      && USE_RERANK === 'true'
      && RERANKER_PROVIDER === 'cohere'
      && typeof COHERE_API_KEY === 'string'
      && COHERE_API_KEY.trim().length > 0;
  }

  /**
   * Rerank documents using Cohere API
   */
  async rerankWithCohere(query, docs, topK = 10) {
    const documents = docs.map(d => d.content ?? d.text ?? '');
    const payload = {
      model: 'rerank-english-v3.0',
      query,
      documents,
      top_n: Math.min(topK, documents.length)
    };

    const res = await axios.post(
      'https://api.cohere.com/v1/rerank',
      payload,
      { 
        headers: { 
          Authorization: `Bearer ${process.env.COHERE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 8000
      }
    );

    const byIdx = res?.data?.results || [];
    // Map Cohere results back onto original docs with a unified `score`
    const reranked = byIdx.map(r => {
      const originalDoc = docs[r.index];
      return {
        ...originalDoc,
        score: r.relevance_score,
        source: 'cohere_reranked'
      };
    });

    return reranked;
  }

  async retrieve(request) {
    if (!flags.RAG_ENABLED) {
      return {
        chunks: [],
        low_confidence: true,
        stats: { message: 'RAG is disabled' }
      };
    }

    const { courseId, query, chat_window_summary, limit = 8 } = request;
    const startTime = Date.now();

    console.log(`[RETRIEVAL] Retrieving for course ${courseId}: "${query.substring(0, 100)}..."`);

    // Build enhanced query with chat context
    const enhancedQuery = this.buildEnhancedQuery(query, chat_window_summary);
    
    // Check cache
    const cacheKey = `${courseId}:${this.normalizeQuery(enhancedQuery)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      console.log('[RETRIEVAL] Returning cached result');
      return cached.result;
    }

    try {
      // Step 1: Get candidates from Typesense (required)
      const keywordCandidates = await this.searchTypesense(courseId, enhancedQuery, 200);
      console.log(`[RETRIEVAL] Found ${keywordCandidates.length} keyword candidates`);

      // Smart retry: if no hits and query contains file phrases, trigger reconcile
      let allCandidates = keywordCandidates;
      if (keywordCandidates.length === 0 && courseId) {
        const phrases = (enhancedQuery.match(/\b(problem\s*set\s*\d+|exam\s*\d+|worksheet\s*\d+)\b/gi) || []);
        if (phrases.length > 0) {
          console.log(`[RAG][SMART_RETRY] course=${courseId} phrases=${JSON.stringify(phrases)} retried=false hits=0`);
          
          // Check debounce (60s per course)
          const debounceKey = `smart_retry_${courseId}`;
          const now = Date.now();
          const lastRetry = this.smartRetryDebounce?.get(debounceKey) || 0;
          
          if (now - lastRetry > 60000) { // 60 seconds
            this.smartRetryDebounce = this.smartRetryDebounce || new Map();
            this.smartRetryDebounce.set(debounceKey, now);
            
            try {
              console.log(`[RAG][SMART_RETRY] Triggering reconcile for course ${courseId}`);
              // Trigger reconcile in background (non-blocking)
              fetch(`http://localhost:8000/api/rag/consistency/reindex/${courseId}`, { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
              }).catch(err => console.log('[RAG][SMART_RETRY] Reconcile failed:', err.message));
              
              // Wait a moment for reconcile to complete, then retry search
              await new Promise(resolve => setTimeout(resolve, 2000));
              const retryCandidates = await this.searchTypesense(courseId, enhancedQuery, 200);
              console.log(`[RAG][SMART_RETRY] course=${courseId} phrases=${JSON.stringify(phrases)} retried=true hits=${retryCandidates.length}`);
              
              if (retryCandidates.length > 0) {
                allCandidates = retryCandidates;
              }
            } catch (retryError) {
              console.log('[RAG][SMART_RETRY] Retry failed:', retryError.message);
            }
          } else {
            console.log(`[RAG][SMART_RETRY] course=${courseId} phrases=${JSON.stringify(phrases)} retried=false hits=0 (debounced)`);
          }
        }
      }

      // Step 2: Add semantic candidates if embeddings enabled
      let embeddingDisabled = false;
      if (flags.USE_EMBEDDINGS) {
        const semanticCandidates = await this.searchSemantic(courseId, enhancedQuery, 200, embeddingDisabled);
        console.log(`[RETRIEVAL] Found ${semanticCandidates.length} semantic candidates`);
        allCandidates = this.mergeCandidates(keywordCandidates, semanticCandidates);
      }

      if (allCandidates.length === 0) {
        const result = {
          chunks: [],
          low_confidence: true,
          stats: {
            keyword_results: keywordCandidates.length,
            semantic_results: flags.USE_EMBEDDINGS ? 0 : null,
            reranked_results: 0,
            total_candidates: 0,
            query_time_ms: Date.now() - startTime
          }
        };
        this.cache.set(cacheKey, { result, timestamp: Date.now() });
        return result;
      }

      // Step 3: Rerank using Cohere if available
      let finalChunks;
      if (this.canUseCohereRerank() && allCandidates.length > 0) {
        console.log(`[RETRIEVAL] Reranking ${allCandidates.length} candidates with Cohere`);
        try {
          finalChunks = await this.rerankWithCohere(enhancedQuery, allCandidates, limit);
          console.log(`[RETRIEVAL] Cohere reranking completed, returned ${finalChunks.length} chunks`);
        } catch (e) {
          console.warn(`[RETRIEVAL] Cohere rerank failed, using unranked candidates: ${e?.message || e}`);
          // Fall back to unranked candidates
          finalChunks = allCandidates.slice(0, limit);
        }
      } else {
        // Simple scoring fallback
        finalChunks = allCandidates
          .sort((a, b) => (b.keywordScore || 0) + (b.semanticScore || 0) - ((a.keywordScore || 0) + (a.semanticScore || 0)))
          .slice(0, limit)
          .map(c => ({
            id: c.id,
            course_id: c.course_id,
            fileId: c.file_id,
            title: c.title,
            content: c.content,
            heading: c.heading,
            heading_path: c.heading_path,
            page: c.page,
            chunk_index: c.chunk_index,
            kind: c.kind,
            source_platform: c.source_platform,
            text: c.text,
            score: (c.keywordScore || 0) + (c.semanticScore || 0),
            source: 'hybrid'
          }));
      }

      const result = {
        chunks: finalChunks,
        low_confidence: finalChunks.length === 0 || this.unifyScore(finalChunks[0] || {}) < 0.3,
        stats: {
          keyword_results: keywordCandidates.length,
          semantic_results: flags.USE_EMBEDDINGS ? (allCandidates.length - keywordCandidates.length) : null,
          reranked_results: finalChunks.length,
          total_candidates: allCandidates.length,
          query_time_ms: Date.now() - startTime
        }
      };

      // Cache result
      this.cache.set(cacheKey, { result, timestamp: Date.now() });

      console.log(`[RETRIEVAL] Completed in ${result.stats.query_time_ms}ms, returned ${finalChunks.length} chunks`);
      return result;

    } catch (error) {
      console.error('[RETRIEVAL] Error during retrieval:', error);
      
      return {
        chunks: [],
        low_confidence: true,
        stats: {
          keyword_results: 0,
          semantic_results: null,
          reranked_results: 0,
          total_candidates: 0,
          query_time_ms: Date.now() - startTime,
          error: error.message
        }
      };
    }
  }

  buildEnhancedQuery(query, chatSummary) {
    if (!chatSummary || chatSummary.trim().length === 0) {
      return query;
    }

    const trimmedSummary = chatSummary.length > 500 
      ? chatSummary.substring(0, 500) + '...'
      : chatSummary;

    return `${query}\n\nContext: ${trimmedSummary}`;
  }

  async searchTypesense(courseId, query, limit) {
    if (!this.typesense) return [];

    try {
      const startTime = Date.now();
      const cleanQuery = this.cleanQuery(query);
      
      console.log(`[RETRIEVAL] Original query: "${query}" -> Cleaned: "${cleanQuery}"`);
      
      // Step 1: Multi-Query Expansion
      const queries = await expandQueries(cleanQuery);
      console.log(`[RETRIEVAL] MQE generated ${queries.length} query variants:`, queries);
      
      // Step 2: Search with each query variant
      const perQuery = Math.max(5, Math.ceil(flags.RERANKER_TOP_K_INPUT / queries.length));
      const allHits = [];
      
      for (const q of queries) {
        try {
          const hits = await this.searchSingleQuery(courseId, q, perQuery);
          allHits.push(...hits);
        } catch (error) {
          console.warn(`[RETRIEVAL] Query "${q}" failed:`, error.message);
        }
      }
      
      // Step 3: Deduplicate by document ID
      const dedup = new Map();
      for (const hit of allHits) {
        if (!dedup.has(hit.id)) {
          dedup.set(hit.id, hit);
        }
      }
      
      let candidates = Array.from(dedup.values());
      console.log(`[RETRIEVAL] After deduplication: ${candidates.length} unique documents`);
      
      // Step 4: Truncate to TOP_K_INPUT for reranking
      if (candidates.length > flags.RERANKER_TOP_K_INPUT) {
        candidates = candidates.slice(0, flags.RERANKER_TOP_K_INPUT);
        console.log(`[RETRIEVAL] Truncated to ${candidates.length} candidates for reranking`);
      }
      
      // Step 5: Rerank if enabled
      let results;
      if (flags.ENABLE_RERANKER && candidates.length > 0) {
        try {
          console.log(`[RETRIEVAL] Reranking with ${flags.RERANKER_PROVIDER}...`);
          const rerankStartTime = Date.now();
          
          const docs = candidates.map(this.toDoc).filter(d => d.text?.length > 0);
          const reranked = await Promise.race([
            rerank({
              provider: flags.RERANKER_PROVIDER,
              query: cleanQuery,
              docs,
              topN: flags.RERANKER_TOP_N,
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Reranking timeout')), 2500)
            )
          ]);
          
          // Map back to original chunk objects
          const byId = new Map(candidates.map(c => [c.id, c]));
          results = reranked.map(r => ({ 
            ...byId.get(r.id), 
            rerankScore: r.rerankScore 
          }));
          
          console.log(`[RETRIEVAL] Reranking completed in ${Date.now() - rerankStartTime}ms`);
          
        } catch (error) {
          console.warn(`[RETRIEVAL] Reranking failed, using original order:`, error.message);
          results = candidates.slice(0, flags.RERANKER_TOP_N);
        }
      } else {
        results = candidates.slice(0, flags.RERANKER_TOP_N);
      }
      
      // Step 6: Log final results
      const totalTime = Date.now() - startTime;
      console.log(`[RETRIEVAL] Final results: ${results.length} docs in ${totalTime}ms`);
      console.log(`[RETRIEVAL] MQE: ${flags.ENABLE_MQE}, Reranker: ${flags.ENABLE_RERANKER} (${flags.RERANKER_PROVIDER})`);
      
      results.slice(0, 3).forEach((c, i) => {
        console.log(`[RETRIEVAL] Preview[${i}]:`, (c.content || '').slice(0, 160));
      });

      return results;
      
    } catch (error) {
      console.error('[RETRIEVAL] Search failed:', error);
      return [];
    }
  }

  /**
   * Search with a single query (used by MQE)
   */
  async searchSingleQuery(courseId, query, limit) {
    // Build dynamic query_by based on available fields (use content, not text)
    const queryBy = 'content,title,heading';
    
    // Use widened filter to include both gradescope-pdf and local-pdf
    const courseFilter = courseId ? `course_id:=${courseId}` : '';
    const kindFilter = 'kind:=[gradescope-pdf,local-pdf,unknown]';
    const filterBy = courseFilter ? `${courseFilter} && ${kindFilter}` : kindFilter;
    
    const params = {
      q: query,
      query_by: queryBy,
      query_by_weights: '6,2,2',
      filter_by: filterBy,
      include_fields: 'id,title,heading,content,text,page,kind,source_platform,file_id,course_id,_text_match',
      per_page: limit,
      page: 1,
      snippet_threshold: 30,
      num_typos: 1,
      sort_by: '_text_match:desc'
    };

    // Add vector search if embeddings are enabled
    let vector_query;
    if (flags.USE_EMBEDDINGS) {
      const qVec = await embed(query);
      if (qVec) {
        const k = Math.max(8, Math.ceil(limit * 0.6));
        vector_query = `embedding:(${qVec.join(',')}, k:${k})`;
      } else {
        console.log('[RETRIEVAL] Embedding generation failed, using BM25-only search');
      }
    }

    // For now, disable vector query to avoid length issues
    const searchParams = params;

    const results = await this.typesense.collections('rag_chunks')
      .documents()
      .search(searchParams);

    return (results.hits || []).map(hit => {
      // Normalize content field as specified - use content if available, fallback to text
      const body = (hit.document.content && hit.document.content.trim()) || 
                   (hit.document.text && hit.document.text.trim()) || '';
      
      return {
        id: hit.document.id,
        course_id: hit.document.course_id,
        file_id: hit.document.file_id,
        title: hit.document.title,
        content: body,
        heading: hit.document.heading,
        heading_path: hit.document.heading_path,
        page: hit.document.page,
        chunk_index: hit.document.chunk_index,
        kind: hit.document.kind,
        source_platform: hit.document.source_platform,
        text: body,
        keywordScore: hit.text_match,
        snippet: hit.highlights?.content?.[0]?.snippet || hit.highlights?.text?.[0]?.snippet || ''
      };
    });
  }

  /**
   * Convert chunk to document format for reranking
   */
  toDoc(chunk) {
    const text = (chunk.content || chunk.text || '').slice(0, 1500); // Keep it light
    const meta = { 
      title: chunk.title, 
      page: chunk.page, 
      course_id: chunk.course_id, 
      kind: chunk.kind 
    };
    return { id: chunk.id, text, meta };
  }

  async searchSemantic(courseId, query, limit, embeddingDisabled = false) {
    if (!this.db || !flags.USE_EMBEDDINGS) return [];

    try {
      // Generate query embedding using new abstraction
      const queryEmbedding = await embed(query);
      if (!queryEmbedding) {
        console.log('[RETRIEVAL] No embedding generated, skipping semantic search');
        return [];
      }

      const embeddingVector = `[${queryEmbedding.join(',')}]`;
      
      const result = await this.db.query(`
        SELECT 
          id,
          course_id,
          file_id,
          page,
          heading_path,
          content as text,
          1 - (embedding <=> $1::vector) as similarity_score
        FROM rag_chunks
        WHERE course_id = $2 AND embedding IS NOT NULL
        ORDER BY embedding <=> $1::vector
        LIMIT $3
      `, [embeddingVector, courseId, limit]);

      return result.rows.map(row => ({
        id: row.id,
        course_id: row.course_id,
        file_id: row.file_id,
        page: row.page,
        heading_path: row.heading_path,
        text: row.text,
        semanticScore: parseFloat(row.similarity_score)
      }));
    } catch (error) {
      console.error('[RETRIEVAL] Semantic search failed:', error);
      return [];
    }
  }


  mergeCandidates(keywordResults, semanticResults) {
    const candidates = new Map();

    // Add keyword results
    for (const result of keywordResults) {
      candidates.set(result.id, {
        ...result,
        source: 'keyword'
      });
    }

    // Merge semantic results
    for (const result of semanticResults) {
      const existing = candidates.get(result.id);
      if (existing) {
        existing.semanticScore = result.semanticScore;
        existing.source = 'hybrid';
      } else {
        candidates.set(result.id, {
          ...result,
          source: 'semantic'
        });
      }
    }

    return Array.from(candidates.values());
  }

  // Legacy rerankCandidates method - now deprecated in favor of direct Cohere reranking
  async rerankCandidates(query, candidates, limit) {
    console.warn('[RETRIEVAL] Using deprecated rerankCandidates method - should use direct Cohere reranking');
    return candidates.slice(0, limit);
  }

  async rerankWithVoyage(query, documents) {
    const response = await axios.post('https://api.voyageai.com/v1/rerank', {
      model: 'rerank-2.5',
      query,
      documents,
      return_documents: false,
      top_k: Math.min(documents.length, 20)
    }, {
      headers: {
        'Authorization': `Bearer ${flags.VOYAGE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    return response.data.results.map(result => ({
      index: result.index,
      score: result.relevance_score
    }));
  }

  // Duplicate method removed - using the main rerankWithCohere method above

  normalizeQuery(query) {
    return query.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  async clearCache() {
    this.cache.clear();
    console.log('[RETRIEVAL] Cache cleared');
  }

  async healthCheck() {
    const components = {};
    
    // Check Postgres
    try {
      if (this.db) {
        await this.db.query('SELECT 1');
        components.postgres = true;
      } else {
        components.postgres = false;
      }
    } catch (error) {
      components.postgres = false;
    }

    // Check Typesense
    try {
      if (this.typesense) {
        await this.typesense.collections('rag_chunks').retrieve();
        components.typesense = true;
      } else {
        components.typesense = false;
      }
    } catch (error) {
      components.typesense = false;
    }

    // Check embeddings if enabled
    if (flags.USE_EMBEDDINGS) {
      try {
        const testEmbedding = await this.generateQueryEmbedding('test');
        components.embeddings = !!testEmbedding;
      } catch (error) {
        components.embeddings = false;
      }
    } else {
      components.embeddings = null;
    }

    const requiredComponents = Object.entries(components)
      .filter(([key, value]) => value !== null)
      .map(([key, value]) => value);
    
    const allHealthy = requiredComponents.every(status => status);
    
    return {
      status: allHealthy ? 'healthy' : 'degraded',
      components
    };
  }
}

// Singleton instance
let retrievalService = null;

function getRetrievalService() {
  if (!retrievalService) {
    retrievalService = new RetrievalService();
  }
  return retrievalService;
}

module.exports = {
  RetrievalService,
  getRetrievalService
};
