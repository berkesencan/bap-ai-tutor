// Test frontend display consistency - compare generated PDF with interactive questions
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const puppeteer = require('puppeteer');

const API_BASE = 'http://localhost:8000';
const FRONTEND_URL = 'http://localhost:5173';

// Test configuration
const TEST_CONFIG = {
  numTests: 5,
  numQuestions: 10,
  subject: 'Parallel Computing',
  difficulty: 'medium',
  pdfPath: './backend/uploads/1754522304600-midterm-sp24.pdf'
};

// Helper function to analyze PDF content
const analyzePDFContent = async (pdfPath) => {
  try {
    // For now, we'll assume the PDF has content if it exists
    // In a real test, we'd extract text from PDF to check for tables/code
    const stats = fs.statSync(pdfPath);
    console.log(`📄 PDF size: ${(stats.size / 1024).toFixed(1)}KB`);
    return {
      hasContent: stats.size > 50000, // Assume large PDFs have content
      size: stats.size
    };
  } catch (error) {
    console.log(`❌ Error analyzing PDF: ${error.message}`);
    return { hasContent: false, size: 0 };
  }
};

// Helper function to check frontend interactive questions
const checkFrontendDisplay = async (testNumber) => {
  console.log(`\n🌐 Checking frontend display for test ${testNumber}...`);
  
  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    // Navigate to frontend
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle0' });
    
    // Wait for the page to load
    await page.waitForTimeout(3000);
    
    // Look for interactive questions section
    const interactiveQuestions = await page.evaluate(() => {
      const questions = document.querySelectorAll('.question-container, .question-block, [data-question]');
      const results = [];
      
      questions.forEach((q, index) => {
        const text = q.textContent || q.innerText || '';
        const hasTable = text.includes('[TABLE]') || text.includes('<table>') || text.includes('tabular');
        const hasCode = text.includes('[CODE SNIPPET]') || text.includes('<pre>') || text.includes('verbatim');
        const hasDiagram = text.includes('[DIAGRAM]') || text.includes('tikzpicture');
        
        results.push({
          questionNumber: index + 1,
          hasTable,
          hasCode,
          hasDiagram,
          preview: text.substring(0, 100)
        });
      });
      
      return results;
    });
    
    await browser.close();
    
    const totalQuestions = interactiveQuestions.length;
    const questionsWithTables = interactiveQuestions.filter(q => q.hasTable).length;
    const questionsWithCode = interactiveQuestions.filter(q => q.hasCode).length;
    const questionsWithDiagrams = interactiveQuestions.filter(q => q.hasDiagram).length;
    
    console.log(`📊 Frontend Analysis:`);
    console.log(`- Total questions found: ${totalQuestions}`);
    console.log(`- Questions with tables: ${questionsWithTables}`);
    console.log(`- Questions with code: ${questionsWithCode}`);
    console.log(`- Questions with diagrams: ${questionsWithDiagrams}`);
    
    return {
      testNumber,
      totalQuestions,
      questionsWithTables,
      questionsWithCode,
      questionsWithDiagrams,
      hasContent: questionsWithTables > 0 || questionsWithCode > 0 || questionsWithDiagrams > 0,
      questions: interactiveQuestions
    };
    
  } catch (error) {
    console.log(`❌ Error checking frontend: ${error.message}`);
    return {
      testNumber,
      totalQuestions: 0,
      questionsWithTables: 0,
      questionsWithCode: 0,
      questionsWithDiagrams: 0,
      hasContent: false,
      error: error.message
    };
  }
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
    console.log(`📊 Backend response:`);
    console.log(`- Interactive questions: ${data.interactiveQuestions?.length || 0}`);
    console.log(`- Parsed questions: ${data.parsedQuestions?.length || 0}`);
    
    // Check if backend preserved content
    let backendHasContent = false;
    if (data.interactiveQuestions) {
      const hasCode = data.interactiveQuestions.some(q => 
        q.question.includes('[CODE SNIPPET]') || q.question.includes('\\begin{verbatim}')
      );
      const hasTable = data.interactiveQuestions.some(q => 
        q.question.includes('[TABLE]') || q.question.includes('\\begin{tabular}')
      );
      const hasDiagram = data.interactiveQuestions.some(q => 
        q.question.includes('[DIAGRAM]') || q.question.includes('\\begin{tikzpicture}')
      );
      
      backendHasContent = hasCode || hasTable || hasDiagram;
      
      console.log(`- Backend has code snippets: ${hasCode}`);
      console.log(`- Backend has tables: ${hasTable}`);
      console.log(`- Backend has diagrams: ${hasDiagram}`);
    }
    
    // Analyze generated PDF
    const pdfAnalysis = await analyzePDFContent(data.pdfPath);
    console.log(`- PDF has content: ${pdfAnalysis.hasContent}`);
    
    // Check frontend display
    const frontendAnalysis = await checkFrontendDisplay(testNumber);
    
    return {
      testNumber,
      backendHasContent,
      pdfHasContent: pdfAnalysis.hasContent,
      frontendHasContent: frontendAnalysis.hasContent,
      frontendAnalysis,
      backendQuestions: data.interactiveQuestions?.length || 0,
      frontendQuestions: frontendAnalysis.totalQuestions
    };
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    return {
      testNumber,
      backendHasContent: false,
      pdfHasContent: false,
      frontendHasContent: false,
      error: error.message
    };
  }
};

// Run all tests
const runAllTests = async () => {
  console.log('🧪 FRONTEND DISPLAY CONSISTENCY TESTING');
  console.log('='.repeat(60));
  console.log(`Testing if interactive questions consistently show tables/code snippets`);
  console.log(`Running ${TEST_CONFIG.numTests} tests with ${TEST_CONFIG.numQuestions} questions each`);
  
  const results = [];
  
  for (let i = 1; i <= TEST_CONFIG.numTests; i++) {
    const result = await runTest(i);
    results.push(result);
    
    if (i < TEST_CONFIG.numTests) {
      console.log('\n⏳ Waiting 10 seconds before next test...\n');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
  
  // Final analysis
  console.log('\n🎯 FINAL ANALYSIS');
  console.log('='.repeat(60));
  
  const successfulTests = results.filter(r => r && !r.error);
  
  console.log(`📊 RESULTS:`);
  console.log(`- Successful tests: ${successfulTests.length}/${TEST_CONFIG.numTests}`);
  
  if (successfulTests.length > 0) {
    const testsWithBackendContent = successfulTests.filter(r => r.backendHasContent);
    const testsWithFrontendContent = successfulTests.filter(r => r.frontendHasContent);
    const testsWithPDFContent = successfulTests.filter(r => r.pdfHasContent);
    
    console.log(`\n🔍 CONTENT ANALYSIS:`);
    console.log(`- Tests where backend preserved content: ${testsWithBackendContent.length}/${successfulTests.length}`);
    console.log(`- Tests where frontend displayed content: ${testsWithFrontendContent.length}/${successfulTests.length}`);
    console.log(`- Tests where PDF had content: ${testsWithPDFContent.length}/${successfulTests.length}`);
    
    // Check for the specific inconsistency you mentioned
    const inconsistentTests = successfulTests.filter(r => 
      r.backendHasContent && !r.frontendHasContent
    );
    
    const consistentTests = successfulTests.filter(r => 
      (r.backendHasContent && r.frontendHasContent) || 
      (!r.backendHasContent && !r.frontendHasContent)
    );
    
    console.log(`\n🎯 INCONSISTENCY ANALYSIS:`);
    console.log(`- Consistent tests (backend matches frontend): ${consistentTests.length}`);
    console.log(`- Inconsistent tests (backend has content, frontend doesn't): ${inconsistentTests.length}`);
    
    if (inconsistentTests.length > 0) {
      console.log(`\n❌ INCONSISTENCY DETECTED!`);
      console.log(`The backend is preserving content but the frontend is not displaying it.`);
      
      inconsistentTests.forEach(test => {
        console.log(`  Test ${test.testNumber}: Backend has content but frontend doesn't`);
      });
    } else {
      console.log(`\n✅ No frontend display inconsistency detected`);
    }
    
    // Detailed breakdown
    console.log(`\n📋 DETAILED BREAKDOWN:`);
    successfulTests.forEach(test => {
      console.log(`Test ${test.testNumber}: Backend=${test.backendHasContent}, Frontend=${test.frontendHasContent}, PDF=${test.pdfHasContent}`);
    });
  }
  
  console.log('\n🔍 CONCLUSION:');
  console.log('This test checks if the frontend consistently displays tables/code snippets');
  console.log('when the backend provides them in the interactiveQuestions array.');
};

// Run the tests
runAllTests().catch(console.error); 