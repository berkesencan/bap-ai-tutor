const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function debugInteractiveTableFlow() {
  console.log('🔍 DEBUGGING INTERACTIVE TABLE FLOW');
  console.log('===================================');
  
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
      
      console.log('\n📊 STEP 1: BACKEND DATA ANALYSIS');
      console.log('================================');
      
      if (result.interactiveQuestions) {
        console.log(`✅ interactiveQuestions count: ${result.interactiveQuestions.length}`);
        
        // Find questions with table content
        const tableQuestions = result.interactiveQuestions.filter(q => 
          q.question.includes('&') || q.question.includes('|') || 
          q.question.includes('Task') || q.question.includes('Time')
        );
        
        console.log(`📊 Questions with table indicators: ${tableQuestions.length}`);
        
        if (tableQuestions.length > 0) {
          console.log('\n📋 TABLE QUESTIONS FOUND:');
          tableQuestions.forEach((q, index) => {
            console.log(`\n${index + 1}. Question ${q.id || index + 1}:`);
            console.log(`   Text: "${q.question.substring(0, 100)}..."`);
            console.log(`   Has &: ${q.question.includes('&')}`);
            console.log(`   Has |: ${q.question.includes('|')}`);
            console.log(`   Has Task: ${q.question.includes('Task')}`);
            console.log(`   Has Time: ${q.question.includes('Time')}`);
          });
        }
      }
      
      console.log('\n📊 STEP 2: FRONTEND LOGIC SIMULATION');
      console.log('====================================');
      
      // Simulate the frontend logic exactly
      if (result.interactiveQuestions) {
        const questionsArray = result.interactiveQuestions.map(q => q.question);
        
        console.log(`🎯 Frontend would process ${questionsArray.length} questions`);
        
        // Simulate the table detection function
        function simulateTableDetection(questionText) {
          console.log(`\n🔍 Testing table detection for: "${questionText.substring(0, 80)}..."`);
          
          const hasTableIndicators = questionText.includes('table') || 
                                    questionText.includes('Task') || 
                                    questionText.includes('Time') || 
                                    questionText.includes('core type') ||
                                    questionText.includes('|') ||
                                    questionText.includes('&') ||  // This should work now
                                    questionText.includes('-----') ||
                                    questionText.includes('---') ||
                                    questionText.match(/\b[A-Z]\s+\d+\s+\d+\b/) ||
                                    questionText.match(/\b\d+\s+\d+\s+\d+\b/) ||
                                    questionText.match(/[A-Z]\s+\d+\.?\d*\s+[A-Z]/) ||
                                    questionText.match(/\d+\s+\d+\.?\d*\s+[A-Z]/);
          
          console.log(`   Table indicators detected: ${hasTableIndicators}`);
          return hasTableIndicators;
        }
        
        // Test each question
        questionsArray.forEach((question, index) => {
          const hasTable = simulateTableDetection(question);
          if (hasTable) {
            console.log(`✅ Question ${index + 1} WOULD be sent to Gemini for table conversion`);
          } else {
            console.log(`❌ Question ${index + 1} would NOT be sent to Gemini`);
          }
        });
      }
      
      console.log('\n📊 STEP 3: GEMINI API TEST');
      console.log('==========================');
      
      // Test the actual Gemini API call
      if (result.interactiveQuestions) {
        const tableQuestion = result.interactiveQuestions.find(q => 
          q.question.includes('&') || q.question.includes('Task')
        );
        
        if (tableQuestion) {
          console.log('🧪 Testing actual Gemini API call...');
          
          const tableConversionPrompt = `You are a text processor. Your ONLY job is to convert table-like data to HTML tables while keeping everything else exactly the same.

QUESTION TO PROCESS:
"${tableQuestion.question}"

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
            const geminiResponse = await axios.post('http://localhost:8000/api/ai/test-gemini', {
              prompt: tableConversionPrompt
            });
            
            if (geminiResponse.data.success) {
              console.log('✅ Gemini API call successful!');
              console.log('📄 Response preview:');
              console.log(geminiResponse.data.data.response.substring(0, 200) + '...');
              
              // Check if HTML table was generated
              if (geminiResponse.data.data.response.includes('<table')) {
                console.log('🎉 SUCCESS: HTML table was generated!');
              } else {
                console.log('⚠️ WARNING: No HTML table found in response');
              }
            } else {
              console.log('❌ Gemini API call failed:', geminiResponse.data);
            }
          } catch (error) {
            console.log('❌ Gemini API test failed:', error.message);
          }
        }
      }
      
    } else {
      console.error('❌ API call failed:', response.data);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
debugInteractiveTableFlow(); 