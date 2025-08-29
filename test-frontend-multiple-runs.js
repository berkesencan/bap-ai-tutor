const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testFrontendMultipleRuns() {
  console.log('🔍 MULTIPLE RUNS FRONTEND PROCESSING TEST');
  console.log('=========================================');
  console.log('Running multiple tests to check consistency\n');
  
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
          
                     // Test Gemini API calls
           let geminiTableSuccess = false;
           let geminiMCSuccess = false;
           let geminiTableResponseText = '';
           let geminiMCResponseText = '';
           
           // Test table conversion if we have table questions
           if (tableDetectionResults.length > 0) {
             try {
               const testTableQuestion = questionsArray[tableDetectionResults[0].index - 1];
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
               
               const geminiTableResponse = await axios.post('http://localhost:8000/api/test-ai/test-gemini', {
                 prompt: tableConversionPrompt
               }, {
                 timeout: 30000
               });
               
               if (geminiTableResponse.data.success) {
                 geminiTableSuccess = true;
                 geminiTableResponseText = geminiTableResponse.data.data.response;
                 console.log(`✅ Gemini table API: SUCCESS (${geminiTableResponseText.length} chars)`);
               } else {
                 console.log(`❌ Gemini table API: FAILED`);
               }
             } catch (error) {
               console.log(`❌ Gemini table API: ERROR - ${error.message}`);
             }
           } else {
             console.log(`⏭️  Gemini table API: SKIPPED (no table questions)`);
           }
          
                     // Test multiple choice detection if we have MC questions
           if (mcDetectionResults.length > 0) {
             try {
               const testMCQuestion = questionsArray[mcDetectionResults[0].index - 1];
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
               
               const geminiMCResponse = await axios.post('http://localhost:8000/api/test-ai/test-gemini', {
                 prompt: mcDetectionPrompt
               }, {
                 timeout: 30000
               });
               
               if (geminiMCResponse.data.success) {
                 geminiMCSuccess = true;
                 geminiMCResponseText = geminiMCResponse.data.data.response;
                 console.log(`✅ Gemini MC API: SUCCESS - "${geminiMCResponseText.trim()}"`);
               } else {
                 console.log(`❌ Gemini MC API: FAILED`);
               }
             } catch (error) {
               console.log(`❌ Gemini MC API: ERROR - ${error.message}`);
             }
           } else {
             console.log(`⏭️  Gemini MC API: SKIPPED (no MC questions)`);
           }
          
                     // Store results
           const runResult = {
             run: i,
             totalQuestions: questionsArray.length,
             tableQuestions: tableDetectionResults.length,
             mcQuestions: mcDetectionResults.length,
             geminiTableSuccess: geminiTableSuccess,
             geminiMCSuccess: geminiMCSuccess,
             geminiTableResponse: geminiTableResponseText.substring(0, 50) + '...',
             geminiMCResponse: geminiMCResponseText.trim(),
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
            geminiTableSuccess: false,
            geminiMCSuccess: false,
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
          geminiTableSuccess: false,
          geminiMCSuccess: false,
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
        geminiTableSuccess: false,
        geminiMCSuccess: false,
        error: error.message
      });
    }
    
    // Wait between runs
    if (i < 5) {
      console.log('⏳ Waiting 3 seconds before next run...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  console.log('\n📊 MULTIPLE RUNS ANALYSIS');
  console.log('==========================');
  
  if (results.length > 0) {
    console.log('📋 All runs summary:');
    results.forEach(result => {
      if (result.error) {
        console.log(`   Run ${result.run}: ERROR - ${result.error}`);
      } else {
        console.log(`   Run ${result.run}: ${result.totalQuestions} questions (${result.tableQuestions} tables, ${result.mcQuestions} MC) | Gemini: Table=${result.geminiTableSuccess ? '✅' : '❌'}, MC=${result.geminiMCSuccess ? '✅' : '❌'}`);
      }
    });
    
    // Analyze consistency
    const successfulRuns = results.filter(r => !r.error);
    
    if (successfulRuns.length > 0) {
      const totalQuestions = successfulRuns.map(r => r.totalQuestions);
      const tableQuestions = successfulRuns.map(r => r.tableQuestions);
      const mcQuestions = successfulRuns.map(r => r.mcQuestions);
      const geminiTableSuccess = successfulRuns.map(r => r.geminiTableSuccess);
      const geminiMCSuccess = successfulRuns.map(r => r.geminiMCSuccess);
      
      console.log('\n📊 Consistency Analysis:');
      console.log(`   Backend extraction: ${Math.min(...totalQuestions)} - ${Math.max(...totalQuestions)} questions (${totalQuestions.every(v => v === totalQuestions[0]) ? 'CONSISTENT' : 'INCONSISTENT'})`);
      console.log(`   Table detection: ${Math.min(...tableQuestions)} - ${Math.max(...tableQuestions)} questions (${tableQuestions.every(v => v === tableQuestions[0]) ? 'CONSISTENT' : 'INCONSISTENT'})`);
      console.log(`   MC detection: ${Math.min(...mcQuestions)} - ${Math.max(...mcQuestions)} questions (${mcQuestions.every(v => v === mcQuestions[0]) ? 'CONSISTENT' : 'INCONSISTENT'})`);
      console.log(`   Gemini table API: ${geminiTableSuccess.filter(Boolean).length}/${geminiTableSuccess.length} successful (${geminiTableSuccess.every(Boolean) ? 'CONSISTENT' : 'INCONSISTENT'})`);
      console.log(`   Gemini MC API: ${geminiMCSuccess.filter(Boolean).length}/${geminiMCSuccess.length} successful (${geminiMCSuccess.every(Boolean) ? 'CONSISTENT' : 'INCONSISTENT'})`);
      
      console.log('\n🎯 FRONTEND PROCESSING CONCLUSION:');
      console.log('=================================');
      
      if (geminiTableSuccess.every(Boolean) && geminiMCSuccess.every(Boolean)) {
        console.log('✅ FRONTEND PROCESSING IS CONSISTENTLY WORKING!');
        console.log('   The issue must be in the frontend rendering/display logic.');
      } else {
        console.log('❌ FRONTEND PROCESSING HAS INTERMITTENT ISSUES!');
        console.log('   Gemini API calls are failing inconsistently.');
      }
    }
  }
}

// Run the multiple runs test
testFrontendMultipleRuns(); 