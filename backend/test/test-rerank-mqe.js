#!/usr/bin/env node

/**
 * Integration Tests for Reranker + Multi-Query Expansion
 * 
 * Tests MQE and reranker functionality with realistic scenarios
 */

const { getRetrievalService } = require('../retrieval/retrieval.service');
const { expandQueries, ruleBasedVariants } = require('../retrieval/mqe');
const { rerank } = require('../retrieval/rerankers');
const flags = require('../config/flags');

async function testMQE() {
  console.log('\n=== MQE TESTS ===');
  
  const testQueries = [
    'What is the exact problem text in Homework #7 Q2?',
    'HW5 Problem 3 constraints',
    'Find the derivative of x^2',
    'Question 4 solution steps',
    'Exercise 2 optimization'
  ];
  
  for (const query of testQueries) {
    console.log(`\n--- Testing MQE for: "${query}" ---`);
    
    try {
      // Test rule-based variants
      const ruleVariants = ruleBasedVariants(query);
      console.log(`Rule-based variants (${ruleVariants.length}):`, ruleVariants);
      
      // Test full expansion
      const expanded = await expandQueries(query);
      console.log(`Full expansion (${expanded.length}):`, expanded);
      
      // Verify original query is included
      if (expanded.includes(query)) {
        console.log('✅ Original query preserved');
      } else {
        console.log('❌ Original query missing');
      }
      
      // Check for expected patterns
      const hasVariants = expanded.length > 1;
      console.log(hasVariants ? '✅ Variants generated' : '⚠️ No variants generated');
      
    } catch (error) {
      console.log(`❌ MQE test failed: ${error.message}`);
    }
  }
}

async function testReranker() {
  console.log('\n=== RERANKER TESTS ===');
  
  // Mock documents for testing
  const mockDocs = [
    {
      id: 'doc1',
      text: 'This is about Homework #7 Q2 problem text and solution steps.',
      meta: { title: 'Homework #7', page: 1, kind: 'gradescope-pdf' }
    },
    {
      id: 'doc2', 
      text: 'Introduction to calculus and mathematical concepts.',
      meta: { title: 'Course Introduction', page: 1, kind: 'gradescope-pdf' }
    },
    {
      id: 'doc3',
      text: 'Problem 2: Find the derivative of x^2 + 3x + 1. Solution: dy/dx = 2x + 3.',
      meta: { title: 'Homework #7', page: 2, kind: 'gradescope-pdf' }
    },
    {
      id: 'doc4',
      text: 'Assignment guidelines and submission instructions.',
      meta: { title: 'Assignment Guidelines', page: 1, kind: 'gradescope-pdf' }
    },
    {
      id: 'doc5',
      text: 'Q2: Calculate the integral of 2x from 0 to 5. Answer: 25.',
      meta: { title: 'Homework #7', page: 3, kind: 'gradescope-pdf' }
    }
  ];
  
  const query = 'What is the exact problem text in Homework #7 Q2?';
  
  console.log(`Testing reranker with query: "${query}"`);
  console.log(`Mock documents: ${mockDocs.length}`);
  
  try {
    // Test Cohere reranker (if API key available)
    if (flags.COHERE_API_KEY) {
      console.log('\n--- Testing Cohere Reranker ---');
      try {
        const cohereResults = await rerank({
          provider: 'cohere',
          query,
          docs: mockDocs,
          topN: 3
        });
        
        console.log(`Cohere results: ${cohereResults.length} docs`);
        cohereResults.forEach((doc, i) => {
          console.log(`  ${i+1}. ${doc.meta.title} (score: ${doc.rerankScore?.toFixed(3)})`);
          console.log(`     ${doc.text.slice(0, 80)}...`);
        });
        
        // Check if most relevant docs are ranked higher
        const topDoc = cohereResults[0];
        if (topDoc && (topDoc.text.includes('Q2') || topDoc.text.includes('Problem 2'))) {
          console.log('✅ Cohere ranking looks correct');
        } else {
          console.log('⚠️ Cohere ranking may not be optimal');
        }
        
      } catch (error) {
        console.log(`❌ Cohere reranker failed: ${error.message}`);
      }
    } else {
      console.log('⚠️ Cohere API key not found, skipping Cohere test');
    }
    
    // Test BGE reranker
    console.log('\n--- Testing BGE Reranker ---');
    try {
      const bgeResults = await rerank({
        provider: 'bge',
        query,
        docs: mockDocs,
        topN: 3
      });
      
      console.log(`BGE results: ${bgeResults.length} docs`);
      bgeResults.forEach((doc, i) => {
        console.log(`  ${i+1}. ${doc.meta.title} (score: ${doc.rerankScore?.toFixed(3)})`);
        console.log(`     ${doc.text.slice(0, 80)}...`);
      });
      
      // Check if most relevant docs are ranked higher
      const topDoc = bgeResults[0];
      if (topDoc && (topDoc.text.includes('Q2') || topDoc.text.includes('Problem 2'))) {
        console.log('✅ BGE ranking looks correct');
      } else {
        console.log('⚠️ BGE ranking may not be optimal');
      }
      
    } catch (error) {
      console.log(`❌ BGE reranker failed: ${error.message}`);
    }
    
  } catch (error) {
    console.log(`❌ Reranker test failed: ${error.message}`);
  }
}

async function testEndToEndRetrieval() {
  console.log('\n=== END-TO-END RETRIEVAL TESTS ===');
  
  const courseId = '61596e0c-1672-42b2-b1c5-5d6417fd0e6a'; // Use a real course ID
  
  const testCases = [
    {
      name: 'MQE Disabled',
      query: 'HW7 Q2 problem text',
      enableMQE: false,
      enableReranker: false
    },
    {
      name: 'MQE Enabled',
      query: 'HW7 Q2 problem text', 
      enableMQE: true,
      enableReranker: false
    },
    {
      name: 'MQE + Reranker Enabled',
      query: 'HW7 Q2 problem text',
      enableMQE: true,
      enableReranker: true
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n--- ${testCase.name} ---`);
    
    try {
      // Temporarily override flags for this test
      const originalMQE = flags.ENABLE_MQE;
      const originalReranker = flags.ENABLE_RERANKER;
      
      flags.ENABLE_MQE = testCase.enableMQE;
      flags.ENABLE_RERANKER = testCase.enableReranker;
      
      const retrieval = getRetrievalService();
      const startTime = Date.now();
      
      const result = await retrieval.retrieveChunks(courseId, testCase.query, 5);
      
      const duration = Date.now() - startTime;
      
      console.log(`Query: "${testCase.query}"`);
      console.log(`Results: ${result.chunks?.length || 0} chunks in ${duration}ms`);
      console.log(`MQE: ${testCase.enableMQE}, Reranker: ${testCase.enableReranker}`);
      
      if (result.chunks && result.chunks.length > 0) {
        console.log('Top 3 chunks:');
        result.chunks.slice(0, 3).forEach((chunk, i) => {
          console.log(`  ${i+1}. ${chunk.title} (p.${chunk.page})`);
          console.log(`     ${(chunk.content || '').slice(0, 100)}...`);
          if (chunk.rerankScore) {
            console.log(`     Rerank score: ${chunk.rerankScore.toFixed(3)}`);
          }
        });
        console.log('✅ Retrieval successful');
      } else {
        console.log('⚠️ No chunks found (may be expected if no data)');
      }
      
      // Restore original flags
      flags.ENABLE_MQE = originalMQE;
      flags.ENABLE_RERANKER = originalReranker;
      
    } catch (error) {
      console.log(`❌ End-to-end test failed: ${error.message}`);
    }
  }
}

async function testPerformance() {
  console.log('\n=== PERFORMANCE TESTS ===');
  
  const courseId = '61596e0c-1672-42b2-b1c5-5d6417fd0e6a';
  const query = 'What is the exact problem text in Homework #7 Q2?';
  
  const scenarios = [
    { name: 'Baseline (no MQE, no reranker)', mqe: false, reranker: false },
    { name: 'MQE only', mqe: true, reranker: false },
    { name: 'Reranker only', mqe: false, reranker: true },
    { name: 'Both enabled', mqe: true, reranker: true }
  ];
  
  for (const scenario of scenarios) {
    console.log(`\n--- ${scenario.name} ---`);
    
    try {
      // Override flags
      const originalMQE = flags.ENABLE_MQE;
      const originalReranker = flags.ENABLE_RERANKER;
      
      flags.ENABLE_MQE = scenario.mqe;
      flags.ENABLE_RERANKER = scenario.reranker;
      
      const retrieval = getRetrievalService();
      const startTime = Date.now();
      
      const result = await retrieval.retrieveChunks(courseId, query, 8);
      
      const duration = Date.now() - startTime;
      
      console.log(`Duration: ${duration}ms`);
      console.log(`Results: ${result.chunks?.length || 0} chunks`);
      
      if (duration > 5000) {
        console.log('⚠️ Slow performance (>5s)');
      } else if (duration > 2000) {
        console.log('⚠️ Moderate performance (>2s)');
      } else {
        console.log('✅ Good performance (<2s)');
      }
      
      // Restore flags
      flags.ENABLE_MQE = originalMQE;
      flags.ENABLE_RERANKER = originalReranker;
      
    } catch (error) {
      console.log(`❌ Performance test failed: ${error.message}`);
    }
  }
}

async function main() {
  console.log('=== RERANKER + MQE INTEGRATION TESTS ===');
  console.log('Configuration:', {
    ENABLE_MQE: flags.ENABLE_MQE,
    MQE_PROVIDER: flags.MQE_PROVIDER,
    MQE_NUM: flags.MQE_NUM,
    ENABLE_RERANKER: flags.ENABLE_RERANKER,
    RERANKER_PROVIDER: flags.RERANKER_PROVIDER,
    RERANKER_TOP_K_INPUT: flags.RERANKER_TOP_K_INPUT,
    RERANKER_TOP_N: flags.RERANKER_TOP_N,
    hasCohereKey: !!flags.COHERE_API_KEY
  });
  
  try {
    await testMQE();
    await testReranker();
    await testEndToEndRetrieval();
    await testPerformance();
    
    console.log('\n=== TEST SUMMARY ===');
    console.log('All tests completed. Check individual results above.');
    console.log('\nTo enable features:');
    console.log('- Set ENABLE_MQE=true in .env for query expansion');
    console.log('- Set ENABLE_RERANKER=true in .env for reranking');
    console.log('- Add COHERE_API_KEY to .env for Cohere reranker');
    
  } catch (error) {
    console.error('Test suite failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testMQE, testReranker, testEndToEndRetrieval, testPerformance };
