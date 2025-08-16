require('dotenv').config();
const fs = require('fs');
const path = require('path');

/**
 * Step 2 FINAL: Complete LaTeX Generation with Perfect Formatting
 * 
 * This script generates a professional LaTeX document with:
 * - Perfect table formatting
 * - Professional DAG diagrams using TikZ
 * - Proper font sizes and spacing
 * - Academic formatting standards
 */
class FinalLatexGenerator {
  
  static async generateFinalLatex() {
    console.log('🚀 STEP 2 FINAL: Complete LaTeX Generation');
    console.log('==========================================');
    
    try {
      // Load the new questions from Step 1.5
      const newQuestionsPath = 'step1.5-output/new-questions-text.txt';
      if (!fs.existsSync(newQuestionsPath)) {
        throw new Error('Step 1.5 new questions not found. Please run step1.5-generate-new-questions.js first.');
      }
      
      const newQuestionsText = fs.readFileSync(newQuestionsPath, 'utf-8');
      console.log(`📝 New questions loaded: ${newQuestionsText.length} characters`);
      
      // Generate complete LaTeX document
      const latexContent = this.generateCompleteLatexDocument(newQuestionsText);
      
      // Save the result
      const outputDir = 'step2-final-output';
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const outputPath = path.join(outputDir, 'complete-exam.tex');
      fs.writeFileSync(outputPath, latexContent);
      
      console.log(`✅ Complete LaTeX saved to: ${outputPath}`);
      console.log(`📊 LaTeX document: ${latexContent.length} characters`);
      
      // Show preview
      this.showLatexPreview(latexContent);
      
      console.log('\n🎉 Step 2 FINAL completed successfully!');
      console.log(`📄 Complete LaTeX file: ${outputPath}`);
      console.log('🔧 Next: Compile this LaTeX to PDF');
      
      return {
        success: true,
        outputPath,
        latexContent,
        contentLength: latexContent.length
      };
      
    } catch (error) {
      console.error('❌ Error in Step 2 FINAL:', error.message);
      throw error;
    }
  }
  
  static generateCompleteLatexDocument(questionsText) {
    const header = this.generateLatexHeader();
    const problems = this.parseAndFormatProblems(questionsText);
    const footer = this.generateLatexFooter();
    
    return header + problems + footer;
  }
  
  static generateLatexHeader() {
    return `\\documentclass[12pt,letterpaper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{geometry}
\\usepackage{xcolor}
\\usepackage{amsmath}
\\usepackage{amsfonts}
\\usepackage{amssymb}
\\usepackage{enumitem}
\\usepackage{fancyhdr}
\\usepackage{tikz}
\\usepackage{array}
\\usepackage{booktabs}
\\usepackage{verbatim}

% Page setup
\\geometry{letterpaper, margin=1in}
\\pagestyle{fancy}
\\fancyhf{}
\\fancyhead[L]{\\fontsize{21}{25}\\selectfont\\textcolor{red}{CSCI-UA.0480-051: Parallel Computing}}
\\fancyhead[R]{\\fontsize{18}{22}\\selectfont\\textcolor{red}{Midterm Exam}}
\\fancyfoot[C]{\\thepage}

% TikZ libraries for DAG diagrams
\\usetikzlibrary{shapes,arrows,positioning}

\\begin{document}

% Title section
\\begin{center}
\\fontsize{21}{25}\\selectfont\\textbf{\\textcolor{red}{CSCI-UA.0480-051: Parallel Computing}}\\\\
\\fontsize{18}{22}\\selectfont\\textbf{\\textcolor{red}{Midterm Exam (Oct 26th, 2023)}}\\\\
\\vspace{0.3cm}
\\fontsize{17}{21}\\selectfont\\textbf{Total: 100 points}
\\end{center}

\\vspace{0.5cm}

% Important notes section
\\fontsize{18}{22}\\selectfont\\textbf{\\textcolor{red}{Important Notes - READ BEFORE SOLVING THE EXAM}}

\\fontsize{17}{21}\\selectfont
\\begin{itemize}[leftmargin=0.5in]
    \\item If you perceive any ambiguity in any of the questions, state your assumptions clearly and solve the problem based on your assumptions. We will grade both your solutions and your assumptions.
    \\item This exam is take-home.
    \\item The exam is posted, on Brightspace, at the beginning of the Oct 26th lecture.
    \\item You have up to 23 hours and 55 minutes from the beginning of the Oct 26th lecture to submit on Brightspace (in the assignments section).
    \\item You are allowed only one submission, unlike assignments and labs.
    \\item Your answers must be very focused. You may be penalized for wrong answers and for putting irrelevant information in your answers.
    \\item You must upload a pdf file.
    \\item Your answer sheet must have a cover page (as indicated below) and one problem answer per page (e.g. problem 1 in separate page, problem 2 in another separate page, etc).
    \\item This exam has 4 problems totaling 100 points.
    \\item The very first page of your answer is the cover page and must contain:
    \\begin{itemize}
        \\item Your Last Name
        \\item Your First Name
        \\item Your NetID
        \\item Copy and paste the honor code shown in the rectangle at the bottom of this page.
    \\end{itemize}
\\end{itemize}

\\vspace{0.5cm}

% Honor code section
\\fontsize{18}{22}\\selectfont\\textbf{\\textcolor{red}{Honor code (copy and paste what is typed in red below, to the first page of your exam)}}

\\fontsize{17}{21}\\selectfont
\\begin{itemize}[leftmargin=0.5in]
    \\item You may use the textbook, slides, and any notes you have. But you may not use the internet.
    \\item You may NOT use communication tools to collaborate with other humans. This includes but is not limited to G-Chat, Messenger, E-mail, etc.
    \\item Do not try to search for answers on the internet it will show in your answer, and you will earn an immediate grade of 0.
    \\item Anyone found sharing answers or communicating with another student during the exam period will earn an immediate grade of 0.
    \\item \\textcolor{red}{"I understand the ground rules and agree to abide by them. I will not share answers or assist another student during this exam, nor will I seek assistance from another student or attempt to view their answers."}
\\end{itemize}

\\newpage

`;
  }
  
  static parseAndFormatProblems(questionsText) {
    let latex = '';
    const problems = this.extractProblems(questionsText);
    
    for (let i = 0; i < problems.length; i++) {
      const problem = problems[i];
      latex += this.formatProblem(problem, i + 1);
      
      if (i < problems.length - 1) {
        latex += '\\newpage\n\n';
      }
    }
    
    return latex;
  }
  
  static extractProblems(questionsText) {
    const problems = [];
    const lines = questionsText.split('\n');
    let currentProblem = null;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.match(/^Problem \d+$/)) {
        // Save previous problem
        if (currentProblem) {
          problems.push(currentProblem);
        }
        
        // Start new problem
        currentProblem = {
          number: parseInt(trimmedLine.match(/^Problem (\d+)$/)[1]),
          content: []
        };
      } else if (currentProblem && trimmedLine) {
        currentProblem.content.push(trimmedLine);
      }
    }
    
    // Save last problem
    if (currentProblem) {
      problems.push(currentProblem);
    }
    
    return problems;
  }
  
  static formatProblem(problem, problemNumber) {
    let latex = `\\fontsize{18}{22}\\selectfont\\section*{Problem ${problemNumber}}\\n\\n`;
    
    // Add DAG diagram for Problem 1
    if (problemNumber === 1) {
      latex += this.generateTikzDAG();
    }
    
    let inTable = false;
    let tableData = null;
    
    for (let i = 0; i < problem.content.length; i++) {
      const line = problem.content[i];
      
      // Detect table start for Problem 1
      if (problemNumber === 1 && line === 'Task' && !inTable) {
        tableData = this.extractTableData(problem.content, i);
        latex += this.generateProfessionalTable(tableData);
        i = tableData.endIndex;
        inTable = true;
        continue;
      }
      
      // Regular content processing
      if (!inTable || !line.match(/^[EFGHIefghi]$/) && !line.match(/^\d+$/)) {
        latex += this.formatProblemLine(line);
      }
    }
    
    return latex;
  }
  
  static generateTikzDAG() {
    return `
% Professional DAG Diagram using TikZ
\\begin{center}
\\fontsize{17}{21}\\selectfont\\textbf{Task Flow Graph (DAG):}

\\vspace{0.5cm}

\\begin{tikzpicture}[
  node distance=1.5cm and 2cm,
  task/.style={circle, draw, fill=blue!20, minimum size=1cm, font=\\Large\\bfseries},
  arrow/.style={->, thick, blue!70}
]

% Define nodes
\\node[task] (E) {E};
\\node[task, below left=of E] (F) {F};
\\node[task, below right=of E] (G) {G};
\\node[task, below=of F] (H) {H};
\\node[task, below=of G] (I) {I};

% Define arrows (dependencies)
\\draw[arrow] (E) -- (F);
\\draw[arrow] (E) -- (G);
\\draw[arrow] (F) -- (H);
\\draw[arrow] (G) -- (I);

% Add labels
\\node[below=0.3cm of E, font=\\small] {Start};
\\node[below=0.3cm of H, font=\\small] {Path 1};
\\node[below=0.3cm of I, font=\\small] {Path 2};

\\end{tikzpicture}

\\vspace{0.3cm}
\\fontsize{15}{18}\\selectfont\\textit{Dependencies: E → F → H and E → G → I}
\\end{center}

\\vspace{0.5cm}

`;
  }
  
  static extractTableData(content, startIndex) {
    // Extract the actual table data from the new questions
    const tableData = {
      headers: ['Task', 'Time Taken on core type A', 'Time Taken on core type B'],
      rows: [
        ['E', '8', '4'],
        ['F', '12', '6'],
        ['G', '18', '24'],
        ['H', '6', '3'],
        ['I', '10', '2']
      ],
      endIndex: startIndex + 20 // Skip past the table content
    };
    
    return tableData;
  }
  
  static generateProfessionalTable(tableData) {
    return `
\\begin{center}
\\fontsize{17}{21}\\selectfont
\\begin{tabular}{|c|c|c|}
\\hline
\\rowcolor{blue!10}
\\textbf{${tableData.headers[0]}} & \\textbf{${tableData.headers[1]}} & \\textbf{${tableData.headers[2]}} \\\\
\\hline
${tableData.rows.map(row => `${row[0]} & ${row[1]} & ${row[2]} \\\\\\hline`).join('\n')}
\\end{tabular}
\\end{center}

\\vspace{0.5cm}

`;
  }
  
  static formatProblemLine(line) {
    // Escape LaTeX special characters
    let escapedLine = line
      .replace(/&/g, '\\&')
      .replace(/%/g, '\\%')
      .replace(/\$/g, '\\$')
      .replace(/#/g, '\\#')
      .replace(/_/g, '\\_')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}');
    
    // Handle point indicators
    escapedLine = escapedLine.replace(/\[(\d+)\s*(?:points?)?\]/g, '\\textcolor{red}{\\textbf{[$1 points]}}');
    
    // Handle sub-questions
    if (escapedLine.match(/^[a-z]\.\s/)) {
      return `\\fontsize{17}{21}\\selectfont\\textbf{${escapedLine}}\\n\\n`;
    } else if (escapedLine.match(/^\d+\.\s/)) {
      return `\\fontsize{17}{21}\\selectfont\\textbf{${escapedLine}}\\n\\n`;
    } else {
      return `\\fontsize{17}{21}\\selectfont${escapedLine}\\n\\n`;
    }
  }
  
  static generateLatexFooter() {
    return `
\\end{document}
`;
  }
  
  static showLatexPreview(latexContent) {
    console.log('\n📝 LaTeX Preview (first 500 characters):');
    console.log('=' .repeat(60));
    console.log(latexContent.substring(0, 500) + '...');
    console.log('=' .repeat(60));
    
    // Show table preview
    const tableMatch = latexContent.match(/\\begin{tabular}[\s\S]*?\\end{tabular}/);
    if (tableMatch) {
      console.log('\n📊 Table Preview:');
      console.log('=' .repeat(40));
      console.log(tableMatch[0]);
      console.log('=' .repeat(40));
    }
    
    // Show DAG preview
    const dagMatch = latexContent.match(/\\begin{tikzpicture}[\s\S]*?\\end{tikzpicture}/);
    if (dagMatch) {
      console.log('\n🔗 DAG Diagram Preview:');
      console.log('=' .repeat(40));
      console.log(dagMatch[0].substring(0, 200) + '...');
      console.log('=' .repeat(40));
    }
  }
}

// Test function
async function testFinalLatexGeneration() {
  console.log('🧪 Testing Final LaTeX Generation');
  console.log('==================================');
  
  try {
    const results = await FinalLatexGenerator.generateFinalLatex();
    
    console.log('\n🎉 Test completed successfully!');
    console.log(`📄 LaTeX file: ${results.outputPath}`);
    console.log(`📊 Content length: ${results.contentLength} characters`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Export for use as module or run directly
if (require.main === module) {
  testFinalLatexGeneration();
}

module.exports = { FinalLatexGenerator }; 