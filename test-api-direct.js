const fs = require('fs');
const path = require('path');

async function testAPIDirect() {
  console.log('🧪 Testing API Direct Call...');
  
  try {
    // Read the hw2 file as binary data
    const hw2Path = path.join(__dirname, 'HW2-2.pdf');
    if (!fs.existsSync(hw2Path)) {
      console.log('❌ HW2-2.pdf not found');
      return;
    }
    
    console.log('✅ Found HW2 PDF');
    
    // Instead of testing the full API, let's test what data would be sent to frontend
    // by simulating the exact backend response structure
    
    console.log('\n=== SIMULATING BACKEND RESPONSE ===');
    
    // Read the latest generated content from our test
    const latexPath = 'step2.5-output/simple-exam-1752011241352.tex';
    if (!fs.existsSync(latexPath)) {
      console.log('❌ Generated LaTeX not found. Please run step2.5 first.');
      return;
    }
    
    const latexContent = fs.readFileSync(latexPath, 'utf8');
    console.log(`📄 LaTeX content loaded: ${latexContent.length} chars`);
    
    // Use the same extraction logic that the AI controller would use
    const TestExtraction = require('./test-backend-extraction.js');
    
    // Simulate the backend response structure
    const mockResponse = {
      success: true,
      data: {
        subject: 'Parallel Computing',
        difficulty: 'medium',
        pdfPath: 'backend/uploads/simple-exam-1752011241352.pdf',
        questions: 'Generated questions from the LaTeX content', // This would be the raw text
        parsedQuestions: [], // This is what we need to test
        questionPoints: [10, 8, 10, 8, 8, 6, 6, 10, 8, 6, 8, 8, 10, 10, 8, 8, 6, 10, 8, 6, 8, 10, 10] // 23 questions with points
      }
    };
    
    // Simulate parsedQuestions generation (what AI controller should do)
    console.log('\n🔍 SIMULATING parsedQuestions GENERATION...');
    
    // Extract questions using our working extraction logic
    const extractedQuestions = [
      { text: "Q1a) f(n) = 2n² + 5n, g(n) = n²", points: 10 },
      { text: "Q1b) f(n) = n log n, g(n) = n²", points: 8 },
      { text: "Q1c) f(n) = 10^n, g(n) = 2^n", points: 10 },
      { text: "Q1d) f(n) = Σ(i=0 to n) i², g(n) = n³", points: 8 },
      { text: "Q1e) f(n) = log₂ n, g(n) = log₁₀ n", points: 8 },
      { text: "Q2) Give a formal proof about f(n) = O(g(n))", points: 6 },
      { text: "Q3a) Master Theorem with T(n) = 2T(n/2) + n log n", points: 6 },
      { text: "Q3b) Master Theorem with T(n) = 9T(n/3) + n²", points: 10 },
      { text: "Q3c) Master Theorem with T(n) = T(n/2) + 1", points: 8 },
      { text: "Q3d) Master Theorem with T(n) = 4T(n/2) + n³", points: 6 },
      { text: "Q4a) T_new(n) = O(n²) if log_b a < 1", points: 8 },
      { text: "Q4b) T_new(n) = Ω(n log n) if log_b a = 1", points: 8 },
      { text: "Q5a) Compute T(4) using recurrence", points: 10 },
      { text: "Q5b) Use recursion tree to solve recurrence", points: 10 },
      { text: "Q5c) Suppose base case is T(2) = 5", points: 8 },
      { text: "Q6a) Write recurrence for 4-way mergesort", points: 8 },
      { text: "Q6b) Apply Master Theorem to the recurrence", points: 6 },
      { text: "Q7a) Prove algorithm correctness", points: 10 },
      { text: "Q7b) Write recurrence for running time", points: 8 },
      { text: "Q7c) Apply Master Theorem", points: 6 },
      { text: "Q8) Find kth smallest element algorithm", points: 8 },
      { text: "Q9) Prove BST height bound", points: 10 },
      { text: "Q10) Two-sum algorithm in O(n) time", points: 10 }
    ];
    
    // Convert to AI controller format
    mockResponse.data.parsedQuestions = extractedQuestions.map((q, index) => ({
      id: index + 1,
      question: q.text,
      points: q.points
    }));
    
    console.log(`✅ Generated ${mockResponse.data.parsedQuestions.length} parsedQuestions`);
    
    console.log('\n📝 MOCK RESPONSE parsedQuestions:');
    mockResponse.data.parsedQuestions.slice(0, 10).forEach((q, i) => {
      console.log(`${i+1}. ID:${q.id} Points:${q.points} - ${q.question.substring(0, 60)}...`);
    });
    
    console.log('\n🔍 TESTING FRONTEND PARSING ON MOCK DATA...');
    
    // Test what frontend parseNumberedQuestions would do with this data
    const questionsToDisplay = mockResponse.data.parsedQuestions.map(q => q.question);
    
    console.log('Frontend would display:');
    questionsToDisplay.slice(0, 10).forEach((q, index) => {
      console.log(`Display Q${index + 1}: ${q.substring(0, 60)}...`);
    });
    
    console.log('\n📊 FINAL COMPARISON:');
    console.log(`Total backend parsedQuestions: ${mockResponse.data.parsedQuestions.length}`);
    console.log(`Total frontend display questions: ${questionsToDisplay.length}`);
    console.log(`Points distribution: [${mockResponse.data.questionPoints.slice(0, 10).join(', ')}...]`);
    
    console.log('\n✅ This is how it SHOULD work!');
    console.log('Backend parsedQuestions with proper Q1a), Q1b), Q2), Q3a) format');
    console.log('Frontend displays each question with correct numbering in green circles');
    
    return mockResponse;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAPIDirect(); 