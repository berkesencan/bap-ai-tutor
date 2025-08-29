const PracticeExamPipelineService = require('./backend/services/practice-exam-pipeline.service');
const fs = require('fs');

async function testStep25Only() {
  console.log('🔍 TESTING STEP 2.5 QUESTION GENERATION ONLY');
  console.log('=' .repeat(60));
  
  // Use the same PDF
  const testPdf = 'midterm-fall21.pdf';
  
  if (!fs.existsSync(testPdf)) {
    console.log('❌ Test PDF not found:', testPdf);
    return;
  }
  
  try {
    console.log('🚀 STEP 1: PDF EXTRACTION');
    const extractionResults = await PracticeExamPipelineService.extractPDFContent(testPdf);
    console.log('✅ Extraction completed');
    
    console.log('\n🚀 STEP 2: LaTeX CONVERSION');
    const goldenLatex = await PracticeExamPipelineService.simpleGeminiConversion(extractionResults);
    console.log('✅ LaTeX conversion completed');
    console.log('📄 Golden LaTeX length:', goldenLatex.length);
    console.log('📄 Golden LaTeX preview (first 200 chars):');
    console.log(goldenLatex.substring(0, 200) + '...\n');
    
    console.log('🚀 STEP 2.5: SMART NEW QUESTION GENERATION');
    console.log('=' .repeat(50));
    
    const options = {
      numQuestions: 3,
      difficulty: 'medium',
      instructions: 'Generate completely new practice questions based on algorithms concepts',
      questionPoints: [30, 35, 35]
    };
    
    // Call Step 2.5 directly
    const newExamData = await PracticeExamPipelineService.generateSmartContextAwareExam(goldenLatex, extractionResults, options);
    
    console.log('✅ Step 2.5 completed!');
    console.log('📊 New exam data keys:', Object.keys(newExamData));
    console.log('📄 NEW LaTeX length:', newExamData.latexContent.length);
    console.log('🎓 Detected subject:', newExamData.subject);
    
    console.log('\n📄 NEW LATEX CONTENT (first 500 chars):');
    console.log('=' .repeat(50));
    console.log(newExamData.latexContent.substring(0, 500));
    console.log('...\n');
    
    console.log('📄 NEW LATEX CONTENT (last 300 chars):');
    console.log('=' .repeat(50));
    const content = newExamData.latexContent;
    console.log('...' + content.substring(Math.max(0, content.length - 300)));
    
    // Compare with original
    console.log('\n🔍 COMPARISON ANALYSIS:');
    console.log('=' .repeat(30));
    console.log('Original LaTeX length:', goldenLatex.length);
    console.log('New LaTeX length:', newExamData.latexContent.length);
    
    // Check if content is similar
    const originalFirstLine = goldenLatex.split('\n')[6] || ''; // Skip preamble
    const newFirstLine = newExamData.latexContent.split('\n')[6] || '';
    
    console.log('Original first content line:', originalFirstLine.substring(0, 100));
    console.log('New first content line:', newFirstLine.substring(0, 100));
    
    if (originalFirstLine.trim() === newFirstLine.trim()) {
      console.log('🚨 WARNING: Content appears to be identical!');
    } else {
      console.log('✅ Content appears to be different!');
    }
    
    // Save the new content for manual inspection
    const outputFile = 'step25-new-questions.tex';
    fs.writeFileSync(outputFile, newExamData.latexContent);
    console.log(`\n📄 New content saved to: ${outputFile}`);
    console.log('You can open this file to see the generated questions');
    
  } catch (error) {
    console.error('\n❌ STEP 2.5 TEST FAILED:');
    console.error('Error message:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testStep25Only().then(() => {
  console.log('\n🏁 Step 2.5 test completed');
}).catch((error) => {
  console.error('\n💥 Test crashed:', error);
}); 