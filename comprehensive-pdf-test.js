const PDFService = require('./backend/services/pdf.service');
const { exec } = require('child_process');

async function comprehensivePDFTest() {
  console.log('=== COMPREHENSIVE PDF TESTING ===');
  console.log('📋 Generating multiple test PDFs to compare with midterm-sp24.pdf\n');
  
  const testCases = [
    {
      name: 'SIMPLE_TABLE',
      description: 'Basic table structure like the original',
      content: `CSCI-UA.0480-051: Parallel Computing

Midterm Exam (March 9th, 2023)

Total: 100 points

Problem 1 (25 points)

Consider the following table showing processor features:

| Feature | Maximum Number of Processes/Threads | Maximum Number of Cores |
|---------|-------------------------------------|-------------------------|
| Only Pipelining | 1 | 1 |
| Superscalar (4 execution units) | 1 | 1 |
| 2-way Hyperthreading | 2 | 1 |

a. [8 points] Explain the difference between processes and threads.`
    },
    
    {
      name: 'COMPLEX_TABLES',
      description: 'Multiple tables with different structures',
      content: `CSCI-UA.0480-051: Parallel Computing

Practice Exam

Total: 100 points

Problem 1 (30 points)

The following table shows execution times:

| Task | CPU type A | CPU type B |
|------|------------|------------|
| A    | 5          | 5          |
| B    | 10         | 5          |
| C    | 20         | 30         |

Problem 2 (40 points)

Consider this scheduling table:

| Process | Arrival Time | Burst Time | Priority |
|---------|--------------|------------|----------|
| P1      | 0            | 8          | 3        |
| P2      | 1            | 4          | 1        |
| P3      | 2            | 9          | 4        |
| P4      | 3            | 5          | 2        |

a. [15 points] Calculate the average waiting time.

b. [25 points] Draw the Gantt chart for priority scheduling.`
    },
    
    {
      name: 'DAG_DIAGRAM',
      description: 'Content with DAG diagrams like the original',
      content: `CSCI-UA.0480-051: Parallel Computing

Midterm Exam

Total: 100 points

Problem 1 (35 points)

Consider the following DAG:

\`\`\`
       A(2)
      /    \\
   B(4)    C(6)
     |      |
   D(8)    E(10)
     |      |
      \\    /
       F(3)
\`\`\`

The numbers in parentheses represent execution times.

a. [10 points] What is the critical path?

b. [15 points] Calculate minimum execution time with unlimited processors.

c. [10 points] How many processors are needed for optimal performance?`
    },
    
    {
      name: 'MIXED_CONTENT',
      description: 'Mixed content with tables, diagrams, and text like the original',
      content: `CSCI-UA.0480-051: Parallel Computing

Midterm Exam (March 9th, 2023)

Total: 100 points

Problem 1 (25 points)

Consider the following table showing processor features:

| Feature | Maximum Number of Processes/Threads | Maximum Number of Cores |
|---------|-------------------------------------|-------------------------|
| Only Pipelining | 1 | 1 |
| Superscalar (4 execution units) | 1 | 1 |
| 2-way Hyperthreading | 2 | 1 |

a. [8 points] Explain how pipelining improves performance.

b. [12 points] Compare superscalar and hyperthreading approaches.

c. [5 points] Which feature provides the best speedup for parallel workloads?

Problem 2 (40 points)

Consider a task dependency graph:

\`\`\`
    A(5)
   /    \\
B(10)   C(15)
  |       |
D(20)   E(8)
  |       |
   \\     /
    F(12)
\`\`\`

The following table shows execution times on different CPU types:

| Task | CPU-A | CPU-B | CPU-C |
|------|-------|-------|-------|
| A    | 5     | 4     | 6     |
| B    | 10    | 8     | 12    |
| C    | 15    | 18    | 10    |
| D    | 20    | 16    | 25    |
| E    | 8     | 10    | 6     |
| F    | 12    | 14    | 8     |

a. [15 points] Calculate the critical path for each CPU type.

b. [15 points] Which CPU type provides the best performance?

c. [10 points] What is the theoretical speedup with unlimited processors?

Problem 3 (35 points)

a. [10 points] Define parallel efficiency and explain its importance.

b. [15 points] A parallel program achieves 6x speedup on 8 processors. Calculate the parallel efficiency and identify potential bottlenecks.

c. [10 points] How would you improve the parallel efficiency of this program?`
    }
  ];
  
  const generatedPDFs = [];
  
  for (const testCase of testCases) {
    try {
      console.log(`\n📄 Generating ${testCase.name}...`);
      console.log(`   Description: ${testCase.description}`);
      
      const pdf = await PDFService.generateExamPDF(
        testCase.content, 
        'Parallel Computing', 
        { 
          difficulty: 'medium',
          questionPoints: [25, 40, 35]
        }
      );
      
      const filename = `TEST-${testCase.name}-${Date.now()}.pdf`;
      const filePath = await PDFService.savePDFToFile(pdf, filename);
      
      generatedPDFs.push({
        name: testCase.name,
        description: testCase.description,
        path: filePath,
        size: pdf.length
      });
      
      console.log(`   ✅ Generated: ${filename}`);
      console.log(`   📊 Size: ${pdf.length} bytes`);
      
    } catch (error) {
      console.error(`   ❌ Failed to generate ${testCase.name}:`, error.message);
    }
  }
  
  console.log('\n🎯 TESTING SUMMARY:');
  console.log(`📋 Generated ${generatedPDFs.length} test PDFs`);
  
  generatedPDFs.forEach((pdf, index) => {
    console.log(`\n${index + 1}. ${pdf.name}`);
    console.log(`   📝 ${pdf.description}`);
    console.log(`   📁 ${pdf.path}`);
    console.log(`   📊 ${pdf.size} bytes`);
  });
  
  console.log('\n🔍 MANUAL COMPARISON REQUIRED:');
  console.log('1. Open the original: midterm-sp24.pdf');
  console.log('2. Compare with each generated PDF');
  console.log('3. Check for:');
  console.log('   ✅ Proper table formatting (all rows visible, proper borders)');
  console.log('   ✅ Correct text alignment (no right-shifting)');
  console.log('   ✅ Professional header formatting');
  console.log('   ✅ Consistent font sizes and spacing');
  console.log('   ✅ Proper margin alignment');
  console.log('   ✅ DAG diagram rendering');
  
  console.log('\n🚀 Opening PDFs for comparison...');
  
  // Open original first
  exec('open midterm-sp24.pdf', (error) => {
    if (error) {
      console.log('❌ Could not open original PDF:', error.message);
    } else {
      console.log('✅ Opened original: midterm-sp24.pdf');
    }
  });
  
  // Open generated PDFs with delay
  generatedPDFs.forEach((pdf, index) => {
    setTimeout(() => {
      exec(`open "${pdf.path}"`, (error) => {
        if (error) {
          console.log(`❌ Could not open ${pdf.name}:`, error.message);
        } else {
          console.log(`✅ Opened: ${pdf.name}`);
        }
      });
    }, (index + 1) * 2000); // 2 second delay between opens
  });
  
  console.log('\n📋 COMPARISON CHECKLIST:');
  console.log('□ Headers match the original format?');
  console.log('□ Tables show all data rows (not just headers)?');
  console.log('□ Content alignment matches (no right-shift)?');
  console.log('□ Font sizes are consistent?');
  console.log('□ Spacing and margins look professional?');
  console.log('□ Overall layout resembles the original?');
  
}

// Run the comprehensive test
comprehensivePDFTest(); 