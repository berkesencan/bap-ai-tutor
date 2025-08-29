const axios = require('axios');

// Test questions that represent the real scenarios from your screenshots
const testScenarios = [
  {
    name: "Mathematical Subparts (should NOT be multiple choice)",
    questions: [
      "For each example, indicate whether f = o(g) (little-oh), f = ω(g) (little-omega), or f = θ(g) (big-Theta). No justification is necessary. (b) f(n) = n^3, g(n) = 2^n",
      "(c) f(n) = log n, g(n) = sqrt(n)", 
      "(d) f(n) = n^2 + 100n, g(n) = n^2"
    ]
  },
  {
    name: "Regular Questions (should be single)",
    questions: [
      "A rectangular garden is 12 meters long and 8 meters wide. If a gardener wants to build a walkway of uniform width around the garden, and the total area of the garden and walkway combined is 168 square meters, what is the width of the walkway?",
      "Solve the recurrence relation T(n) = 2T(n/2) + n with T(1) = 1"
    ]
  },
  {
    name: "True Multiple Choice (should be grouped)",
    questions: [
      "What is the time complexity of binary search? a) O(n) b) O(log n) c) O(n log n) d) O(n²)",
      "Which data structure uses LIFO? a) Queue b) Stack c) Tree d) Graph"
    ]
  }
];

async function testLiveSystem() {
  console.log('🧪 TESTING LIVE SYSTEM WITH REAL SCENARIOS');
  console.log('==========================================');
  
  let allTestsPassed = true;
  
  for (const scenario of testScenarios) {
    console.log(`\n📋 Testing: ${scenario.name}`);
    console.log('-'.repeat(50));
    
    try {
      // Test each question individually to see detection results
      for (let i = 0; i < scenario.questions.length; i++) {
        const question = scenario.questions[i];
        console.log(`\n🔍 Question ${i + 1}: "${question.substring(0, 60)}..."`);
        
        // Create analysis prompt for single question
        const analysisPrompt = `SMART MULTIPLE CHOICE DETECTION

You must distinguish between QUESTION SUBPARTS and MULTIPLE CHOICE OPTIONS.

QUESTIONS TO ANALYZE:
1. ${question}

CRITICAL DISTINCTION:

**QUESTION SUBPARTS** = Keep as separate questions:
- "(a) f(n) = 3(log₃ n)³, g(n) = n³" - This is a mathematical subpart of a larger problem
- "(b) f(n) = n, g(n) = n^(1/3)" - This is another mathematical subpart
- These are SEPARATE mathematical problems to solve, NOT multiple choice options!

**TRUE MULTIPLE CHOICE** = Group as one question with options:
- "What is the capital of France? a) Paris b) London c) Berlin d) Madrid"
- This has a question followed by SHORT answer choices
- Options are alternative answers to ONE question

RESPONSE FORMAT:
Return a JSON array where each item is either:
- Single question: {"type": "single", "question": "question text", "originalIndex": 0}
- Multiple choice: {"type": "multiple_choice", "question": "main question", "options": ["a) option1", "b) option2", "c) option3", "d) option4"], "originalIndex": 0}

Analyze and return the JSON array:`;

        // Call the actual backend API
        const response = await axios.post('http://localhost:8000/api/test-ai/test-gemini', {
          prompt: analysisPrompt
        });
        
        if (response.data.success) {
          const responseText = response.data.data.response;
          
          // Parse the JSON response
          const jsonMatch = responseText.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            const detection = result[0]; // First (and only) question
            
            console.log(`   ✅ Detected as: ${detection.type}`);
            
            // Verify expected results
            if (scenario.name.includes("Mathematical Subparts")) {
              if (detection.type !== 'single') {
                console.log(`   ❌ ERROR: Mathematical subpart should be 'single', got '${detection.type}'`);
                allTestsPassed = false;
              } else {
                console.log(`   ✅ CORRECT: Mathematical subpart correctly detected as single`);
              }
            } else if (scenario.name.includes("Regular Questions")) {
              if (detection.type !== 'single') {
                console.log(`   ❌ ERROR: Regular question should be 'single', got '${detection.type}'`);
                allTestsPassed = false;
              } else {
                console.log(`   ✅ CORRECT: Regular question correctly detected as single`);
              }
            } else if (scenario.name.includes("True Multiple Choice")) {
              if (detection.type !== 'multiple_choice') {
                console.log(`   ❌ ERROR: Multiple choice should be 'multiple_choice', got '${detection.type}'`);
                allTestsPassed = false;
              } else {
                console.log(`   ✅ CORRECT: Multiple choice correctly detected`);
                console.log(`   📝 Question: "${detection.question.substring(0, 40)}..."`);
                console.log(`   📝 Options: ${detection.options.join(' | ')}`);
              }
            }
          } else {
            console.log(`   ❌ ERROR: Could not parse JSON response`);
            allTestsPassed = false;
          }
        } else {
          console.log(`   ❌ ERROR: API call failed`);
          allTestsPassed = false;
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
      allTestsPassed = false;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🎯 FINAL TEST RESULTS');
  console.log('='.repeat(60));
  
  if (allTestsPassed) {
    console.log('🎉 ALL TESTS PASSED! ✅');
    console.log('');
    console.log('✅ Mathematical subparts correctly detected as single questions');
    console.log('✅ Regular questions correctly detected as single questions');  
    console.log('✅ True multiple choice correctly detected and grouped');
    console.log('');
    console.log('🚀 THE SYSTEM IS WORKING CORRECTLY!');
  } else {
    console.log('❌ SOME TESTS FAILED!');
    console.log('');
    console.log('The system needs fixes before it can be considered working.');
  }
}

// Wait for backend to be ready and run the test
setTimeout(() => {
  testLiveSystem().catch(error => {
    console.error('❌ Test suite failed:', error.message);
  });
}, 3000); // 3 second delay to ensure backend is ready 