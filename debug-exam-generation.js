// Comprehensive debugging script for exam generation
const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  numTests: 5,
  numQuestions: 10,
  subject: 'Parallel Computing',
  difficulty: 'medium',
  pdfPath: './backend/uploads/midterm-sp24.pdf' // Adjust path as needed
};

// Helper function to simulate the backend processing
const simulateBackendProcessing = (testNumber) => {
  console.log(`\n🧪 TEST ${testNumber}/${TEST_CONFIG.numTests}`);
  console.log('='.repeat(50));
  
  // Simulate the cleanLatexText function
  const cleanLatexText = (text) => {
    console.log(`📝 Cleaning LaTeX text (${text.length} chars)...`);
    
    let processed = text
      .replace(/\\item\s*/g, '')
      .replace(/\\item\s*\[[a-z]\]\s*/g, '')
      .replace(/\\item\s*\[.*?\]\s*/g, '')
      .replace(/\$([^$]+)\$/g, (match, mathContent) => {
        return mathContent
          .replace(/\\log_(\d+)/g, 'log₍$1₎')
          .replace(/\\log_\{(\d+)\}/g, 'log₍$1₎')
          .replace(/\^(\d+)/g, '⁽$1⁾')
          .replace(/\^{([^}]+)}/g, '⁽$1⁾')
          .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
          .replace(/\\sum_\{([^}]+)\}\^([^\s]+)/g, 'Σ($1 to $2)')
          .replace(/\\mathbb\{([^}]+)\}/g, '$1')
          .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
          .replace(/\\sqrt/g, '√')
          .replace(/\\infty/g, '∞')
          .replace(/\\Theta/g, 'Θ')
          .replace(/\\Omega/g, 'Ω')
          .replace(/\\omega/g, 'ω')
          .replace(/\\ge/g, '≥')
          .replace(/\\le/g, '≤')
          .replace(/\\neq/g, '≠')
          .replace(/\\to/g, '→')
          .replace(/\\lim/g, 'lim')
          .replace(/\\log/g, 'log');
      });
    
    // Check for important content before processing
    const hasCodeSnippets = processed.includes('\\begin{verbatim}') || processed.includes('\\begin{lstlisting}');
    const hasTables = processed.includes('\\begin{tabular}');
    const hasDiagrams = processed.includes('\\begin{tikzpicture}');
    
    console.log(`🔍 Content detection: Code=${hasCodeSnippets}, Tables=${hasTables}, Diagrams=${hasDiagrams}`);
    
    // PRESERVE IMPORTANT CONTENT
    processed = processed
      .replace(/\\begin\{verbatim\}([\s\S]*?)\\end\{verbatim\}/g, (match, content) => {
        console.log(`✅ Preserved code snippet (${content.length} chars)`);
        return `\n[CODE SNIPPET]\n${content}\n[/CODE SNIPPET]\n`;
      })
      .replace(/\\begin\{tabular\}([\s\S]*?)\\end\{tabular\}/g, (match, content) => {
        console.log(`✅ Preserved table (${content.length} chars)`);
        return `\n[TABLE]\n${content}\n[/TABLE]\n`;
      })
      .replace(/\\begin\{tikzpicture\}([\s\S]*?)\\end\{tikzpicture\}/g, (match, content) => {
        console.log(`✅ Preserved diagram (${content.length} chars)`);
        return `\n[DIAGRAM]\n${content}\n[/DIAGRAM]\n`;
      })
      .replace(/\\begin\{lstlisting\}([\s\S]*?)\\end\{lstlisting\}/g, (match, content) => {
        console.log(`✅ Preserved code listing (${content.length} chars)`);
        return `\n[CODE SNIPPET]\n${content}\n[/CODE SNIPPET]\n`;
      });
    
    // Remove other LaTeX environments but preserve content
    processed = processed
      .replace(/\\begin\{([^}]+)\}([\s\S]*?)\\end\{\1\}/g, '$2')
      .replace(/\\textbf\{([^}]+)\}/g, '$1')
      .replace(/\\emph\{([^}]+)\}/g, '$1')
      .replace(/\\section\*?\{([^}]+)\}/g, '$1')
      .replace(/\\subsection\*?\{([^}]+)\}/g, '$1')
      .replace(/\\[a-zA-Z]+\*?\{[^}]*\}/g, '')
      .replace(/\\[a-zA-Z]+\*/g, '')
      .replace(/\\[a-zA-Z]+/g, '')
      .replace(/\{([^}]*)\}/g, '$1')
      .replace(/\\\\/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Check final result
    const finalHasCodeSnippets = processed.includes('[CODE SNIPPET]');
    const finalHasTables = processed.includes('[TABLE]');
    const finalHasDiagrams = processed.includes('[DIAGRAM]');
    
    console.log(`📊 Final result: Code=${finalHasCodeSnippets}, Tables=${finalHasTables}, Diagrams=${finalHasDiagrams}`);
    
    return processed;
  };
  
  // Simulate question extraction
  const extractQuestionsFromLatex = (latexContent) => {
    console.log(`🔍 Extracting questions from LaTeX (${latexContent.length} chars)...`);
    
    const questions = [];
    const cleanLatexText = (text) => {
      // Use the same function as above
      return text
        .replace(/\\item\s*/g, '')
        .replace(/\\item\s*\[[a-z]\]\s*/g, '')
        .replace(/\\item\s*\[.*?\]\s*/g, '')
        .replace(/\$([^$]+)\$/g, (match, mathContent) => {
          return mathContent
            .replace(/\\log_(\d+)/g, 'log₍$1₎')
            .replace(/\\log_\{(\d+)\}/g, 'log₍$1₎')
            .replace(/\^(\d+)/g, '⁽$1⁾')
            .replace(/\^{([^}]+)}/g, '⁽$1⁾')
            .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
            .replace(/\\sum_\{([^}]+)\}\^([^\s]+)/g, 'Σ($1 to $2)')
            .replace(/\\mathbb\{([^}]+)\}/g, '$1')
            .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
            .replace(/\\sqrt/g, '√')
            .replace(/\\infty/g, '∞')
            .replace(/\\Theta/g, 'Θ')
            .replace(/\\Omega/g, 'Ω')
            .replace(/\\omega/g, 'ω')
            .replace(/\\ge/g, '≥')
            .replace(/\\le/g, '≤')
            .replace(/\\neq/g, '≠')
            .replace(/\\to/g, '→')
            .replace(/\\lim/g, 'lim')
            .replace(/\\log/g, 'log');
        })
        .replace(/\\begin\{verbatim\}([\s\S]*?)\\end\{verbatim\}/g, (match, content) => {
          return `\n[CODE SNIPPET]\n${content}\n[/CODE SNIPPET]\n`;
        })
        .replace(/\\begin\{tabular\}([\s\S]*?)\\end\{tabular\}/g, (match, content) => {
          return `\n[TABLE]\n${content}\n[/TABLE]\n`;
        })
        .replace(/\\begin\{tikzpicture\}([\s\S]*?)\\end\{tikzpicture\}/g, (match, content) => {
          return `\n[DIAGRAM]\n${content}\n[/DIAGRAM]\n`;
        })
        .replace(/\\begin\{lstlisting\}([\s\S]*?)\\end\{lstlisting\}/g, (match, content) => {
          return `\n[CODE SNIPPET]\n${content}\n[/CODE SNIPPET]\n`;
        })
        .replace(/\\begin\{([^}]+)\}([\s\S]*?)\\end\{\1\}/g, '$2')
        .replace(/\\textbf\{([^}]+)\}/g, '$1')
        .replace(/\\emph\{([^}]+)\}/g, '$1')
        .replace(/\\section\*?\{([^}]+)\}/g, '$1')
        .replace(/\\subsection\*?\{([^}]+)\}/g, '$1')
        .replace(/\\[a-zA-Z]+\*?\{[^}]*\}/g, '')
        .replace(/\\[a-zA-Z]+\*/g, '')
        .replace(/\\[a-zA-Z]+/g, '')
        .replace(/\{([^}]*)\}/g, '$1')
        .replace(/\\\\/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    };
    
    // Simulate different extraction methods
    const methods = [
      'exam format',
      'homework format', 
      'numbered format',
      'item format',
      'heuristic format'
    ];
    
    for (let i = 0; i < methods.length; i++) {
      const method = methods[i];
      console.log(`🔍 Trying ${method} extraction...`);
      
      // Simulate finding questions (random for testing)
      const numQuestions = Math.floor(Math.random() * 3) + 8; // 8-10 questions
      
      for (let j = 0; j < numQuestions; j++) {
        const questionText = `Q${j+1}) This is a test question ${j+1} with some content.`;
        const cleanText = cleanLatexText(questionText);
        
        questions.push({
          text: cleanText,
          points: null
        });
      }
      
      if (questions.length > 0) {
        console.log(`✅ Found ${questions.length} questions using ${method}`);
        break;
      }
    }
    
    return questions;
  };
  
  // Simulate the full pipeline
  console.log('🚀 Starting exam generation simulation...');
  
  // Step 1: Simulate LaTeX content (this would come from the actual PDF processing)
  const mockLatexContent = `
\\section*{Problem 1}
Consider the following MPI code:
\\begin{verbatim}
#include <mpi.h>
int main(int argc, char** argv) {
    MPI_Init(&argc, &argv);
    int rank, size;
    MPI_Comm_rank(MPI_COMM_WORLD, &rank);
    MPI_Comm_size(MPI_COMM_WORLD, &size);
    
    int data = rank * 10;
    if (rank == 0) {
        MPI_Recv(&data, 1, MPI_INT, 1, 0, MPI_COMM_WORLD, MPI_STATUS_IGNORE);
    } else {
        MPI_Send(&data, 1, MPI_INT, 0, 0, MPI_COMM_WORLD);
    }
    
    MPI_Finalize();
    return 0;
}
\\end{verbatim}

What are the final values of x and y for each process?

\\section*{Problem 2}
Consider the following performance table:
\\begin{tabular}{|c|c|c|}
\\hline
Task & P1 (ms) & P2 (ms) \\\\
\\hline
A & 5 & 7 \\\\
B & 3 & 2 \\\\
C & 7 & 8 \\\\
\\hline
\\end{tabular}

Calculate the speedup for each task.
`;
  
  console.log(`📄 Mock LaTeX content length: ${mockLatexContent.length} chars`);
  
  // Step 2: Extract questions
  const extractedQuestions = extractQuestionsFromLatex(mockLatexContent);
  
  // Step 3: Analyze results
  console.log(`\n📊 ANALYSIS FOR TEST ${testNumber}:`);
  console.log(`- Total questions extracted: ${extractedQuestions.length}`);
  
  let codeSnippetCount = 0;
  let tableCount = 0;
  let diagramCount = 0;
  
  extractedQuestions.forEach((question, index) => {
    const hasCode = question.text.includes('[CODE SNIPPET]');
    const hasTable = question.text.includes('[TABLE]');
    const hasDiagram = question.text.includes('[DIAGRAM]');
    
    if (hasCode) codeSnippetCount++;
    if (hasTable) tableCount++;
    if (hasDiagram) diagramCount++;
    
    console.log(`  Q${index + 1}: Code=${hasCode}, Table=${hasTable}, Diagram=${hasDiagram}`);
  });
  
  console.log(`\n📈 SUMMARY:`);
  console.log(`- Questions with code snippets: ${codeSnippetCount}/${extractedQuestions.length}`);
  console.log(`- Questions with tables: ${tableCount}/${extractedQuestions.length}`);
  console.log(`- Questions with diagrams: ${diagramCount}/${extractedQuestions.length}`);
  
  return {
    testNumber,
    totalQuestions: extractedQuestions.length,
    codeSnippetCount,
    tableCount,
    diagramCount,
    questions: extractedQuestions
  };
};

// Run multiple tests
console.log('🧪 COMPREHENSIVE EXAM GENERATION DEBUGGING');
console.log('='.repeat(60));
console.log(`Running ${TEST_CONFIG.numTests} tests with ${TEST_CONFIG.numQuestions} questions each`);
console.log(`Subject: ${TEST_CONFIG.subject}`);
console.log(`Difficulty: ${TEST_CONFIG.difficulty}`);

const results = [];

for (let i = 1; i <= TEST_CONFIG.numTests; i++) {
  const result = simulateBackendProcessing(i);
  results.push(result);
  
  // Add delay between tests to simulate real conditions
  if (i < TEST_CONFIG.numTests) {
    console.log('\n⏳ Waiting 2 seconds before next test...\n');
    // In real execution, this would be a setTimeout
  }
}

// Final analysis
console.log('\n🎯 FINAL ANALYSIS');
console.log('='.repeat(60));

const avgQuestions = results.reduce((sum, r) => sum + r.totalQuestions, 0) / results.length;
const avgCodeSnippets = results.reduce((sum, r) => sum + r.codeSnippetCount, 0) / results.length;
const avgTables = results.reduce((sum, r) => sum + r.tableCount, 0) / results.length;
const avgDiagrams = results.reduce((sum, r) => sum + r.diagramCount, 0) / results.length;

console.log(`📊 AVERAGES ACROSS ${TEST_CONFIG.numTests} TESTS:`);
console.log(`- Average questions per test: ${avgQuestions.toFixed(1)}`);
console.log(`- Average code snippets per test: ${avgCodeSnippets.toFixed(1)}`);
console.log(`- Average tables per test: ${avgTables.toFixed(1)}`);
console.log(`- Average diagrams per test: ${avgDiagrams.toFixed(1)}`);

// Check for consistency
const inconsistentTests = results.filter(r => 
  r.codeSnippetCount === 0 || r.tableCount === 0 || r.diagramCount === 0
);

if (inconsistentTests.length > 0) {
  console.log(`\n⚠️ INCONSISTENCY DETECTED:`);
  console.log(`${inconsistentTests.length} tests had missing content:`);
  inconsistentTests.forEach(test => {
    console.log(`  Test ${test.testNumber}: Code=${test.codeSnippetCount}, Tables=${test.tableCount}, Diagrams=${test.diagramCount}`);
  });
} else {
  console.log(`\n✅ CONSISTENT RESULTS: All tests preserved content correctly`);
}

console.log('\n🔍 RECOMMENDATIONS:');
console.log('1. Check if the issue is in the PDF extraction phase');
console.log('2. Verify that LaTeX content contains the expected environments');
console.log('3. Test with actual PDF files to see real content');
console.log('4. Monitor the question extraction methods being used');
console.log('5. Check if different extraction methods handle content differently'); 