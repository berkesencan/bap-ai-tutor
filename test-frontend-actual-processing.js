const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testFrontendActualProcessing() {
  console.log('🔍 TESTING ACTUAL FRONTEND PROCESSING');
  console.log('=====================================');
  console.log('Testing if the frontend processing logic actually works\n');
  
  try {
    const pdfPath = './midterm-sp24.pdf';
    
    if (!fs.existsSync(pdfPath)) {
      console.error('❌ Test PDF not found:', pdfPath);
      return;
    }
    
    console.log('📄 Using test PDF:', pdfPath);
    
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
      
      if (!result.interactiveQuestions || result.interactiveQuestions.length === 0) {
        console.error('❌ No interactive questions received from backend');
        return;
      }
      
      console.log(`✅ Received ${result.interactiveQuestions.length} questions from backend`);
      
      // Test 1: Table Conversion (using the actual frontend logic)
      console.log('\n📊 TEST 1: TABLE CONVERSION');
      console.log('============================');
      
      const questionsArray = result.interactiveQuestions.map(q => q.question);
      
      // Find questions that should have tables
      const tableQuestions = questionsArray.filter(q => 
        q.includes('&') || q.includes('|') || q.includes('Task')
      );
      
      console.log(`📊 Found ${tableQuestions.length} questions with table indicators`);
      
      if (tableQuestions.length > 0) {
        console.log('\n🎯 Testing table conversion for first table question:');
        console.log('==================================================');
        
        const testQuestion = tableQuestions[0];
        console.log(`📋 Original question: "${testQuestion.substring(0, 150)}..."`);
        
        // Test the actual table conversion logic
        const hasTableIndicators = testQuestion.includes('table') || 
                                 testQuestion.includes('Task') || 
                                 testQuestion.includes('Time') || 
                                 testQuestion.includes('core type') ||
                                 testQuestion.includes('|') ||
                                 testQuestion.includes('&') ||
                                 testQuestion.includes('-----') ||
                                 testQuestion.includes('---') ||
                                 (testQuestion.match(/\b[A-Z]\s+\d+\s+\d+\b/) !== null) ||
                                 (testQuestion.match(/\b\d+\s+\d+\s+\d+\b/) !== null) ||
                                 (testQuestion.match(/[A-Z]\s+\d+\.?\d*\s+[A-Z]/) !== null) ||
                                 (testQuestion.match(/\d+\s+\d+\.?\d*\s+[A-Z]/) !== null);
        
        console.log(`🔍 Table detection result: ${hasTableIndicators}`);
        
        if (hasTableIndicators) {
          console.log('✅ Table would be sent to Gemini for conversion');
          
          // Test the actual Gemini API call (simulate frontend)
          console.log('\n🚀 Testing actual Gemini API call...');
          
          try {
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
            
            const geminiResponse = await axios.post('http://localhost:8000/api/ai/test-gemini', {
              prompt: tableConversionPrompt
            }, {
              timeout: 30000
            });
            
            if (geminiResponse.data.success) {
              console.log('✅ Gemini API call successful!');
              console.log(`📋 Gemini response: "${geminiResponse.data.response.substring(0, 200)}..."`);
              
              // Check if Gemini actually converted to HTML table
              if (geminiResponse.data.response.includes('<table') || geminiResponse.data.response.includes('&lt;table')) {
                console.log('🎉 SUCCESS: Gemini converted to HTML table!');
              } else {
                console.log('⚠️  Gemini returned text but no HTML table detected');
              }
            } else {
              console.log('❌ Gemini API call failed:', geminiResponse.data);
            }
            
          } catch (geminiError) {
            console.log('❌ Gemini API call error:', geminiError.message);
          }
        }
      }
      
      // Test 2: Multiple Choice Detection (using the actual frontend logic)
      console.log('\n📊 TEST 2: MULTIPLE CHOICE DETECTION');
      console.log('=====================================');
      
      // Find questions that might be multiple choice
      const mcQuestions = questionsArray.filter(q => 
        q.match(/\b[a-d]\)\s+[A-Za-z]/) || q.match(/\b[a-d]\.\s+[A-Za-z]/)
      );
      
      console.log(`📊 Found ${mcQuestions.length} questions with multiple choice indicators`);
      
      if (mcQuestions.length > 0) {
        console.log('\n🎯 Testing multiple choice detection for first MC question:');
        console.log('==========================================================');
        
        const testMCQuestion = mcQuestions[0];
        console.log(`📋 Original question: "${testMCQuestion.substring(0, 150)}..."`);
        
        // Test the actual multiple choice detection logic
        const hasMultipleChoice = testMCQuestion.match(/\b[a-d]\)\s+[A-Za-z]/) || 
                                 testMCQuestion.match(/\b[a-d]\.\s+[A-Za-z]/) ||
                                 testMCQuestion.match(/\b[a-d]\s+[A-Za-z]/);
        
        console.log(`🔍 Multiple choice detection result: ${hasMultipleChoice ? hasMultipleChoice[0] : 'false'}`);
        
        if (hasMultipleChoice) {
          console.log('✅ Multiple choice would be sent to Gemini for grouping');
          
          // Test the actual Gemini API call for MC detection
          console.log('\n🚀 Testing actual Gemini API call for MC detection...');
          
          try {
            const mcDetectionPrompt = `You are a question analyzer. Your ONLY job is to determine if a question contains TRUE multiple choice options or just question subparts.
            
            QUESTION TO ANALYZE:
            "${testMCQuestion}"
            
            CRITICAL RULES:
            - TRUE MULTIPLE CHOICE: A single question with multiple options (a), b), c), d)) that are all part of the SAME question
            - QUESTION SUBPARTS: Separate questions or parts that happen to use (a), b), c)) format but are NOT multiple choice options
            
            EXAMPLES:
            TRUE MC: "What is 2+2? a) 3 b) 4 c) 5 d) 6" (all options for same question)
            SUBPARTS: "a) Explain X b) Calculate Y c) Compare Z" (separate tasks)
            
            RESPONSE FORMAT:
            If TRUE multiple choice: return "MULTIPLE_CHOICE"
            If question subparts: return "SINGLE"
            
            Analyze and respond:`;
            
            const geminiMCResponse = await axios.post('http://localhost:8000/api/ai/test-gemini', {
              prompt: mcDetectionPrompt
            }, {
              timeout: 30000
            });
            
            if (geminiMCResponse.data.success) {
              console.log('✅ Gemini MC detection API call successful!');
              console.log(`📋 Gemini response: "${geminiMCResponse.data.response}"`);
              
              if (geminiMCResponse.data.response.includes('MULTIPLE_CHOICE')) {
                console.log('🎉 SUCCESS: Gemini correctly identified as multiple choice!');
              } else if (geminiMCResponse.data.response.includes('SINGLE')) {
                console.log('🎉 SUCCESS: Gemini correctly identified as single question!');
              } else {
                console.log('⚠️  Gemini response unclear:', geminiMCResponse.data.response);
              }
            } else {
              console.log('❌ Gemini MC detection API call failed:', geminiMCResponse.data);
            }
            
          } catch (geminiError) {
            console.log('❌ Gemini MC detection API call error:', geminiError.message);
          }
        }
      }
      
      console.log('\n🎯 FRONTEND PROCESSING TEST CONCLUSION:');
      console.log('======================================');
      console.log('This test shows if the actual frontend processing logic works.');
      console.log('If Gemini calls succeed, the issue might be in the frontend rendering.');
      console.log('If Gemini calls fail, that explains the intermittent issues.');
      
    } else {
      console.error('❌ API call failed:', response.data);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the frontend processing test
testFrontendActualProcessing(); 