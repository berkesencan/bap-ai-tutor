const fs = require('fs');

// Directly test the LaTeX template function
function createSimpleLatexTemplate(subject, questionsText, questionPoints) {
  const totalPoints = questionPoints.reduce((sum, points) => sum + points, 0);
  
  return `\\documentclass[12pt]{article}
\\usepackage[margin=1in]{geometry}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{xcolor}
\\usepackage{enumitem}
\\usepackage{setspace}

\\begin{document}

% Header - matching original 21px font size (\\Large)
\\begin{center}
{\\Large\\textbf{${subject}}}\\\\[0.1in]
{\\Large\\textbf{Midterm Exam (Mar 14th, 2024)}}\\\\[0.1in]
{\\Large\\textbf{Total: ${totalPoints} points}}
\\end{center}

\\vspace{0.3in}

% Important Notes section with red text - matching original
{\\large\\textbf{Important Notes- {\\color{red}\\textbf{READ BEFORE SOLVING THE EXAM}}}}

\\vspace{0.1in}

\\begin{itemize}[leftmargin=0.5in]
\\item \\textbf{If you perceive any ambiguity in any of the questions, state your assumptions clearly and solve the problem based on your assumptions. We will grade both your solutions and your assumptions.}

\\item \\textbf{This exam is take-home.}

\\item \\textbf{The exam is posted on Brightspace, at the beginning of the March 14th lecture (2pm EST).}

\\item \\textbf{You have up to 24 hours to submit on Brightspace (i.e. till March 15th 2pm EST), in the same way as you submit an assignment. However, {\\color{red}\\textbf{unlike assignments, you can only submit once}}.}

\\item \\textbf{Your answers must be very focused. You may be penalized for giving wrong answers and for putting irrelevant information in your answers.}

\\item \\textbf{Your answer sheet must be organized as follows:}
\\begin{itemize}
\\item {\\color{red}\\textbf{The very first page of your answer must contain only:}}
\\begin{itemize}
\\item \\textbf{You Last Name}
\\item \\textbf{Your First Name}
\\item \\textbf{Your NetID}
\\item \\textbf{Copy and paste the honor code shown in the rectangle at the bottom of this page.}
\\end{itemize}
\\item \\textbf{In your answer sheet, {\\color{red}\\textbf{answer one problem per page}}. The exam has four main problems, each one must be answered in a separate page.}
\\end{itemize}

\\item \\textbf{This exam consists of 4 problems, with a total of 100 points.}

\\item \\textbf{Your answers can be typed or written by hand (but with clear handwriting). It is up to you. But {\\color{red}\\textbf{you must upload one pdf file containing all your answers}}.}
\\end{itemize}

\\vspace{0.3in}

% Honor Code section
{\\large\\textbf{Honor code (copy and paste to the first page of your exam)}}

\\vspace{0.1in}

\\begin{itemize}[leftmargin=0.5in]
\\item You may use the textbook, slides, the class recorded lectures, the information in the discussion forums of the class on Brightspace, and any notes you have. But you may not use the internet.

\\item You may NOT use communication tools to collaborate with other humans. This includes but is not limited to Google-Chat, Messenger, E-mail, etc.

\\item You cannot use LLMs such as chatGPT, Gemini, Bard, etc.

\\item Do not try to search for answers on the internet, it will show in your answer, and you will earn an immediate grade of 0.

\\item Anyone found sharing answers, communicating with another student, searching the internet, or using prohibited tools (as mentioned above) during the exam period will earn an immediate grade of 0.

\\item \\textbf{"I understand the ground rules and agree to abide by them. I will not share answers or assist another student during this exam, nor will I seek assistance from another student or attempt to view their answers."}
\\end{itemize}

\\newpage

% Questions section
${questionsText}

\\end{document}`;
}

async function testLatexRedText() {
  console.log('=== TESTING LATEX RED TEXT ===');
  
  const subject = 'CSCI-UA.0480-051: Parallel Computing';
  const questionsText = `Problem 1 [30 points]
Test question about parallel computing.

Problem 2 [35 points]  
Another test question about MPI.

Problem 3 [35 points]
Final question about performance analysis.`;
  
  const questionPoints = [30, 35, 35];
  
  console.log('📝 Generating LaTeX template...');
  const latexContent = createSimpleLatexTemplate(subject, questionsText, questionPoints);
  
  console.log('✅ LaTeX template generated');
  console.log('📄 Content length:', latexContent.length);
  
  // Check for red text
  const hasRedColor = latexContent.includes('\\color{red}');
  console.log('🔴 Contains \\color{red}:', hasRedColor);
  
  if (hasRedColor) {
    console.log('\n🔴 RED TEXT INSTANCES:');
    const redMatches = latexContent.match(/\\color\{red\}[^}]*\}/g) || [];
    redMatches.forEach((match, i) => {
      console.log(`${i + 1}: ${match}`);
    });
    
    // More detailed search for red text patterns
    const redLines = latexContent.split('\n').filter(line => line.includes('\\color{red}'));
    console.log('\n🔴 LINES WITH RED TEXT:');
    redLines.forEach((line, i) => {
      console.log(`${i + 1}: ${line.trim()}`);
    });
  }
  
  // Save the template
  fs.writeFileSync('test-red-text-template.tex', latexContent);
  console.log('\n💾 LaTeX template saved to: test-red-text-template.tex');
  
  // Show the Important Notes section specifically
  const importantNotesStart = latexContent.indexOf('Important Notes');
  const importantNotesEnd = latexContent.indexOf('Honor code');
  if (importantNotesStart !== -1 && importantNotesEnd !== -1) {
    console.log('\n📝 IMPORTANT NOTES SECTION:');
    console.log('='.repeat(60));
    console.log(latexContent.substring(importantNotesStart, importantNotesEnd));
    console.log('='.repeat(60));
  }
  
  // Test compilation if pdflatex is available
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);
  
  try {
    console.log('\n🔧 Testing LaTeX compilation...');
    
    // Try to compile
    const timestamp = Date.now();
    const filename = `test-red-text-${timestamp}`;
    const texFile = `${filename}.tex`;
    const pdfFile = `${filename}.pdf`;
    
    fs.writeFileSync(texFile, latexContent);
    
    await execAsync(`pdflatex -interaction=nonstopmode ${texFile}`);
    
    if (fs.existsSync(pdfFile)) {
      const stats = fs.statSync(pdfFile);
      console.log('✅ LaTeX compilation successful!');
      console.log('📄 PDF created:', pdfFile);
      console.log('📊 PDF size:', stats.size, 'bytes');
      
      // Convert to HTML to check for red text
      try {
        const htmlPath = `${filename}.html`;
        await execAsync(`pdftohtml -c -hidden -noframes "${pdfFile}" "${htmlPath.replace('.html', '')}"`);
        
        if (fs.existsSync(htmlPath)) {
          const htmlContent = fs.readFileSync(htmlPath, 'utf8');
          const hasRedInHtml = htmlContent.includes('#ff0000');
          console.log('🔴 PDF contains red text (in HTML):', hasRedInHtml);
          
          if (hasRedInHtml) {
            console.log('✅ RED TEXT SUCCESSFULLY PRESERVED IN PDF!');
            
            // Show red text instances in HTML
            const redMatches = htmlContent.match(/color:#ff0000[^}]*}/g) || [];
            console.log('🔴 Red text instances in HTML:', redMatches.length);
          } else {
            console.log('❌ RED TEXT LOST DURING PDF COMPILATION');
            console.log('🔍 Searching for any color patterns...');
            const colorMatches = htmlContent.match(/color:#[0-9a-fA-F]{6}/g) || [];
            console.log('🎨 All colors found:', [...new Set(colorMatches)]);
          }
          
          console.log('💾 HTML conversion saved to:', htmlPath);
        }
      } catch (htmlError) {
        console.log('⚠️ Could not convert PDF to HTML:', htmlError.message);
      }
      
    } else {
      console.log('❌ PDF was not created');
    }
    
  } catch (compileError) {
    console.log('⚠️ LaTeX compilation failed:', compileError.message);
    console.log('💡 This might be because pdflatex is not installed');
  }
}

testLatexRedText()
  .then(() => {
    console.log('\n✅ LaTeX red text test completed');
  })
  .catch(error => {
    console.error('\n💥 Test failed:', error.message);
  }); 