#!/usr/bin/env node

/**
 * Debug flags loading
 */

console.log('🔍 Debugging flags loading...');

// Test 1: Check environment variables directly
console.log('\n1. Environment variables:');
console.log('RAG_ENABLED:', process.env.RAG_ENABLED);
console.log('USE_EMBEDDINGS:', process.env.USE_EMBEDDINGS);
console.log('GOOGLE_API_KEY:', process.env.GOOGLE_API_KEY ? 'SET' : 'NOT SET');

// Test 2: Load dotenv and check again
console.log('\n2. After dotenv.config():');
require('dotenv').config();
console.log('RAG_ENABLED:', process.env.RAG_ENABLED);
console.log('USE_EMBEDDINGS:', process.env.USE_EMBEDDINGS);
console.log('GOOGLE_API_KEY:', process.env.GOOGLE_API_KEY ? 'SET' : 'NOT SET');

// Test 3: Load flags module
console.log('\n3. After loading flags module:');
const flags = require('./backend/config/flags');
console.log('RAG_ENABLED:', flags.RAG_ENABLED);
console.log('USE_EMBEDDINGS:', flags.USE_EMBEDDINGS);
console.log('hasEmbeddings:', flags.hasEmbeddings);

// Test 4: Check if there are multiple .env files
console.log('\n4. Checking for .env files:');
const fs = require('fs');
const path = require('path');

const envFiles = [
  './backend/.env',
  './.env',
  './backend/.env.local',
  './.env.local'
];

envFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ Found: ${file}`);
    const content = fs.readFileSync(file, 'utf8');
    const ragEnabled = content.includes('RAG_ENABLED=true');
    console.log(`   RAG_ENABLED=true: ${ragEnabled}`);
  } else {
    console.log(`❌ Not found: ${file}`);
  }
});
