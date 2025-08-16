const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

async function testWebsiteSimulation() {
  console.log('🌐 TESTING WEBSITE SIMULATION - EXACT API CALL');
  console.log('=' .repeat(60));
  
  // First check if backend is running
  try {
    const healthCheck = await axios.get('http://localhost:8000/api/ai/test-route');
    console.log('✅ Backend is running:', healthCheck.data.message);
  } catch (error) {
    console.log('❌ Backend is not running. Please start with: cd backend && npm start');
    console.log('Error:', error.message);
    return;
  }
  
  // Use the uploaded PDF file name 
  const testPdf = 'OS_hw3_24F.pdf';
  
  if (!fs.existsSync(testPdf)) {
    console.log('❌ Test PDF not found:', testPdf);
    console.log('Available PDFs:');
    const files = fs.readdirSync('.').filter(f => f.endsWith('.pdf'));
    files.forEach(f => console.log('  -', f));
    return;
  }
  
  console.log('📄 Using test PDF:', testPdf);
  console.log('📊 PDF size:', fs.statSync(testPdf).size, 'bytes');
  
  try {
    // Create the EXACT same FormData as the website
    const form = new FormData();
    form.append('subject', 'Operating Systems');
    form.append('questionCount', '3');
    form.append('difficulty', 'medium');
    form.append('generatePDF', 'true');
    form.append('instructions', 'Generate practice questions based on this operating systems exam');
    form.append('questionPoints', JSON.stringify([30, 35, 35]));
    form.append('pdf', fs.createReadStream(testPdf));
    
    console.log('\n🚀 SENDING REQUEST TO BACKEND API...');
    console.log('📤 Endpoint: POST /api/ai/practice-exam');
    console.log('📋 Form data:');
    console.log('   - subject: Operating Systems');
    console.log('   - questionCount: 3');
    console.log('   - difficulty: medium');
    console.log('   - generatePDF: true');
    console.log('   - instructions: Generate practice questions...');
    console.log('   - questionPoints: [30,35,35]');
    console.log('   - pdf: OS_hw3_24F.pdf');
    
    const startTime = Date.now();
    
    const response = await axios.post('http://localhost:8000/api/ai/practice-exam', form, {
      headers: {
        ...form.getHeaders(),
      },
      timeout: 120000, // 2 minute timeout
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    
    const duration = Date.now() - startTime;
    
    console.log('\n✅ SUCCESS! Response received');
    console.log('⏱️  Duration:', duration, 'ms');
    console.log('📊 Status:', response.status);
    console.log('📋 Response structure:', {
      hasSuccess: 'success' in response.data,
      successValue: response.data.success,
      hasData: 'data' in response.data,
      dataKeys: response.data.data ? Object.keys(response.data.data) : 'no data field'
    });
    
    // Check if response has the correct format for frontend
    if (response.data.success && response.data.data) {
      console.log('✅ Response format is correct for frontend!');
      const data = response.data.data;
      
      if (data.subject) {
        console.log('🎓 Subject detected:', data.subject);
      }
      
      if (data.pdfPath) {
        console.log('📄 PDF generated:', data.pdfPath);
        
        // Check if the PDF file actually exists
        if (fs.existsSync(data.pdfPath)) {
          const pdfStats = fs.statSync(data.pdfPath);
          console.log('📏 PDF size:', pdfStats.size, 'bytes');
          console.log('✅ PDF file verified!');
          
          // Try to open it
          if (process.platform === 'darwin') {
            const { exec } = require('child_process');
            exec(`open "${data.pdfPath}"`, (error) => {
              if (!error) {
                console.log('🖥️  PDF opened successfully!');
              }
            });
          }
        } else {
          console.log('❌ PDF file not found at:', data.pdfPath);
        }
      } else {
        console.log('❌ No PDF path in response data');
      }
      
      if (data.questions) {
        console.log('📝 Questions generated:', data.questions.substring(0, 200) + '...');
      }
      
    } else {
      console.log('❌ Response format is incorrect for frontend!');
      console.log('   Expected: { success: true, data: {...} }');
      console.log('   Got:', Object.keys(response.data));
      
      // Still try to extract data from old format for backward compatibility
      if (response.data.subject) {
        console.log('🎓 Subject (old format):', response.data.subject);
      }
      if (response.data.pdfPath) {
        console.log('📄 PDF (old format):', response.data.pdfPath);
      }
    }
    
    console.log('\n🎉 WEBSITE SIMULATION SUCCESSFUL!');
    
  } catch (error) {
    console.error('\n❌ WEBSITE SIMULATION FAILED:');
    console.error('Error status:', error.response?.status);
    console.error('Error message:', error.message);
    
    if (error.response?.data) {
      console.error('Server response:', error.response.data);
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Make sure the backend server is running on port 8000');
    } else if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      console.error('💡 The request timed out - this might indicate a server-side error');
    }
  }
}

// Run the test
testWebsiteSimulation().then(() => {
  console.log('\n🏁 Website simulation test completed');
}).catch((error) => {
  console.error('\n💥 Test crashed:', error);
}); 