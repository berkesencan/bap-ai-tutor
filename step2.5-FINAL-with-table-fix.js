require('dotenv').config();
const fs = require('fs');

async function replaceQuestionsFinal() {
  console.log('🚀 Step 2.5 FINAL: Replace Questions with PERFECT Table Formatting');
  console.log('================================================================');
  
  try {
    const successfulLatexPath = 'simple-gemini-output/gemini-generated.tex';
    const newQuestionsPath = 'step1.5-output/new-questions-text.txt';
    
    let originalLatex = fs.readFileSync(successfulLatexPath, 'utf-8');
    let newQuestionsText = fs.readFileSync(newQuestionsPath, 'utf-8');
    
    console.log(`📄 Original LaTeX: ${originalLatex.length} characters`);
    console.log(`📝 New questions: ${newQuestionsText.length} characters`);
    
    // Extract problems section
    const problemsStart = newQuestionsText.indexOf('Problem 1');
    const newProblemsText = newQuestionsText.substring(problemsStart).trim();
    
    // Find LaTeX problem boundaries
    const latexProblemsStart = originalLatex.indexOf('\\section*{Problem 1}');
    const latexProblemsEnd = originalLatex.indexOf('\\end{document}');
    
    const latexHeader = originalLatex.substring(0, latexProblemsStart);
    const latexFooter = originalLatex.substring(latexProblemsEnd);
    
    // Convert with SMART table detection
    let newProblemsLatex = convertWithSmartTableDetection(newProblemsText);
    
    const finalLatex = latexHeader + newProblemsLatex + latexFooter;
    
    if (!fs.existsSync('step2.5-output')) {
      fs.mkdirSync('step2.5-output');
    }
    
    const outputPath = 'step2.5-output/latex-with-new-questions-FINAL.tex';
    fs.writeFileSync(outputPath, finalLatex);
    
    console.log(`✅ Saved FINAL LaTeX to: ${outputPath}`);
    console.log('🎉 Step 2.5 FINAL completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

function convertWithSmartTableDetection(problemsText) {
  let latex = '';
  const lines = problemsText.split('\n');
  let inProblemContent = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) {
      if (inProblemContent) latex += '\n\n';
      continue;
    }
    
    // Problem header detection
    const problemMatch = line.match(/^Problem (\d+)$/);
    if (problemMatch) {
      const problemNum = problemMatch[1];
      latex += `\\section*{Problem ${problemNum}}\n`;
      inProblemContent = true;
      continue;
    }
    
    if (inProblemContent) {
      // SMART TABLE DETECTION: Look for the specific table pattern
      if (line.includes('The following table shows the time taken by each task')) {
        // We found the table description, now build the table
        latex += line + '\n\n';
        
        // Skip ahead to collect table data
        let j = i + 1;
        let tableData = {
          tasks: [],
          typeAValues: [],
          typeBValues: []
        };
        
        // Look for the table structure in the next lines
        while (j < lines.length) {
          const currentLine = lines[j].trim();
          if (!currentLine) {
            j++;
            continue;
          }
          
          // Stop if we hit the next part (questions a., b., etc.)
          if (currentLine.match(/^[a-z]\./)) {
            break;
          }
          
          // Collect single letters (tasks: E, F, G, H, I)
          if (currentLine.match(/^[A-Z]$/)) {
            tableData.tasks.push(currentLine);
          }
          // Collect numbers (execution times)
          else if (currentLine.match(/^\d+$/)) {
            if (tableData.typeAValues.length < tableData.tasks.length) {
              tableData.typeAValues.push(currentLine);
            } else {
              tableData.typeBValues.push(currentLine);
            }
          }
          
          j++;
        }
        
        // Generate the proper LaTeX table
        latex += generatePerfectLatexTable(tableData);
        
        // Skip the processed lines
        i = j - 1;
        continue;
      }
      
      // Regular content processing
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

function generatePerfectLatexTable(tableData) {
  const { tasks, typeAValues, typeBValues } = tableData;
  
  console.log(`🔧 Generating PERFECT table:`);
  console.log(`   Tasks: ${tasks.join(', ')}`);
  console.log(`   Type A: ${typeAValues.join(', ')}`);
  console.log(`   Type B: ${typeBValues.join(', ')}`);
  
  let latex = '\n\\begin{center}\n';
  latex += '\\begin{tabular}{|c|c|c|}\n';
  latex += '\\hline\n';
  latex += '\\textbf{Task} & \\textbf{Time Taken on core type A} & \\textbf{Time Taken on core type B} \\\\\n';
  latex += '\\hline\n';
  
  // Generate table rows
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i] || '';
    const typeA = typeAValues[i] || '';
    const typeB = typeBValues[i] || '';
    latex += `${task} & ${typeA} & ${typeB} \\\\\n`;
    latex += '\\hline\n';
  }
  
  latex += '\\end{tabular}\n';
  latex += '\\end{center}\n\n';
  
  return latex;
}

// Run the function
replaceQuestionsFinal().catch(console.error);
