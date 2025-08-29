require('dotenv').config();
const fs = require('fs');

async function replaceQuestionsProper() {
  console.log('🚀 Step 2.5 PROPER: Replace Questions Correctly');
  console.log('================================================');
  
  try {
    // Read the successful simple LaTeX
    const successfulLatexPath = 'simple-gemini-output/gemini-generated.tex';
    if (!fs.existsSync(successfulLatexPath)) {
      throw new Error('Successful simple LaTeX not found.');
    }
    
    // Read the new questions from Step 1.5
    const newQuestionsPath = 'step1.5-output/new-questions-text.txt';
    if (!fs.existsSync(newQuestionsPath)) {
      throw new Error('Step 1.5 new questions not found.');
    }
    
    let originalLatex = fs.readFileSync(successfulLatexPath, 'utf-8');
    let newQuestionsText = fs.readFileSync(newQuestionsPath, 'utf-8');
    
    console.log(`📄 Original LaTeX: ${originalLatex.length} characters`);
    console.log(`📝 New questions: ${newQuestionsText.length} characters`);
    
    // Extract just the problems from the new questions text
    const problemsStart = newQuestionsText.indexOf('Problem 1');
    if (problemsStart === -1) {
      throw new Error('Could not find Problem 1 in new questions');
    }
    
    const newProblemsText = newQuestionsText.substring(problemsStart).trim();
    console.log(`🎯 Extracted problems text: ${newProblemsText.length} characters`);
    
    // Find where the problems start in the original LaTeX
    const latexProblemsStart = originalLatex.indexOf('\\section*{Problem 1}');
    if (latexProblemsStart === -1) {
      throw new Error('Could not find Problem 1 section in original LaTeX');
    }
    
    // Find where the problems end
    const latexProblemsEnd = originalLatex.indexOf('\\end{document}');
    if (latexProblemsEnd === -1) {
      throw new Error('Could not find end of document in original LaTeX');
    }
    
    // Extract header and footer
    const latexHeader = originalLatex.substring(0, latexProblemsStart);
    const latexFooter = originalLatex.substring(latexProblemsEnd);
    
    // Convert problems to LaTeX
    let newProblemsLatex = convertTextToLatex(newProblemsText);
    
    // Combine everything
    const finalLatex = latexHeader + newProblemsLatex + latexFooter;
    
    // Save the result
    if (!fs.existsSync('step2.5-output')) {
      fs.mkdirSync('step2.5-output');
    }
    
    const outputPath = 'step2.5-output/latex-with-new-questions-proper.tex';
    fs.writeFileSync(outputPath, finalLatex);
    
    console.log(`✅ Saved proper LaTeX to: ${outputPath}`);
    console.log('🎉 Step 2.5 PROPER completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

function convertTextToLatex(problemsText) {
  let latex = '';
  const lines = problemsText.split('\n');
  let inProblemContent = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) {
      if (inProblemContent) latex += '\n\n';
      continue;
    }
    
    // Check if this is a problem header
    const problemMatch = line.match(/^Problem (\d+)$/);
    if (problemMatch) {
      const problemNum = problemMatch[1];
      latex += `\\section*{Problem ${problemNum}}\n`;
      inProblemContent = true;
      continue;
    }
    
    // Handle problem content
    if (inProblemContent) {
      // Escape LaTeX special characters
      let escapedLine = line
        .replace(/&/g, '\\&')
        .replace(/_/g, '\\_')
        .replace(/%/g, '\\%')
        .replace(/\$/g, '\\$')
        .replace(/#/g, '\\#');
      
      // Handle point indicators
      escapedLine = escapedLine.replace(/\[(\d+)( points?)?\]/g, '\\textbf{[$1 points]}');
      
      // Handle sub-questions
      if (escapedLine.match(/^[a-z]\./)) {
        latex += `\\textbf{${escapedLine}}\n\n`;
      } else if (escapedLine.match(/^\d+\./)) {
        latex += `\\textbf{${escapedLine}}\n\n`;
      } else {
        latex += `${escapedLine}\n\n`;
      }
    }
  }
  
  return latex;
}

// Run the function
replaceQuestionsProper().catch(console.error);

 
 
 
 
 
 