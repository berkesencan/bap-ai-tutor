const { getRetrievalService } = require('./retrieval/retrieval.service');

async function testSearchTypesense() {
  console.log('Testing searchTypesense method directly...');
  
  const retrievalService = getRetrievalService();
  
  try {
    // Test the searchTypesense method directly
    const result = await retrievalService.searchTypesense('aa8a2355-a59e-46e8-ae99-99a82358ddb9', 'derivative of x squared', 5);
    
    console.log('searchTypesense result:', {
      chunks: result.length,
      firstChunk: result[0] ? {
        id: result[0].id,
        course_id: result[0].course_id,
        kind: result[0].kind,
        content: result[0].content?.substring(0, 50) + '...'
      } : null
    });
    
  } catch (error) {
    console.error('Error testing searchTypesense:', error);
  }
}

testSearchTypesense();
