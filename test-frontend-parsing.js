const fs = require('fs');

// Simulate the exact backend response that the frontend receives
function simulateFrontendProcessing() {
  console.log('🧪 Testing Frontend Question Processing...');
  
  // This is what the backend API response looks like based on our tests
  const mockBackendResponse = {
    success: true,
    data: {
      subject: 'Design & Analysis of Algorithms',
      difficulty: 'medium',
      pdfPath: 'backend/uploads/simple-exam-1752011890657.pdf',
      questions: 'Q1a) f(n) = n⁽2⁾ log n, g(n) = n⁽3⁾\nQ1b) f(n) = n⁽1/2⁾, g(n) = n⁽2/3⁾\nQ1c) f(n) = 2^n, g(n) = n⁽2⁾ 2^n\nQ1d) f(n) = Σ(i=1 to n) i⁽2⁾, g(n) = n⁽3⁾\nQ1e) f(n) = log₍2₎ n, g(n) = log₍10₎ n + log_e n\nQ2) Give a formal proof of the following statement: If f(n) = o(g(n)), then f(n) = O(g(n))',
      parsedQuestions: [
        { id: 1, question: 'Q1a) f(n) = n⁽2⁾ log n, g(n) = n⁽3⁾', points: 10 },
        { id: 2, question: 'Q1b) f(n) = n⁽1/2⁾, g(n) = n⁽2/3⁾', points: 8 },
        { id: 3, question: 'Q1c) f(n) = 2^n, g(n) = n⁽2⁾ 2^n', points: 10 },
        { id: 4, question: 'Q1d) f(n) = Σ(i=1 to n) i⁽2⁾, g(n) = n⁽3⁾', points: 8 },
        { id: 5, question: 'Q1e) f(n) = log₍2₎ n, g(n) = log₍10₎ n + log_e n', points: 8 },
        { id: 6, question: 'Q2) Give a formal proof of the following statement: If f(n) = o(g(n)), then f(n) = O(g(n))', points: 6 },
        { id: 7, question: 'Q3a) T(n) = 2T(n/2) + n log n', points: 6 },
        { id: 8, question: 'Q3b) T(n) = 9T(n/3) + n²', points: 10 },
        { id: 9, question: 'Q3c) T(n) = T(n/2) + 1', points: 8 },
        { id: 10, question: 'Q4a) T_new(n) = O(n²) if log_b a = 2', points: 6 }
      ],
      questionPoints: [10, 8, 10, 8, 8, 6, 6, 10, 8, 6]
    }
  };
  
  console.log('\n=== SIMULATING FRONTEND PROCESSING ===');
  console.log('Backend response structure:');
  console.log('- parsedQuestions:', mockBackendResponse.data.parsedQuestions.length, 'items');
  console.log('- questionPoints:', mockBackendResponse.data.questionPoints.length, 'items');
  
  // This is the exact logic from AiTutorPage.jsx lines 1862-1873
  console.log('\n=== FRONTEND LOGIC SIMULATION ===');
  
  const practiceExamResult = mockBackendResponse.data;
  
  let questionsToDisplay = [];
  
  if (practiceExamResult.parsedQuestions && Array.isArray(practiceExamResult.parsedQuestions)) {
    // Use backend's structured questions with proper numbering
    questionsToDisplay = practiceExamResult.parsedQuestions.map(q => q.question);
    console.log('📋 Using backend parsed questions with proper numbering');
  } else {
    // This shouldn't happen in our case, but this is the fallback
    console.log('📋 Fallback: parsing raw text (this should NOT happen)');
  }
  
  console.log(`✅ questionsToDisplay array has ${questionsToDisplay.length} items`);
  console.log('\n=== QUESTION DISPLAY SIMULATION ===');
  
  // This simulates the map function from lines 1873-1902
  questionsToDisplay.forEach((question, index) => {
    console.log(`\n--- Processing Question ${index + 1} ---`);
    console.log(`Raw question text: "${question}"`);
    
    // This is the exact logic from lines 1882-1893
    const questionMatch = question.match(/^(Q\d+[a-z]?\))/);
    let displayNumber;
    
    if (questionMatch) {
      displayNumber = questionMatch[1].replace(')', ''); // Remove the closing parenthesis
      console.log(`✅ Regex matched: "${questionMatch[1]}" → Display: "${displayNumber}"`);
    } else {
      // Fallback to simple numbering if no proper format found
      displayNumber = `Q${index + 1}`;
      console.log(`❌ Regex failed, using fallback: "${displayNumber}"`);
    }
    
    // Remove question number from text to avoid duplication
    const cleanedText = question.replace(/^Q\d+[a-z]?\)\s*/, '');
    console.log(`Cleaned text: "${cleanedText}"`);
    
    console.log(`🎯 GREEN CIRCLE WILL SHOW: "${displayNumber}"`);
    console.log(`📝 QUESTION TEXT WILL SHOW: "${cleanedText}"`);
  });
  
  console.log('\n=== EXPECTED VS ACTUAL ===');
  console.log('Expected green circles: 01a, 01b, 01c, 01d, 01e, 02, 03a, 03b, 03c, 04a');
  console.log('Expected question texts: Clean text without Q1a) prefix');
  
  const actualGreenCircles = questionsToDisplay.map((question, index) => {
    const questionMatch = question.match(/^(Q\d+[a-z]?\))/);
    if (questionMatch) {
      return questionMatch[1].replace(')', '');
    }
    return `Q${index + 1}`;
  });
  
  console.log('Actual green circles:', actualGreenCircles.join(', '));
  
  if (actualGreenCircles.join(', ') === 'Q1a, Q1b, Q1c, Q1d, Q1e, Q2, Q3a, Q3b, Q3c, Q4a') {
    console.log('\n✅ FRONTEND LOGIC IS WORKING CORRECTLY!');
    console.log('The issue might be elsewhere...');
  } else {
    console.log('\n❌ FRONTEND LOGIC HAS ISSUES!');
    console.log('This is why the green circles are wrong.');
  }
  
  // Check if the issue is in the number of questions vs points mismatch
  console.log('\n=== CHECKING POINTS DISTRIBUTION ===');
  console.log(`Questions to display: ${questionsToDisplay.length}`);
  console.log(`Question points array: ${practiceExamResult.questionPoints.length}`);
  
  if (questionsToDisplay.length !== practiceExamResult.questionPoints.length) {
    console.log('❌ MISMATCH! This could cause display issues.');
    console.log('questionsToDisplay:', questionsToDisplay.length);
    console.log('questionPoints:', practiceExamResult.questionPoints.length);
    
    // This is what might be causing the problem - if only 10 questions are requested
    // but 33 are extracted, the frontend might only show the first 10
    if (practiceExamResult.questionPoints.length < questionsToDisplay.length) {
      console.log('\n🔍 TRUNCATION ISSUE DETECTED!');
      console.log('The frontend might be truncating to match the questionPoints array length');
      console.log(`Only showing first ${practiceExamResult.questionPoints.length} questions`);
      
      const truncatedQuestions = questionsToDisplay.slice(0, practiceExamResult.questionPoints.length);
      console.log('Truncated questions:');
      truncatedQuestions.forEach((q, i) => {
        console.log(`  ${i + 1}. ${q.substring(0, 50)}...`);
      });
    }
  } else {
    console.log('✅ Questions and points arrays match in length');
  }
}

simulateFrontendProcessing(); 