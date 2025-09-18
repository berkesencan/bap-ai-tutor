const { getIngestionService } = require('./ingestion/ingestion.service');
const { v4: uuidv4 } = require('uuid');

async function testRAGSystem() {
  console.log('Testing RAG system...');
  
  const ingestionService = getIngestionService();
  
  // Create test chunks for Calculus II course
  const testChunks = [
    {
      id: uuidv4(),
      course_id: 'aa8a2355-a59e-46e8-ae99-99a82358ddb9',
      file_id: 'test-pdf-1',
      title: 'Problem Set 1',
      content: 'Problem 1: Find the derivative of f(x) = x^2 + 3x + 1. Answer: f\'(x) = 2x + 3. Problem 2: Evaluate the integral of 2x dx from 0 to 5. Answer: 25.',
      heading: 'Calculus Problems',
      heading_path: ['Calculus Problems'],
      page: 1,
      chunk_index: 0,
      kind: 'gradescope-pdf',
      source_platform: 'gradescope',
      created_at: new Date()
    },
    {
      id: uuidv4(),
      course_id: 'aa8a2355-a59e-46e8-ae99-99a82358ddb9',
      file_id: 'test-pdf-2',
      title: 'Problem Set 2',
      content: 'Problem 1: Find the limit as x approaches 0 of sin(x)/x. Answer: 1. Problem 2: Find the derivative of ln(x). Answer: 1/x.',
      heading: 'Calculus Problems',
      heading_path: ['Calculus Problems'],
      page: 1,
      chunk_index: 0,
      kind: 'gradescope-pdf',
      source_platform: 'gradescope',
      created_at: new Date()
    }
  ];
  
  try {
    // Store chunks
    await ingestionService.storeChunks(testChunks);
    console.log('✅ Test chunks stored successfully');
    
    // Test retrieval
    const { getRetrievalService } = require('./retrieval/retrieval.service');
    const retrievalService = getRetrievalService();
    
    const result = await retrievalService.retrieve({
      courseId: 'aa8a2355-a59e-46e8-ae99-99a82358ddb9',
      query: 'derivative of x squared',
      limit: 5
    });
    
    console.log('✅ Retrieval test result:', {
      chunks: result.chunks.length,
      low_confidence: result.low_confidence,
      stats: result.stats
    });
    
    if (result.chunks.length > 0) {
      console.log('✅ First chunk preview:', (result.chunks[0].content || result.chunks[0].text || '').substring(0, 100) + '...');
    }
    
  } catch (error) {
    console.error('❌ Error testing RAG system:', error);
  }
}

testRAGSystem();
