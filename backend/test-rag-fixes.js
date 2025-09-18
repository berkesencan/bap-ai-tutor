#!/usr/bin/env node

/**
 * Test Script: Verify RAG fixes work end-to-end
 * 
 * This script tests the complete RAG pipeline with OCR and hybrid search
 */

const { getRetrievalService } = require('./retrieval/retrieval.service');
const { getIngestionService } = require('./ingestion/ingestion.service');
const aiService = require('./services/ai.service');
const flags = require('./config/flags');

async function testRetrieval() {
  console.log('=== TESTING RETRIEVAL ===');
  
  const retrieval = getRetrievalService();
  const query = "What is the exact problem text in Homework #7 Q2?";
  const courseId = '61596e0c-1672-42b2-b1c5-5d6417fd0e6a'; // Use a real course ID
  
  console.log('Query:', query);
  console.log('Course ID:', courseId);
  console.log('Flags:', {
    USE_EMBEDDINGS: flags.USE_EMBEDDINGS,
    EMBEDDINGS_DIM: flags.EMBEDDINGS_DIM,
    OCR_PROVIDER: flags.OCR_PROVIDER,
    OCR_STRATEGY: flags.OCR_STRATEGY
  });
  
  try {
    const result = await retrieval.retrieveChunks(courseId, query, 8);
    
    console.log('\n=== RETRIEVAL RESULT ===');
    console.log('Chunks found:', result.chunks?.length || 0);
    console.log('Low confidence:', result.low_confidence);
    console.log('Stats:', result.stats);
    
    if (result.chunks && result.chunks.length > 0) {
      console.log('\n=== TOP 5 CHUNKS ===');
      result.chunks.slice(0, 5).forEach((chunk, i) => {
        console.log(`Chunk ${i+1}:`);
        console.log(`  Title: ${chunk.title || 'N/A'}`);
        console.log(`  Page: ${chunk.page || 'N/A'}`);
        console.log(`  Kind: ${chunk.kind || 'N/A'}`);
        console.log(`  Text (first 200 chars): ${(chunk.text || chunk.content || '').substring(0, 200)}...`);
        console.log(`  Score: ${chunk.keywordScore || chunk.semanticScore || 'N/A'}`);
        console.log('');
      });
    }
    
    return result;
    
  } catch (error) {
    console.error('Retrieval error:', error.message);
    return null;
  }
}

async function testChat() {
  console.log('\n=== TESTING CHAT ===');
  
  const query = "What is the exact problem text in Homework #7 Q2?";
  const courseId = '61596e0c-1672-42b2-b1c5-5d6417fd0e6a';
  const userId = 'dev-cli';
  
  try {
    const result = await aiService.answerQuestion({
      userId,
      question: query,
      courseId,
      sessionId: 'test-session'
    });
    
    console.log('Chat result:');
    console.log('Answer length:', result.answer?.length || 0);
    console.log('Sources count:', result.sources?.length || 0);
    console.log('Confidence:', result.confidence);
    console.log('Answer preview:', result.answer?.substring(0, 300) + '...');
    
    if (result.sources && result.sources.length > 0) {
      console.log('\nSources:');
      result.sources.forEach((source, i) => {
        console.log(`  ${i+1}. ${source.title} (page ${source.page || 'N/A'})`);
      });
    }
    
    return result;
    
  } catch (error) {
    console.error('Chat error:', error.message);
    return null;
  }
}

async function testIngestion() {
  console.log('\n=== TESTING INGESTION ===');
  
  const ingestion = getIngestionService();
  await ingestion.initialize();
  
  // Create a test PDF buffer (minimal valid PDF)
  const pdfContent = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<</ProcSet[/PDF/Text]/Font<</F1 5 0 R>>>>/Contents 4 0 R>>endobj
4 0 obj<</Length 44>>stream
BT
/F1 24 Tf
100 700 Td
(Homework #7 Q2: Calculate the derivative) Tj
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
  
  try {
    const result = await ingestion.ingestDocument({
      courseId: 'test-course-rag-fix',
      materialId: 'test-assignment-rag-fix',
      fileName: 'test-homework-7-q2.pdf',
      fileType: 'pdf',
      contentHash: 'test-hash-rag-fix',
      force: true,
      buffer: pdfBuffer,
      source: 'test'
    });
    
    console.log('Ingestion result:');
    console.log('Status:', result.status);
    console.log('Chunk count:', result.chunkCount);
    console.log('Has PDF:', result.hasPdf);
    console.log('Bytes processed:', result.bytesProcessed);
    
    return result;
    
  } catch (error) {
    console.error('Ingestion error:', error.message);
    return null;
  }
}

async function main() {
  console.log('=== RAG FIXES VERIFICATION ===');
  console.log('Testing OCR-enabled ingestion, hybrid search, and improved chat responses\n');
  
  try {
    // Test 1: Ingestion with OCR
    const ingestionResult = await testIngestion();
    
    // Test 2: Retrieval with hybrid search
    const retrievalResult = await testRetrieval();
    
    // Test 3: Chat with improved prompting
    const chatResult = await testChat();
    
    // Summary
    console.log('\n=== SUMMARY ===');
    console.log('Ingestion:', ingestionResult?.status === 'success' ? '✅ PASS' : '❌ FAIL');
    console.log('Retrieval:', retrievalResult?.chunks?.length > 0 ? '✅ PASS' : '❌ FAIL');
    console.log('Chat:', chatResult?.answer?.length > 0 ? '✅ PASS' : '❌ FAIL');
    
    if (chatResult?.answer?.includes('[') && chatResult?.answer?.includes(']')) {
      console.log('Citations:', '✅ PASS (found citation format)');
    } else {
      console.log('Citations:', '❌ FAIL (no citation format found)');
    }
    
    if (chatResult?.answer?.includes('exact problem text') || chatResult?.answer?.includes('Homework #7 Q2')) {
      console.log('Content relevance:', '✅ PASS (mentions specific assignment)');
    } else {
      console.log('Content relevance:', '❌ FAIL (does not mention specific assignment)');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testRetrieval, testChat, testIngestion };
