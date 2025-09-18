const Typesense = require('typesense');
require('dotenv').config();

async function checkTypesenseChunks() {
  const typesense = new Typesense.Client({
    nodes: [{
      host: process.env.TYPESENSE_HOST || 'localhost',
      port: parseInt(process.env.TYPESENSE_PORT || '8108'),
      protocol: process.env.TYPESENSE_PROTOCOL || 'http'
    }],
    apiKey: process.env.TYPESENSE_API_KEY || 'xyz',
    connectionTimeoutSeconds: 10
  });

  try {
    console.log('Checking Typesense chunks...');
    
    // Get all chunks for the course
    const searchResults = await typesense.collections('rag_chunks')
      .documents()
      .search({
        q: '*',
        filter_by: `course_id:aa8a2355-a59e-46e8-ae99-99a82358ddb9`,
        per_page: 10,
        page: 1
      });

    console.log('All chunks for course:', {
      found: searchResults.found,
      hits: searchResults.hits?.length || 0
    });

    if (searchResults.hits && searchResults.hits.length > 0) {
      console.log('First few chunks:');
      searchResults.hits.slice(0, 3).forEach((hit, i) => {
        console.log(`Chunk ${i + 1}:`, {
          id: hit.document.id,
          course_id: hit.document.course_id,
          kind: hit.document.kind,
          title: hit.document.title,
          content_preview: hit.document.content?.substring(0, 50) + '...'
        });
      });
    }
    
  } catch (error) {
    console.error('Error checking Typesense chunks:', error);
  }
}

checkTypesenseChunks();
