#!/usr/bin/env node

/**
 * RAG Happy Path Test Script
 * 
 * Tests the complete RAG pipeline in development mode:
 * 1. Ingests a test PDF
 * 2. Verifies Typesense and Postgres storage
 * 3. Runs retrieval for "Question 6 Cut Lemma"
 * 4. Prints results with page numbers
 */

const axios = require('axios');

const BACKEND_URL = 'http://localhost:8000';
const TYPESENSE_URL = 'http://localhost:8108';
const TYPESENSE_API_KEY = 'xyz';

// Test document path
const TEST_PDF = '/Users/peterperry/Desktop/midterm-sp24.pdf';
const COURSE_ID = 'cs-parallel-sp24';
const MATERIAL_ID = 'midterm-sp24-test';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testHealthCheck() {
  console.log('🏥 Testing RAG health check...');
  try {
    const response = await axios.get(`${BACKEND_URL}/api/rag/health`);
    const health = response.data.data;
    
    console.log(`   Overall Status: ${health.overall_status}`);
    console.log(`   RAG Enabled: ${health.rag_enabled}`);
    console.log(`   Dev Mode: ${health.dev_mode}`);
    console.log(`   Postgres: ${health.services.ingestion?.services?.postgres ? '✅' : '❌'}`);
    console.log(`   Typesense: ${health.services.ingestion?.services?.typesense ? '✅' : '❌'}`);
    console.log(`   Unstructured: ${health.services.ingestion?.services?.unstructured ? '✅' : '❌'}`);
    
    if (health.overall_status !== 'healthy') {
      throw new Error('Services are not healthy');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function testIngestion() {
  console.log('📥 Testing document ingestion...');
  try {
    const response = await axios.post(`${BACKEND_URL}/api/rag/ingest`, {
      courseId: COURSE_ID,
      materialId: MATERIAL_ID,
      localFilePath: TEST_PDF,
      fileName: 'midterm-sp24.pdf',
      fileType: 'pdf',
      contentHash: `test-${Date.now()}`,
      force: true // Force re-ingestion for testing
    });
    
    const result = response.data.data;
    console.log(`   Status: ${result.status}`);
    console.log(`   Chunk Count: ${result.chunkCount}`);
    console.log(`   Parser: ${result.parser}`);
    
    if (result.status !== 'indexed' || result.chunkCount === 0) {
      throw new Error(`Ingestion failed: ${JSON.stringify(result)}`);
    }
    
    return result.chunkCount;
  } catch (error) {
    console.error('❌ Ingestion failed:', error.response?.data || error.message);
    return 0;
  }
}

async function checkTypesenseCount() {
  console.log('🔍 Checking Typesense document count...');
  try {
    const response = await axios.get(`${TYPESENSE_URL}/collections/rag_chunks`, {
      headers: { 'X-TYPESENSE-API-KEY': TYPESENSE_API_KEY }
    });
    
    const count = response.data.num_documents;
    console.log(`   Typesense documents: ${count}`);
    return count;
  } catch (error) {
    console.error('❌ Typesense check failed:', error.message);
    return 0;
  }
}

async function checkPostgresCount() {
  console.log('🗄️ Checking Postgres chunk count...');
  try {
    // Use docker compose exec to query postgres
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    const { stdout } = await execAsync(
      `cd .. && docker compose exec -T postgres psql -U postgres -d rag_db -t -c "SELECT COUNT(*) FROM rag_chunks WHERE course_id='${COURSE_ID}';"`
    );
    
    const count = parseInt(stdout.trim());
    console.log(`   Postgres chunks: ${count}`);
    return count;
  } catch (error) {
    console.error('❌ Postgres check failed:', error.message);
    return 0;
  }
}

async function testRetrieval() {
  console.log('🔎 Testing retrieval for "Question 6 Cut Lemma"...');
  try {
    const response = await axios.post(`${BACKEND_URL}/api/rag/retrieve`, {
      courseId: COURSE_ID,
      query: 'Question 6 Cut Lemma',
      limit: 5
    });
    
    const result = response.data.data;
    console.log(`   Found chunks: ${result.chunks.length}`);
    console.log(`   Low confidence: ${result.low_confidence}`);
    console.log(`   Query time: ${result.stats.query_time_ms}ms`);
    
    if (result.chunks.length > 0) {
      console.log('\n   📄 Top sources:');
      result.chunks.forEach((chunk, index) => {
        const preview = chunk.text.substring(0, 100).replace(/\n/g, ' ') + '...';
        console.log(`   ${index + 1}. [${chunk.fileId}, p.${chunk.page || 'N/A'}] ${preview}`);
        console.log(`      Score: ${chunk.score}`);
      });
    }
    
    return result.chunks.length;
  } catch (error) {
    console.error('❌ Retrieval failed:', error.response?.data || error.message);
    return 0;
  }
}

async function main() {
  console.log('🚀 Starting RAG Happy Path Test\n');
  
  // Test health
  const healthOk = await testHealthCheck();
  if (!healthOk) {
    console.log('\n❌ Health check failed. Ensure services are running with: docker-compose up -d');
    process.exit(1);
  }
  
  console.log('');
  
  // Test ingestion
  const chunkCount = await testIngestion();
  if (chunkCount === 0) {
    console.log('\n❌ Ingestion failed. Check the PDF path and backend logs.');
    process.exit(1);
  }
  
  // Wait a moment for indexing
  console.log('⏳ Waiting for indexing to complete...');
  await sleep(2000);
  
  console.log('');
  
  // Check storage counts
  const typesenseCount = await checkTypesenseCount();
  const postgresCount = await checkPostgresCount();
  
  console.log('');
  
  // Test retrieval
  const retrievalCount = await testRetrieval();
  
  console.log('\n🎉 RAG Happy Path Test Complete!');
  console.log(`   Ingested: ${chunkCount} chunks`);
  console.log(`   Typesense: ${typesenseCount} documents`);
  console.log(`   Postgres: ${postgresCount} chunks`);
  console.log(`   Retrieved: ${retrievalCount} results`);
  
  if (chunkCount > 0 && retrievalCount > 0) {
    console.log('\n✅ All tests passed! RAG pipeline is working correctly.');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed. Check the logs above.');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Test script crashed:', error);
    process.exit(1);
  });
}
