const Typesense = require('typesense');
require('dotenv').config();

async function testTypesenseDocument() {
  const typesense = new Typesense.Client({
    nodes: [{
      host: process.env.TYPESENSE_HOST || 'localhost',
      port: parseInt(process.env.TYPESENSE_PORT || '8108'),
      protocol: process.env.TYPESENSE_PROTOCOL || 'http'
    }],
    apiKey: process.env.TYPESENSE_API_KEY || 'xyz',
    connectionTimeoutSeconds: 10
  });

  try {
    console.log('Testing Typesense document retrieval...');
    
    // Get a specific document
    const document = await typesense.collections('rag_chunks')
      .documents('7c4a02ca-d449-49fc-b7cb-a7220522a242')
      .retrieve();

    console.log('Document structure:', {
      id: document.id,
      course_id: document.course_id,
      file_id: document.file_id,
      title: document.title,
      content: document.content?.substring(0, 50) + '...',
      heading: document.heading,
      heading_path: document.heading_path,
      page: document.page,
      chunk_index: document.chunk_index,
      kind: document.kind,
      source_platform: document.source_platform
    });
    
  } catch (error) {
    console.error('Error testing Typesense document:', error);
  }
}

testTypesenseDocument();
