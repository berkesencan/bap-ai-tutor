const axios = require('axios');

async function testGeminiResponse() {
  console.log('🔍 TESTING GEMINI API RESPONSE FORMAT');
  console.log('=====================================');
  
  try {
    const testPrompt = 'Hello, this is a test. Please respond with "TEST_SUCCESS"';
    
    console.log('🚀 Calling Gemini API...');
    console.log(`📋 Prompt: "${testPrompt}"`);
    
    const response = await axios.post('http://localhost:8000/api/test-ai/test-gemini', {
      prompt: testPrompt
    }, {
      timeout: 30000
    });
    
    console.log('\n📊 RESPONSE ANALYSIS:');
    console.log('=====================');
    console.log(`✅ Status: ${response.status}`);
    console.log(`📋 Response type: ${typeof response.data}`);
    console.log(`📋 Response keys: ${Object.keys(response.data)}`);
    console.log(`📋 Full response:`, JSON.stringify(response.data, null, 2));
    
    if (response.data.success) {
      console.log('\n🎯 SUCCESS RESPONSE:');
      console.log(`📋 Response text: "${response.data.data.response}"`);
      console.log(`📋 Response length: ${response.data.data.response.length}`);
      console.log(`📋 Model: ${response.data.data.model}`);
    } else {
      console.log('\n❌ ERROR RESPONSE:');
      console.log(`📋 Error: ${response.data.message || response.data.error}`);
    }
    
  } catch (error) {
    console.log('\n❌ REQUEST FAILED:');
    console.log(`📋 Error: ${error.message}`);
    if (error.response) {
      console.log(`📋 Status: ${error.response.status}`);
      console.log(`📋 Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }
}

testGeminiResponse(); 