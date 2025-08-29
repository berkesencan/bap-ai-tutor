const PDFService = require('./backend/services/pdf.service');
const { exec } = require('child_process');

async function midtermReplicaTest() {
  console.log('=== MIDTERM REPLICA TEST ===');
  console.log('🎯 Attempting to exactly replicate the uploaded midterm-sp24.pdf format\n');
  
  // Content that closely matches the original midterm structure
  const replicaContent = `CSCI-UA.0480-051: Parallel Computing

Midterm Exam (March 9th, 2023)

Total: 100 points

READ BEFORE YOU START:
- This is a closed-book exam
- You have 75 minutes to complete the exam
- Write your name and NetID on the top of each page
- Show all your work for partial credit
- Good luck!

Problem 1 (25 points)

Consider the following table showing processor features and their capabilities:

| Feature | Maximum Number of Processes/Threads | Maximum Number of Cores |
|---------|-------------------------------------|-------------------------|
| Only Pipelining | 1 | 1 |
| Superscalar (4 execution units) | 1 | 1 |
| 2-way Hyperthreading | 2 | 1 |
| 4-core CPU | 4 | 4 |
| 8-core CPU with Hyperthreading | 16 | 8 |

a. [8 points] Explain the difference between processes and threads in the context of these processor features. How does hyperthreading enable multiple threads per core?

b. [12 points] Compare the performance characteristics of each feature. Which feature would provide the best speedup for CPU-bound parallel workloads? Justify your answer.

c. [5 points] If you had to choose between a 4-core CPU without hyperthreading and a 2-core CPU with hyperthreading for parallel computing, which would you choose and why?

Problem 2 (40 points)

Suppose we have the following DAG that represents different tasks and their dependencies:

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

a. [15 points] What is the minimum number of CPUs of each type that we need to get the highest speedup over sequential execution on CPU type A? Show which CPU will execute which task(s) and calculate the final speedup.

b. [15 points] Repeat part (a), but using CPU type B instead of CPU type A as the baseline for sequential execution.

c. [10 points] A program uses multiple threads to perform computation. Does increasing the number of shared variables always lead to better performance through better data sharing? Explain why or why not, considering synchronization overhead.

Problem 3 (35 points)

Consider parallel algorithm analysis and performance evaluation.

a. [10 points] Define parallel efficiency and explain its importance in evaluating parallel algorithms. What factors can cause parallel efficiency to decrease as the number of processors increases?

b. [15 points] A parallel sorting algorithm achieves the following execution times:
   - Sequential: 120 seconds
   - 2 processors: 65 seconds  
   - 4 processors: 35 seconds
   - 8 processors: 22 seconds
   
   Calculate the speedup and parallel efficiency for each configuration. What can you conclude about the scalability of this algorithm?

c. [10 points] Explain Amdahl's Law and how it limits the maximum speedup achievable by parallel processing. If a program has 20% sequential code, what is the theoretical maximum speedup possible with unlimited processors?

Name: ________________________    NetID: ________________________

Honor Code: I pledge that I have neither given nor received unauthorized aid on this examination.

Signature: ________________________    Date: ________________________`;

  try {
    console.log('📄 Generating MIDTERM REPLICA PDF...');
    console.log('   Attempting to match original formatting exactly');
    
    const pdf = await PDFService.generateExamPDF(
      replicaContent, 
      'Parallel Computing', 
      { 
        difficulty: 'medium',
        questionPoints: [25, 40, 35]
      }
    );
    
    const filename = `MIDTERM-REPLICA-${Date.now()}.pdf`;
    const filePath = await PDFService.savePDFToFile(pdf, filename);
    
    console.log(`✅ Generated: ${filename}`);
    console.log(`📊 Size: ${pdf.length} bytes`);
    console.log(`📁 Path: ${filePath}`);
    
    console.log('\n🎯 REPLICA COMPARISON:');
    console.log('This PDF should closely match the original midterm-sp24.pdf in:');
    console.log('✅ Header format (CSCI-UA.0480-051: Parallel Computing)');
    console.log('✅ Exam title and date format');
    console.log('✅ Total points display');
    console.log('✅ Problem structure and numbering');
    console.log('✅ Table formatting with complete data rows');
    console.log('✅ DAG diagram representation');
    console.log('✅ Sub-question formatting (a., b., c.)');
    console.log('✅ Point allocation display ([X points])');
    console.log('✅ Honor code section at bottom');
    console.log('✅ Professional academic layout');
    
    console.log('\n🚀 Opening PDFs for side-by-side comparison...');
    
    // Open original first
    setTimeout(() => {
      exec('open midterm-sp24.pdf', (error) => {
        if (error) {
          console.log('❌ Could not open original:', error.message);
        } else {
          console.log('✅ Opened original: midterm-sp24.pdf');
        }
      });
    }, 500);
    
    // Open replica after delay
    setTimeout(() => {
      exec(`open "${filePath}"`, (error) => {
        if (error) {
          console.log('❌ Could not open replica:', error.message);
        } else {
          console.log('✅ Opened replica: MIDTERM-REPLICA');
        }
      });
    }, 2000);
    
    console.log('\n📋 DETAILED COMPARISON CHECKLIST:');
    console.log('□ Course code format matches exactly?');
    console.log('□ Exam title and date formatting identical?');
    console.log('□ Total points display in same style?');
    console.log('□ Problem headers use same font/size?');
    console.log('□ Tables show all data rows with proper borders?');
    console.log('□ Table column widths appropriate for content?');
    console.log('□ DAG diagrams render clearly?');
    console.log('□ Sub-questions (a., b., c.) formatted consistently?');
    console.log('□ Point allocations ([X points]) in correct style?');
    console.log('□ Text alignment matches (no right-shifting)?');
    console.log('□ Margins and spacing look professional?');
    console.log('□ Honor code section at bottom formatted correctly?');
    console.log('□ Overall layout resembles academic exam format?');
    
    console.log('\n🔍 SPECIFIC ISSUES TO CHECK:');
    console.log('❗ Are all table rows visible (not just headers)?');
    console.log('❗ Is content properly aligned to left margin?');
    console.log('❗ Do tables have proper borders and spacing?');
    console.log('❗ Are mathematical expressions readable?');
    console.log('❗ Does the DAG diagram display correctly?');
    
  } catch (error) {
    console.error('❌ Replica test failed:', error.message);
    console.error('Full error:', error);
  }
}

// Run the midterm replica test
midtermReplicaTest(); 