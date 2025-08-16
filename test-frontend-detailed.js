const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testFrontendDetailed() {
  console.log('🔍 DETAILED FRONTEND PROCESSING TEST');
  console.log('====================================');
  console.log('Testing frontend processing step by step\n');
  
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
      
      // STEP 1: Analyze what we received
      console.log('\n📊 STEP 1: BACKEND DATA ANALYSIS');
      console.log('================================');
      
      const questionsArray = result.interactiveQuestions.map(q => q.question);
      
      // Show first few questions to understand the content
      console.log('\n📋 FIRST 3 QUESTIONS FROM BACKEND:');
      questionsArray.slice(0, 3).forEach((q, index) => {
        console.log(`\n${index + 1}. "${q.substring(0, 150)}..."`);
      });
      
      // STEP 2: Test frontend detection logic
      console.log('\n📊 STEP 2: FRONTEND DETECTION LOGIC');
      console.log('===================================');
      
      let tableDetectionResults = [];
      let mcDetectionResults = [];
      
      questionsArray.forEach((question, index) => {
        // Test table detection (EXACT frontend logic)
        const hasTableIndicators = question.includes('table') || 
                                 question.includes('Task') || 
                                 question.includes('Time') || 
                                 question.includes('core type') ||
                                 question.includes('|') ||
                                 question.includes('&') ||
                                 question.includes('-----') ||
                                 question.includes('---') ||
                                 (question.match(/\b[A-Z]\s+\d+\s+\d+\b/) !== null) ||
                                 (question.match(/\b\d+\s+\d+\s+\d+\b/) !== null) ||
                                 (question.match(/[A-Z]\s+\d+\.?\d*\s+[A-Z]/) !== null) ||
                                 (question.match(/\d+\s+\d+\.?\d*\s+[A-Z]/) !== null);
        
        // Test multiple choice detection (EXACT frontend logic)
        const hasMultipleChoice = question.match(/\b[a-d]\)\s+[A-Za-z]/) || 
                                 question.match(/\b[a-d]\.\s+[A-Za-z]/) ||
                                 question.match(/\b[a-d]\s+[A-Za-z]/);
        
        if (hasTableIndicators) {
          tableDetectionResults.push({
            index: index + 1,
            question: question.substring(0, 100) + '...',
            indicators: {
              table: question.includes('table'),
              task: question.includes('Task'),
              time: question.includes('Time'),
              ampersand: question.includes('&'),
              pipe: question.includes('|')
            }
          });
        }
        
        if (hasMultipleChoice) {
          mcDetectionResults.push({
            index: index + 1,
            question: question.substring(0, 100) + '...',
            match: hasMultipleChoice[0]
          });
        }
      });
      
      console.log(`📊 Table detection: ${tableDetectionResults.length} questions detected`);
      console.log(`📊 Multiple choice detection: ${mcDetectionResults.length} questions detected`);
      
      // STEP 3: Test actual Gemini API calls
      console.log('\n📊 STEP 3: GEMINI API TESTING');
      console.log('=============================');
      
      if (tableDetectionResults.length > 0) {
        console.log('\n🎯 TESTING TABLE CONVERSION WITH GEMINI:');
        console.log('========================================');
        
        const testTableQuestion = questionsArray[tableDetectionResults[0].index - 1];
        console.log(`📋 Testing question ${tableDetectionResults[0].index}: "${testTableQuestion.substring(0, 150)}..."`);
        
        try {
          const tableConversionPrompt = `You are a text processor. Your ONLY job is to convert table-like data to HTML tables while keeping everything else exactly the same.
          
          QUESTION TO PROCESS:
          "${testTableQuestion}"
          
          RULES:
          - If you see rows and columns of data that look like a table, convert ONLY that part to HTML table format
          - Tables may use | (pipe), & (ampersand), or other separators
          - Use <table class="question-table"><thead><tr><th>...</th></tr></thead><tbody><tr><td>...</td></tr></tbody></table>
          - Keep ALL other text exactly as it appears
          - If no table data exists, return the original text unchanged
          - Do NOT include any instructions, examples, or explanations in your response
          - ONLY return the processed question text
          
          Process and return the question:`;
          
          console.log('🚀 Calling Gemini API for table conversion...');
          
          const geminiResponse = await axios.post('http://localhost:8000/api/test-ai/test-gemini', {
            prompt: tableConversionPrompt
          }, {
            timeout: 30000
          });
          
          if (geminiResponse.data.success) {
            console.log('✅ Gemini API call successful!');
            console.log(`📋 Response length: ${geminiResponse.data.data.response.length} characters`);
            console.log(`📋 Response preview: "${geminiResponse.data.data.response.substring(0, 200)}..."`);
            
            if (geminiResponse.data.data.response.includes('<table') || geminiResponse.data.data.response.includes('&lt;table')) {
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
      
      if (mcDetectionResults.length > 0) {
        console.log('\n🎯 TESTING MULTIPLE CHOICE DETECTION WITH GEMINI:');
        console.log('=================================================');
        
        const testMCQuestion = questionsArray[mcDetectionResults[0].index - 1];
        console.log(`📋 Testing question ${mcDetectionResults[0].index}: "${testMCQuestion.substring(0, 150)}..."`);
        
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
          
          console.log('🚀 Calling Gemini API for MC detection...');
          
          const geminiMCResponse = await axios.post('http://localhost:8000/api/test-ai/test-gemini', {
            prompt: mcDetectionPrompt
          }, {
            timeout: 30000
          });
          
          if (geminiMCResponse.data.success) {
            console.log('✅ Gemini MC detection API call successful!');
            console.log(`📋 Response: "${geminiMCResponse.data.data.response}"`);
            
            if (geminiMCResponse.data.data.response.includes('MULTIPLE_CHOICE')) {
              console.log('🎉 SUCCESS: Gemini correctly identified as multiple choice!');
            } else if (geminiMCResponse.data.data.response.includes('SINGLE')) {
              console.log('🎉 SUCCESS: Gemini correctly identified as single question!');
            } else {
              console.log('⚠️  Gemini response unclear:', geminiMCResponse.data.data.response);
            }
          } else {
            console.log('❌ Gemini MC detection API call failed:', geminiMCResponse.data);
          }
          
        } catch (geminiError) {
          console.log('❌ Gemini MC detection API call error:', geminiError.message);
        }
      }
      
      // STEP 4: Simulate frontend rendering
      console.log('\n📊 STEP 4: FRONTEND RENDERING SIMULATION');
      console.log('========================================');
      
      let processedQuestions = 0;
      let unprocessedQuestions = 0;
      
      questionsArray.forEach((question, index) => {
        const hasTableIndicators = question.includes('table') || 
                                 question.includes('Task') || 
                                 question.includes('Time') || 
                                 question.includes('core type') ||
                                 question.includes('|') ||
                                 question.includes('&') ||
                                 question.includes('-----') ||
                                 question.includes('---') ||
                                 (question.match(/\b[A-Z]\s+\d+\s+\d+\b/) !== null) ||
                                 (question.match(/\b\d+\s+\d+\s+\d+\b/) !== null) ||
                                 (question.match(/[A-Z]\s+\d+\.?\d*\s+[A-Z]/) !== null) ||
                                 (question.match(/\d+\s+\d+\.?\d*\s+[A-Z]/) !== null);
        
        const hasMultipleChoice = question.match(/\b[a-d]\)\s+[A-Za-z]/) || 
                                 question.match(/\b[a-d]\.\s+[A-Za-z]/) ||
                                 question.match(/\b[a-d]\s+[A-Za-z]/);
        
        if (hasTableIndicators || hasMultipleChoice) {
          processedQuestions++;
        } else {
          unprocessedQuestions++;
        }
      });
      
      console.log(`📊 Frontend rendering breakdown:`);
      console.log(`   Questions that would be processed by Gemini: ${processedQuestions}`);
      console.log(`   Questions that would be displayed as-is: ${unprocessedQuestions}`);
      console.log(`   Total questions: ${questionsArray.length}`);
      
      console.log('\n🎯 FRONTEND PROCESSING CONCLUSION:');
      console.log('=================================');
      console.log('This shows exactly what happens in the frontend processing.');
      console.log('If Gemini calls work, the issue might be in the frontend rendering logic.');
      console.log('If Gemini calls fail, that explains the intermittent issues.');
      
    } else {
      console.error('❌ API call failed:', response.data);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the detailed frontend test
testFrontendDetailed(); 