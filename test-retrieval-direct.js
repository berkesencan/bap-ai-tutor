const { getRetrievalService } = require('./backend/retrieval/retrieval.service');

async function testRetrieval() {
  console.log('🧪 Testing retrieval service directly...');
  
  try {
    const retrievalService = getRetrievalService();
    
    console.log('✅ Retrieval service created');
    
    const results = await retrievalService.retrieve({
      query: 'tree-like way of adding numbers',
      courseId: 'test-course-123',
      userId: 'test-user'
    });
    console.log('📊 Search results:', JSON.stringify(results, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testRetrieval();
