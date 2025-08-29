const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testFrontendRenderingConsistency() {
  console.log('🔍 FRONTEND RENDERING CONSISTENCY TEST');
  console.log('=======================================');
  console.log('Testing if frontend can consistently process and display tables/MC\n');
  
  const pdfPath = './midterm-sp24.pdf';
  
  if (!fs.existsSync(pdfPath)) {
    console.error('❌ Test PDF not found:', pdfPath);
    return;
  }
  
  console.log('📄 Using test PDF:', pdfPath);
  
  const results = [];
  
  // Run 5 tests
  for (let i = 1; i <= 5; i++) {
    console.log(`\n🔄 RUN ${i}/5`);
    console.log('==========');
    
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
          
          // Test frontend detection logic
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
                question: question.substring(0, 100) + '...'
              });
            }
            
            if (hasMultipleChoice) {
              mcDetectionResults.push({
                index: index + 1,
                question: question.substring(0, 100) + '...'
              });
            }
          });
          
          console.log(`📊 Frontend detection: ${tableDetectionResults.length} tables, ${mcDetectionResults.length} MC`);
          
          // Test Gemini API calls for table conversion
          let tableConversionSuccess = false;
          let tableConversionResult = '';
          
          if (tableDetectionResults.length > 0) {
            try {
              const testTableQuestion = questionsArray[tableDetectionResults[0].index - 1];
              console.log(`🎯 Testing table conversion for question ${tableDetectionResults[0].index}`);
              
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
              
              const geminiResponse = await axios.post('http://localhost:8000/api/test-ai/test-gemini', {
                prompt: tableConversionPrompt
              }, {
                timeout: 30000
              });
              
              if (geminiResponse.data.success) {
                tableConversionResult = geminiResponse.data.data.response;
                tableConversionSuccess = true;
                
                // Check if Gemini actually converted to HTML table
                const hasHTMLTable = tableConversionResult.includes('<table') || tableConversionResult.includes('&lt;table');
                
                console.log(`✅ Gemini table conversion: SUCCESS`);
                console.log(`📋 Has HTML table: ${hasHTMLTable ? 'YES' : 'NO'}`);
                console.log(`📋 Response preview: "${tableConversionResult.substring(0, 150)}..."`);
                
                if (hasHTMLTable) {
                  console.log('🎉 SUCCESS: Frontend would display this as an HTML table!');
                } else {
                  console.log('⚠️  Gemini processed but no HTML table generated');
                }
              } else {
                console.log(`❌ Gemini table conversion: FAILED`);
              }
            } catch (error) {
              console.log(`❌ Gemini table conversion: ERROR - ${error.message}`);
            }
          } else {
            console.log(`⏭️  No table questions detected in this run`);
          }
          
          // Test Gemini API calls for multiple choice detection
          let mcDetectionSuccess = false;
          let mcDetectionResult = '';
          
          if (mcDetectionResults.length > 0) {
            try {
              const testMCQuestion = questionsArray[mcDetectionResults[0].index - 1];
              console.log(`🎯 Testing MC detection for question ${mcDetectionResults[0].index}`);
              
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
              
              const geminiResponse = await axios.post('http://localhost:8000/api/test-ai/test-gemini', {
                prompt: mcDetectionPrompt
              }, {
                timeout: 30000
              });
              
              if (geminiResponse.data.success) {
                mcDetectionResult = geminiResponse.data.data.response.trim();
                mcDetectionSuccess = true;
                
                console.log(`✅ Gemini MC detection: SUCCESS`);
                console.log(`📋 Result: "${mcDetectionResult}"`);
                
                if (mcDetectionResult === 'MULTIPLE_CHOICE') {
                  console.log('🎉 SUCCESS: Frontend would group this as multiple choice!');
                } else if (mcDetectionResult === 'SINGLE') {
                  console.log('✅ SUCCESS: Frontend would display this as a single question!');
                } else {
                  console.log('⚠️  Gemini response unclear');
                }
              } else {
                console.log(`❌ Gemini MC detection: FAILED`);
              }
            } catch (error) {
              console.log(`❌ Gemini MC detection: ERROR - ${error.message}`);
            }
          } else {
            console.log(`⏭️  No MC questions detected in this run`);
          }
          
          // Store results
          const runResult = {
            run: i,
            totalQuestions: questionsArray.length,
            tableQuestions: tableDetectionResults.length,
            mcQuestions: mcDetectionResults.length,
            tableConversionSuccess: tableConversionSuccess,
            mcDetectionSuccess: mcDetectionSuccess,
            tableHasHTML: tableConversionResult.includes('<table') || tableConversionResult.includes('&lt;table'),
            mcResult: mcDetectionResult,
            sampleQuestion: questionsArray[0] ? questionsArray[0].substring(0, 100) + '...' : 'None'
          };
          
          results.push(runResult);
          
        } else {
          console.log(`❌ Run ${i}: No interactive questions received`);
          results.push({
            run: i,
            totalQuestions: 0,
            tableQuestions: 0,
            mcQuestions: 0,
            tableConversionSuccess: false,
            mcDetectionSuccess: false,
            tableHasHTML: false,
            mcResult: '',
            error: 'No questions received'
          });
        }
      } else {
        console.log(`❌ Run ${i}: API call failed`);
        results.push({
          run: i,
          totalQuestions: 0,
          tableQuestions: 0,
          mcQuestions: 0,
          tableConversionSuccess: false,
          mcDetectionSuccess: false,
          tableHasHTML: false,
          mcResult: '',
          error: 'API call failed'
        });
      }
      
    } catch (error) {
      console.log(`❌ Run ${i} failed:`, error.message);
      results.push({
        run: i,
        totalQuestions: 0,
        tableQuestions: 0,
        mcQuestions: 0,
        tableConversionSuccess: false,
        mcDetectionSuccess: false,
        tableHasHTML: false,
        mcResult: '',
        error: error.message
      });
    }
    
    // Wait between runs
    if (i < 5) {
      console.log('⏳ Waiting 3 seconds before next run...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  console.log('\n📊 FRONTEND RENDERING CONSISTENCY ANALYSIS');
  console.log('===========================================');
  
  if (results.length > 0) {
    console.log('📋 All runs summary:');
    results.forEach(result => {
      if (result.error) {
        console.log(`   Run ${result.run}: ERROR - ${result.error}`);
      } else {
        const tableStatus = result.tableQuestions > 0 ? 
          (result.tableConversionSuccess && result.tableHasHTML ? '✅ HTML TABLE' : '❌ FAILED') : 
          '⏭️  NO TABLES';
        
        const mcStatus = result.mcQuestions > 0 ? 
          (result.mcDetectionSuccess ? `✅ ${result.mcResult}` : '❌ FAILED') : 
          '⏭️  NO MC';
        
        console.log(`   Run ${result.run}: ${result.totalQuestions} questions | Tables: ${tableStatus} | MC: ${mcStatus}`);
      }
    });
    
    // Analyze rendering consistency
    const successfulRuns = results.filter(r => !r.error);
    
    if (successfulRuns.length > 0) {
      const runsWithTables = successfulRuns.filter(r => r.tableQuestions > 0);
      const runsWithMC = successfulRuns.filter(r => r.mcQuestions > 0);
      
      console.log('\n📊 Rendering Consistency Analysis:');
      
      if (runsWithTables.length > 0) {
        const tableSuccessRate = runsWithTables.filter(r => r.tableConversionSuccess && r.tableHasHTML).length / runsWithTables.length;
        console.log(`   Table rendering: ${runsWithTables.length} runs had tables, ${(tableSuccessRate * 100).toFixed(0)}% successfully converted to HTML`);
      } else {
        console.log(`   Table rendering: No runs had table questions`);
      }
      
      if (runsWithMC.length > 0) {
        const mcSuccessRate = runsWithMC.filter(r => r.mcDetectionSuccess).length / runsWithMC.length;
        console.log(`   MC detection: ${runsWithMC.length} runs had MC questions, ${(mcSuccessRate * 100).toFixed(0)}% successfully detected`);
      } else {
        console.log(`   MC detection: No runs had MC questions`);
      }
      
      console.log('\n🎯 FRONTEND RENDERING CONCLUSION:');
      console.log('=================================');
      
      const tableConsistent = runsWithTables.length === 0 || runsWithTables.every(r => r.tableConversionSuccess && r.tableHasHTML);
      const mcConsistent = runsWithMC.length === 0 || runsWithMC.every(r => r.mcDetectionSuccess);
      
      if (tableConsistent && mcConsistent) {
        console.log('✅ FRONTEND RENDERING IS CONSISTENTLY WORKING!');
        console.log('   The issue must be in the React component rendering or state management.');
      } else {
        console.log('❌ FRONTEND RENDERING HAS INTERMITTENT ISSUES!');
        console.log('   Gemini API calls or processing logic is inconsistent.');
      }
    }
  }
}

// Run the rendering consistency test
testFrontendRenderingConsistency(); 