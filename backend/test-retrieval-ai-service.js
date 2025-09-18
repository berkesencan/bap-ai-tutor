const { getRetrievalService } = require('./retrieval/retrieval.service');

async function testRetrievalAIService() {
  console.log('Testing retrieval service with AI service parameters...');
  
  const retrievalService = getRetrievalService();
  
  try {
    const result = await retrievalService.retrieve({
      courseId: 'aa8a2355-a59e-46e8-ae99-99a82358ddb9',
      query: 'what is the derivative of x squared?',
      chat_window_summary: '',
      limit: 8
    });
    
    console.log('Retrieval result:', {
      chunks: result.chunks.length,
      low_confidence: result.low_confidence,
      stats: result.stats
    });
    
    if (result.chunks.length > 0) {
      console.log('First chunk:', {
        id: result.chunks[0].id,
        course_id: result.chunks[0].course_id,
        kind: result.chunks[0].kind,
        content: result.chunks[0].content?.substring(0, 100) + '...'
      });
    } else {
      console.log('No chunks found. Checking Typesense directly...');
      
      // Test Typesense search directly
      const Typesense = require('typesense');
      const typesense = new Typesense.Client({
        nodes: [{
          host: process.env.TYPESENSE_HOST || 'localhost',
          port: parseInt(process.env.TYPESENSE_PORT || '8108'),
          protocol: process.env.TYPESENSE_PROTOCOL || 'http'
        }],
        apiKey: process.env.TYPESENSE_API_KEY || 'xyz',
        connectionTimeoutSeconds: 10
      });

      const searchResults = await typesense.collections('rag_chunks')
        .documents()
        .search({
          q: 'what is the derivative of x squared?',
          query_by: 'content,heading_path',
          filter_by: `course_id:aa8a2355-a59e-46e8-ae99-99a82358ddb9 && kind:gradescope-pdf`,
          per_page: 5,
          page: 1,
          sort_by: '_text_match:desc',
          snippet_threshold: 30,
          num_typos: 1
        });

      console.log('Direct Typesense search:', {
        found: searchResults.found,
        hits: searchResults.hits?.length || 0
      });
    }
    
  } catch (error) {
    console.error('Error testing retrieval:', error);
  }
}

testRetrievalAIService();
