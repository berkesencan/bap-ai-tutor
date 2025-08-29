const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testFrontendRenderingBug() {
  console.log('🔍 FRONTEND RENDERING BUG TEST');
  console.log('===============================');
  console.log('Testing the hasProcessed state bug in QuestionDisplay\n');
  
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
        
        // Find questions with table indicators
        const tableQuestions = questionsArray.filter(q => 
          q.includes('&') || q.includes('|') || q.includes('Task')
        );
        
        console.log(`📊 Found ${tableQuestions.length} questions with table indicators`);
        
        if (tableQuestions.length > 0) {
          console.log('\n🧪 TESTING FRONTEND RENDERING BUG:');
          console.log('==================================');
          
          // Test the first table question
          const testQuestion = tableQuestions[0];
          console.log(`📋 Testing question: "${testQuestion.substring(0, 150)}..."`);
          
          // Simulate the frontend processing logic
          console.log('\n🔄 SIMULATING FRONTEND PROCESSING:');
          console.log('==================================');
          
          let hasProcessed = false;
          let processedText = '';
          
          // First processing (should work)
          console.log('1️⃣ First processing (hasProcessed = false):');
          if (!hasProcessed) {
            console.log('   ✅ Processing allowed, calling convertTableTextToHTML...');
            
            // Simulate table conversion
            const tableConversionPrompt = `You are a text processor. Your ONLY job is to convert table-like data to HTML tables while keeping everything else exactly the same.
            
            QUESTION TO PROCESS:
            "${testQuestion}"
            
            RULES:
            - If you see rows and columns of data that look like a table, convert ONLY that part to HTML table format
            - Tables may use | (pipe), & (ampersand), or other separators
            - Use <table class="question-table"><thead><tr><th>...</th></tr></thead><tbody><tr><td>...</td></tr></tbody></table>
            - Keep ALL other text exactly as it appears
            - If no table data exists, return the original text unchanged
            - Do NOT include any instructions, examples, or explanations in your response
            - ONLY return the processed question text
            
            Process and return the question:`;
            
            try {
              const geminiResponse = await axios.post('http://localhost:8000/api/test-ai/test-gemini', {
                prompt: tableConversionPrompt
              }, {
                timeout: 30000
              });
              
              if (geminiResponse.data.success) {
                processedText = geminiResponse.data.data.response;
                hasProcessed = true;
                
                const hasHTMLTable = processedText.includes('<table') || processedText.includes('&lt;table');
                console.log(`   ✅ Processing completed: ${hasHTMLTable ? 'HTML TABLE GENERATED' : 'NO HTML TABLE'}`);
                console.log(`   📋 Result: "${processedText.substring(0, 100)}..."`);
              } else {
                console.log('   ❌ Gemini call failed');
                processedText = testQuestion;
                hasProcessed = true;
              }
            } catch (error) {
              console.log(`   ❌ Processing error: ${error.message}`);
              processedText = testQuestion;
              hasProcessed = true;
            }
          } else {
            console.log('   ❌ Processing blocked by hasProcessed flag');
          }
          
          // Second processing (should be blocked by hasProcessed)
          console.log('\n2️⃣ Second processing (hasProcessed = true):');
          if (!hasProcessed) {
            console.log('   ✅ Processing allowed (this should not happen)');
          } else {
            console.log('   ❌ Processing blocked by hasProcessed flag');
            console.log('   📋 Using cached result: "' + processedText.substring(0, 100) + '..."');
          }
          
          // Simulate data change (like when backend sends different data)
          console.log('\n3️⃣ Simulating data change (new question data):');
          const newQuestionData = "Q2) This is a completely different question with a table: Task & Time A & 5 B & 3 C & 7";
          console.log(`   📋 New question data: "${newQuestionData}"`);
          
          // Reset hasProcessed to simulate component re-render
          hasProcessed = false;
          console.log('   🔄 Resetting hasProcessed = false (simulating component re-render)');
          
          // Third processing (should work again)
          console.log('\n4️⃣ Third processing (hasProcessed = false again):');
          if (!hasProcessed) {
            console.log('   ✅ Processing allowed, calling convertTableTextToHTML...');
            
            // Simulate table conversion for new data
            const newTableConversionPrompt = `You are a text processor. Your ONLY job is to convert table-like data to HTML tables while keeping everything else exactly the same.
            
            QUESTION TO PROCESS:
            "${newQuestionData}"
            
            RULES:
            - If you see rows and columns of data that look like a table, convert ONLY that part to HTML table format
            - Tables may use | (pipe), & (ampersand), or other separators
            - Use <table class="question-table"><thead><tr><th>...</th></tr></thead><tbody><tr><td>...</td></tr></tbody></table>
            - Keep ALL other text exactly as it appears
            - If no table data exists, return the original text unchanged
            - Do NOT include any instructions, examples, or explanations in your response
            - ONLY return the processed question text
            
            Process and return the question:`;
            
            try {
              const geminiResponse = await axios.post('http://localhost:8000/api/test-ai/test-gemini', {
                prompt: newTableConversionPrompt
              }, {
                timeout: 30000
              });
              
              if (geminiResponse.data.success) {
                processedText = geminiResponse.data.data.response;
                hasProcessed = true;
                
                const hasHTMLTable = processedText.includes('<table') || processedText.includes('&lt;table');
                console.log(`   ✅ Processing completed: ${hasHTMLTable ? 'HTML TABLE GENERATED' : 'NO HTML TABLE'}`);
                console.log(`   📋 Result: "${processedText.substring(0, 100)}..."`);
              } else {
                console.log('   ❌ Gemini call failed');
                processedText = newQuestionData;
                hasProcessed = true;
              }
            } catch (error) {
              console.log(`   ❌ Processing error: ${error.message}`);
              processedText = newQuestionData;
              hasProcessed = true;
            }
          } else {
            console.log('   ❌ Processing blocked by hasProcessed flag');
          }
          
          console.log('\n🎯 FRONTEND RENDERING BUG CONCLUSION:');
          console.log('=====================================');
          console.log('The issue is in the QuestionDisplay component:');
          console.log('1. hasProcessed state prevents re-processing when data changes');
          console.log('2. This causes inconsistent table display');
          console.log('3. The fix is to reset hasProcessed when questionData changes');
          
        } else {
          console.log('⏭️  No table questions found in this run');
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

// Run the frontend rendering bug test
testFrontendRenderingBug(); 