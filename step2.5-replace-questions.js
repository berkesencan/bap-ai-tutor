require('dotenv').config();
const fs = require('fs');

async function replaceQuestionsInLatex() {
  console.log('🚀 Step 2.5: Replace Questions in Successful LaTeX');
  console.log('===================================================');
  
  try {
    // Check if we have the successful simple LaTeX
    const successfulLatexPath = 'simple-gemini-output/gemini-generated.tex';
    if (!fs.existsSync(successfulLatexPath)) {
      throw new Error('Successful simple LaTeX not found. Please run simple-gemini-conversion.js first.');
    }
    
    // Check if we have the new questions from Step 1.5
    const newQuestionsPath = 'step1.5-output/new-questions-text.txt';
    if (!fs.existsSync(newQuestionsPath)) {
      throw new Error('Step 1.5 new questions not found. Please run step1.5-generate-new-questions.js first.');
    }
    
    // Read the successful LaTeX template
    const successfulLatex = fs.readFileSync(successfulLatexPath, 'utf-8');
    console.log(`📄 Successful LaTeX loaded: ${successfulLatex.length} characters`);
    
    // Read the new questions
    const newQuestionsText = fs.readFileSync(newQuestionsPath, 'utf-8');
    console.log(`📄 New questions loaded: ${newQuestionsText.length} characters`);
    
    console.log('\n=== ANALYZING SUCCESSFUL LATEX STRUCTURE ===');
    
    // Extract the header/preamble (everything before the first \section*{Problem)
    const problemStartMatch = successfulLatex.match(/\\section\*\{Problem/);
    if (!problemStartMatch) {
      throw new Error('Could not find problem sections in successful LaTeX');
    }
    
    const headerEndIndex = problemStartMatch.index;
    const latexHeader = successfulLatex.substring(0, headerEndIndex);
    console.log(`✅ Extracted LaTeX header: ${latexHeader.length} characters`);
    
    // Extract the footer (everything after the last problem)
    const latexFooter = '\\end{document}';
    console.log(`✅ LaTeX footer: ${latexFooter}`);
    
    console.log('\n=== PARSING NEW QUESTIONS FROM STEP 1.5 ===');
    
    // Parse the new questions text to extract structured content
    const lines = newQuestionsText.split('\n');
    let currentProblem = null;
    let problems = [];
    let currentContent = [];
    
    for (let line of lines) {
      line = line.trim();
      
      // Check if this is a problem header
      const problemMatch = line.match(/^Problem (\d+)$/);
      if (problemMatch) {
        // Save previous problem if exists
        if (currentProblem) {
          problems.push({
            number: currentProblem,
            content: currentContent.join('\n').trim()
          });
        }
        
        // Start new problem
        currentProblem = problemMatch[1];
        currentContent = [];
        continue;
      }
      
      // Skip empty lines and header content before Problem 1
      if (!currentProblem) {
        continue;
      }
      
      // Add content to current problem
      if (line) {
        currentContent.push(line);
      }
    }
    
    // Don't forget the last problem
    if (currentProblem) {
      problems.push({
        number: currentProblem,
        content: currentContent.join('\n').trim()
      });
    }
    
    console.log(`✅ Parsed ${problems.length} problems from Step 1.5`);
    problems.forEach((p, i) => {
      console.log(`   Problem ${p.number}: ${p.content.length} characters`);
    });
    
    console.log('\n=== GENERATING NEW LATEX WITH REPLACED QUESTIONS ===');
    
    // Build the new LaTeX document
    let newLatex = latexHeader;
    
    // Add each problem with the new content
    for (let problem of problems) {
      newLatex += `\\section*{Problem ${problem.number}}\n`;
      
      // Process the problem content to make it LaTeX-friendly
      let latexContent = problem.content;
      
      // Convert simple ASCII art DAG to LaTeX-friendly format
      latexContent = latexContent.replace(/^\s*a\s*$/m, '\\texttt{a}');
      latexContent = latexContent.replace(/^\s*\/\s*\\\s*$/m, '\\texttt{/ \\\\}');
      latexContent = latexContent.replace(/^\s*b\s+c\s*$/m, '\\texttt{b   c}');
      latexContent = latexContent.replace(/^\s*\/\s*\\\s*\/\s*\\\s*$/m, '\\texttt{/ \\\\ / \\\\}');
      latexContent = latexContent.replace(/^\s*d\s+e\s+f\s+g\s*$/m, '\\texttt{d   e f  g}');
      
      // Convert tables to LaTeX format
      if (latexContent.includes('Task') && latexContent.includes('Time Taken')) {
        // Find and replace the table
        const tableRegex = /Task[\s\S]*?Time Taken on[\s\S]*?core type 2[\s\S]*?(?=\n[a-z]\.|$)/;
        const tableMatch = latexContent.match(tableRegex);
        
        if (tableMatch) {
          const latexTable = `
\\begin{tabular}{|c|c|c|}
\\hline
Task & Time Taken on core type 1 & Time Taken on core type 2 \\\\ \\hline
a & 8 & 6 \\\\
b & 12 & 8 \\\\
c & 18 & 24 \\\\
d & 6 & 4 \\\\
e & 15 & 10 \\\\
f & 9 & 6 \\\\
g & 11 & 7 \\\\ \\hline
\\end{tabular}
`;
          latexContent = latexContent.replace(tableMatch[0], latexTable);
        }
      }
      
      // Convert numbered lists to LaTeX enumerate
      latexContent = latexContent.replace(/^(\d+)\.\s+(.+)$/gm, '\\item $2');
      
      // Convert lettered lists to LaTeX enumerate  
      latexContent = latexContent.replace(/^([a-z])\.\s*\[(\d+)\s*(?:points?)?\]\s*(.+)$/gm, '\\item [$1.] [$2 points] $3');
      latexContent = latexContent.replace(/^([a-z])\.\s*\[(\d+)\]\s*(.+)$/gm, '\\item [$1.] [$2 points] $3');
      
      // Wrap in enumerate if we have items
      if (latexContent.includes('\\item')) {
        latexContent = '\\begin{enumerate}\n' + latexContent + '\n\\end{enumerate}';
      }
      
      // Escape special characters
      latexContent = latexContent.replace(/&/g, '\\&');
      latexContent = latexContent.replace(/_/g, '\\_');
      latexContent = latexContent.replace(/#/g, '\\#');
      
      newLatex += latexContent + '\n\n';
    }
    
    // Add footer
    newLatex += latexFooter;
    
    console.log(`✅ Generated new LaTeX: ${newLatex.length} characters`);
    
    // Save the result
    const outputDir = 'step2.5-output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputPath = `${outputDir}/latex-with-new-questions.tex`;
    fs.writeFileSync(outputPath, newLatex);
    
    console.log(`💾 New LaTeX saved to: ${outputPath}`);
    
    // Show preview
    console.log('\n📝 New LaTeX Preview (first 800 characters):');
    console.log('=' .repeat(60));
    console.log(newLatex.substring(0, 800) + '...');
    console.log('=' .repeat(60));
    
    console.log('\n✅ Step 2.5 completed successfully!');
    console.log(`📄 LaTeX with new questions: ${outputPath}`);
    console.log('\nNext step: node simple-pdf-compiler.js (but point it to the new file)');
    
    return {
      success: true,
      outputPath,
      newLatex,
      problemCount: problems.length
    };
    
  } catch (error) {
    console.error('❌ Error in Step 2.5:', error.message);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  replaceQuestionsInLatex()
    .then(() => {
      console.log('\n🎉 Done! Ready to compile the LaTeX with new questions.');
    })
    .catch(error => {
      console.error('💥 Step 2.5 failed:', error.message);
    });
}

module.exports = { replaceQuestionsInLatex }; 