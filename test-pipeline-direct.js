const PracticeExamPipelineService = require('./backend/services/practice-exam-pipeline.service');
const fs = require('fs');
const path = require('path');

async function testPipelineDirectly() {
  console.log('🧪 TESTING PRACTICE EXAM PIPELINE DIRECTLY');
  console.log('=' .repeat(60));
  
  // Test with the available PDF
  const testPdf = 'midterm-fall21.pdf';
  
  if (!fs.existsSync(testPdf)) {
    console.log('❌ Test PDF not found:', testPdf);
    console.log('Available PDFs in directory:');
    const files = fs.readdirSync('.').filter(f => f.endsWith('.pdf'));
    files.forEach(f => console.log('  -', f));
    return;
  }
  
  console.log('📄 Using test PDF:', testPdf);
  console.log('📊 PDF size:', fs.statSync(testPdf).size, 'bytes');
  
  try {
    console.log('\n🚀 STARTING PIPELINE TEST...');
    console.log('=' .repeat(40));
    
    const options = {
      numQuestions: 3,
      difficulty: 'medium',
      instructions: 'Generate practice questions based on the content of this exam',
      questionPoints: [30, 35, 35]
    };
    
    console.log('🎯 Pipeline options:', options);
    
    const startTime = Date.now();
    
    // Call the pipeline directly
    const result = await PracticeExamPipelineService.generateExamFromPDF(testPdf, options);
    
    const duration = Date.now() - startTime;
    
    console.log('\n✅ PIPELINE COMPLETED SUCCESSFULLY!');
    console.log('=' .repeat(40));
    console.log('⏱️  Total duration:', duration, 'ms');
    console.log('📊 Result keys:', Object.keys(result));
    
    if (result.subject) {
      console.log('🎓 Detected subject:', result.subject);
    }
    
    if (result.pdfPath) {
      console.log('📄 Generated PDF:', result.pdfPath);
      
      if (fs.existsSync(result.pdfPath)) {
        const pdfStats = fs.statSync(result.pdfPath);
        console.log('📏 PDF size:', pdfStats.size, 'bytes');
        console.log('📅 Generated at:', pdfStats.birthtime.toISOString());
        
        // Try to show some info about the generated content
        if (result.latexContent) {
          console.log('📝 LaTeX content length:', result.latexContent.length, 'characters');
          console.log('📄 LaTeX preview (first 200 chars):');
          console.log(result.latexContent.substring(0, 200) + '...');
        }
        
        console.log('\n🎉 SUCCESS! Generated exam PDF is ready at:', result.pdfPath);
        
        // Optional: Try to open the PDF (macOS)
        if (process.platform === 'darwin') {
          console.log('\n🖥️  Attempting to open PDF...');
          const { exec } = require('child_process');
          exec(`open "${result.pdfPath}"`, (error) => {
            if (error) {
              console.log('⚠️  Could not auto-open PDF:', error.message);
              console.log('📂 Please manually open:', result.pdfPath);
            } else {
              console.log('✅ PDF opened successfully!');
            }
          });
        }
        
      } else {
        console.log('❌ Generated PDF file not found at:', result.pdfPath);
      }
    } else {
      console.log('❌ No PDF path in result');
    }
    
    if (result.analysis) {
      console.log('\n📊 CONTENT ANALYSIS:');
      console.log('   Subject detected:', result.analysis.subject);
      console.log('   Visual elements:', result.analysis.detectedElements);
      console.log('   Content topics:', result.analysis.contentTopics);
      console.log('   Question types:', result.analysis.questionTypes);
    }
    
  } catch (error) {
    console.error('\n❌ PIPELINE TEST FAILED:');
    console.error('Error message:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testPipelineDirectly().then(() => {
  console.log('\n🏁 Test completed');
}).catch((error) => {
  console.error('\n💥 Test crashed:', error);
}); 