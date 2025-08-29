const fs = require('fs');
const path = require('path');

// Import the controller to test the template
const AIController = require('./backend/controllers/ai.controller.js');

async function testSimpleLatexTemplate() {
  console.log('=== TESTING SIMPLE LATEX TEMPLATE ===');
  
  const subject = 'CSCI-UA.0480-051: Parallel Computing';
  const questionsText = `Problem 1: Test question about parallel computing.

Problem 2: Another test question about MPI.

Problem 3: Final question about performance analysis.`;
  
  const questionPoints = [30, 35, 35];
  
  console.log('📝 Generating LaTeX template...');
  const latexContent = AIController.createSimpleLatexTemplate(subject, questionsText, questionPoints);
  
  console.log('✅ LaTeX template generated');
  console.log('📄 Content length:', latexContent.length);
  
  // Check for red text
  const hasRedColor = latexContent.includes('\\color{red}');
  console.log('🔴 Contains \\color{red}:', hasRedColor);
  
  if (hasRedColor) {
    console.log('\n🔴 RED TEXT INSTANCES:');
    const redMatches = latexContent.match(/\\color\{red\}[^}]*\}/g) || [];
    redMatches.forEach((match, i) => {
      console.log(`${i + 1}: ${match}`);
    });
  }
  
  // Save the template
  fs.writeFileSync('test-simple-template.tex', latexContent);
  console.log('\n💾 LaTeX template saved to: test-simple-template.tex');
  
  // Show first part of template
  console.log('\n📝 TEMPLATE PREVIEW (first 1000 chars):');
  console.log('='.repeat(60));
  console.log(latexContent.substring(0, 1000));
  console.log('='.repeat(60));
  
  // Now test compilation
  console.log('\n🔧 Testing LaTeX compilation...');
  
  try {
    const LaTeXPDFAnalyzer = require('./backend/services/latex-pdf-analyzer');
    const timestamp = Date.now();
    const filename = `test-simple-template-${timestamp}`;
    
    const pdfPath = await LaTeXPDFAnalyzer.compileLaTeXToPDF(latexContent, filename);
    console.log('✅ LaTeX compilation successful!');
    console.log('📄 PDF created at:', pdfPath);
    
    // Check PDF size
    if (fs.existsSync(pdfPath)) {
      const stats = fs.statSync(pdfPath);
      console.log('📊 PDF size:', stats.size, 'bytes');
      
      // Try to convert to HTML to check for red text
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      try {
        const htmlPath = `test-simple-${timestamp}.html`;
        await execAsync(`pdftohtml -c -hidden -noframes "${pdfPath}" "${htmlPath.replace('.html', '')}"`);
        
        if (fs.existsSync(htmlPath)) {
          const htmlContent = fs.readFileSync(htmlPath, 'utf8');
          const hasRedInHtml = htmlContent.includes('#ff0000');
          console.log('🔴 PDF contains red text (in HTML):', hasRedInHtml);
          
          if (hasRedInHtml) {
            console.log('✅ RED TEXT SUCCESSFULLY PRESERVED IN PDF!');
          } else {
            console.log('❌ RED TEXT LOST DURING PDF COMPILATION');
          }
          
          // Save HTML for inspection
          console.log('💾 HTML conversion saved to:', htmlPath);
        }
      } catch (htmlError) {
        console.log('⚠️ Could not convert PDF to HTML for red text check:', htmlError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ LaTeX compilation failed:', error.message);
  }
}

testSimpleLatexTemplate()
  .then(() => {
    console.log('\n✅ Simple LaTeX template test completed');
  })
  .catch(error => {
    console.error('\n💥 Test failed:', error.message);
  }); 