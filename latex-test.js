const LaTeXPDFAnalyzer = require('./latex-pdf-analyzer');
const { exec } = require('child_process');

async function testLaTeXApproach() {
  console.log('=== LATEX-BASED PDF GENERATION TEST ===');
  console.log('🎯 Demonstrating how LaTeX allows precise formatting control\n');
  
  // Sample exam content similar to your midterm
  const examContent = `CSCI-UA.0480-051: Parallel Computing

Midterm Exam (March 9th, 2023)

Total: 100 points

Important Notes:
• READ BEFORE STARTING: Make sure you understand all questions before beginning
• Show all work for partial credit
• Clearly label your answers
• Time limit: 90 minutes

Problem 1 (25 points)

Consider the following table showing processor features and their capabilities:

| Feature | Maximum Number of Processes/Threads | Maximum Number of Cores | Performance Impact |
|---------|-------------------------------------|-------------------------|-------------------|
| Only Pipelining | 1 | 1 | Low |
| Superscalar (4 execution units) | 1 | 1 | Medium |
| 2-way Hyperthreading | 2 | 1 | High |
| Multi-core (4 cores) | 4 | 4 | Very High |

a. [8 points] Explain the difference between processes and threads in the context of parallel computing.

b. [12 points] Compare the performance characteristics of each feature listed in the table.

c. [5 points] Which feature would be most beneficial for CPU-bound tasks? Justify your answer.

Problem 2 (40 points)

Suppose we have the following task dependency graph (DAG):

\`\`\`
       A(5)
      /    \\
   B(10)   C(15)
     |      |
   D(20)   E(8)
     |      |
      \\    /
       F(12)
\`\`\`

The numbers in parentheses represent execution times in seconds.

The following table shows the execution time of each task if we execute it on different CPU types:

| Task | CPU type A | CPU type B | CPU type C |
|------|------------|------------|------------|
| A    | 5          | 4          | 6          |
| B    | 10         | 8          | 12         |
| C    | 15         | 18         | 12         |
| D    | 20         | 16         | 24         |
| E    | 8          | 10         | 6          |
| F    | 12         | 14         | 10         |

a. [15 points] What is the minimum execution time for the entire task graph using CPU type A, and calculate the final speedup.

b. [15 points] Repeat part (a), but using CPU type B instead of CPU type A as the baseline for sequential execution.

c. [10 points] Which CPU type would you choose for optimal performance? Explain your reasoning.`;

  try {
    console.log('📄 Step 1: Analyzing PDF formatting (simulated)...');
    const formatAnalysis = await LaTeXPDFAnalyzer.analyzePDFFormatting('midterm-sp24.pdf');
    console.log('✅ Format analysis completed');
    console.log('📊 Detected formatting:');
    console.log('   - Document class:', formatAnalysis.documentClass);
    console.log('   - Font size:', formatAnalysis.fontSize);
    console.log('   - Margins:', formatAnalysis.margins.top);
    console.log('   - Header color:', formatAnalysis.colors.headerText);
    console.log('   - Table background:', formatAnalysis.colors.tableHeaders);
    
    console.log('\n📝 Step 2: Converting content to LaTeX...');
    const latexDocument = LaTeXPDFAnalyzer.generateLaTeXDocument(
      examContent, 
      'Parallel Computing', 
      formatAnalysis, 
      [25, 40, 35]
    );
    
    console.log('✅ LaTeX document generated');
    console.log(`📏 Document length: ${latexDocument.length} characters`);
    
    console.log('\n🔍 Step 3: LaTeX formatting analysis...');
    console.log('I can now see EXACTLY how the document will be formatted:');
    
    // Analyze specific formatting elements
    const formatElements = {
      documentClass: latexDocument.match(/\\documentclass\[(.*?)\]\{(.*?)\}/),
      colors: latexDocument.match(/\\definecolor\{.*?\}\{HTML\}\{.*?\}/g),
      tableFormatting: latexDocument.match(/\\begin\{tabular\}.*?\\end\{tabular\}/gs),
      sectionFormatting: latexDocument.match(/\\section\*\{.*?\}/g),
      spacing: latexDocument.match(/\\vspace\{.*?\}/g)
    };
    
    console.log('\n📋 DETECTED LATEX FORMATTING:');
    console.log('🎨 Colors defined:', formatElements.colors?.length || 0);
    console.log('📊 Tables found:', formatElements.tableFormatting?.length || 0);
    console.log('📝 Sections found:', formatElements.sectionFormatting?.length || 0);
    console.log('📏 Spacing commands:', formatElements.spacing?.length || 0);
    
    console.log('\n🎯 Step 4: Saving LaTeX for inspection...');
    const texFilePath = await LaTeXPDFAnalyzer.compileLaTeXToPDF(latexDocument, 'midterm-latex-test');
    console.log('✅ LaTeX file saved:', texFilePath);
    
    // Open the LaTeX file for inspection
    setTimeout(() => {
      exec(`open "${texFilePath}"`, (error) => {
        if (error) {
          console.log('❌ Could not open LaTeX file:', error.message);
        } else {
          console.log('✅ Opened LaTeX file for inspection');
        }
      });
    }, 1000);
    
    console.log('\n🔍 LATEX APPROACH ADVANTAGES:');
    console.log('✅ I can see EXACT formatting code');
    console.log('✅ Precise control over colors, fonts, spacing');
    console.log('✅ Professional table formatting with borders and backgrounds');
    console.log('✅ Proper mathematical notation for DAG diagrams');
    console.log('✅ Academic-standard document structure');
    console.log('✅ Consistent formatting across all elements');
    
    console.log('\n📝 SAMPLE LATEX CODE I CAN SEE AND MODIFY:');
    console.log('```latex');
    console.log(latexDocument.substring(0, 800) + '...');
    console.log('```');
    
    console.log('\n🎯 NEXT STEPS FOR PERFECT FORMATTING:');
    console.log('1. You examine the generated LaTeX file');
    console.log('2. Tell me what needs adjustment (colors, spacing, fonts)');
    console.log('3. I modify the LaTeX code precisely');
    console.log('4. We compile to PDF with perfect formatting');
    console.log('5. Repeat until it matches your original exactly');
    
  } catch (error) {
    console.error('❌ LaTeX test failed:', error);
  }
}

// Run the LaTeX test
testLaTeXApproach(); 