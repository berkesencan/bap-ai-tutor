#!/usr/bin/env node

/**
 * Simple test to debug retrieval service initialization
 */

const flags = require('./config/flags');
const Typesense = require('typesense');

console.log('🔍 Testing Retrieval Service Initialization\n');

console.log('Flags:');
console.log('- RAG_ENABLED:', flags.RAG_ENABLED);
console.log('- TYPESENSE_HOST:', flags.TYPESENSE_HOST);
console.log('- TYPESENSE_PORT:', flags.TYPESENSE_PORT);
console.log('- TYPESENSE_PROTOCOL:', flags.TYPESENSE_PROTOCOL);
console.log('- TYPESENSE_API_KEY:', flags.TYPESENSE_API_KEY ? 'SET' : 'NOT SET');

if (flags.RAG_ENABLED) {
  console.log('\n✅ RAG is enabled, creating Typesense client...');
  
  const typesense = new Typesense.Client({
    nodes: [{
      host: flags.TYPESENSE_HOST,
      port: parseInt(flags.TYPESENSE_PORT),
      protocol: flags.TYPESENSE_PROTOCOL
    }],
    apiKey: flags.TYPESENSE_API_KEY,
    connectionTimeoutSeconds: 10
  });
  
  console.log('✅ Typesense client created');
  
  // Test connection
  typesense.collections('rag_chunks').documents().search({
    q: 'vars',
    query_by: 'content',
    per_page: 1
  }).then(results => {
    console.log('✅ Typesense search successful:', results.found, 'results');
    if (results.hits && results.hits.length > 0) {
      console.log('Sample result:', results.hits[0].document.title);
    }
  }).catch(error => {
    console.error('❌ Typesense search failed:', error.message);
  });
  
} else {
  console.log('❌ RAG is disabled');
}
