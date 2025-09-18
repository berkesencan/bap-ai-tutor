#!/usr/bin/env node

/**
 * Quick Test for Reranker + MQE Features
 * 
 * Run this to quickly verify the new features work
 */

const { expandQueries } = require('./retrieval/mqe');
const { rerank } = require('./retrieval/rerankers');
const flags = require('./config/flags');

async function quickTest() {
  console.log('=== QUICK RERANKER + MQE TEST ===\n');
  
  // Test 1: MQE
  console.log('1. Testing Multi-Query Expansion...');
  const query = 'What is the exact problem text in Homework #7 Q2?';
  console.log(`Original query: "${query}"`);
  
  const variants = await expandQueries(query);
  console.log(`Generated ${variants.length} variants:`);
  variants.forEach((v, i) => console.log(`  ${i+1}. "${v}"`));
  console.log();
  
  // Test 2: Reranker (with mock data)
  console.log('2. Testing Reranker...');
  const mockDocs = [
    {
      id: 'doc1',
      text: 'Homework #7 Q2: Find the derivative of x^2 + 3x + 1. The problem asks you to calculate dy/dx.',
      meta: { title: 'Homework #7', page: 2 }
    },
    {
      id: 'doc2',
      text: 'Introduction to calculus concepts and mathematical foundations.',
      meta: { title: 'Course Introduction', page: 1 }
    },
    {
      id: 'doc3',
      text: 'Problem 2 solution: dy/dx = 2x + 3. This is the derivative of the given function.',
      meta: { title: 'Homework #7', page: 3 }
    }
  ];
  
  console.log(`Testing with ${mockDocs.length} mock documents`);
  
  try {
    const reranked = await rerank({
      provider: flags.RERANKER_PROVIDER,
      query,
      docs: mockDocs,
      topN: 2
    });
    
    console.log('Reranked results:');
    reranked.forEach((doc, i) => {
      console.log(`  ${i+1}. ${doc.meta.title} (score: ${doc.rerankScore?.toFixed(3)})`);
      console.log(`     ${doc.text.slice(0, 80)}...`);
    });
    
  } catch (error) {
    console.log(`Reranker test failed: ${error.message}`);
    console.log('This is expected if API keys are not configured');
  }
  
  console.log('\n3. Configuration Status:');
  console.log(`   MQE Enabled: ${flags.ENABLE_MQE}`);
  console.log(`   MQE Provider: ${flags.MQE_PROVIDER}`);
  console.log(`   Reranker Enabled: ${flags.ENABLE_RERANKER}`);
  console.log(`   Reranker Provider: ${flags.RERANKER_PROVIDER}`);
  console.log(`   Has Cohere Key: ${!!flags.COHERE_API_KEY}`);
  
  console.log('\n✅ Quick test completed!');
  console.log('\nTo enable features:');
  console.log('- Set ENABLE_MQE=true in .env');
  console.log('- Set ENABLE_RERANKER=true in .env');
  console.log('- Add COHERE_API_KEY to .env for Cohere reranker');
}

if (require.main === module) {
  quickTest().catch(console.error);
}

module.exports = { quickTest };
