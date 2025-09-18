#!/usr/bin/env node

/**
 * Quick Acceptance Tests for RAG Fixes
 * 
 * Tests the specific scenarios mentioned in the polish checklist
 */

const { getRetrievalService } = require('./retrieval/retrieval.service');
const aiService = require('./services/ai.service');
const flags = require('./config/flags');

async function testSpecificQueries() {
  console.log('=== ACCEPTANCE TESTS ===');
  console.log('Testing specific query scenarios...\n');
  
  const courseId = '61596e0c-1672-42b2-b1c5-5d6417fd0e6a'; // Use a real course ID
  const userId = 'dev-cli';
  
  const testCases = [
    {
      name: 'Exact Problem Text Query',
      query: 'What is the exact problem text in Homework #7 Q2?',
      expected: ['quoted text', '[', 'p.', 'Homework #7 Q2']
    },
    {
      name: 'Constraints Query',
      query: 'In Homework #5 Q1, what are the constraints?',
      expected: ['constraints', 'quoted', '[', 'p.']
    },
    {
      name: 'Table Reference Query',
      query: 'Show where the table of runtimes is mentioned.',
      expected: ['table', 'runtimes', 'quoted', '[', 'p.'] // or 'no context found'
    },
    {
      name: 'Cross-Course Isolation',
      query: 'What is the derivative of x^2?',
      courseId: 'different-course-id', // Test isolation
      expected: ['no context', 'refresh', 're-ingest'] // Should be isolated
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n--- Testing: ${testCase.name} ---`);
    console.log(`Query: "${testCase.query}"`);
    
    try {
      // Test retrieval first
      const retrieval = getRetrievalService();
      const retrievalResult = await retrieval.retrieveChunks(
        testCase.courseId || courseId, 
        testCase.query, 
        5
      );
      
      console.log(`Retrieval: ${retrievalResult.chunks?.length || 0} chunks found`);
      if (retrievalResult.chunks?.length > 0) {
        console.log(`Top chunk preview: ${(retrievalResult.chunks[0].content || '').slice(0, 100)}...`);
      }
      
      // Test chat
      const chatResult = await aiService.answerQuestion({
        userId,
        question: testCase.query,
        courseId: testCase.courseId || courseId,
        sessionId: 'test-session'
      });
      
      console.log(`Chat answer length: ${chatResult.answer?.length || 0}`);
      console.log(`Chat answer preview: ${(chatResult.answer || '').slice(0, 200)}...`);
      console.log(`Sources count: ${chatResult.sources?.length || 0}`);
      
      // Check for expected patterns
      const answer = chatResult.answer || '';
      const foundPatterns = testCase.expected.filter(pattern => 
        answer.toLowerCase().includes(pattern.toLowerCase())
      );
      
      console.log(`Found ${foundPatterns.length}/${testCase.expected.length} expected patterns:`, foundPatterns);
      
      if (foundPatterns.length >= testCase.expected.length * 0.5) {
        console.log('✅ PASS');
      } else {
        console.log('❌ FAIL - Missing expected patterns');
      }
      
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
    }
  }
}

async function testEmbeddingDimension() {
  console.log('\n=== EMBEDDING DIMENSION TEST ===');
  
  try {
    const retrieval = getRetrievalService();
    const testQuery = 'dim-probe';
    
    console.log('Testing embedding generation...');
    const embedding = await retrieval.generateQueryEmbedding(testQuery);
    
    if (embedding && Array.isArray(embedding)) {
      console.log(`✅ Embedding generated: ${embedding.length} dimensions`);
      console.log(`Expected: ${flags.EMBEDDINGS_DIM}, Actual: ${embedding.length}`);
      
      if (flags.ACTUAL_EMBEDDINGS_DIM) {
        console.log(`Auto-detected dimension: ${flags.ACTUAL_EMBEDDINGS_DIM}`);
      }
    } else {
      console.log('❌ No embedding generated');
    }
    
  } catch (error) {
    console.log(`❌ Embedding test failed: ${error.message}`);
  }
}

async function testTypesenseHybrid() {
  console.log('\n=== TYPESENSE HYBRID TEST ===');
  
  try {
    const retrieval = getRetrievalService();
    const courseId = '61596e0c-1672-42b2-b1c5-5d6417fd0e6a';
    const query = 'test hybrid search';
    
    console.log('Testing hybrid search parameters...');
    const result = await retrieval.retrieveChunks(courseId, query, 3);
    
    console.log(`Retrieval result: ${result.chunks?.length || 0} chunks`);
    console.log(`Low confidence: ${result.low_confidence}`);
    console.log(`Stats:`, result.stats);
    
    if (result.chunks && result.chunks.length > 0) {
      console.log('✅ Hybrid search working');
    } else {
      console.log('⚠️ No chunks found (may be expected if no data)');
    }
    
  } catch (error) {
    console.log(`❌ Hybrid search test failed: ${error.message}`);
  }
}

async function testChunkingQuality() {
  console.log('\n=== CHUNKING QUALITY TEST ===');
  
  try {
    const { getIngestionService } = require('./ingestion/ingestion.service');
    const ingestion = getIngestionService();
    await ingestion.initialize();
    
    // Create a test PDF with math and table content
    const pdfContent = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<</ProcSet[/PDF/Text]/Font<</F1 5 0 R>>>>/Contents 4 0 R>>endobj
4 0 obj<</Length 200>>stream
BT
/F1 12 Tf
72 720 Td
(Homework #7 Q2: Calculate the derivative) Tj
0 -20 Td
(Problem: Find dy/dx for y = x^2 + 3x + 1) Tj
0 -20 Td
(Solution: dy/dx = 2x + 3) Tj
0 -20 Td
(Table of values:) Tj
0 -20 Td
(x | y | dy/dx) Tj
0 -20 Td
(0 | 1 | 3) Tj
0 -20 Td
(1 | 5 | 5) Tj
ET
endstream
endobj
5 0 obj<</Type/Font/Subtype/Type1/Name/F1/BaseFont/Helvetica/Encoding/MacRomanEncoding>>endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000059 00000 n
0000000111 00000 n
0000000252 00000 n
0000000346 00000 n
trailer<</Size 6/Root 1 0 R>>startxref
457
%%EOF`;
    
    const pdfBuffer = Buffer.from(pdfContent);
    
    const result = await ingestion.ingestDocument({
      courseId: 'test-chunking-quality',
      materialId: 'test-chunking-assignment',
      fileName: 'test-chunking.pdf',
      fileType: 'pdf',
      contentHash: 'test-chunking-hash',
      force: true,
      buffer: pdfBuffer,
      source: 'test'
    });
    
    console.log(`Ingestion result: ${result.status}`);
    console.log(`Chunks created: ${result.chunkCount}`);
    console.log(`Has PDF: ${result.hasPdf}`);
    
    if (result.status === 'success' && result.chunkCount > 0) {
      console.log('✅ Chunking working');
    } else {
      console.log('❌ Chunking failed');
    }
    
  } catch (error) {
    console.log(`❌ Chunking test failed: ${error.message}`);
  }
}

async function main() {
  console.log('=== RAG FIXES ACCEPTANCE TESTS ===');
  console.log('Configuration:', {
    USE_EMBEDDINGS: flags.USE_EMBEDDINGS,
    EMBEDDINGS_DIM: flags.EMBEDDINGS_DIM,
    OCR_PROVIDER: flags.OCR_PROVIDER,
    OCR_STRATEGY: flags.OCR_STRATEGY,
    MAX_CONTEXT_CHARS: flags.MAX_CONTEXT_CHARS
  });
  
  try {
    await testEmbeddingDimension();
    await testTypesenseHybrid();
    await testChunkingQuality();
    await testSpecificQueries();
    
    console.log('\n=== ACCEPTANCE TEST SUMMARY ===');
    console.log('All tests completed. Check individual results above.');
    
  } catch (error) {
    console.error('Test suite failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testSpecificQueries, testEmbeddingDimension, testTypesenseHybrid, testChunkingQuality };
