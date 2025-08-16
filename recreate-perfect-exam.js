require('dotenv').config();
const fs = require('fs');

/**
 * RECREATE PERFECT EXAM PDF
 * This recreates the enhanced perfect-exam.pdf with:
 * - Professional TikZ DAG diagrams
 * - Proper table formatting with colors
 * - Exact font sizes and red headers
 * - Complete 9-page professional exam
 */

async function recreatePerfectExam() {
  console.log('🚀 RECREATING PERFECT EXAM PDF');
  console.log('===============================');
  
  try {
    // Use the new questions from Step 1.5
    const newQuestionsPath = 'step1.5-output/new-questions-text.txt';
    if (!fs.existsSync(newQuestionsPath)) {
      throw new Error('Step 1.5 new questions not found. Run step1.5-generate-new-questions.js first');
    }
    
    const newQuestions = fs.readFileSync(newQuestionsPath, 'utf8');
    console.log(`📄 Loaded new questions: ${newQuestions.length} characters`);
    
    // Create the enhanced LaTeX with all professional features
    const enhancedLatex = generateEnhancedProfessionalLatex(newQuestions);
    
    // Save to backend uploads
    const outputPath = 'backend/uploads/perfect-exam-recreated.tex';
    fs.writeFileSync(outputPath, enhancedLatex);
    console.log(`💾 Enhanced LaTeX saved: ${outputPath}`);
    
    console.log(`📄 LaTeX preview (first 500 chars):`);
    console.log('='.repeat(50));
    console.log(enhancedLatex.substring(0, 500));
    console.log('='.repeat(50));
    
    console.log(`\n✅ Perfect exam LaTeX recreated!`);
    console.log(`📄 File: ${outputPath}`);
    console.log(`📊 Length: ${enhancedLatex.length} characters`);
    console.log(`\n🔧 Next: Compile with pdflatex to create PDF`);
    
    return outputPath;
    
  } catch (error) {
    console.error('❌ Error recreating perfect exam:', error.message);
    throw error;
  }
}

function generateEnhancedProfessionalLatex(questionsText) {
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
\\usepackage{colortbl}

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

\\fontsize{18}{22}\\selectfont\\section*{Problem 1}

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

\\fontsize{17}{21}\\selectfont
Assume we have the following task flow graph where every node is a task and an arrow from a task to another means dependencies. For example, task F cannot start before task E is done.

Suppose we have two types of cores: type A and type B. The following table shows the time taken by each task, in microseconds, if executed on a core of type A and if executed on a core of type B.

\\begin{center}
\\fontsize{17}{21}\\selectfont
\\begin{tabular}{|c|c|c|}
\\hline
\\rowcolor{blue!10}
\\textbf{Task} & \\textbf{Time Taken on core type A} & \\textbf{Time Taken on core type B} \\\\
\\hline
E & 8 & 4 \\\\
\\hline
F & 12 & 6 \\\\
\\hline
G & 18 & 24 \\\\
\\hline
H & 6 & 3 \\\\
\\hline
I & 10 & 2 \\\\
\\hline
\\end{tabular}
\\end{center}

\\vspace{0.5cm}

\\fontsize{17}{21}\\selectfont\\textbf{a.} \\textcolor{red}{\\textbf{[5 points]}} If we use all cores of type A, what will be the span (indicate tasks and total time) of the DAG?

\\fontsize{17}{21}\\selectfont\\textbf{b.} \\textcolor{red}{\\textbf{[5 points]}} If we use all cores of type B, what will be the span (indicate tasks and total time) of the DAG?

\\fontsize{17}{21}\\selectfont\\textbf{c.} \\textcolor{red}{\\textbf{[15 points]}} What will be the smallest number of cores, of any type, that gives the best speedup compared to using a single core of type A? You can use a mix of any cores (e.g. two cores of type A and one core of type B, etc). In your solution, indicate which task will run on which core, the total number of cores you will use for each type, the total execution times (for parallel version and the sequential version running on core of type A), and the speedup (relative to sequential execution on core of type A).

\\fontsize{17}{21}\\selectfont\\textbf{d.} \\textcolor{red}{\\textbf{[10 points]}} Suppose we use only cores of type A. What is the smallest number of cores to get the highest speedup? Calculate that speedup. Then, if you are allowed to remove only one arrow from the DAG, while keeping the DAG a legal one, what will be that arrow to give a better speedup than the one you just calculated? If there are several solutions, pick one solution, and calculate the new speedup. If there are no solutions, state so, and give no more than two lines of explanation as to why there is no solution.

\\newpage

\\fontsize{18}{22}\\selectfont\\section*{Problem 2}

\\fontsize{17}{21}\\selectfont\\textbf{a.} \\textcolor{red}{\\textbf{[5 points]}} For each one of the following designs, indicate whether it is SISD, SIMD, MISD, or MIMD. No justification needed. Note: If the design fits more than one category, then pick the more general one. For example, MIMD can execute as SIMD if all the instructions are the same. The more general is MIMD so pick MIMD not SIMD.

\\fontsize{17}{21}\\selectfont\\textbf{1.} A single core processor with only a single instruction pipeline.

\\fontsize{17}{21}\\selectfont\\textbf{2.} A vector processor capable of operating on multiple data elements simultaneously.

\\fontsize{17}{21}\\selectfont\\textbf{3.} A multi-core processor with each core running independent instruction streams.

\\fontsize{17}{21}\\selectfont\\textbf{4.} A single core processor with both superscalar and hyperthreading capabilities.

\\fontsize{17}{21}\\selectfont\\textbf{5.} A specialized processor designed for a single, highly-parallel task.

\\fontsize{17}{21}\\selectfont\\textbf{b.} \\textcolor{red}{\\textbf{[5 points]}} Indicate whether each statement below is true (T) or false (F). No justification needed.

\\fontsize{17}{21}\\selectfont\\textbf{1.} Superscalar architecture always implies parallel instruction execution.

\\fontsize{17}{21}\\selectfont\\textbf{2.} Hyperthreading allows multiple threads to share the same physical core resources.

\\fontsize{17}{21}\\selectfont\\textbf{3.} SIMD architectures are well-suited for tasks involving independent data streams.

\\fontsize{17}{21}\\selectfont\\textbf{4.} Cache coherence is not a concern in distributed memory systems.

\\fontsize{17}{21}\\selectfont\\textbf{5.} Amdahl's Law describes the limitations of parallelization due to sequential sections.

\\fontsize{17}{21}\\selectfont\\textbf{c.} \\textcolor{red}{\\textbf{[5 points]}} If we have a multicore processor with sixteen cores, and four-way hyperthreading each, what is the largest number of processes that can execute at the same time? Explain your answer with no more than two sentences.

\\newpage

\\fontsize{18}{22}\\selectfont\\section*{Problem 3}

\\fontsize{17}{21}\\selectfont\\textbf{a.} Suppose you have an algorithm with six tasks that can be executed in parallel.

\\fontsize{17}{21}\\selectfont\\textbf{1.} \\textcolor{red}{\\textbf{[6 points]}} What are the characteristics of those tasks that can make you decide to implement the program as one process with six threads as opposed to six processes with one thread each? State two characteristics to get full credit.

\\fontsize{17}{21}\\selectfont\\textbf{2.} \\textcolor{red}{\\textbf{[4 points]}} With six parallel tasks, it may seem that six cores will give the best speedup over sequential code. However, there may be cases where less than six cores can give the same speedup as the six cores. Give a brief description of such a case in no more than 2-3 lines.

\\fontsize{17}{21}\\selectfont\\textbf{b.} \\textcolor{red}{\\textbf{[4 points]}} If we have two implementations of the same algorithm and we found that one implementation has lower latency than the other. Does that always mean that the implementation with lower latency will always be more efficient? Justify in two sentences.

\\fontsize{17}{21}\\selectfont\\textbf{c.} We have two different implementations of the same algorithm. The first implementation has five hundred thousand instructions where two-thirds of them are floating-point instructions, and the remaining are integer instructions. The second implementation has one million instructions where all of them are integer instructions. Suppose a floating-point instruction takes 12 cycles while an integer instruction takes one cycle. We execute these two implementations on a 3GHz machine. Assume single core processor, where this core is SISD.

\\fontsize{17}{21}\\selectfont\\textbf{1.} \\textcolor{red}{\\textbf{[6 points]}} What is the MIPS of each implementation?

\\fontsize{17}{21}\\selectfont\\textbf{2.} \\textcolor{red}{\\textbf{[6 points]}} What is the CPI of each implementation?

\\newpage

\\fontsize{18}{22}\\selectfont\\section*{Problem 4}

\\fontsize{17}{21}\\selectfont For problem 4, assume we have one communicator: MPI\\_COMM\\_WORLD.

\\fontsize{17}{21}\\selectfont\\textbf{a.} \\textcolor{red}{\\textbf{[3 points]}} Write one MPI command that, if executed by all the processes, will make the process with rank 0 have the sum of all data elements that were initially distributed among all the processes.

\\fontsize{17}{21}\\selectfont\\textbf{b.} \\textcolor{red}{\\textbf{[4 points]}} Why MPI\\_Reduce() requires a specified operation (e.g., MPI\\_SUM, MPI\\_MAX, etc.) but MPI\\_Gather() does not? Give a brief explanation in no more than three sentences.

\\fontsize{17}{21}\\selectfont\\textbf{c.} \\textcolor{red}{\\textbf{[8 points]}} Suppose we use MPI\\_Allreduce() instead of MPI\\_Reduce(). Describe the key difference in the result and explain when you would prefer one over the other. Include a brief discussion of the communication patterns involved.

\\fontsize{17}{21}\\selectfont\\textbf{d.} \\textcolor{red}{\\textbf{[10 points]}} Consider a scenario where you have 8 processes and need to distribute a large array from process 0 to all other processes. Compare and contrast using MPI\\_Bcast() versus MPI\\_Scatter() for this task. Discuss the differences in memory requirements, communication patterns, and when each would be more appropriate.

\\end{document}`;
}

// Run the recreation
recreatePerfectExam()
  .then((outputPath) => {
    console.log(`\n🎉 PERFECT EXAM RECREATED SUCCESSFULLY!`);
    console.log(`📄 LaTeX file: ${outputPath}`);
    console.log(`\n🔧 To compile to PDF, run:`);
    console.log(`cd backend/uploads && pdflatex perfect-exam-recreated.tex`);
  })
  .catch((error) => {
    console.error('💥 Failed to recreate perfect exam:', error);
    process.exit(1);
  }); 