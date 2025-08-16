const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testTableContentAnalysis() {
  console.log('🔍 TABLE CONTENT ANALYSIS TEST');
  console.log('===============================');
  console.log('Analyzing what content is actually in detected table questions\n');
  
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
        
        // Find all questions that might have tables
        let tableQuestions = [];
        
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
          
          if (hasTableIndicators) {
            tableQuestions.push({
              index: index + 1,
              question: question,
              indicators: {
                table: question.includes('table'),
                task: question.includes('Task'),
                time: question.includes('Time'),
                ampersand: question.includes('&'),
                pipe: question.includes('|'),
                dashes: question.includes('-----') || question.includes('---')
              }
            });
          }
        });
        
        console.log(`📊 Found ${tableQuestions.length} questions with table indicators`);
        
        if (tableQuestions.length > 0) {
          console.log('\n📋 DETAILED TABLE CONTENT ANALYSIS:');
          console.log('===================================');
          
          tableQuestions.forEach((tableQ, qIndex) => {
            console.log(`\n${qIndex + 1}. QUESTION ${tableQ.index}:`);
            console.log('=====================================');
            console.log(`📋 Full question: "${tableQ.question}"`);
            console.log(`🔍 Indicators: table=${tableQ.indicators.table}, task=${tableQ.indicators.task}, time=${tableQ.indicators.time}, &=${tableQ.indicators.ampersand}, |=${tableQ.indicators.pipe}, dashes=${tableQ.indicators.dashes}`);
            
            // Check for actual table-like patterns
            const hasAmpersandTable = tableQ.question.includes('&') && tableQ.question.match(/[A-Z]\s*&\s*\d+/);
            const hasPipeTable = tableQ.question.includes('|') && tableQ.question.match(/[A-Z]\s*\|\s*\d+/);
            const hasDashTable = tableQ.question.includes('-----') || tableQ.question.includes('---');
            const hasTaskTimePattern = tableQ.question.includes('Task') && tableQ.question.includes('Time');
            
            console.log(`📊 Table patterns: ampersand=${hasAmpersandTable}, pipe=${hasPipeTable}, dashes=${hasDashTable}, taskTime=${hasTaskTimePattern}`);
            
            // Test Gemini conversion
            console.log(`🚀 Testing Gemini conversion...`);
            
            const tableConversionPrompt = `You are a text processor. Your ONLY job is to convert table-like data to HTML tables while keeping everything else exactly the same.
            
            QUESTION TO PROCESS:
            "${tableQ.question}"
            
            RULES:
            - If you see rows and columns of data that look like a table, convert ONLY that part to HTML table format
            - Tables may use | (pipe), & (ampersand), or other separators
            - Use <table class="question-table"><thead><tr><th>...</th></tr></thead><tbody><tr><td>...</td></tr></tbody></table>
            - Keep ALL other text exactly as it appears
            - If no table data exists, return the original text unchanged
            - Do NOT include any instructions, examples, or explanations in your response
            - ONLY return the processed question text
            
            Process and return the question:`;
            
            axios.post('http://localhost:8000/api/test-ai/test-gemini', {
              prompt: tableConversionPrompt
            }, {
              timeout: 30000
            }).then(geminiResponse => {
              if (geminiResponse.data.success) {
                const result = geminiResponse.data.data.response;
                const hasHTMLTable = result.includes('<table') || result.includes('&lt;table');
                
                console.log(`✅ Gemini result: ${hasHTMLTable ? 'HTML TABLE GENERATED' : 'NO HTML TABLE'}`);
                console.log(`📋 Response preview: "${result.substring(0, 200)}..."`);
                
                if (hasHTMLTable) {
                  console.log('🎉 SUCCESS: This question would display as a table in the frontend!');
                } else {
                  console.log('⚠️  This question would display as regular text in the frontend');
                }
              } else {
                console.log(`❌ Gemini failed: ${geminiResponse.data.message || 'Unknown error'}`);
              }
            }).catch(error => {
              console.log(`❌ Gemini error: ${error.message}`);
            });
          });
          
          console.log('\n🎯 TABLE CONTENT ANALYSIS CONCLUSION:');
          console.log('=====================================');
          console.log('This shows exactly what content is in each "table" question and whether Gemini can convert it to HTML.');
          console.log('If some questions don\'t have real table data, that explains why they don\'t display as tables.');
          
        } else {
          console.log('⏭️  No questions with table indicators found in this run');
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

// Run the table content analysis test
testTableContentAnalysis(); 