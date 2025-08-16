const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

async function testExactScripts() {
  console.log('🧪 TESTING EXACT WORKING STANDALONE SCRIPTS');
  console.log('===========================================');
  
  // Wait for backend to start
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // First check if backend is running
  try {
    const healthCheck = await axios.get('http://localhost:8000/api/ai/test-route');
    console.log('✅ Backend is running:', healthCheck.data.message);
  } catch (error) {
    console.log('❌ Backend is not running. Please start with: cd backend && npm start');
    console.log('Error:', error.message);
    return;
  }
  
  // Use the midterm-sp24.pdf file
  const testPdf = 'midterm-sp24.pdf';
  
  if (!fs.existsSync(testPdf)) {
    console.log('❌ PDF not found:', testPdf);
    console.log('Available PDFs:', fs.readdirSync('.').filter(f => f.endsWith('.pdf')));
    return;
  }
  
  console.log(`📄 Testing with: ${testPdf}`);
  
  const formData = new FormData();
  formData.append('pdf', fs.createReadStream(testPdf));
  formData.append('subject', 'Parallel Computing');
  formData.append('questionCount', '3');
  formData.append('difficulty', 'hard');
  formData.append('generatePDF', 'true');
  formData.append('instructions', 'Generate TikZ diagrams, tables, and MPI code snippets');
  formData.append('questionPoints', '[30,30,40]');
  
  try {
    console.log('🚀 Sending request to exact working scripts API...');
    const startTime = Date.now();
    
    const response = await axios.post('http://localhost:8000/api/ai/practice-exam', formData, {
      headers: formData.getHeaders(),
      timeout: 180000, // 3 minutes
    });
    
    const duration = (Date.now() - startTime) / 1000;
    
    console.log('✅ SUCCESS! Exact working scripts executed');
    console.log(`⏱️  Duration: ${duration.toFixed(1)} seconds`);
    console.log(`📊 Status: ${response.status}`);
    console.log(`📄 Response keys: ${Object.keys(response.data.data || {})}`);
    
    if (response.data.data && response.data.data.pdfPath) {
      console.log(`📁 PDF generated: ${response.data.data.pdfPath}`);
      
      // Check if PDF exists
      const pdfPath = response.data.data.pdfPath;
      if (fs.existsSync(pdfPath)) {
        const stats = fs.statSync(pdfPath);
        console.log(`📄 PDF size: ${(stats.size / 1024).toFixed(1)}KB`);
        
        // Try to open the PDF (macOS)
        try {
          require('child_process').exec(`open "${pdfPath}"`);
          console.log('🎉 PDF opened successfully!');
        } catch (e) {
          console.log('📄 PDF ready for download:', pdfPath);
        }
      } else {
        console.log('❌ PDF file not found at:', pdfPath);
      }
    }
    
    if (response.data.data && response.data.data.questions) {
      console.log('📝 Questions generated:');
      console.log(response.data.data.questions.substring(0, 200) + '...');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status) {
      console.log(`📊 Status: ${error.response.status}`);
    }
  }
}

testExactScripts().catch(console.error); 