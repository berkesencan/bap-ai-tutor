const axios = require('axios');

// Test questions with the exact problematic cases from HW2
const testQuestions = [
  // TRUE multiple choice (should be grouped)
  "What is the capital of France? a) Paris b) London c) Berlin d) Madrid",
  
  // MATHEMATICAL SUBPARTS (should NOT be grouped - these are separate questions)
  "For each of the following pairs of functions, determine whether f(n) = O(g(n)), g(n) = O(f(n)), or neither. (a) f(n) = 3(log₃ n)³, g(n) = n³",
  
  "(b) f(n) = n, g(n) = n^(1/3)",
  
  "(c) f(n) = 2^n, g(n) = 3^n",
  
  // Another TRUE multiple choice
  "Which algorithm has the best time complexity? a) Bubble Sort b) Quick Sort c) Merge Sort d) Selection Sort",
  
  // MORE MATHEMATICAL SUBPARTS (should NOT be grouped)
  "Solve the following recurrence relations: (a) T(n) = 2T(n/2) + n, T(1) = 1",
  
  "(b) T(n) = T(n-1) + n², T(1) = 1"
];

async function testGeminiDetection() {
  console.log('🧪 TESTING GEMINI MULTIPLE CHOICE DETECTION VIA API');
  console.log('==================================================');
  
  console.log('\n📝 Test Questions:');
  testQuestions.forEach((question, index) => {
    console.log(`${index + 1}. ${question}`);
  });
  
  // Create the analysis prompt - ONLY relying on Gemini
  const analysisPrompt = `SMART MULTIPLE CHOICE DETECTION

You must distinguish between QUESTION SUBPARTS and MULTIPLE CHOICE OPTIONS.

QUESTIONS TO ANALYZE:
${testQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

CRITICAL DISTINCTION:

**QUESTION SUBPARTS** = Keep as separate questions:
- "(a) f(n) = 3(log₃ n)³, g(n) = n³" - This is a mathematical subpart of a larger problem
- "(b) f(n) = n, g(n) = n^(1/3)" - This is another mathematical subpart
- "(c) T(n) = 2T(n/2) + n, T(1) = 1" - This is a recurrence relation subpart
- These are SEPARATE mathematical problems to solve, NOT multiple choice options!

**TRUE MULTIPLE CHOICE** = Group as one question with options:
- "What is the capital of France? a) Paris b) London c) Berlin d) Madrid"
- This has a question followed by SHORT answer choices
- Options are alternative answers to ONE question

**KEY DIFFERENCES:**
- Subparts: Complex mathematical expressions, equations, separate problems to solve
- Multiple choice: Simple short answer choices to select from

RESPONSE FORMAT:
Return a JSON array where each item is either:
- Single question: {"type": "single", "question": "question text", "originalIndex": 0}
- Multiple choice: {"type": "multiple_choice", "question": "main question", "options": ["a) option1", "b) option2", "c) option3", "d) option4"], "originalIndex": 0}

EXAMPLES:
- "f(n) = 3(log₃ n)³, g(n) = n³" → {"type": "single"} (mathematical subpart)
- "What color is the sky? a) blue b) green c) red" → {"type": "multiple_choice"} (simple choices)

Analyze and return the JSON array:`;

  try {
    console.log('\n🤖 Sending to backend API...');
    
    const response = await axios.post('http://localhost:8000/api/test-ai/test-gemini', {
      prompt: analysisPrompt
    });
    
    if (response.data.success) {
      const responseText = response.data.data.response;
      console.log('\n✅ Gemini Response:');
      console.log('=' .repeat(60));
      console.log(responseText);
      console.log('=' .repeat(60));
      
      // Try to parse JSON
      try {
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsedResult = JSON.parse(jsonMatch[0]);
          console.log('\n📊 Parsed Results:');
          parsedResult.forEach((item, index) => {
            console.log(`${index + 1}. Type: ${item.type}`);
            if (item.type === 'multiple_choice') {
              console.log(`   Question: ${item.question}`);
              console.log(`   Options: ${item.options.join(', ')}`);
            } else {
              console.log(`   Question: ${item.question.substring(0, 100)}...`);
            }
          });
          
          // Check if the mathematical subparts were correctly detected as single questions
          const mathSubparts = parsedResult.filter((item, index) => {
            const originalQuestion = testQuestions[index];
            return originalQuestion.includes('f(n) =') || originalQuestion.includes('T(n) =');
          });
          
          const correctlyDetected = mathSubparts.every(item => item.type === 'single');
          
          console.log('\n🎯 TEST RESULTS:');
          console.log(`Mathematical subparts correctly detected as single: ${correctlyDetected ? '✅ YES' : '❌ NO'}`);
          console.log(`Total questions processed: ${parsedResult.length}`);
          console.log(`Multiple choice detected: ${parsedResult.filter(q => q.type === 'multiple_choice').length}`);
          console.log(`Single questions detected: ${parsedResult.filter(q => q.type === 'single').length}`);
          
          if (correctlyDetected) {
            console.log('\n🎉 SUCCESS: Gemini correctly distinguishes mathematical subparts from multiple choice!');
          } else {
            console.log('\n❌ FAILURE: Gemini needs better prompting to distinguish mathematical subparts');
          }
          
        } else {
          console.log('❌ No JSON array found in response');
        }
      } catch (parseError) {
        console.log('❌ Error parsing JSON:', parseError.message);
      }
    } else {
      console.log('❌ API call failed:', response.data.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Error details:', error.response.data);
    }
  }
}

// Run the test
testGeminiDetection().catch(console.error); 