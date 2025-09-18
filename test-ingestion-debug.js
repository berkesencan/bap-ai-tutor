#!/usr/bin/env node

/**
 * Debug the ingestion service step by step
 */

const { getIngestionService } = require('./backend/ingestion/ingestion.service');

async function testIngestion() {
  console.log('🧪 Testing ingestion service step by step...');
  
  try {
    const ingestion = getIngestionService();
    console.log('✅ Ingestion service created');
    
    // Test with a simple document
    const fs = require('fs');
    const filePath = './hw1.pdf';
    
    if (!fs.existsSync(filePath)) {
      console.error('❌ hw1.pdf not found');
      return;
    }
    
    console.log('✅ hw1.pdf found');
    
    const fileBuffer = fs.readFileSync(filePath);
    console.log(`✅ File read: ${fileBuffer.length} bytes`);
    
    // Test the ingestion
    console.log('📤 Starting ingestion...');
    const result = await ingestion.ingestDocument({
      courseId: 'test-course-123',
      materialId: 'test-material-123',
      buffer: fileBuffer,
      fileName: 'hw1.pdf',
      fileType: 'pdf',
      kind: 'local-pdf',
      sourcePlatform: 'local',
      title: 'HW1',
      force: true
    });
    
    console.log('📊 Ingestion result:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testIngestion()
  .then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  });
