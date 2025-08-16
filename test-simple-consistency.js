// Simple test to check backend consistency and provide manual frontend verification
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const API_BASE = 'http://localhost:8000';

// Test configuration
const TEST_CONFIG = {
  numTests: 5,
  numQuestions: 10,
  subject: 'Parallel Computing',
  difficulty: 'medium',
  pdfPath: './backend/uploads/1754522304600-midterm-sp24.pdf'
};

// Helper function to analyze backend response
const analyzeBackendResponse = (testNumber, data) => {
  console.log(`\n📊 BACKEND ANALYSIS FOR TEST ${testNumber}:`);
  console.log('='.repeat(50));
  
  if (!data.interactiveQuestions) {
    console.log('❌ No interactiveQuestions found');
    return {
      testNumber,
      totalQuestions: 0,
      codeSnippetCount: 0,
      tableCount: 0,
      diagramCount: 0,
      hasContent: false
    };
  }
  
  console.log(`📝 Interactive questions: ${data.interactiveQuestions.length} questions`);
  
  let codeSnippetCount = 0;
  let tableCount = 0;
  let diagramCount = 0;
  let questionsWithContent = [];
  
  data.interactiveQuestions.forEach((question, index) => {
    const hasCode = question.question.includes('[CODE SNIPPET]') || question.question.includes('\\begin{verbatim}');
    const hasTable = question.question.includes('[TABLE]') || question.question.includes('\\begin{tabular}');
    const hasDiagram = question.question.includes('[DIAGRAM]') || question.question.includes('\\begin{tikzpicture}');
    
    if (hasCode) codeSnippetCount++;
    if (hasTable) tableCount++;
    if (hasDiagram) diagramCount++;
    
    if (hasCode || hasTable || hasDiagram) {
      questionsWithContent.push({
        id: question.id,
        hasCode,
        hasTable,
        hasDiagram,
        preview: question.question.substring(0, 150) + '...'
      });
    }
    
    console.log(`  Q${index + 1}: Code=${hasCode}, Table=${hasTable}, Diagram=${hasDiagram}`);
  });
  
  console.log(`\n📈 SUMMARY:`);
  console.log(`- Questions with code snippets: ${codeSnippetCount}/${data.interactiveQuestions.length}`);
  console.log(`- Questions with tables: ${tableCount}/${data.interactiveQuestions.length}`);
  console.log(`- Questions with diagrams: ${diagramCount}/${data.interactiveQuestions.length}`);
  
  if (questionsWithContent.length > 0) {
    console.log(`\n🔍 QUESTIONS WITH CONTENT:`);
    questionsWithContent.forEach(q => {
      console.log(`  Q${q.id}: Code=${q.hasCode}, Table=${q.hasTable}, Diagram=${q.hasDiagram}`);
      console.log(`    ${q.preview}`);
    });
  }
  
  return {
    testNumber,
    totalQuestions: data.interactiveQuestions.length,
    codeSnippetCount,
    tableCount,
    diagramCount,
    hasContent: codeSnippetCount > 0 || tableCount > 0 || diagramCount > 0,
    questionsWithContent
  };
};

// Main test function
const runTest = async (testNumber) => {
  console.log(`\n🧪 TEST ${testNumber}/${TEST_CONFIG.numTests}`);
  console.log('='.repeat(60));
  
  try {
    // Check if PDF exists
    if (!fs.existsSync(TEST_CONFIG.pdfPath)) {
      console.log(`❌ PDF not found: ${TEST_CONFIG.pdfPath}`);
      return null;
    }
    
    console.log(`📄 Using PDF: ${TEST_CONFIG.pdfPath}`);
    
    // Create form data
    const formData = new FormData();
    formData.append('subject', TEST_CONFIG.subject);
    formData.append('numQuestions', TEST_CONFIG.numQuestions.toString());
    formData.append('difficulty', TEST_CONFIG.difficulty);
    formData.append('generatePDF', 'true');
    formData.append('instructions', '');
    formData.append('questionPoints', JSON.stringify(Array(TEST_CONFIG.numQuestions).fill(10)));
    formData.append('pdf', fs.createReadStream(TEST_CONFIG.pdfPath));
    
    console.log('🚀 Generating exam...');
    
    // Generate the exam
    const response = await axios.post(`${API_BASE}/api/ai/practice-exam`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      timeout: 120000
    });
    
    console.log('✅ Exam generated successfully');
    
    // Analyze the response
    const data = response.data.data;
    const analysis = analyzeBackendResponse(testNumber, data);
    
    // Save response for manual inspection
    const responseFile = `test-${testNumber}-response.json`;
    fs.writeFileSync(responseFile, JSON.stringify(data, null, 2));
    console.log(`💾 Response saved to: ${responseFile}`);
    
    return analysis;
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
    return {
      testNumber,
      totalQuestions: 0,
      codeSnippetCount: 0,
      tableCount: 0,
      diagramCount: 0,
      hasContent: false,
      error: error.message
    };
  }
};

// Run all tests
const runAllTests = async () => {
  console.log('🧪 BACKEND CONSISTENCY TESTING');
  console.log('='.repeat(60));
  console.log(`Testing if backend consistently preserves tables/code snippets`);
  console.log(`Running ${TEST_CONFIG.numTests} tests with ${TEST_CONFIG.numQuestions} questions each`);
  console.log(`Subject: ${TEST_CONFIG.subject}`);
  console.log(`Difficulty: ${TEST_CONFIG.difficulty}`);
  console.log(`PDF: ${TEST_CONFIG.pdfPath}`);
  
  const results = [];
  
  for (let i = 1; i <= TEST_CONFIG.numTests; i++) {
    const result = await runTest(i);
    results.push(result);
    
    if (i < TEST_CONFIG.numTests) {
      console.log('\n⏳ Waiting 5 seconds before next test...\n');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  // Final analysis
  console.log('\n🎯 FINAL ANALYSIS');
  console.log('='.repeat(60));
  
  const successfulTests = results.filter(r => r && !r.error);
  const failedTests = results.filter(r => r && r.error);
  
  console.log(`📊 RESULTS:`);
  console.log(`- Successful tests: ${successfulTests.length}/${TEST_CONFIG.numTests}`);
  console.log(`- Failed tests: ${failedTests.length}/${TEST_CONFIG.numTests}`);
  
  if (successfulTests.length > 0) {
    const testsWithContent = successfulTests.filter(r => r.hasContent);
    const testsWithoutContent = successfulTests.filter(r => !r.hasContent);
    
    console.log(`\n🔍 BACKEND CONSISTENCY ANALYSIS:`);
    console.log(`- Tests WITH content (code/tables/diagrams): ${testsWithContent.length}`);
    console.log(`- Tests WITHOUT content: ${testsWithoutContent.length}`);
    
    if (testsWithContent.length > 0 && testsWithoutContent.length > 0) {
      console.log(`\n❌ BACKEND INCONSISTENCY DETECTED!`);
      console.log(`Some tests have content, others don't. This confirms the backend bug.`);
      
      console.log(`\nTests WITH content:`);
      testsWithContent.forEach(test => {
        console.log(`  Test ${test.testNumber}: Code=${test.codeSnippetCount}, Tables=${test.tableCount}, Diagrams=${test.diagramCount}`);
      });
      
      console.log(`\nTests WITHOUT content:`);
      testsWithoutContent.forEach(test => {
        console.log(`  Test ${test.testNumber}: Code=${test.codeSnippetCount}, Tables=${test.tableCount}, Diagrams=${test.diagramCount}`);
      });
    } else if (testsWithContent.length === successfulTests.length) {
      console.log(`\n✅ BACKEND CONSISTENT: All tests have content`);
    } else if (testsWithoutContent.length === successfulTests.length) {
      console.log(`\n❌ BACKEND CONSISTENT BUT BROKEN: No tests have content`);
    }
    
    // Calculate averages
    const avgCodeSnippets = successfulTests.reduce((sum, r) => sum + r.codeSnippetCount, 0) / successfulTests.length;
    const avgTables = successfulTests.reduce((sum, r) => sum + r.tableCount, 0) / successfulTests.length;
    const avgDiagrams = successfulTests.reduce((sum, r) => sum + r.diagramCount, 0) / successfulTests.length;
    
    console.log(`\n📈 AVERAGES ACROSS ${successfulTests.length} SUCCESSFUL TESTS:`);
    console.log(`- Average code snippets per test: ${avgCodeSnippets.toFixed(1)}`);
    console.log(`- Average tables per test: ${avgTables.toFixed(1)}`);
    console.log(`- Average diagrams per test: ${avgDiagrams.toFixed(1)}`);
  }
  
  if (failedTests.length > 0) {
    console.log(`\n❌ FAILED TESTS:`);
    failedTests.forEach(test => {
      console.log(`  Test ${test.testNumber}: ${test.error}`);
    });
  }
  
  console.log('\n🔍 MANUAL FRONTEND VERIFICATION:');
  console.log('1. Open the frontend at http://localhost:5173');
  console.log('2. Generate a practice exam with the same settings');
  console.log('3. Check if the interactive questions show tables/code snippets');
  console.log('4. Compare with the backend response files saved above');
  console.log('5. Repeat for multiple generations to see inconsistency');
  
  console.log('\n📁 SAVED RESPONSE FILES:');
  for (let i = 1; i <= TEST_CONFIG.numTests; i++) {
    console.log(`  test-${i}-response.json`);
  }
  
  console.log('\n🎯 NEXT STEPS:');
  console.log('1. If backend inconsistency detected, the fix is already applied');
  console.log('2. If backend is consistent but frontend shows inconsistency, check frontend processing');
  console.log('3. Manual verification will confirm if the issue is resolved');
};

// Run the tests
runAllTests().catch(console.error); 