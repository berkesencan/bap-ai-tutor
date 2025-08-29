const fs = require('fs');

function fixLatexFormatting() {
  console.log('🔧 Fixing LaTeX formatting issues...');
  
  const inputPath = 'step2.5-output/latex-with-new-questions.tex';
  const outputPath = 'step2.5-output/latex-with-new-questions-fixed.tex';
  
  let latex = fs.readFileSync(inputPath, 'utf-8');
  
  // Fix the main issues:
  
  // 1. Fix the enumerate environment in Problem 1
  latex = latex.replace(
    /\\section\*\{Problem 1\}\s*\\begin\{enumerate\}\s*Assume we have/,
    '\\section*{Problem 1}\nAssume we have'
  );
  
  // 2. Fix the table formatting
  latex = latex.replace(/\\\\ \\hline/g, '\\\\ \\hline');
  
  // 3. Fix the enumerate items to be properly formatted
  latex = latex.replace(/\\item \[([a-z])\.\] \[(\d+) points\]/g, '\\item[\\textbf{$1.}] \\textbf{[$2 points]}');
  
  // 4. Fix Problem 2 structure
  latex = latex.replace(
    /\\section\*\{Problem 2\}\s*\\begin\{enumerate\}\s*\\item \[a\.\] \[5 points\]/,
    '\\section*{Problem 2}\n\\begin{enumerate}\n\\item[\\textbf{a.}] \\textbf{[5 points]}'
  );
  
  // 5. Fix Problem 3 structure  
  latex = latex.replace(
    /\\section\*\{Problem 3\}\s*\\begin\{enumerate\}\s*a\. Suppose you have/,
    '\\section*{Problem 3}\n\\begin{enumerate}\n\\item[\\textbf{a.}] Suppose you have'
  );
  
  // 6. Fix Problem 4 structure
  latex = latex.replace(
    /\\section\*\{Problem 4\}\s*\\begin\{enumerate\}\s*For problem 4, assume/,
    '\\section*{Problem 4}\nFor problem 4, assume'
  );
  
  // 7. Add proper enumerate for Problem 1 sub-items
  latex = latex.replace(
    /(\n)\\item \[a\.\] \[5 points\] If we use all cores/,
    '$1\\begin{enumerate}\n\\item[\\textbf{a.}] \\textbf{[5 points]} If we use all cores'
  );
  
  // 8. Close enumerate before Problem 2
  latex = latex.replace(
    /no more than two lines of explanation as to why there is no solution\.\s*\\end\{enumerate\}\s*\\section\*\{Problem 2\}/,
    'no more than two lines of explanation as to why there is no solution.\n\\end{enumerate}\n\n\\section*{Problem 2}'
  );
  
  // 9. Fix the numbered sub-items in Problem 2
  latex = latex.replace(/\\item A single-core processor/g, '\\item[1.] A single-core processor');
  latex = latex.replace(/\\item A single-core processor with out-of-order/g, '\\item[2.] A single-core processor with out-of-order');
  latex = latex.replace(/\\item A multi-core processor/g, '\\item[3.] A multi-core processor');
  latex = latex.replace(/\\item A vector processor/g, '\\item[4.] A vector processor');
  latex = latex.replace(/\\item A GPU with many/g, '\\item[5.] A GPU with many');
  
  // 10. Fix the True/False items
  latex = latex.replace(/\\item Cache memory improves/g, '\\item[1.] Cache memory improves');
  latex = latex.replace(/\\item Amdahl's Law states/g, '\\item[2.] Amdahl\'s Law states');
  latex = latex.replace(/\\item A race condition/g, '\\item[3.] A race condition');
  latex = latex.replace(/\\item Deadlock occurs/g, '\\item[4.] Deadlock occurs');
  latex = latex.replace(/\\item Shared memory/g, '\\item[5.] Shared memory');
  
  // 11. Add proper enumerate structure for Problem 4
  latex = latex.replace(
    /(process 2: int A\[10\] = \{21, 22, 23, 24, 25, 26, 27, 28, 29, 30\};)\s*\\item \[a\.\]/,
    '$1\n\\begin{enumerate}\n\\item[\\textbf{a.}]'
  );
  
  fs.writeFileSync(outputPath, latex);
  console.log(`✅ Fixed LaTeX saved to: ${outputPath}`);
  
  return outputPath;
}

if (require.main === module) {
  const fixedPath = fixLatexFormatting();
  console.log('🎉 LaTeX formatting fixed!');
  console.log(`Next: compile ${fixedPath}`);
}

module.exports = { fixLatexFormatting }; 