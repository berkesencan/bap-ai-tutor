#!/usr/bin/env node

/**
 * Debug script to test retrieval service step by step
 */

const { getRetrievalService } = require('./backend/retrieval/retrieval.service');

async function testRetrieval() {
  console.log('🧪 Testing Retrieval Service Debug\n');
  
  try {
    const retrieval = getRetrievalService();
    console.log('✅ Retrieval service initialized');
    
    if (!retrieval.typesense) {
      console.log('❌ Typesense client not available');
      return;
    }
    console.log('✅ Typesense client available');
    
    // Test direct Typesense search
    console.log('\n🔍 Testing direct Typesense search...');
    const directResults = await retrieval.typesense.collections('rag_chunks')
      .documents()
      .search({
        q: 'vars',
        query_by: 'title,heading,content',
        filter_by: 'course_id:=730bf66b-9eee-4a70-9543-1f05021d3798',
        per_page: 5
      });
    
    console.log(`Direct search found ${directResults.found} results`);
    if (directResults.hits && directResults.hits.length > 0) {
      console.log('First result:', directResults.hits[0].document.title);
    }
    
    // Test searchTypesense method
    console.log('\n🔍 Testing searchTypesense method...');
    const searchResults = await retrieval.searchTypesense('730bf66b-9eee-4a70-9543-1f05021d3798', 'vars', 5);
    console.log(`searchTypesense found ${searchResults.length} results`);
    if (searchResults.length > 0) {
      console.log('First result:', searchResults[0].title);
    }
    
    // Test full retrieve method
    console.log('\n🔍 Testing full retrieve method...');
    const retrieveResults = await retrieval.retrieve({
      courseId: '730bf66b-9eee-4a70-9543-1f05021d3798',
      query: 'vars',
      limit: 5
    });
    
    console.log(`Retrieve found ${retrieveResults.chunks.length} chunks`);
    console.log('Stats:', retrieveResults.stats);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

testRetrieval();
