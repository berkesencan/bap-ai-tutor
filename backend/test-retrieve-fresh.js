const { getRetrievalService } = require('./retrieval/retrieval.service');

async function testRetrieveFresh() {
  console.log('Testing retrieve method with fresh instance...');
  
  // Create a fresh instance to avoid cache issues
  const RetrievalService = require('./retrieval/retrieval.service').RetrievalService;
  const retrievalService = new RetrievalService();
  
  try {
    const result = await retrievalService.retrieve({
      courseId: 'aa8a2355-a59e-46e8-ae99-99a82358ddb9',
      query: 'derivative of x squared',
      limit: 5
    });
    
    console.log('Fresh retrieve result:', {
      chunks: result.chunks.length,
      low_confidence: result.low_confidence,
      stats: result.stats
    });
    
    if (result.chunks.length > 0) {
      console.log('First chunk:', {
        id: result.chunks[0].id,
        course_id: result.chunks[0].course_id,
        kind: result.chunks[0].kind,
        content: result.chunks[0].content?.substring(0, 50) + '...'
      });
    }
    
  } catch (error) {
    console.error('Error testing fresh retrieve:', error);
  }
}

testRetrieveFresh();
