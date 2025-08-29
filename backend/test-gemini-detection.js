const { GoogleGenerativeAI } = require('@google/generative-ai');

// Test sample questions - mix of multiple choice and open-ended
const sampleQuestions = [
  {
    id: 1,
    question: "What is the time complexity of quicksort in the worst case? a) O(n) b) O(n log n) c) O(n²) d) O(n³)",
    points: 10
  },
  {
    id: 2,
    question: "Explain the difference between strong scaling and weak scaling in parallel computing.",
    points: 15
  },
  {
    id: 3,
    question: "Which of the following is a correct implementation of binary search? a) Linear search b) Recursive divide and conquer c) Bubble sort d) Hash table lookup",
    points: 10
  }
];

async function testGeminiDetection() {
  console.log('🧪 Testing Gemini API Auto-Detection...');
  
  // Initialize Gemini API (using the same approach as the backend)
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY not found in environment variables');
    return;
  }
  
  try {
    // Prepare the questions text
    const questionsText = sampleQuestions.map(q => q.question).join('\n\n');
    
    console.log('📝 Sample Questions to Analyze:');
    sampleQuestions.forEach((q, i) => {
      console.log(`${i + 1}. ${q.question.substring(0, 100)}...`);
    });
    
    // Enhanced prompt with clear examples
    const prompt = `TASK: Analyze these questions and determine which ones are multiple choice format.

A question is MULTIPLE CHOICE if it contains answer options like:
- a) option text  b) option text  c) option text  d) option text
- a. option text  b. option text  c. option text  d. option text

Questions to analyze:
${questionsText}

RESPOND IN THIS EXACT FORMAT:

QUESTION 1: multiple_choice
a) first option text
b) second option text  
c) third option text
d) fourth option text

QUESTION 2: open_ended

QUESTION 3: multiple_choice
a) option text
b) option text
c) option text  
d) option text

Continue for ALL questions. If a question has a), b), c), d) options, it is multiple_choice. If not, it is open_ended.`;

    console.log('\n🤖 Sending request to Gemini API...');
    console.log('📤 Prompt length:', prompt.length);
    
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    
    if (!result || !result.response) {
      throw new Error('No response from Gemini API');
    }
    
    const responseText = result.response.text();
    console.log('\n✅ Gemini Response Received:');
    console.log('📥 Response length:', responseText.length);
    console.log('📝 Full Response:');
    console.log('=' .repeat(50));
    console.log(responseText);
    console.log('=' .repeat(50));
    
    // Parse the response
    console.log('\n🔍 Parsing Response...');
    const parsedQuestions = parseGeminiResponse(responseText, sampleQuestions);
    
    console.log('\n📊 Detection Results:');
    parsedQuestions.forEach(q => {
      console.log(`- Q${q.id}: ${q.type}${q.options ? ` (${q.options.length} options)` : ''}`);
      if (q.options) {
        q.options.forEach(opt => console.log(`    ${opt.label}) ${opt.text}`));
      }
    });
    
    // Verify results
    const multipleChoiceCount = parsedQuestions.filter(q => q.type === 'multiple_choice').length;
    const openEndedCount = parsedQuestions.filter(q => q.type === 'open_ended').length;
    
    console.log('\n🎯 Test Results:');
    console.log(`- Multiple Choice Questions: ${multipleChoiceCount}`);
    console.log(`- Open-Ended Questions: ${openEndedCount}`);
    console.log(`- Total Questions: ${parsedQuestions.length}`);
    
    // Expected results: Q1 and Q3 should be multiple choice, Q2 should be open-ended
    if (multipleChoiceCount >= 2 && openEndedCount >= 1) {
      console.log('✅ Gemini API Auto-Detection WORKING!');
    } else {
      console.log('❌ Gemini API Auto-Detection may need adjustment');
    }
    
  } catch (error) {
    console.error('❌ Gemini API Test Failed:', error.message);
    console.error('Full error:', error);
  }
}

function parseGeminiResponse(response, originalQuestions) {
  const structuredQuestions = [];
  const lines = response.split('\n');
  
  let currentQuestionIndex = -1;
  let currentType = 'open_ended';
  let currentOptions = [];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Look for question headers: "QUESTION 1: multiple_choice" or "QUESTION 1: open_ended"
    const questionMatch = trimmedLine.match(/QUESTION\s+(\d+):\s*(multiple_choice|open_ended)/i);
    if (questionMatch) {
      // Save previous question if exists
      if (currentQuestionIndex >= 0 && currentQuestionIndex < originalQuestions.length) {
        const originalQ = originalQuestions[currentQuestionIndex];
        structuredQuestions.push({
          id: originalQ.id,
          question: originalQ.question,
          type: currentType,
          options: currentType === 'multiple_choice' ? currentOptions : undefined,
          points: originalQ.points
        });
      }
      
      // Start new question
      currentQuestionIndex = parseInt(questionMatch[1]) - 1; // Convert to 0-based index
      currentType = questionMatch[2].toLowerCase();
      currentOptions = [];
      continue;
    }
    
    // Look for options: "a) option text", "b) option text", etc.
    const optionMatch = trimmedLine.match(/^([a-d])\)\s*(.+)/i);
    if (optionMatch && currentType === 'multiple_choice') {
      currentOptions.push({
        label: optionMatch[1].toLowerCase(),
        text: optionMatch[2].trim()
      });
    }
  }
  
  // Don't forget the last question
  if (currentQuestionIndex >= 0 && currentQuestionIndex < originalQuestions.length) {
    const originalQ = originalQuestions[currentQuestionIndex];
    structuredQuestions.push({
      id: originalQ.id,
      question: originalQ.question,
      type: currentType,
      options: currentType === 'multiple_choice' ? currentOptions : undefined,
      points: originalQ.points
    });
  }
  
  // Fill in any missing questions as open-ended
  for (let i = 0; i < originalQuestions.length; i++) {
    if (!structuredQuestions.find(sq => sq.id === originalQuestions[i].id)) {
      structuredQuestions.push({
        ...originalQuestions[i],
        type: 'open_ended'
      });
    }
  }
  
  return structuredQuestions;
}

// Run the test
testGeminiDetection(); 