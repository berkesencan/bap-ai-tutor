const PDFService = require('./backend/services/pdf.service');
const { exec } = require('child_process');

async function edgeCasePDFTest() {
  console.log('=== EDGE CASE PDF TESTING ===');
  console.log('🔍 Testing potential formatting issues and edge cases\n');
  
  const edgeCases = [
    {
      name: 'LONG_TABLE_HEADERS',
      description: 'Tables with very long column headers',
      content: `CSCI-UA.0480-051: Parallel Computing

Midterm Exam (March 9th, 2023)

Total: 100 points

Problem 1 (30 points)

Consider the following table with very long column headers:

| Very Long Feature Name That Might Cause Wrapping Issues | Maximum Number of Concurrent Processes/Threads Supported | Maximum Number of Physical CPU Cores Available |
|----------------------------------------------------------|-----------------------------------------------------------|------------------------------------------------|
| Only Pipelining Without Any Other Optimizations | 1 | 1 |
| Superscalar Architecture with 4 Execution Units | 1 | 1 |
| 2-way Hyperthreading Technology Implementation | 2 | 1 |

a. [15 points] How do these features affect parallel performance?

b. [15 points] Which feature provides the best throughput improvement?`
    },
    
    {
      name: 'MANY_SMALL_TABLES',
      description: 'Multiple small tables in sequence',
      content: `CSCI-UA.0480-051: Parallel Computing

Practice Exam

Total: 100 points

Problem 1 (40 points)

Consider these execution time tables:

Table A:
| Task | Time |
|------|------|
| A1   | 5    |
| A2   | 10   |

Table B:
| Task | Time |
|------|------|
| B1   | 3    |
| B2   | 7    |

Table C:
| Task | Time |
|------|------|
| C1   | 12   |
| C2   | 8    |

Table D:
| Task | Time |
|------|------|
| D1   | 15   |
| D2   | 4    |

a. [20 points] Calculate total execution time for each table.

b. [20 points] Which table has the best load balance?`
    },
    
    {
      name: 'MIXED_SYMBOLS',
      description: 'Content with special characters and symbols',
      content: `CSCI-UA.0480-051: Parallel Computing

Midterm Exam (March 9th, 2023)

Total: 100 points

Problem 1 (25 points)

Consider parallel algorithms with complexity analysis:

| Algorithm | Sequential O(n) | Parallel O(n/p) | Efficiency η |
|-----------|-----------------|-----------------|--------------|
| Merge Sort | O(n log n) | O((n log n)/p) | 85% |
| Quick Sort | O(n²) worst | O(n²/p) worst | 70% |
| Bubble Sort | O(n²) | O(n²/p) | 45% |

Special symbols: α, β, γ, δ, ε, π, σ, τ, ω, Ω, Θ

Mathematical expressions:
- Speedup: S(p) = T₁/Tₚ
- Efficiency: E(p) = S(p)/p = T₁/(p×Tₚ)
- Scalability: f(n,p) ≤ c×g(n/p)

a. [10 points] Calculate theoretical speedup for p=8 processors.

b. [15 points] Explain why efficiency decreases with more processors.`
    },
    
    {
      name: 'LARGE_COMPLEX_DAG',
      description: 'Complex DAG with many nodes and connections',
      content: `CSCI-UA.0480-051: Parallel Computing

Final Exam

Total: 100 points

Problem 1 (50 points)

Consider this complex task dependency graph:

\`\`\`
           A(5)
          /    \\
       B(3)    C(7)
      /   \\   /   \\
   D(4)   E(6) F(2) G(8)
    |     |   |     |
   H(3)  I(5) J(4) K(7)
    |     |   |     |
     \\   /     \\   /
      L(6)      M(9)
        |        |
        \\      /
         N(4)
\`\`\`

Execution times are shown in parentheses.

The following table shows processor assignments:

| Task | Processor | Start Time | Finish Time |
|------|-----------|------------|-------------|
| A    | P1        | 0          | 5           |
| B    | P2        | 5          | 8           |
| C    | P3        | 5          | 12          |
| D    | P2        | 8          | 12          |
| E    | P1        | 12         | 18          |

a. [20 points] Complete the scheduling table for all tasks.

b. [15 points] What is the critical path and total execution time?

c. [15 points] Can you reduce the total time with better scheduling?`
    }
  ];
  
  const generatedPDFs = [];
  
  for (const testCase of edgeCases) {
    try {
      console.log(`\n📄 Generating ${testCase.name}...`);
      console.log(`   Description: ${testCase.description}`);
      
      const pdf = await PDFService.generateExamPDF(
        testCase.content, 
        'Parallel Computing', 
        { 
          difficulty: 'hard',
          questionPoints: [30, 40, 30]
        }
      );
      
      const filename = `EDGE-${testCase.name}-${Date.now()}.pdf`;
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
      console.error(`   Full error:`, error);
    }
  }
  
  console.log('\n🔍 EDGE CASE TESTING SUMMARY:');
  console.log(`📋 Generated ${generatedPDFs.length} edge case PDFs`);
  
  generatedPDFs.forEach((pdf, index) => {
    console.log(`\n${index + 1}. ${pdf.name}`);
    console.log(`   📝 ${pdf.description}`);
    console.log(`   📁 ${pdf.path}`);
    console.log(`   📊 ${pdf.size} bytes`);
  });
  
  console.log('\n🚀 Opening edge case PDFs for inspection...');
  
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
    }, (index + 1) * 1500); // 1.5 second delay between opens
  });
  
  console.log('\n🔍 EDGE CASE CHECKLIST:');
  console.log('□ Long table headers wrap properly?');
  console.log('□ Multiple small tables format correctly?');
  console.log('□ Special characters and symbols render correctly?');
  console.log('□ Complex DAGs display properly?');
  console.log('□ Tables with many columns fit on page?');
  console.log('□ Content doesn\'t overflow page boundaries?');
  console.log('□ Mathematical expressions display correctly?');
  console.log('□ All table data rows are visible?');
  
}

// Run the edge case test
edgeCasePDFTest(); 