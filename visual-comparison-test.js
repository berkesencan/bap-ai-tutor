const PDFService = require('./backend/services/pdf.service');
const { exec } = require('child_process');
const fs = require('fs');

async function visualComparisonTest() {
  console.log('=== COMPREHENSIVE VISUAL COMPARISON TEST ===');
  console.log('🎯 Generating multiple test PDFs to compare visual formatting\n');
  
  const testScenarios = [
    {
      name: 'ALIGNMENT_TEST',
      description: 'Test for proper left margin alignment',
      content: `CSCI-UA.0480-051: Parallel Computing

Midterm Exam (March 9th, 2023)

Total: 100 points

Problem 1 (25 points)

This text should be aligned to the left margin without any shifting to the right.

Consider the following table:

| Feature | Value |
|---------|-------|
| Test 1  | Data  |
| Test 2  | Data  |

a. [10 points] This sub-question should also be properly aligned.

b. [15 points] All text should start at the same left margin position.`
    },
    
    {
      name: 'TABLE_ALIGNMENT_TEST',
      description: 'Focus on table alignment and positioning',
      content: `CSCI-UA.0480-051: Parallel Computing

Table Alignment Test

Total: 100 points

Problem 1 (30 points)

The following table should be aligned with the text:

| Task | CPU type A | CPU type B | CPU type C |
|------|------------|------------|------------|
| A    | 5          | 4          | 6          |
| B    | 10         | 8          | 12         |
| C    | 15         | 18         | 12         |

Text after table should maintain the same left alignment as text before table.

Another table:

| Simple | Test |
|--------|------|
| Row 1  | Val  |
| Row 2  | Val  |

Final text should still be aligned properly.`
    },
    
    {
      name: 'EXACT_REPLICA',
      description: 'Exact replica attempt of uploaded midterm',
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

a. [8 points] Explain the difference between processes and threads.

b. [12 points] Compare the performance characteristics of each feature.

c. [5 points] Which feature would be most beneficial for CPU-bound tasks?

Problem 2 (40 points)

Suppose we have the following DAG:

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

The following table shows execution times:

| Task | CPU type A | CPU type B | CPU type C |
|------|------------|------------|------------|
| A    | 5          | 4          | 6          |
| B    | 10         | 8          | 12         |
| C    | 15         | 18         | 12         |
| D    | 20         | 16         | 24         |
| E    | 8          | 10         | 6          |
| F    | 12         | 14         | 10         |

a. [15 points] Calculate the minimum execution time.

b. [15 points] Determine optimal scheduling strategy.

c. [10 points] Explain the impact of CPU type selection.`
    }
  ];
  
  const generatedPDFs = [];
  
  // Generate all test PDFs
  for (const scenario of testScenarios) {
    try {
      console.log(`📄 Generating ${scenario.name}...`);
      console.log(`   ${scenario.description}`);
      
      const pdf = await PDFService.generateExamPDF(
        scenario.content, 
        'Parallel Computing', 
        { 
          difficulty: 'medium',
          questionPoints: [25, 40, 35]
        }
      );
      
      const timestamp = Date.now();
      const filename = `VISUAL-${scenario.name}-${timestamp}.pdf`;
      const filePath = await PDFService.savePDFToFile(pdf, filename);
      
      generatedPDFs.push({
        name: scenario.name,
        description: scenario.description,
        path: filePath,
        size: pdf.length
      });
      
      console.log(`   ✅ Generated: ${filename}`);
      console.log(`   📊 Size: ${pdf.length} bytes`);
      
    } catch (error) {
      console.error(`   ❌ Failed to generate ${scenario.name}:`, error.message);
    }
  }
  
  console.log('\n🎯 VISUAL COMPARISON SUMMARY:');
  console.log(`📋 Generated ${generatedPDFs.length} test PDFs for visual comparison`);
  
  generatedPDFs.forEach((pdf, index) => {
    console.log(`\n${index + 1}. ${pdf.name}`);
    console.log(`   📝 ${pdf.description}`);
    console.log(`   📁 ${pdf.path}`);
    console.log(`   📊 ${pdf.size} bytes`);
  });
  
  console.log('\n🚀 Opening all PDFs for visual comparison...');
  console.log('📋 VISUAL INSPECTION CHECKLIST:');
  console.log('□ All text starts at the same left margin position?');
  console.log('□ Tables are aligned with surrounding text?');
  console.log('□ No content is shifted to the right?');
  console.log('□ Headers are properly centered?');
  console.log('□ Problem sections have consistent indentation?');
  console.log('□ Sub-questions (a., b., c.) are properly aligned?');
  console.log('□ Table borders and content are properly positioned?');
  console.log('□ DAG diagrams are centered appropriately?');
  
  // Open original midterm first
  setTimeout(() => {
    exec('open midterm-sp24.pdf', (error) => {
      if (error) {
        console.log('❌ Could not open original midterm:', error.message);
      } else {
        console.log('✅ Opened ORIGINAL: midterm-sp24.pdf');
      }
    });
  }, 500);
  
  // Open generated PDFs with staggered timing
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
  
  console.log('\n🔍 CRITICAL ALIGNMENT ISSUES TO CHECK:');
  console.log('❗ Compare left margin alignment between original and generated PDFs');
  console.log('❗ Verify that tables start at the same position as regular text');
  console.log('❗ Check that problem headers align consistently');
  console.log('❗ Ensure sub-questions maintain proper indentation');
  console.log('❗ Confirm no content appears shifted to the right');
  
  console.log('\n💡 VISUAL COMPARISON TIPS:');
  console.log('1. Open PDFs side-by-side in separate windows');
  console.log('2. Compare the left edge alignment of text');
  console.log('3. Check table positioning relative to text');
  console.log('4. Look for consistent margins throughout');
  console.log('5. Verify headers are centered properly');
  
  // Also create a summary report
  console.log('\n📊 GENERATING SUMMARY REPORT...');
  const summaryReport = `
VISUAL COMPARISON TEST REPORT
Generated: ${new Date().toISOString()}

ORIGINAL FILE: midterm-sp24.pdf

GENERATED TEST FILES:
${generatedPDFs.map((pdf, i) => `${i+1}. ${pdf.name} - ${pdf.description} (${pdf.size} bytes)`).join('\n')}

ALIGNMENT ISSUES TO VERIFY:
□ Left margin consistency across all content
□ Table alignment with surrounding text  
□ Header centering and positioning
□ Problem section indentation
□ Sub-question alignment
□ No right-shifting of content

COMPARISON METHOD:
1. Open original midterm-sp24.pdf
2. Open each generated test PDF
3. Compare side-by-side for alignment issues
4. Verify table formatting matches original
5. Check for consistent left margin positioning

EXPECTED RESULT:
All generated PDFs should have identical left margin alignment to the original midterm PDF.
No content should appear shifted to the right compared to the original.
`;
  
  fs.writeFileSync('visual-comparison-report.txt', summaryReport);
  console.log('✅ Summary report saved: visual-comparison-report.txt');
}

// Run the visual comparison test
visualComparisonTest(); 
 
 
 
 
 
 
 