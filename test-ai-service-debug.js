const { getRetrievalService } = require('./backend/retrieval/retrieval.service');
const aiService = require('./backend/services/ai.service');

async function testAIService() {
  console.log('🧪 Testing AI service with RAG...');
  
  try {
    // Test retrieval first
    const retrievalService = getRetrievalService();
    const retrievalResult = await retrievalService.retrieve({
      courseId: 'test-course-123',
      query: 'tree-like way of adding numbers',
      userId: 'test-user'
    });
    
    console.log('📊 Retrieval result:', {
      chunks: retrievalResult.chunks.length,
      low_confidence: retrievalResult.low_confidence,
      stats: retrievalResult.stats
    });
    
    if (retrievalResult.chunks.length > 0) {
      console.log('📄 First chunk:', JSON.stringify(retrievalResult.chunks[0], null, 2));
    }
    
    // Test AI service
    const response = await aiService.answerQuestion({
      userId: 'test-user',
      question: 'What is the tree-like way of adding numbers from different cores?',
      courseId: 'test-course-123'
    });
    
    console.log('🤖 AI response:', JSON.stringify(response, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testAIService();
