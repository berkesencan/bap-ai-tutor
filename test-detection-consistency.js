const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testDetectionConsistency() {
  console.log('🔍 DETECTION CONSISTENCY TEST');
  console.log('=============================');
  console.log('Testing if the detection function works consistently\n');
  
  const pdfPath = './midterm-sp24.pdf';
  
  if (!fs.existsSync(pdfPath)) {
    console.error('❌ Test PDF not found:', pdfPath);
    return;
  }
  
  console.log('📄 Using test PDF:', pdfPath);
  
  try {
    // Create form data
    const formData = new FormData();
    formData.append('pdf', fs.createReadStream(pdfPath));
    formData.append('subject', 'Computer Science');
    formData.append('numQuestions', '10');
    formData.append('difficulty', 'medium');
    formData.append('includeMultipleChoice', 'true');
    
    console.log('🚀 Sending request to backend...');
    
    const response = await axios.post('http://localhost:8000/api/ai/practice-exam', formData, {
      headers: {
        ...formData.getHeaders(),
      },
      timeout: 60000
    });
    
    if (response.data.success) {
      const result = response.data.data;
      
      if (result.interactiveQuestions && result.interactiveQuestions.length > 0) {
        const questionsArray = result.interactiveQuestions.map(q => q.question);
        
        console.log(`✅ Received ${questionsArray.length} questions from backend`);
        
        // Test the detection function multiple times with the same data
        console.log('\n🧪 TESTING DETECTION FUNCTION CONSISTENCY:');
        console.log('===========================================');
        
        const detectionResults = [];
        
        for (let i = 1; i <= 3; i++) {
          console.log(`\n🔄 DETECTION RUN ${i}/3`);
          console.log('==================');
          
          try {
            // Simulate the exact detection logic from the frontend
            const analysisPrompt = `SMART MULTIPLE CHOICE DETECTION
You must distinguish between QUESTION SUBPARTS and MULTIPLE CHOICE OPTIONS.
QUESTIONS TO ANALYZE:
${questionsArray.map((q, i) => `${i + 1}. ${q}`).join('\n')}

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

            console.log('🤖 Calling Gemini for detection...');
            
            const geminiResponse = await axios.post('http://localhost:8000/api/test-ai/test-gemini', {
              prompt: analysisPrompt
            }, {
              timeout: 30000
            });
            
            if (geminiResponse.data.success) {
              console.log('✅ Gemini call successful');
              console.log(`📋 Response length: ${geminiResponse.data.data.response.length} characters`);
              
              // Try to parse JSON
              const jsonMatch = geminiResponse.data.data.response.match(/\[[\s\S]*\]/);
              
              if (jsonMatch) {
                try {
                  const groupedQuestions = JSON.parse(jsonMatch[0]);
                  const multipleChoiceCount = groupedQuestions.filter(q => q.type === 'multiple_choice').length;
                  const singleCount = groupedQuestions.filter(q => q.type === 'single').length;
                  
                  console.log(`🎯 DETECTION SUCCESS: ${multipleChoiceCount} multiple choice, ${singleCount} single questions`);
                  
                  detectionResults.push({
                    run: i,
                    success: true,
                    multipleChoiceCount: multipleChoiceCount,
                    singleCount: singleCount,
                    totalQuestions: groupedQuestions.length,
                    method: 'JSON_PARSING'
                  });
                  
                } catch (parseError) {
                  console.log(`❌ JSON parsing failed: ${parseError.message}`);
                  console.log('🔧 Using fallback (all single questions)');
                  
                  detectionResults.push({
                    run: i,
                    success: false,
                    multipleChoiceCount: 0,
                    singleCount: questionsArray.length,
                    totalQuestions: questionsArray.length,
                    method: 'FALLBACK_JSON_PARSE_ERROR'
                  });
                }
              } else {
                console.log('❌ No JSON found in response');
                console.log('🔧 Using fallback (all single questions)');
                
                detectionResults.push({
                  run: i,
                  success: false,
                  multipleChoiceCount: 0,
                  singleCount: questionsArray.length,
                  totalQuestions: questionsArray.length,
                  method: 'FALLBACK_NO_JSON'
                });
              }
              
            } else {
              console.log(`❌ Gemini call failed: ${geminiResponse.data.message || 'Unknown error'}`);
              console.log('🔧 Using fallback (all single questions)');
              
              detectionResults.push({
                run: i,
                success: false,
                multipleChoiceCount: 0,
                singleCount: questionsArray.length,
                totalQuestions: questionsArray.length,
                method: 'FALLBACK_GEMINI_FAILED'
              });
            }
            
          } catch (error) {
            console.log(`❌ Detection run ${i} failed: ${error.message}`);
            console.log('🔧 Using fallback (all single questions)');
            
            detectionResults.push({
              run: i,
              success: false,
              multipleChoiceCount: 0,
              singleCount: questionsArray.length,
              totalQuestions: questionsArray.length,
              method: 'FALLBACK_EXCEPTION'
            });
          }
          
          // Wait between runs
          if (i < 3) {
            console.log('⏳ Waiting 2 seconds before next run...');
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
        
        console.log('\n📊 DETECTION CONSISTENCY ANALYSIS');
        console.log('==================================');
        
        console.log('📋 All detection runs:');
        detectionResults.forEach(result => {
          console.log(`   Run ${result.run}: ${result.success ? 'SUCCESS' : 'FAILED'} | ${result.multipleChoiceCount} MC, ${result.singleCount} single | Method: ${result.method}`);
        });
        
        // Check consistency
        const successfulRuns = detectionResults.filter(r => r.success);
        const failedRuns = detectionResults.filter(r => !r.success);
        
        console.log('\n📊 Consistency Summary:');
        console.log(`   Successful runs: ${successfulRuns.length}/3`);
        console.log(`   Failed runs: ${failedRuns.length}/3`);
        
        if (successfulRuns.length > 0) {
          const mcCounts = successfulRuns.map(r => r.multipleChoiceCount);
          const singleCounts = successfulRuns.map(r => r.singleCount);
          
          console.log(`   Multiple choice counts: ${mcCounts.join(', ')}`);
          console.log(`   Single question counts: ${singleCounts.join(', ')}`);
          
          const mcConsistent = mcCounts.every(count => count === mcCounts[0]);
          const singleConsistent = singleCounts.every(count => count === singleCounts[0]);
          
          console.log(`   MC counts consistent: ${mcConsistent ? 'YES' : 'NO'}`);
          console.log(`   Single counts consistent: ${singleConsistent ? 'YES' : 'NO'}`);
        }
        
        console.log('\n🎯 DETECTION CONSISTENCY CONCLUSION:');
        console.log('====================================');
        
        if (successfulRuns.length === 3 && successfulRuns.every(r => r.multipleChoiceCount === successfulRuns[0].multipleChoiceCount)) {
          console.log('✅ DETECTION IS CONSISTENTLY WORKING!');
          console.log('   The issue must be elsewhere in the frontend.');
        } else if (successfulRuns.length === 0) {
          console.log('❌ DETECTION IS CONSISTENTLY FAILING!');
          console.log('   All runs are falling back to single questions.');
          console.log('   This explains why tables/MC don\'t work!');
        } else {
          console.log('❌ DETECTION IS INCONSISTENT!');
          console.log('   Some runs succeed, some fail.');
          console.log('   This explains the intermittent behavior!');
        }
        
      } else {
        console.error('❌ No interactive questions received from backend');
      }
    } else {
      console.error('❌ API call failed:', response.data);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the detection consistency test
testDetectionConsistency(); 