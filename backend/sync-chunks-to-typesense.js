const { Pool } = require('pg');
const Typesense = require('typesense');
const flags = require('./config/flags');

async function syncChunksToTypesense() {
  // Initialize database connection
  const db = new Pool({
    connectionString: flags.DATABASE_URL,
    ssl: false,
  });

  // Initialize Typesense client
  const typesense = new Typesense.Client({
    nodes: [{
      host: flags.TYPESENSE_HOST,
      port: parseInt(flags.TYPESENSE_PORT),
      protocol: flags.TYPESENSE_PROTOCOL
    }],
    apiKey: flags.TYPESENSE_API_KEY,
    connectionTimeoutSeconds: 10
  });

  try {
    console.log('Syncing chunks from database to Typesense...');
    
    // Get all chunks from database
    const result = await db.query('SELECT * FROM rag_chunks WHERE course_id = $1', ['aa8a2355-a59e-46e8-ae99-99a82358ddb9']);
    console.log(`Found ${result.rows.length} chunks in database`);
    
    // Check what's already in Typesense
    const existingResult = await typesense.collections('rag_chunks').documents().search({
      q: '*',
      query_by: 'title',
      filter_by: 'course_id:=aa8a2355-a59e-46e8-ae99-99a82358ddb9',
      per_page: 100
    });
    
    const existingIds = new Set(existingResult.hits.map(hit => hit.document.id));
    console.log(`Found ${existingIds.size} chunks already in Typesense`);
    
    // Find missing chunks
    const missingChunks = result.rows.filter(chunk => !existingIds.has(chunk.id));
    console.log(`Found ${missingChunks.length} missing chunks`);
    
    if (missingChunks.length === 0) {
      console.log('No missing chunks to sync');
      return;
    }
    
    // Sync missing chunks
    for (const chunk of missingChunks) {
      try {
        const document = {
          id: chunk.id,
          course_id: chunk.course_id,
          file_id: chunk.file_id,
          title: chunk.title,
          content: chunk.content,
          heading: chunk.heading,
          heading_path: chunk.heading_path,
          page: chunk.page,
          chunk_index: chunk.chunk_index,
          kind: chunk.kind,
          source_platform: chunk.source_platform,
          created_at: chunk.created_at,
          updated_at: chunk.updated_at
        };
        
        await typesense.collections('rag_chunks').documents().create(document);
        console.log(`Synced chunk: ${chunk.title} (${chunk.id})`);
      } catch (error) {
        console.error(`Error syncing chunk ${chunk.id}:`, error.message);
      }
    }
    
    console.log('Sync completed');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.end();
  }
}

syncChunksToTypesense();
