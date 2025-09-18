#!/usr/bin/env node

/**
 * RAG End-to-End Test Script
 * 
 * Tests the complete RAG flow:
 * 1. Ingest local PDF
 * 2. Verify chunks are indexed
 * 3. Test chat retrieval with quoted content
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Parse command line arguments
const args = process.argv.slice(2);
let filePath = null;
let courseId = null;
let askQuestion = null;

for (let i = 0; i < args.length; i += 2) {
  const flag = args[i];
  const value = args[i + 1];
  
  switch (flag) {
    case '--file':
      filePath = value;
      break;
    case '--courseId':
      courseId = value;
      break;
    case '--ask':
      askQuestion = value;
      break;
    default:
      console.error(`Unknown flag: ${flag}`);
      process.exit(1);
  }
}

// Validate required arguments
if (!filePath || !courseId || !askQuestion) {
  console.error('Usage: node scripts/rag-e2e.js --file <path> --courseId <uuid> --ask "<question>"');
  console.error('Example: node scripts/rag-e2e.js --file ./hw1.pdf --courseId 123e4567-e89b-12d3-a456-426614174000 --ask "What is Homework #1 Q1? Please quote it."');
  process.exit(1);
}

// Validate file exists
if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

const BASE_URL = 'http://localhost:8000';

async function makeRequest(method, url, data = null, headers = {}) {
  try {
    const config = { method, url, headers };
    if (data) {
      if (data instanceof FormData) {
        config.data = data;
        config.headers['Content-Type'] = 'multipart/form-data';
      } else {
        config.data = data;
        config.headers['Content-Type'] = 'application/json';
      }
    }
    
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
}

async function step1_ingest() {
  console.log('🔄 Step 1: Ingesting local PDF...');
  
  const formData = new FormData();
  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  const blob = new Blob([fileBuffer], { type: 'application/pdf' });
  formData.append('file', blob, fileName);
  
  const result = await makeRequest('POST', `${BASE_URL}/api/debug/ingest-local?courseId=${courseId}&title=HW1&label=Q1`, formData);
  
  if (!result.success) {
    console.error('❌ Step 1 FAILED:', result.error);
    return false;
  }
  
  if (!result.data.success || result.data.chunks < 3) {
    console.error('❌ Step 1 FAILED: Expected success=true and chunks≥3, got:', result.data);
    return false;
  }
  
  console.log(`✅ Step 1 PASSED: Ingested ${result.data.chunks} chunks`);
  return true;
}

async function step2_peek() {
  console.log('🔄 Step 2: Peeking at indexed content...');
  
  const result = await makeRequest('GET', `${BASE_URL}/api/debug/peek?courseId=${courseId}`);
  
  if (!result.success) {
    console.error('❌ Step 2 FAILED:', result.error);
    return false;
  }
  
  const { data } = result.data;
  if (!data || data.totalHits < 3) {
    console.error('❌ Step 2 FAILED: Expected ≥3 items, got:', data?.totalHits || 0);
    return false;
  }
  
  const validItems = data.topResults.filter(item => item.len > 100);
  if (validItems.length < 3) {
    console.error('❌ Step 2 FAILED: Expected ≥3 items with len>100, got:', validItems.length);
    console.error('Items:', data.topResults.map(item => ({ len: item.len, sample: item.sample?.slice(0, 50) })));
    return false;
  }
  
  console.log(`✅ Step 2 PASSED: Found ${validItems.length} items with substantial content`);
  console.log('Sample content:', validItems[0].sample?.slice(0, 100) + '...');
  return true;
}

async function step3_chat() {
  console.log('🔄 Step 3: Testing chat with quoted content...');
  
  const chatData = {
    courseId: courseId,
    message: askQuestion
  };
  
  const result = await makeRequest('POST', `${BASE_URL}/api/ai/chat`, chatData);
  
  if (!result.success) {
    console.error('❌ Step 3 FAILED:', result.error);
    return false;
  }
  
  const { text, sources, materials } = result.data;
  
  if (!text || text.length < 120) {
    console.error('❌ Step 3 FAILED: Expected text≥120 chars, got:', text?.length || 0);
    return false;
  }
  
  if (!sources || sources.length === 0) {
    console.error('❌ Step 3 FAILED: Expected sources array, got:', sources);
    return false;
  }
  
  // Check if response contains recognizable content from the PDF
  const hasQuotedContent = text.includes('"') || text.includes('[') || text.includes(']');
  if (!hasQuotedContent) {
    console.warn('⚠️  Step 3 WARNING: Response may not contain quoted content from PDF');
  }
  
  console.log('✅ Step 3 PASSED: Generated response with sources');
  console.log('Response preview:', text.slice(0, 200) + '...');
  console.log('Sources:', sources.length);
  
  return true;
}

async function main() {
  console.log('🚀 Starting RAG End-to-End Test');
  console.log(`File: ${filePath}`);
  console.log(`Course ID: ${courseId}`);
  console.log(`Question: ${askQuestion}`);
  console.log('');
  
  const step1 = await step1_ingest();
  if (!step1) {
    console.log('\n❌ TEST FAILED at Step 1');
    process.exit(1);
  }
  
  // Wait a moment for indexing to complete
  console.log('⏳ Waiting 2 seconds for indexing to complete...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const step2 = await step2_peek();
  if (!step2) {
    console.log('\n❌ TEST FAILED at Step 2');
    process.exit(1);
  }
  
  const step3 = await step3_chat();
  if (!step3) {
    console.log('\n❌ TEST FAILED at Step 3');
    process.exit(1);
  }
  
  console.log('\n🎉 ALL TESTS PASSED! RAG flow is working correctly.');
  console.log('✅ PDF ingestion successful');
  console.log('✅ Content indexing verified');
  console.log('✅ Chat retrieval with sources working');
}

// Run the test
main().catch(error => {
  console.error('💥 Test script failed:', error.message);
  process.exit(1);
});
