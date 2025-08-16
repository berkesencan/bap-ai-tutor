// Quick debug test to simulate the controller's PDF generation logic

async function testControllerLogic() {
  console.log('=== TESTING CONTROLLER PDF LOGIC ===');
  
  // Simulate the conditions from the controller
  const subject = 'Test Subject';
  const questionsText = '1. Question 1\n\n2. Question 2';
  const questionPoints = [50, 50];
  
  try {
    // Test the createSimpleLatexTemplate function
    console.log('📝 Testing simple LaTeX template creation...');
    
    const simpleLatex = createSimpleLatexTemplate(subject, questionsText, questionPoints);
    console.log('✅ Simple LaTeX created, length:', simpleLatex.length);
    console.log('📄 LaTeX preview:', simpleLatex.substring(0, 300));
    
    // Test LaTeX compilation
    const LaTeXPDFAnalyzer = require('./backend/services/latex-pdf-analyzer');
    console.log('📦 LaTeX analyzer loaded');
    
    const timestamp = Date.now();
    const filename = `quick-debug-${timestamp}`;
    
    console.log('🔧 Compiling LaTeX...');
    const compiledPdfPath = await LaTeXPDFAnalyzer.compileLaTeXToPDF(simpleLatex, filename);
    console.log('✅ Compilation completed:', compiledPdfPath);
    
    // Verify file exists
    const fs = require('fs');
    if (fs.existsSync(compiledPdfPath)) {
      const stats = fs.statSync(compiledPdfPath);
      console.log('✅ PDF verified - Size:', stats.size, 'bytes');
      return compiledPdfPath;
    } else {
      throw new Error('PDF not found at expected path');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Helper functions from controller
function createSimpleLatexTemplate(subject, questionsText, questionPoints) {
  return `\\documentclass[12pt]{article}
\\usepackage[margin=1in]{geometry}
\\usepackage{amsmath}
\\usepackage{enumitem}

\\begin{document}

\\begin{center}
{\\Large\\bfseries ${subject} Practice Exam}

\\vspace{0.3cm}

{\\normalsize Total: ${questionPoints.reduce((sum, p) => sum + p, 0)} points}
\\end{center}

\\vspace{0.5cm}

${addPointsToQuestions(questionsText, questionPoints)}

\\end{document}`;
}

function addPointsToQuestions(questionsText, questionPoints) {
  if (!questionPoints || questionPoints.length === 0) {
    return questionsText;
  }
  
  const lines = questionsText.split('\\n');
  const result = [];
  let questionIndex = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if this line starts a new question
    const questionMatch = line.match(/^(\\d+)\\.\\s*(.*)/);
    if (questionMatch && questionIndex < questionPoints.length) {
      const questionNum = questionMatch[1];
      const questionText = questionMatch[2];
      const points = questionPoints[questionIndex];
      
      // Add the question with points
      result.push(`${questionNum}. ${questionText} [${points} points]`);
      questionIndex++;
    } else {
      // Keep the line as is
      result.push(line);
    }
  }
  
  return result.join('\\n');
}

testControllerLogic()
  .then(pdfPath => {
    console.log('🎉 SUCCESS! PDF created at:', pdfPath);
    console.log('✅ Controller logic works correctly');
  })
  .catch(error => {
    console.log('💥 FAILED:', error.message);
  }); 