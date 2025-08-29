const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

async function debugLatexGeneration() {
  console.log('=== DEBUGGING LATEX GENERATION ===');
  
  const originalPdf = 'midterm-sp24.pdf';
  
  if (!fs.existsSync(originalPdf)) {
    console.log('❌ Original PDF file not found:', originalPdf);
    return;
  }
  
  try {
    const form = new FormData();
    form.append('subject', 'Parallel Computing DEBUG TEST');
    form.append('questionCount', '2');
    form.append('difficulty', 'medium');
    form.append('generatePDF', 'true');
    form.append('questionPoints', '[30,35]');
    form.append('pdf', fs.createReadStream(originalPdf));
    
    console.log('📡 Generating practice exam to debug LaTeX...');
    
    const response = await axios.post('http://localhost:8000/api/ai/practice-exam', form, {
      headers: {
        ...form.getHeaders()
      },
      timeout: 60000
    });
    
    console.log('✅ Response received');
    console.log('📄 Response data keys:', Object.keys(response.data));
    
    if (response.data.data) {
      console.log('📄 Data keys:', Object.keys(response.data.data));
      
      if (response.data.data.latexContent) {
        console.log('\n📝 LATEX CONTENT (first 2000 chars):');
        console.log('='.repeat(60));
        console.log(response.data.data.latexContent.substring(0, 2000));
        console.log('='.repeat(60));
        
        // Check for red text
        const hasRedColor = response.data.data.latexContent.includes('\\color{red}');
        console.log('\n🔴 Contains \\color{red}:', hasRedColor);
        
        if (hasRedColor) {
          console.log('\n🔴 RED TEXT INSTANCES:');
          const redMatches = response.data.data.latexContent.match(/\\color\{red\}[^}]*\}/g) || [];
          redMatches.forEach((match, i) => {
            console.log(`${i + 1}: ${match}`);
          });
        }
        
        // Save the LaTeX content for inspection
        fs.writeFileSync('debug-latex-content.tex', response.data.data.latexContent);
        console.log('\n💾 LaTeX content saved to: debug-latex-content.tex');
      }
      
      if (response.data.data.pdfPath) {
        console.log('\n📄 Generated PDF:', response.data.data.pdfPath);
        const stats = fs.statSync(response.data.data.pdfPath);
        console.log('📊 PDF Size:', stats.size, 'bytes');
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    if (error.response) {
      console.error('📄 Response status:', error.response.status);
      console.error('📄 Response data:', error.response.data);
    }
  }
}

debugLatexGeneration()
  .then(() => {
    console.log('\n✅ Debug completed');
  })
  .catch(error => {
    console.error('\n💥 Debug failed:', error.message);
  }); 