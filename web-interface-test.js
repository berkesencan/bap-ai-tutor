const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');

async function webInterfaceTest() {
  console.log('=== WEB INTERFACE PDF TESTING ===');
  console.log('🌐 Testing the actual web interface with uploaded midterm PDF\n');
  
  const baseURL = 'http://localhost:8000';
  
  try {
    // Test 1: Generate practice exam with uploaded PDF as template
    console.log('📄 Test 1: Using uploaded midterm as template...');
    
    const formData = new FormData();
    
    // Add the uploaded PDF file
    const pdfBuffer = fs.readFileSync('midterm-sp24.pdf');
    formData.append('pdf', pdfBuffer, 'midterm-sp24.pdf');
    
    // Add other form parameters
    formData.append('subject', 'Parallel Computing');
    formData.append('difficulty', 'medium');
    formData.append('numQuestions', '3');
    formData.append('instructions', 'Generate questions similar to the uploaded midterm exam with proper table formatting and DAG diagrams.');
    formData.append('questionPoints', JSON.stringify([25, 40, 35]));
    formData.append('generatePDF', 'true'); // Request PDF generation
    
    console.log('   📤 Sending request to generate practice exam...');
    
    const response = await axios.post(`${baseURL}/api/ai/practice-exam`, formData, {
      headers: {
        ...formData.getHeaders(),
      }
    });
    
    if (response.status === 200 && response.data.success) {
      console.log(`   ✅ Generated practice exam successfully`);
      console.log(`   📊 Response type: JSON`);
      console.log(`   📝 Has interactive questions: ${!!response.data.data.text}`);
      console.log(`   📄 PDF generated: ${response.data.data.pdfGenerated}`);
      
      if (response.data.data.pdfGenerated && response.data.data.pdfDownloadUrl) {
        console.log(`   📥 PDF download URL: ${response.data.data.pdfDownloadUrl}`);
        
        // Now download the PDF
        try {
          console.log('   📤 Downloading PDF...');
          const pdfDownloadResponse = await axios.get(`${baseURL}${response.data.data.pdfDownloadUrl}`, {
            responseType: 'arraybuffer'
          });
          
          if (pdfDownloadResponse.status === 200) {
            const timestamp = Date.now();
            const filename = `WEB-TEST-midterm-template-${timestamp}.pdf`;
            const relativePath = `backend/uploads/${filename}`;
            
            fs.writeFileSync(relativePath, pdfDownloadResponse.data);
            
            console.log(`   ✅ Downloaded PDF: ${filename}`);
            console.log(`   📊 PDF Size: ${pdfDownloadResponse.data.length} bytes`);
            console.log(`   📁 Saved to: ${relativePath}`);
            
            // Open PDFs for comparison
            console.log('\n🚀 Opening PDFs for comparison...');
            
            setTimeout(() => {
              exec('open midterm-sp24.pdf', (error) => {
                if (error) {
                  console.log('❌ Could not open original:', error.message);
                } else {
                  console.log('✅ Opened original: midterm-sp24.pdf');
                }
              });
            }, 500);
            
            setTimeout(() => {
              exec(`open "${relativePath}"`, (error) => {
                if (error) {
                  console.log('❌ Could not open generated PDF:', error.message);
                  const absolutePath = path.resolve(relativePath);
                  exec(`open "${absolutePath}"`, (error2) => {
                    if (error2) {
                      console.log('❌ Could not open with absolute path either:', error2.message);
                    } else {
                      console.log('✅ Opened generated: WEB-TEST-midterm-template (absolute path)');
                    }
                  });
                } else {
                  console.log('✅ Opened generated: WEB-TEST-midterm-template');
                }
              });
            }, 2000);
            
          } else {
            console.error(`❌ PDF download failed with status: ${pdfDownloadResponse.status}`);
          }
        } catch (downloadError) {
          console.error('❌ PDF download error:', downloadError.message);
        }
      } else {
        console.log('❌ PDF was not generated or download URL missing');
        if (response.data.data.pdfError) {
          console.log('   PDF Error:', response.data.data.pdfError);
        }
      }
      
      console.log('\n🔍 WEB INTERFACE COMPARISON:');
      console.log('This tests the ACTUAL web interface functionality:');
      console.log('✅ Uses real uploaded PDF as template');
      console.log('✅ Goes through complete web request pipeline');
      console.log('✅ Tests PDF content analysis and formatting');
      console.log('✅ Verifies downloadable PDF generation');
      console.log('✅ Tests proper JSON + PDF download flow');
      
    } else {
      console.error(`❌ Request failed with status: ${response.status}`);
      console.error('Response:', response.data);
    }
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Cannot connect to server. Make sure the backend is running on http://localhost:8000');
      console.log('\n💡 To start the backend:');
      console.log('   cd backend && npm start');
    } else {
      console.error('❌ Web interface test failed:', error.message);
      if (error.response) {
        console.error('   Response status:', error.response.status);
        console.error('   Response data:', error.response.data);
      }
    }
  }
  
  // Test 2: Generate without PDF to compare
  try {
    console.log('\n📄 Test 2: Generating without uploaded PDF for comparison...');
    
    const formData2 = new FormData();
    formData2.append('subject', 'Parallel Computing');
    formData2.append('difficulty', 'medium');
    formData2.append('numQuestions', '3');
    formData2.append('instructions', 'Generate questions about parallel computing with tables and DAG diagrams.');
    formData2.append('questionPoints', JSON.stringify([25, 40, 35]));
    formData2.append('generatePDF', 'true'); // Request PDF generation
    
    const response2 = await axios.post(`${baseURL}/api/ai/practice-exam`, formData2, {
      headers: {
        ...formData2.getHeaders(),
      }
    });
    
    if (response2.status === 200 && response2.data.success) {
      console.log(`   ✅ Generated practice exam without template`);
      
      if (response2.data.data.pdfGenerated && response2.data.data.pdfDownloadUrl) {
        try {
          const pdfDownloadResponse2 = await axios.get(`${baseURL}${response2.data.data.pdfDownloadUrl}`, {
            responseType: 'arraybuffer'
          });
          
          if (pdfDownloadResponse2.status === 200) {
            const timestamp = Date.now();
            const filename = `WEB-TEST-no-template-${timestamp}.pdf`;
            const relativePath = `backend/uploads/${filename}`;
            
            fs.writeFileSync(relativePath, pdfDownloadResponse2.data);
            
            console.log(`   ✅ Downloaded no-template PDF: ${filename}`);
            console.log(`   📊 Size: ${pdfDownloadResponse2.data.length} bytes`);
            
            setTimeout(() => {
              exec(`open "${relativePath}"`, (error) => {
                if (error) {
                  console.log('❌ Could not open no-template PDF:', error.message);
                  const absolutePath = path.resolve(relativePath);
                  exec(`open "${absolutePath}"`, (error2) => {
                    if (error2) {
                      console.log('❌ Could not open no-template with absolute path:', error2.message);
                    } else {
                      console.log('✅ Opened no-template: WEB-TEST-no-template (absolute path)');
                    }
                  });
                } else {
                  console.log('✅ Opened no-template: WEB-TEST-no-template');
                }
              });
            }, 3500);
          }
        } catch (downloadError2) {
          console.error('❌ No-template PDF download error:', downloadError2.message);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Test 2 failed:', error.message);
  }
  
  console.log('\n📋 WEB INTERFACE CHECKLIST:');
  console.log('□ JSON response received successfully?');
  console.log('□ PDF download URL provided?');
  console.log('□ PDF downloaded successfully?');
  console.log('□ PDF with template matches uploaded midterm format?');
  console.log('□ PDF without template uses standard academic format?');
  console.log('□ Tables show complete data (not just headers)?');
  console.log('□ Content alignment is correct (no right-shift)?');
  console.log('□ Template formatting is preserved?');
  console.log('□ Generated content matches request parameters?');
  console.log('□ Point distribution matches requested values?');
  
  console.log('\n🎯 CRITICAL COMPARISON POINTS:');
  console.log('1. Compare original midterm-sp24.pdf with generated template PDF');
  console.log('2. Verify table formatting matches exactly');
  console.log('3. Check that all table rows are visible');
  console.log('4. Ensure headers and structure match');
  console.log('5. Confirm no content is shifted to the right');
  console.log('6. Verify proper JSON + PDF download workflow');
}

// Run the web interface test
webInterfaceTest(); 