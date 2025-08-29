const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

async function testLatexContent() {
  console.log('🔍 EXAMINING GENERATED LATEX CONTENT');
  console.log('=' .repeat(50));
  
  try {
    const form = new FormData();
    form.append('subject', 'Parallel Computing');
    form.append('questionCount', '3');
    form.append('difficulty', 'medium');
    form.append('generatePDF', 'true');
    form.append('instructions', 'Generate new practice questions');
    form.append('questionPoints', JSON.stringify([30, 35, 35]));
    form.append('pdf', fs.createReadStream('midterm-sp24.pdf'));
    
    console.log('📡 Generating exam and capturing LaTeX content...');
    
    const response = await axios.post('http://localhost:8000/api/ai/practice-exam', form, {
      headers: { ...form.getHeaders() },
      timeout: 60000
    });
    
    if (response.data.success && response.data.data) {
      const data = response.data.data;
      console.log('✅ Response received');
      console.log('🎓 Subject:', data.subject);
      console.log('📝 Questions length:', data.questions.length);
      
      console.log('\n📄 ACTUAL QUESTIONS CONTENT:');
      console.log('=' .repeat(50));
      console.log(data.questions);
      console.log('=' .repeat(50));
      
      // Try to get the actual LaTeX file
      const pdfPath = data.pdfPath;
      if (pdfPath) {
        const latexPath = pdfPath.replace('.pdf', '.tex');
        if (fs.existsSync(latexPath)) {
          console.log('\n📄 EXAMINING GENERATED LATEX FILE:');
          console.log('File:', latexPath);
          const latexContent = fs.readFileSync(latexPath, 'utf8');
          console.log('Length:', latexContent.length);
          
          console.log('\n🔍 LATEX CONTENT (first 1000 chars):');
          console.log(latexContent.substring(0, 1000));
          
          console.log('\n🔍 LATEX CONTENT (last 1000 chars):');
          console.log('...' + latexContent.substring(Math.max(0, latexContent.length - 1000)));
          
          // Look for question patterns
          const questionMatches = latexContent.match(/\\section\{[^}]*\}|\\subsection\{[^}]*\}|\d+\.\s*/g);
          if (questionMatches) {
            console.log('\n🎯 FOUND QUESTION PATTERNS:');
            questionMatches.slice(0, 10).forEach((match, i) => {
              console.log(`${i + 1}: ${match}`);
            });
          }
          
        } else {
          console.log('❌ LaTeX file not found:', latexPath);
        }
      }
      
    } else {
      console.log('❌ Failed to get response');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testLatexContent().then(() => {
  console.log('\n🏁 LaTeX examination completed');
}).catch(console.error); 