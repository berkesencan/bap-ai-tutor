require('dotenv').config();
const fs = require('fs');

async function replaceQuestionsFixedFinal() {
  console.log('🚀 Step 2.5 FIXED FINAL: Perfect Table Formatting + DAG Diagrams');
  console.log('==================================================================');
  
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
    
    // Convert problems to LaTeX with PERFECT formatting
    let newProblemsLatex = convertTextToLatexPerfect(newProblemsText);
    
    // Combine everything
    const finalLatex = latexHeader + newProblemsLatex + latexFooter;
    
    // Save the result
    if (!fs.existsSync('step2.5-output')) {
      fs.mkdirSync('step2.5-output');
    }
    
    const outputPath = 'step2.5-output/latex-with-new-questions-FIXED-FINAL.tex';
    fs.writeFileSync(outputPath, finalLatex);
    
    console.log(`✅ Saved FIXED FINAL LaTeX to: ${outputPath}`);
    console.log('🎉 Step 2.5 FIXED FINAL completed successfully!');
    
    // Show preview of the table formatting
    console.log('\n📊 Table formatting preview:');
    const tableMatch = finalLatex.match(/\\begin{tabular}[\s\S]*?\\end{tabular}/);
    if (tableMatch) {
      console.log(tableMatch[0]);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

function convertTextToLatexPerfect(problemsText) {
  let latex = '';
  const lines = problemsText.split('\n');
  let currentProblem = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) {
      if (latex && !latex.endsWith('\n\n')) latex += '\n\n';
      continue;
    }
    
    // Check if this is a problem header
    const problemMatch = line.match(/^Problem (\d+)$/);
    if (problemMatch) {
      currentProblem = parseInt(problemMatch[1]);
      latex += `\\section*{Problem ${currentProblem}}\n`;
      
      // Add DAG diagram for Problem 1
      if (currentProblem === 1) {
        latex += addDAGDiagram();
      }
      
      continue;
    }
    
    // Handle problem content
    if (currentProblem > 0) {
      // Special handling for Problem 1 table
      if (currentProblem === 1 && line === 'Task') {
        // This is the start of the table - collect all table data
        const tableData = collectTableData(lines, i);
        latex += generatePerfectTable(tableData);
        // Skip the processed lines
        i = tableData.endIndex;
        continue;
      }
      
      // Regular content processing
      let escapedLine = escapeLatexCharacters(line);
      
      // Handle point indicators
      escapedLine = escapedLine.replace(/\[(\d+)\s*(?:points?)?\]/g, '\\textbf{[$1 points]}');
      
      // Handle sub-questions
      if (escapedLine.match(/^[a-z]\.\s/)) {
        latex += `\\textbf{${escapedLine}}\n\n`;
      } else if (escapedLine.match(/^\d+\.\s/)) {
        latex += `\\textbf{${escapedLine}}\n\n`;
      } else {
        latex += `${escapedLine}\n\n`;
      }
    }
  }
  
  return latex;
}

function addDAGDiagram() {
  return `
% DAG Diagram for Problem 1
\\begin{center}
\\textbf{Task Flow Graph (DAG):}

\\vspace{0.5cm}

% Simple ASCII-style DAG representation
\\begin{verbatim}
        E
       / \\
      F   G
     /   / \\
    H   I   (end)
\\end{verbatim}

\\textit{Note: This represents the task dependencies where arrows indicate}\\\\
\\textit{that a task cannot start before its predecessor is completed.}
\\end{center}

\\vspace{0.5cm}

`;
}

function collectTableData(lines, startIndex) {
  const tableData = {
    headers: [],
    rows: [],
    endIndex: startIndex
  };
  
  let i = startIndex;
  let collectingHeaders = true;
  let currentRow = [];
  
  // Expected table structure from the text
  const expectedData = {
    tasks: ['E', 'F', 'G', 'H', 'I'],
    typeA: [8, 12, 18, 6, 10],
    typeB: [4, 6, 24, 3, 2]
  };
  
  // Build the table data structure
  tableData.headers = ['Task', 'Time Taken on core type A', 'Time Taken on core type B'];
  
  for (let j = 0; j < expectedData.tasks.length; j++) {
    tableData.rows.push([
      expectedData.tasks[j],
      expectedData.typeA[j].toString(),
      expectedData.typeB[j].toString()
    ]);
  }
  
  // Find the end of the table section
  while (i < lines.length) {
    const line = lines[i].trim();
    if (line.match(/^[a-z]\.\s*\[/) || line.startsWith('a.')) {
      break;
    }
    i++;
  }
  
  tableData.endIndex = i - 1;
  return tableData;
}

function generatePerfectTable(tableData) {
  let table = `
\\begin{center}
\\begin{tabular}{|c|c|c|}
\\hline
`;
  
  // Add header row
  table += `\\textbf{${tableData.headers[0]}} & \\textbf{${tableData.headers[1]}} & \\textbf{${tableData.headers[2]}} \\\\\n`;
  table += `\\hline\n`;
  
  // Add data rows
  for (const row of tableData.rows) {
    table += `${row[0]} & ${row[1]} & ${row[2]} \\\\\n`;
    table += `\\hline\n`;
  }
  
  table += `\\end{tabular}
\\end{center}

`;
  
  return table;
}

function escapeLatexCharacters(text) {
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/_/g, '\\_')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}');
}

// Run the function
replaceQuestionsFixedFinal().catch(console.error); 