const PracticeExamPipelineService = require('./backend/services/practice-exam-pipeline.service');
const fs = require('fs');

async function testDirectPipeline() {
  console.log('🧪 DIRECT PIPELINE TEST - GENERATING EXAM');
  console.log('=' .repeat(60));
  
  const testPdf = 'midterm-sp24.pdf';
  
  if (!fs.existsSync(testPdf)) {
    console.log('❌ PDF not found:', testPdf);
    return;
  }
  
  console.log('📄 Using PDF:', testPdf);
  console.log('📊 PDF size:', fs.statSync(testPdf).size, 'bytes');
  
  try {
    console.log('\n🚀 CALLING PIPELINE DIRECTLY...');
    
    const options = {
      numQuestions: 3,
      difficulty: 'medium',
      instructions: 'Generate practice questions based on this parallel computing exam',
      questionPoints: [30, 35, 35]
    };
    
    console.log('🎯 Options:', options);
    
    const result = await PracticeExamPipelineService.generateExamFromPDF(testPdf, options);
    
    console.log('\n✅ PIPELINE COMPLETED!');
    console.log('📊 Result keys:', Object.keys(result));
    
    if (result.subject) {
      console.log('🎓 Subject detected:', result.subject);
    }
    
    if (result.pdfPath) {
      console.log('📄 PDF generated:', result.pdfPath);
      const pdfStats = fs.statSync(result.pdfPath);
      console.log('📏 PDF size:', (pdfStats.size / 1024).toFixed(1), 'KB');
    }
    
    if (result.latexContent) {
      console.log('\n📄 LATEX CONTENT LENGTH:', result.latexContent.length);
      console.log('\n🔍 FIRST 500 CHARS OF LATEX:');
      console.log(result.latexContent.substring(0, 500));
      console.log('\n🔍 LAST 500 CHARS OF LATEX:');
      console.log('...' + result.latexContent.substring(Math.max(0, result.latexContent.length - 500)));
      
      // Look for actual questions in the LaTeX
      const sections = result.latexContent.match(/\\section\{[^}]*\}/g);
      if (sections) {
        console.log('\n🎯 FOUND SECTIONS:');
        sections.forEach((section, i) => {
          console.log(`${i + 1}: ${section}`);
        });
      }
      
      // Look for enumerate environments (questions)
      const enumerates = result.latexContent.match(/\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/g);
      if (enumerates) {
        console.log('\n📝 FOUND QUESTION BLOCKS:');
        enumerates.forEach((block, i) => {
          console.log(`Block ${i + 1}:`);
          console.log(block.substring(0, 200) + '...');
          console.log('---');
        });
      }
    }
    
    console.log('\n🎉 DIRECT PIPELINE TEST SUCCESSFUL!');
    
    // Open the PDF if it exists
    if (result.pdfPath && process.platform === 'darwin') {
      const { exec } = require('child_process');
      exec(`open "${result.pdfPath}"`, (error) => {
        if (!error) {
          console.log('🖥️  PDF opened successfully!');
        }
      });
    }
    
  } catch (error) {
    console.error('\n❌ PIPELINE FAILED:');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testDirectPipeline().then(() => {
  console.log('\n🏁 Direct pipeline test completed');
}).catch(console.error); 