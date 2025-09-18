#!/usr/bin/env node

/**
 * Test script to ingest hw1.pdf directly
 */

const fs = require('fs');
const path = require('path');
const { getIngestionService } = require('./ingestion/ingestion.service');

async function testHw1Ingestion() {
  console.log('🧪 Testing HW1 PDF Ingestion\n');
  
  try {
    // Read the hw1.pdf file
    const pdfPath = path.join(__dirname, '..', 'hw1.pdf');
    console.log('📄 Reading PDF from:', pdfPath);
    
    if (!fs.existsSync(pdfPath)) {
      console.log('❌ hw1.pdf not found at:', pdfPath);
      return;
    }
    
    const pdfBuffer = fs.readFileSync(pdfPath);
    console.log(`✅ PDF loaded: ${pdfBuffer.length} bytes`);
    
    // Get ingestion service
    const ingestion = getIngestionService();
    console.log('✅ Ingestion service initialized');
    
    // Ingest the PDF
    const courseId = '730bf66b-9eee-4a70-9543-1f05021d3798';
    const result = await ingestion.ingestDocument({
      courseId,
      materialId: 'hw1-test',
      buffer: pdfBuffer,
      fileName: 'hw1.pdf',
      fileType: 'pdf',
      kind: 'homework-pdf',
      sourcePlatform: 'local'
    });
    
    console.log('\n📊 Ingestion Result:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.status === 'success') {
      console.log(`\n🎉 Successfully ingested ${result.chunkCount} chunks!`);
    } else {
      console.log(`\n❌ Ingestion failed: ${result.error}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

testHw1Ingestion();
