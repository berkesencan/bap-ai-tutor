require('dotenv').config();
const fs = require('fs');

/**
 * STEP 2.5: FIXED - REPLACE QUESTIONS IN GOLDEN LATEX
 * 
 * Takes the golden LaTeX from Step 2 and replaces only the question content
 * with the new questions from Step 1.5 while preserving perfect formatting
 */

async function createPerfectExamFixed() {
  console.log('🚀 STEP 2.5 FIXED: Replace Questions in Golden LaTeX');
  console.log('==================================================');
  
  try {
    // Load the GOLDEN LaTeX from Step 2
    const goldenLatexPath = 'simple-gemini-output/gemini-generated.tex';
    if (!fs.existsSync(goldenLatexPath)) {
      throw new Error('❌ Step 2 golden LaTeX not found. Run simple-gemini-conversion.js first');
    }
    
    // Load the new questions from Step 1.5
    const newQuestionsPath = 'step1.5-output/new-questions-text.txt';
    if (!fs.existsSync(newQuestionsPath)) {
      throw new Error('❌ Step 1.5 new questions not found. Run step1.5-generate-new-questions.js first');
    }
    
    const goldenLatex = fs.readFileSync(goldenLatexPath, 'utf8');
    const newQuestionsText = fs.readFileSync(newQuestionsPath, 'utf8');
    
    console.log(`📄 Golden LaTeX loaded: ${goldenLatex.length} characters`);
    console.log(`📋 New questions loaded: ${newQuestionsText.length} characters`);
    
    // Extract header and structure from golden LaTeX (everything before problems)
    const headerMatch = goldenLatex.match(/(.*?)(?=Problem\\s*1|\\end{document})/s);
    if (!headerMatch) {
      throw new Error('❌ Could not find header section in golden LaTeX');
    }
    
    const goldenHeader = headerMatch[1];
    console.log(`📋 Golden header extracted: ${goldenHeader.length} characters`);
    
    // Parse new questions to get individual problems
    const newProblems = parseQuestionsToLatex(newQuestionsText);
    console.log(`🔢 Parsed ${newProblems.length} new problems`);
    
    // Create the perfect exam by combining golden header + new problems
    const perfectExam = createPerfectExamLatex(goldenHeader, newProblems);
    
    // Save the result
    const outputDir = 'step2.5-output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputPath = `${outputDir}/perfect-exam-FIXED.tex`;
    fs.writeFileSync(outputPath, perfectExam);
    
    console.log(`💾 Perfect exam saved: ${outputPath}`);
    console.log(`📊 Final LaTeX length: ${perfectExam.length} characters`);
    
    // Show preview
    console.log(`\\n📝 Perfect Exam Preview (first 800 chars):`);
    console.log('='.repeat(60));
    console.log(perfectExam.substring(0, 800));
    console.log('='.repeat(60));
    
    console.log(`\\n✅ STEP 2.5 FIXED COMPLETED!`);
    console.log(`📄 File: ${outputPath}`);
    console.log(`🔧 Next: node step3-enhanced-pdf-compiler.js`);
    
    return outputPath;
    
  } catch (error) {
    console.error('❌ Step 2.5 failed:', error.message);
    throw error;
  }
}

function parseQuestionsToLatex(questionsText) {
  const problems = [];
  
  // Split by "Problem" but keep the header intact
  const sections = questionsText.split(/(?=Problem\\s+\\d+)/);
  
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i].trim();
    if (section.includes('Problem') && section.length > 50) {
      // Extract problem number
      const problemMatch = section.match(/Problem\\s+(\\d+)/);
      const problemNumber = problemMatch ? problemMatch[1] : (i + 1);
      
      // Clean up the problem content
      let problemContent = section.replace(/Problem\\s+\\d+[\\s\\n]*/, '');
      
      // Convert to proper LaTeX format
      problemContent = convertToLatexFormat(problemContent);
      
      problems.push({
        number: problemNumber,
        content: problemContent
      });
    }
  }
  
  return problems;
}

function convertToLatexFormat(content) {
  // Clean up and format the content for LaTeX
  let formatted = content;
  
  // Convert newlines to proper spacing
  formatted = formatted.replace(/\\n{3,}/g, '\\n\\n\\n'); // Limit excessive newlines
  formatted = formatted.replace(/\\n{2}/g, '\\n\\n'); // Double newlines for paragraphs
  
  // Handle point values
  formatted = formatted.replace(/\\[(\\d+)\\s*points?\\]/gi, '[\\\\textbf{$1 points}]');
  
  // Handle sub-problems (a., b., c., etc.)
  formatted = formatted.replace(/^([a-z])\\.\\s/gm, '\\\\item[\\\\textbf{$1.}] ');
  
  // Handle MPI code formatting
  formatted = formatted.replace(/MPI_([A-Z_]+)/g, '\\\\texttt{MPI\\\\_$1}');
  
  // Handle special characters
  formatted = formatted.replace(/_/g, '\\\\_');
  formatted = formatted.replace(/&/g, '\\\\&');
  formatted = formatted.replace(/#/g, '\\\\#');
  
  return formatted;
}

function createPerfectExamLatex(goldenHeader, newProblems) {
  let perfectLatex = goldenHeader;
  
  // Add the new problems
  newProblems.forEach((problem, index) => {
    perfectLatex += `\\n\\n\\\\section*{Problem ${problem.number}}\\n\\n`;
    perfectLatex += problem.content;
    
    if (index < newProblems.length - 1) {
      perfectLatex += '\\n\\n\\\\newpage\\n';
    }
  });
  
  // Close the document
  perfectLatex += '\\n\\n\\\\end{document}';
  
  return perfectLatex;
}

// Run the fixed perfect exam creation
createPerfectExamFixed()
  .then((outputPath) => {
    console.log(`\\n🎉 STEP 2.5 FIXED SUCCESS!`);
    console.log(`📄 Perfect exam: ${outputPath}`);
    console.log(`\\n🔧 Next: node step3-enhanced-pdf-compiler.js`);
  })
  .catch((error) => {
    console.error('💥 Step 2.5 FIXED failed:', error);
    process.exit(1);
  }); 