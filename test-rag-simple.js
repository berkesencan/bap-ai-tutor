#!/usr/bin/env node

/**
 * Simple RAG Test Script
 * Tests basic functionality without requiring full service stack
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing RAG Components...');

// Test 1: Check if hw1.pdf exists
console.log('\n1. Checking hw1.pdf...');
if (fs.existsSync('./hw1.pdf')) {
  const stats = fs.statSync('./hw1.pdf');
  console.log(`✅ hw1.pdf exists (${stats.size} bytes)`);
} else {
  console.log('❌ hw1.pdf not found');
  process.exit(1);
}

// Test 2: Check if backend files exist
console.log('\n2. Checking backend files...');
const backendFiles = [
  'backend/routes/debug.routes.js',
  'backend/retrieval/retrieval.service.js',
  'backend/services/ai.service.js',
  'backend/ingestion/ingestion.service.js',
  'backend/config/flags.js'
];

let allFilesExist = true;
for (const file of backendFiles) {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} missing`);
    allFilesExist = false;
  }
}

if (!allFilesExist) {
  console.log('\n❌ Some backend files are missing');
  process.exit(1);
}

// Test 3: Check if multer is installed
console.log('\n3. Checking dependencies...');
try {
  const packageJson = JSON.parse(fs.readFileSync('backend/package.json', 'utf8'));
  if (packageJson.dependencies.multer) {
    console.log('✅ multer is installed');
  } else {
    console.log('❌ multer is not installed');
  }
} catch (error) {
  console.log('❌ Could not read package.json');
}

// Test 4: Check environment variables
console.log('\n4. Checking environment...');
const envFile = 'backend/.env';
if (fs.existsSync(envFile)) {
  console.log('✅ .env file exists');
  const envContent = fs.readFileSync(envFile, 'utf8');
  const hasRagEnabled = envContent.includes('RAG_ENABLED=true');
  const hasDatabaseUrl = envContent.includes('DATABASE_URL=');
  const hasTypesenseKey = envContent.includes('TYPESENSE_API_KEY=');
  
  console.log(`RAG_ENABLED: ${hasRagEnabled ? '✅' : '❌'}`);
  console.log(`DATABASE_URL: ${hasDatabaseUrl ? '✅' : '❌'}`);
  console.log(`TYPESENSE_API_KEY: ${hasTypesenseKey ? '✅' : '❌'}`);
} else {
  console.log('❌ .env file not found');
}

console.log('\n🎯 Basic checks completed. If all are ✅, the RAG system should work.');
console.log('\nTo test the full flow:');
console.log('1. Start backend: cd backend && npm start');
console.log('2. Test ingestion: curl -X POST "http://localhost:8000/api/debug/ingest-local?courseId=test-123&title=HW1" -F "file=@./hw1.pdf"');
console.log('3. Test peek: curl "http://localhost:8000/api/debug/peek?courseId=test-123"');
console.log('4. Test chat: curl -X POST "http://localhost:8000/api/ai/chat" -H "Content-Type: application/json" -d \'{"courseId":"test-123","message":"What is in this PDF?"}\'');
