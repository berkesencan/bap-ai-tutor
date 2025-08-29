require('dotenv').config();
const fs = require('fs');

async function replaceQuestionsInLatexFixed() {
  console.log('🚀 Step 2.5 FIXED: Replace Questions in Successful LaTeX');
  console.log('======================================================');
  
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
    
    // Extract the header (everything before the first \section*{Problem)
    const problemStartMatch = successfulLatex.match(/\\section\*\{Problem/);
    if (!problemStartMatch) {
      throw new Error('Could not find problem sections in successful LaTeX');
    }
    
    const headerEndIndex = problemStartMatch.index;
    const latexHeader = successfulLatex.substring(0, headerEndIndex);
    console.log(`✅ Extracted LaTeX header: ${latexHeader.length} characters`);
    
    console.log('\n=== PARSING NEW QUESTIONS FROM STEP 1.5 ===');
    
    // Parse the new questions text - they are in numbered format (1., 2., etc.)
    const lines = newQuestionsText.split('\n');
    let currentProblem = null;
    let problems = [];
    let currentContent = [];
    let inHeader = true;
    
    for (let line of lines) {
      line = line.trim();
      
      // Skip header content until we find the first numbered question
      if (inHeader) {
        // Look for numbered questions (1., 2., etc.)
        const numberMatch = line.match(/^(\d+)\.\s+(.+)$/);
        if (numberMatch) {
          inHeader = false;
          currentProblem = numberMatch[1];
          currentContent = [numberMatch[2]]; // Start with the question text
          continue;
        }
        continue; // Skip header lines
      }
      
      // Check if this is a new numbered question
      const numberMatch = line.match(/^(\d+)\.\s+(.+)$/);
      if (numberMatch) {
        // Save previous problem if exists
        if (currentProblem) {
          problems.push({
            number: currentProblem,
            content: currentContent.join('\n').trim()
          });
        }
        
        // Start new problem
        currentProblem = numberMatch[1];
        currentContent = [numberMatch[2]]; // Start with the question text
        continue;
      }
      
      // Add content to current problem (including empty lines for spacing)
      if (currentProblem) {
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
      
      // Convert HTML-style superscripts and subscripts to LaTeX
      latexContent = latexContent.replace(/<sup>([^<]+)<\/sup>/g, '^{$1}');
      latexContent = latexContent.replace(/<sub>([^<]+)<\/sub>/g, '_{$1}');
      
      // Convert special characters to LaTeX
      latexContent = latexContent.replace(/≥/g, '\\geq ');
      latexContent = latexContent.replace(/≤/g, '\\leq ');
      latexContent = latexContent.replace(/∞/g, '\\infty');
      latexContent = latexContent.replace(/∑/g, '\\sum');
      latexContent = latexContent.replace(/θ/g, '\\Theta');
      latexContent = latexContent.replace(/Θ/g, '\\Theta');
      latexContent = latexContent.replace(/ω/g, '\\omega');
      latexContent = latexContent.replace(/Ω/g, '\\Omega');
      latexContent = latexContent.replace(/∈/g, '\\in');
      latexContent = latexContent.replace(/ℕ/g, '\\mathbb{N}');
      latexContent = latexContent.replace(/→/g, '\\to');
      latexContent = latexContent.replace(/⌊/g, '\\lfloor');
      latexContent = latexContent.replace(/⌋/g, '\\rfloor');
      latexContent = latexContent.replace(/⌈/g, '\\lceil');
      latexContent = latexContent.replace(/⌉/g, '\\rceil');
      latexContent = latexContent.replace(/̸=/g, '\\neq');
      
      // Convert fractions
      latexContent = latexContent.replace(/(\w+)\s*−\s*1\s*\/\s*(\w+)−1/g, '\\frac{$1-1}{$2-1}');
      
      // Wrap mathematical expressions in $ $
      latexContent = latexContent.replace(/\bf\(([^)]+)\)/g, '$f($1)$');
      latexContent = latexContent.replace(/\bg\(([^)]+)\)/g, '$g($1)$');
      latexContent = latexContent.replace(/\bT\(([^)]+)\)/g, '$T($1)$');
      latexContent = latexContent.replace(/\bO\(([^)]+)\)/g, '$O($1)$');
      latexContent = latexContent.replace(/\bn\^(\d+)/g, '$n^{$1}$');
      latexContent = latexContent.replace(/\blog_(\d+)/g, '$\\log_{$1}$');
      latexContent = latexContent.replace(/\b(\d+)\^([^\\s]+)/g, '$1^{$2}$');
      
      // Convert lettered sub-questions to LaTeX enumerate
      const subQuestions = latexContent.split(/\n\s*\([a-z]\)/);
      if (subQuestions.length > 1) {
        // This has sub-questions
        latexContent = subQuestions[0] + '\n\\begin{enumerate}\n';
        for (let i = 1; i < subQuestions.length; i++) {
          latexContent += `\\item ${subQuestions[i].trim()}\n`;
        }
        latexContent += '\\end{enumerate}';
      }
      
      // Escape remaining special characters
      latexContent = latexContent.replace(/&/g, '\\&');
      latexContent = latexContent.replace(/_/g, '\\_');
      latexContent = latexContent.replace(/#/g, '\\#');
      latexContent = latexContent.replace(/%/g, '\\%');
      
      newLatex += latexContent + '\n\n';
    }
    
    // Add the Master Theorem section from the original (if it exists)
    const masterTheoremMatch = successfulLatex.match(/(\\section\*\{Our Master Theorem\}[\s\S]*?)\\end\{document\}/);
    if (masterTheoremMatch) {
      newLatex += masterTheoremMatch[1];
    }
    
    // Add footer
    newLatex += '\\end{document}';
    
    console.log(`✅ Generated new LaTeX: ${newLatex.length} characters`);
    
    // Save the result
    const outputDir = 'step2.5-output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputPath = `${outputDir}/latex-with-new-questions-fixed.tex`;
    fs.writeFileSync(outputPath, newLatex);
    
    console.log(`💾 New LaTeX saved to: ${outputPath}`);
    
    // Show preview
    console.log('\n📝 New LaTeX Preview (first 800 characters):');
    console.log('=' .repeat(60));
    console.log(newLatex.substring(0, 800) + '...');
    console.log('=' .repeat(60));
    
    console.log('\n✅ Step 2.5 FIXED completed successfully!');
    console.log(`📄 LaTeX with new questions: ${outputPath}`);
    console.log('\nNext step: Compile this LaTeX to PDF');
    
    return {
      success: true,
      outputPath,
      newLatex,
      problemCount: problems.length
    };
    
  } catch (error) {
    console.error('❌ Error in Step 2.5 FIXED:', error.message);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  replaceQuestionsInLatexFixed()
    .then(() => {
      console.log('\n🎉 Done! Ready to compile the LaTeX with new questions.');
    })
    .catch(error => {
      console.error('💥 Step 2.5 FIXED failed:', error.message);
    });
}

module.exports = { replaceQuestionsInLatexFixed }; 