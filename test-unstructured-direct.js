#!/usr/bin/env node

/**
 * Direct test of Unstructured API integration
 */

const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

async function testUnstructured() {
  console.log('🧪 Testing Unstructured API directly...');
  
  try {
    const filePath = './hw1.pdf';
    const fileName = 'hw1.pdf';
    
    if (!fs.existsSync(filePath)) {
      console.error('❌ hw1.pdf not found');
      return;
    }
    
    console.log('✅ hw1.pdf found');
    
    // Create form data
    const formData = new FormData();
    const fileBuffer = fs.readFileSync(filePath);
    
    formData.append('files', fileBuffer, {
      filename: fileName,
      contentType: 'application/pdf'
    });
    formData.append('strategy', 'hi_res');
    formData.append('coordinates', 'true');
    formData.append('pdf_infer_table_structure', 'true');
    formData.append('ocr_languages', 'eng');
    
    console.log('📤 Sending request to Unstructured...');
    
    const response = await axios.post('http://localhost:8001/general/v0/general', formData, {
      headers: { 
        ...formData.getHeaders()
      },
      timeout: 60000
    });
    
    console.log('✅ Unstructured response received');
    console.log(`📊 Status: ${response.status}`);
    console.log(`📄 Elements: ${response.data.length}`);
    
    // Show first few elements
    console.log('\n📋 First 3 elements:');
    response.data.slice(0, 3).forEach((element, i) => {
      console.log(`${i + 1}. [${element.type}] ${element.text?.slice(0, 100)}...`);
    });
    
    return response.data;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('📊 Status:', error.response.status);
      console.error('📄 Response:', error.response.data);
    }
    throw error;
  }
}

// Run the test
testUnstructured()
  .then(() => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  });
