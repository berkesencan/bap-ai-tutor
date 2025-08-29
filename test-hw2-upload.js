const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testHW2Upload() {
  console.log('🧪 TESTING ACTUAL HW2-2.pdf UPLOAD');
  console.log('===================================');
  
  // Find the HW2 file
  const hw2Path = './HW2-2.pdf';
  
    if (!fs.existsSync(hw2Path)) {
    console.error('❌ HW2-2.pdf not found!');
      return;
    }
    
  console.log(`📄 Found HW2 file: ${hw2Path}`);
  console.log(`📄 File size: ${(fs.statSync(hw2Path).size / 1024).toFixed(1)}KB`);
    
  try {
    // Create FormData for file upload
    const formData = new FormData();
    formData.append('pdf', fs.createReadStream(hw2Path));
    formData.append('subject', 'algorithms');
    formData.append('numQuestions', '10');
    formData.append('difficulty', 'medium');
    formData.append('generatePDF', 'false');
    formData.append('instructions', '');
    formData.append('questionPoints', JSON.stringify([10, 10, 10, 10, 10, 10, 10, 10, 10, 10]));
    
    console.log('\n🚀 Uploading HW2-2.pdf to backend...');
    
    // Upload to the actual backend endpoint
    const response = await axios.post('http://localhost:8000/api/ai/practice-exam', formData, {
      headers: {
        ...formData.getHeaders(),
        'Content-Type': 'multipart/form-data'
      },
      timeout: 120000 // 2 minutes timeout
    });
    
    console.log('✅ Upload successful!');
    console.log('\n📋 BACKEND RESPONSE:');
    console.log('===================');
    
    if (response.data.success && response.data.data) {
      const result = response.data.data;
      
      console.log('📊 Response Summary:');
      console.log(`- Success: ${response.data.success}`);
      console.log(`- Subject: ${result.subject}`);
      console.log(`- Difficulty: ${result.difficulty}`);
      console.log(`- PDF Path: ${result.pdfPath}`);
      
      // Check what questions were extracted
      if (result.interactiveQuestions && Array.isArray(result.interactiveQuestions)) {
        console.log(`\n📝 INTERACTIVE QUESTIONS (${result.interactiveQuestions.length} total):`);
        console.log('=' .repeat(60));
        
        result.interactiveQuestions.forEach((q, index) => {
          console.log(`\n${index + 1}. [${q.points} pts] "${q.question.substring(0, 100)}..."`);
          
          // Check if this looks like a mathematical subpart
          if (q.question.includes('(a)') || q.question.includes('(b)') || q.question.includes('(c)')) {
            console.log(`   🔍 Contains subpart notation: ${q.question.match(/\([a-z]\)/g) || 'none'}`);
          }
          
          // Check if this looks like multiple choice
          const hasMultipleChoicePattern = q.question.match(/[a-d]\).*[a-d]\)/);
          if (hasMultipleChoicePattern) {
            console.log(`   🔍 Possible multiple choice pattern detected`);
      }
        });
      
        // Now test the multiple choice detection on these REAL questions
        console.log('\n🔍 TESTING MULTIPLE CHOICE DETECTION ON REAL HW2 QUESTIONS:');
        console.log('=' .repeat(70));
      
        // Extract just the question text
        const questionTexts = result.interactiveQuestions.map(q => q.question);
        
        // Test the detection using the same logic as the frontend
        const analysisPrompt = `SMART MULTIPLE CHOICE DETECTION

You must distinguish between QUESTION SUBPARTS and MULTIPLE CHOICE OPTIONS.

QUESTIONS TO ANALYZE:
${questionTexts.map((q, i) => `${i + 1}. ${q}`).join('\n')}

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

        console.log('\n🤖 Testing detection on extracted HW2 questions...');
        
        const detectionResponse = await axios.post('http://localhost:8000/api/test-ai/test-gemini', {
          prompt: analysisPrompt
        });
        
        if (detectionResponse.data.success) {
          const responseText = detectionResponse.data.data.response;
          console.log('\n📊 DETECTION RESULTS:');
          console.log('=' .repeat(40));
          
          const jsonMatch = responseText.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const detectionResults = JSON.parse(jsonMatch[0]);
            
            let multipleChoiceCount = 0;
            let singleCount = 0;
            let mathematicalSubparts = 0;
            
            detectionResults.forEach((result, index) => {
              console.log(`\n${index + 1}. Type: ${result.type}`);
              console.log(`   Original: "${questionTexts[index].substring(0, 60)}..."`);
              
              if (result.type === 'multiple_choice') {
                multipleChoiceCount++;
                console.log(`   ✅ Detected as MULTIPLE CHOICE`);
                console.log(`   📝 Question: "${result.question.substring(0, 40)}..."`);
                console.log(`   📝 Options: ${result.options.join(' | ')}`);
              } else {
                singleCount++;
                console.log(`   ✅ Detected as SINGLE QUESTION`);
              
                // Check if this was a mathematical subpart
                if (questionTexts[index].includes('(a)') || questionTexts[index].includes('(b)') || questionTexts[index].includes('(c)')) {
                  mathematicalSubparts++;
                  console.log(`   🔍 Contains mathematical subpart notation - CORRECTLY kept as single`);
                }
              }
            });
            
            console.log('\n🎯 FINAL HW2 DETECTION SUMMARY:');
            console.log('=' .repeat(50));
            console.log(`📊 Total questions: ${detectionResults.length}`);
            console.log(`📊 Multiple choice: ${multipleChoiceCount}`);
            console.log(`📊 Single questions: ${singleCount}`);
            console.log(`📊 Mathematical subparts correctly handled: ${mathematicalSubparts}`);
            
            if (mathematicalSubparts > 0 && multipleChoiceCount === 0) {
              console.log('\n🎉 SUCCESS: Mathematical subparts were correctly detected as single questions!');
              console.log('✅ No false multiple choice detections!');
            } else if (multipleChoiceCount > 0) {
              console.log('\n⚠️  WARNING: Some questions were detected as multiple choice. Check if correct.');
            }
            
          } else {
            console.log('❌ Could not parse detection results');
          }
        } else {
          console.log('❌ Detection test failed');
        }
        
      } else {
        console.log('❌ No interactive questions found in response');
      }
      
    } else {
      console.log('❌ Upload failed or invalid response');
      console.log('Response:', response.data);
    }
    
  } catch (error) {
    console.error('❌ Upload test failed:', error.message);
    if (error.response) {
      console.error('Error details:', error.response.data);
}
  }
}

// Run the test
testHW2Upload().catch(console.error); 