const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function frontendProcessingTest() {
  console.log('🔍 FRONTEND PROCESSING TEST');
  console.log('==========================');
  console.log('Testing how frontend processes backend data step by step\n');
  
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
      
      console.log('\n📊 STEP 1: BACKEND DATA VERIFICATION');
      console.log('====================================');
      
      if (result.interactiveQuestions) {
        console.log(`✅ interactiveQuestions count: ${result.interactiveQuestions.length}`);
        
        // Find questions with different content types
        const tableQuestions = result.interactiveQuestions.filter(q => 
          q.question.includes('&') || q.question.includes('|') || q.question.includes('Task')
        );
        
        const codeQuestions = result.interactiveQuestions.filter(q => 
          q.question.includes('MPI_') || q.question.includes('int ') || q.question.includes('printf')
        );
        
        const multipleChoiceQuestions = result.interactiveQuestions.filter(q => 
          q.question.match(/\b[a-d]\)\s+[A-Za-z]/) || q.question.match(/\b[a-d]\.\s+[A-Za-z]/)
        );
        
        console.log(`📊 Questions with tables: ${tableQuestions.length}`);
        console.log(`📊 Questions with code: ${codeQuestions.length}`);
        console.log(`📊 Questions with multiple choice: ${multipleChoiceQuestions.length}`);
        
        // Show examples of each type
        if (tableQuestions.length > 0) {
          console.log('\n📋 TABLE QUESTION EXAMPLE:');
          console.log('==========================');
          console.log(tableQuestions[0].question.substring(0, 200) + '...');
        }
        
        if (codeQuestions.length > 0) {
          console.log('\n📋 CODE QUESTION EXAMPLE:');
          console.log('=========================');
          console.log(codeQuestions[0].question.substring(0, 200) + '...');
        }
        
        if (multipleChoiceQuestions.length > 0) {
          console.log('\n📋 MULTIPLE CHOICE QUESTION EXAMPLE:');
          console.log('====================================');
          console.log(multipleChoiceQuestions[0].question.substring(0, 200) + '...');
        }
      }
      
      console.log('\n📊 STEP 2: FRONTEND DETECTION SIMULATION');
      console.log('========================================');
      
      if (result.interactiveQuestions) {
        const questionsArray = result.interactiveQuestions.map(q => q.question);
        
        console.log(`🎯 Simulating frontend processing for ${questionsArray.length} questions`);
        
        // Simulate the EXACT frontend table detection logic
        let tableDetectionCount = 0;
        let tableDetectionDetails = [];
        
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
            tableDetectionCount++;
            tableDetectionDetails.push({
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
        });
        
        console.log(`📊 Table detection results: ${tableDetectionCount} questions detected`);
        
        if (tableDetectionDetails.length > 0) {
          console.log('\n📋 TABLE DETECTION DETAILS:');
          console.log('===========================');
          tableDetectionDetails.forEach((detail, index) => {
            console.log(`\n${index + 1}. Question ${detail.index}:`);
            console.log(`   Text: "${detail.question}"`);
            console.log(`   Indicators: table=${detail.indicators.table}, task=${detail.indicators.task}, time=${detail.indicators.time}, &=${detail.indicators.ampersand}, |=${detail.indicators.pipe}`);
          });
        }
      }
      
      console.log('\n📊 STEP 3: MULTIPLE CHOICE DETECTION SIMULATION');
      console.log('==============================================');
      
      if (result.interactiveQuestions) {
        const questionsArray = result.interactiveQuestions.map(q => q.question);
        
        // Simulate the EXACT frontend multiple choice detection logic
        let mcDetectionCount = 0;
        let mcDetectionDetails = [];
        
        questionsArray.forEach((question, index) => {
          // Test multiple choice detection (EXACT frontend logic)
          const hasMultipleChoice = question.match(/\b[a-d]\)\s+[A-Za-z]/) || 
                                   question.match(/\b[a-d]\.\s+[A-Za-z]/) ||
                                   question.match(/\b[a-d]\s+[A-Za-z]/);
          
          if (hasMultipleChoice) {
            mcDetectionCount++;
            mcDetectionDetails.push({
              index: index + 1,
              question: question.substring(0, 100) + '...',
              match: hasMultipleChoice[0]
            });
          }
        });
        
        console.log(`📊 Multiple choice detection results: ${mcDetectionCount} questions detected`);
        
        if (mcDetectionDetails.length > 0) {
          console.log('\n📋 MULTIPLE CHOICE DETECTION DETAILS:');
          console.log('=====================================');
          mcDetectionDetails.slice(0, 3).forEach((detail, index) => {
            console.log(`\n${index + 1}. Question ${detail.index}:`);
            console.log(`   Text: "${detail.question}"`);
            console.log(`   Match: "${detail.match}"`);
          });
        }
      }
      
      console.log('\n📊 STEP 4: FRONTEND RENDERING SIMULATION');
      console.log('========================================');
      
      if (result.interactiveQuestions) {
        const questionsArray = result.interactiveQuestions.map(q => q.question);
        
        console.log(`🎯 Simulating frontend rendering for ${questionsArray.length} questions`);
        
        // Simulate what the frontend would do for each question
        let tableQuestions = 0;
        let mcQuestions = 0;
        let regularQuestions = 0;
        
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
          
          if (hasTableIndicators) {
            tableQuestions++;
          } else if (hasMultipleChoice) {
            mcQuestions++;
          } else {
            regularQuestions++;
          }
        });
        
        console.log(`📊 Frontend rendering breakdown:`);
        console.log(`   Table questions: ${tableQuestions} (would be sent to Gemini for table conversion)`);
        console.log(`   Multiple choice questions: ${mcQuestions} (would be grouped by Gemini)`);
        console.log(`   Regular questions: ${regularQuestions} (would be displayed as-is)`);
        
        console.log(`\n📊 Total questions that would be processed: ${tableQuestions + mcQuestions}`);
        console.log(`📊 Total questions that would be displayed as-is: ${regularQuestions}`);
      }
      
      console.log('\n🎯 FRONTEND PROCESSING CONCLUSION:');
      console.log('=================================');
      console.log('This shows exactly how the frontend would process the backend data.');
      console.log('If the numbers look wrong, the issue is in the detection logic.');
      console.log('If the numbers look right, the issue might be in the Gemini API calls.');
      
    } else {
      console.error('❌ API call failed:', response.data);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the frontend processing test
frontendProcessingTest(); 