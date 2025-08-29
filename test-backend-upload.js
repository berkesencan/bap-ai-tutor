const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

async function testBackendUpload() {
  console.log('🧪 TESTING BACKEND API WITH MIDTERM-SP24.PDF');
  
  const pdfFilePath = 'midterm-sp24.pdf';
  
  if (!fs.existsSync(pdfFilePath)) {
    console.log('❌ PDF file not found:', pdfFilePath);
    return;
  }
  
  console.log('📄 Found PDF file, size:', fs.statSync(pdfFilePath).size, 'bytes');
  
  try {
    // Create form data for upload
    const form = new FormData();
    form.append('pdf', fs.createReadStream(pdfFilePath));
    form.append('subject', 'Parallel Computing');
    form.append('questionCount', '3');
    form.append('difficulty', 'medium');
    form.append('generatePDF', 'true');
    form.append('questionPoints', '[30,35,35]');
    
    console.log('🚀 Sending request to backend API...');
    
    const response = await fetch('http://localhost:8000/api/ai/practice-exam', {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });
    
    console.log('📊 Response status:', response.status);
    
    if (!response.ok) {
      console.log('❌ Request failed');
      const errorText = await response.text();
      console.log('Error response:', errorText);
      return;
    }
    
    const result = await response.json();
    console.log('✅ Response received');
    console.log('📊 FULL RESPONSE:', JSON.stringify(result, null, 2));
    
    // Check both result and result.data for PDF path
    const generatedPdfPath = result.pdfPath || result.data?.pdfPath;
    const subject = result.subject || result.data?.subject;
    const questions = result.questions || result.data?.questions;
    
    if (generatedPdfPath) {
      console.log('🎉 PDF GENERATED SUCCESSFULLY!');
      console.log('📄 PDF path:', generatedPdfPath);
      
      // Check if the PDF file actually exists
      const fullPdfPath = `backend/${generatedPdfPath}`;
      if (fs.existsSync(fullPdfPath)) {
        const pdfSize = fs.statSync(fullPdfPath).size;
        console.log('✅ PDF file exists on disk');
        console.log('📊 PDF size:', pdfSize, 'bytes');
        
        if (pdfSize > 50000) {
          console.log('🎉 SUCCESS: PDF size indicates proper content!');
        } else {
          console.log('⚠️ WARNING: PDF size seems small');
        }
      } else {
        console.log('❌ PDF file not found on disk:', fullPdfPath);
      }
    } else {
      console.log('❌ No PDF path in response');
    }
    
    console.log('🎯 Subject detected:', subject);
    console.log('📝 Questions available:', !!questions);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Make sure node-fetch and form-data are available
try {
  testBackendUpload();
} catch (error) {
  console.error('❌ Missing dependencies. Install with:');
  console.error('npm install node-fetch form-data');
} 