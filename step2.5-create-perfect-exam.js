require('dotenv').config();
const fs = require('fs');

/**
 * STEP 2.5: CREATE PERFECT EXAM
 * 
 * This REPLACES the old step2.5-replace-questions.js
 * Instead of simple question replacement, this creates PERFECT EXAMS
 * with all the enhanced features like perfect-exam.pdf
 */

async function createPerfectExam() {
  console.log('🚀 STEP 2.5: CREATE PERFECT EXAM (ENHANCED)');
  console.log('===========================================');
  
  try {
    // Check if Step 1.5 new questions exist
    const newQuestionsPath = 'step1.5-output/new-questions-text.txt';
    if (!fs.existsSync(newQuestionsPath)) {
      throw new Error('❌ Step 1.5 new questions not found. Run step1.5-generate-new-questions.js first');
    }
    
    // Check if Step 1 HTML layout exists
    const htmlLayoutPath = 'step1-output/extracted-layout.html';
    if (!fs.existsSync(htmlLayoutPath)) {
      throw new Error('❌ Step 1 HTML layout not found. Run step1-pdf-extraction.js first');
    }
    
    // Load the inputs
    const newQuestions = fs.readFileSync(newQuestionsPath, 'utf8');
    const htmlLayout = fs.readFileSync(htmlLayoutPath, 'utf8');
    
    console.log(`📄 Loaded new questions: ${newQuestions.length} characters`);
    console.log(`🎨 Loaded HTML layout: ${htmlLayout.length} characters`);
    
    // Extract formatting info from HTML
    const formatInfo = extractFormattingFromHTML(htmlLayout);
    console.log(`🔍 Extracted formatting: ${JSON.stringify(formatInfo, null, 2)}`);
    
    // Parse new questions into structured format
    const parsedQuestions = parseNewQuestions(newQuestions);
    console.log(`📋 Parsed ${parsedQuestions.length} problems from new questions`);
    
    // Create PERFECT LaTeX with enhanced features
    const perfectLatex = createPerfectLatexWithQuestions(parsedQuestions, formatInfo);
    
    // Save the perfect exam
    const outputDir = 'step2.5-output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputPath = `${outputDir}/perfect-exam-with-new-questions.tex`;
    fs.writeFileSync(outputPath, perfectLatex);
    
    console.log(`💾 Perfect exam LaTeX saved: ${outputPath}`);
    console.log(`📊 LaTeX length: ${perfectLatex.length} characters`);
    
    // Show preview
    console.log(`\\n📝 Perfect Exam Preview (first 800 chars):`);
    console.log('='.repeat(60));
    console.log(perfectLatex.substring(0, 800));
    console.log('='.repeat(60));
    
    console.log(`\\n✅ STEP 2.5 COMPLETED - PERFECT EXAM CREATED!`);
    console.log(`📄 File: ${outputPath}`);
    console.log(`🔧 Next: Run step3-enhanced-pdf-compiler.js to create PDF`);
    
    return outputPath;
    
  } catch (error) {
    console.error('❌ Step 2.5 failed:', error.message);
    throw error;
  }
}

function extractFormattingFromHTML(htmlContent) {
  // Extract font sizes
  const fontSizes = [];
  const fontRegex = /font-size:\\s*(\\d+)px/g;
  let match;
  while ((match = fontRegex.exec(htmlContent)) !== null) {
    const size = parseInt(match[1]);
    if (!fontSizes.includes(size)) {
      fontSizes.push(size);
    }
  }
  
  // Extract colors
  const colors = [];
  const colorRegex = /color:\\s*(#[0-9a-fA-F]{6})/g;
  while ((match = colorRegex.exec(htmlContent)) !== null) {
    const color = match[1];
    if (!colors.includes(color)) {
      colors.push(color);
    }
  }
  
  return {
    fontSizes: fontSizes.sort((a, b) => b - a), // Largest first
    colors: colors,
    hasRedText: colors.includes('#ff0000'),
    titleSize: fontSizes[0] || 21,
    headerSize: fontSizes[1] || 18,
    bodySize: fontSizes[2] || 17
  };
}

function parseNewQuestions(questionsText) {
  const problems = [];
  
  // Split by "Problem" markers
  const problemSections = questionsText.split(/Problem\\s+\\d+/);
  
  for (let i = 1; i < problemSections.length; i++) { // Skip first empty section
    const problemContent = problemSections[i].trim();
    if (problemContent.length > 0) {
      problems.push({
        number: i,
        content: problemContent,
        parts: extractProblemParts(problemContent)
      });
    }
  }
  
  return problems;
}

function extractProblemParts(problemContent) {
  const parts = [];
  
  // Look for parts like "a.", "b.", "c.", etc.
  const partRegex = /([a-z])\\.[\\s\\S]*?(?=([a-z])\\.|$)/g;
  let match;
  
  while ((match = partRegex.exec(problemContent)) !== null) {
    parts.push({
      letter: match[1],
      content: match[0].trim()
    });
  }
  
  return parts;
}

function createPerfectLatexWithQuestions(problems, formatInfo) {
  const { titleSize, headerSize, bodySize, hasRedText } = formatInfo;
  
  return `\\\\documentclass[12pt,letterpaper]{article}
\\\\usepackage[utf8]{inputenc}
\\\\usepackage[T1]{fontenc}
\\\\usepackage{geometry}
\\\\usepackage{xcolor}
\\\\usepackage{amsmath}
\\\\usepackage{amsfonts}
\\\\usepackage{amssymb}
\\\\usepackage{enumitem}
\\\\usepackage{fancyhdr}
\\\\usepackage{tikz}
\\\\usepackage{array}
\\\\usepackage{booktabs}
\\\\usepackage{verbatim}
\\\\usepackage{colortbl}

% Page setup
\\\\geometry{letterpaper, margin=1in}
\\\\pagestyle{fancy}
\\\\fancyhf{}
\\\\fancyhead[L]{\\\\fontsize{${titleSize}}{${Math.round(titleSize * 1.2)}}\\\\selectfont\\\\textcolor{red}{CSCI-UA.0480-051: Parallel Computing}}
\\\\fancyhead[R]{\\\\fontsize{${headerSize}}{${Math.round(headerSize * 1.2)}}\\\\selectfont\\\\textcolor{red}{Midterm Exam}}
\\\\fancyfoot[C]{\\\\thepage}

% TikZ libraries for DAG diagrams
\\\\usetikzlibrary{shapes,arrows,positioning}

\\\\begin{document}

% Title section
\\\\begin{center}
\\\\fontsize{${titleSize}}{${Math.round(titleSize * 1.2)}}\\\\selectfont\\\\textbf{\\\\textcolor{red}{CSCI-UA.0480-051: Parallel Computing}}\\\\\\\\
\\\\fontsize{${headerSize}}{${Math.round(headerSize * 1.2)}}\\\\selectfont\\\\textbf{\\\\textcolor{red}{Midterm Exam (Generated)}}\\\\\\\\
\\\\vspace{0.3cm}
\\\\fontsize{${bodySize}}{${Math.round(bodySize * 1.2)}}\\\\selectfont\\\\textbf{Total: 100 points}
\\\\end{center}

\\\\vspace{0.5cm}

% Important notes section
\\\\fontsize{${headerSize}}{${Math.round(headerSize * 1.2)}}\\\\selectfont\\\\textbf{\\\\textcolor{red}{Important Notes - READ BEFORE SOLVING THE EXAM}}

\\\\fontsize{${bodySize}}{${Math.round(bodySize * 1.2)}}\\\\selectfont
\\\\begin{itemize}[leftmargin=0.5in]
    \\\\item If you perceive any ambiguity in any of the questions, state your assumptions clearly and solve the problem based on your assumptions. We will grade both your solutions and your assumptions.
    \\\\item This exam is take-home.
    \\\\item The exam is posted, on Brightspace, at the beginning of the lecture.
    \\\\item You have up to 23 hours and 55 minutes from the beginning of the lecture to submit on Brightspace (in the assignments section).
    \\\\item You are allowed only one submission, unlike assignments and labs.
    \\\\item Your answers must be very focused. You may be penalized for wrong answers and for putting irrelevant information in your answers.
    \\\\item You must upload a pdf file.
    \\\\item Your answer sheet must have a cover page (as indicated below) and one problem answer per page.
    \\\\item This exam has ${problems.length} problems totaling 100 points.
\\\\end{itemize}

\\\\vspace{0.5cm}

% Honor code section
\\\\fontsize{${headerSize}}{${Math.round(headerSize * 1.2)}}\\\\selectfont\\\\textbf{\\\\textcolor{red}{Honor code (copy and paste what is typed in red below, to the first page of your exam)}}

\\\\fontsize{${bodySize}}{${Math.round(bodySize * 1.2)}}\\\\selectfont
\\\\begin{itemize}[leftmargin=0.5in]
    \\\\item You may use the textbook, slides, and any notes you have. But you may not use the internet.
    \\\\item You may NOT use communication tools to collaborate with other humans. This includes but is not limited to G-Chat, Messenger, E-mail, etc.
    \\\\item Do not try to search for answers on the internet it will show in your answer, and you will earn an immediate grade of 0.
    \\\\item Anyone found sharing answers or communicating with another student during the exam period will earn an immediate grade of 0.
    \\\\item \\\\textcolor{red}{"I understand the ground rules and agree to abide by them. I will not share answers or assist another student during this exam, nor will I seek assistance from another student or attempt to view their answers."}
\\\\end{itemize}

${generateProblemsWithEnhancements(problems, bodySize, headerSize)}

\\\\end{document}`;
}

function generateProblemsWithEnhancements(problems, bodySize, headerSize) {
  let latexProblems = '';
  
  for (let i = 0; i < problems.length; i++) {
    const problem = problems[i];
    
    latexProblems += `\\\\newpage

\\\\fontsize{${headerSize}}{${Math.round(headerSize * 1.2)}}\\\\selectfont\\\\section*{Problem ${problem.number}}

`;

    // Add special enhancements for first problem (DAG)
    if (i === 0) {
      latexProblems += generateDAGDiagram();
    }
    
    // Add table if problem mentions cores/tasks
    if (problem.content.toLowerCase().includes('core') || problem.content.toLowerCase().includes('task')) {
      latexProblems += generateProfessionalTable();
    }
    
    // Add the problem content with proper formatting
    latexProblems += formatProblemContent(problem.content, bodySize);
    
    latexProblems += '\\n\\n';
  }
  
  return latexProblems;
}

function generateDAGDiagram() {
  return `% Professional DAG Diagram using TikZ
\\\\begin{center}
\\\\fontsize{17}{21}\\\\selectfont\\\\textbf{Task Flow Graph (DAG):}

\\\\vspace{0.5cm}

\\\\begin{tikzpicture}[
  node distance=1.5cm and 2cm,
  task/.style={circle, draw, fill=blue!20, minimum size=1cm, font=\\\\Large\\\\bfseries},
  arrow/.style={->, thick, blue!70}
]

% Define nodes
\\\\node[task] (E) {E};
\\\\node[task, below left=of E] (F) {F};
\\\\node[task, below right=of E] (G) {G};
\\\\node[task, below=of F] (H) {H};
\\\\node[task, below=of G] (I) {I};

% Define arrows (dependencies)
\\\\draw[arrow] (E) -- (F);
\\\\draw[arrow] (E) -- (G);
\\\\draw[arrow] (F) -- (H);
\\\\draw[arrow] (G) -- (I);

% Add labels
\\\\node[below=0.3cm of E, font=\\\\small] {Start};
\\\\node[below=0.3cm of H, font=\\\\small] {Path 1};
\\\\node[below=0.3cm of I, font=\\\\small] {Path 2};

\\\\end{tikzpicture}

\\\\vspace{0.3cm}
\\\\fontsize{15}{18}\\\\selectfont\\\\textit{Dependencies: E → F → H and E → G → I}
\\\\end{center}

\\\\vspace{0.5cm}

`;
}

function generateProfessionalTable() {
  return `\\\\begin{center}
\\\\fontsize{17}{21}\\\\selectfont
\\\\begin{tabular}{|c|c|c|}
\\\\hline
\\\\rowcolor{blue!10}
\\\\textbf{Task} & \\\\textbf{Time Taken on core type A} & \\\\textbf{Time Taken on core type B} \\\\\\\\
\\\\hline
E & 8 & 4 \\\\\\\\
\\\\hline
F & 12 & 6 \\\\\\\\
\\\\hline
G & 18 & 24 \\\\\\\\
\\\\hline
H & 6 & 3 \\\\\\\\
\\\\hline
I & 10 & 2 \\\\\\\\
\\\\hline
\\\\end{tabular}
\\\\end{center}

\\\\vspace{0.5cm}

`;
}

function formatProblemContent(content, bodySize) {
  // Clean up the content and format properly
  let formatted = content.replace(/\\n+/g, '\\n\\n'); // Normalize line breaks
  
  // Add proper LaTeX formatting for points
  formatted = formatted.replace(/\\[(\\d+)\\s*points?\\]/g, '\\\\textcolor{red}{\\\\textbf{[$1 points]}}');
  
  // Add font size
  formatted = `\\\\fontsize{${bodySize}}{${Math.round(bodySize * 1.2)}}\\\\selectfont\\n${formatted}`;
  
  return formatted;
}

// Run the perfect exam creation
createPerfectExam()
  .then((outputPath) => {
    console.log(`\\n🎉 STEP 2.5 SUCCESS - PERFECT EXAM CREATED!`);
    console.log(`📄 Enhanced LaTeX: ${outputPath}`);
    console.log(`\\n🔧 Next step: node step3-enhanced-pdf-compiler.js`);
  })
  .catch((error) => {
    console.error('💥 Step 2.5 failed:', error);
    process.exit(1);
  }); 