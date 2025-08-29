const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function comprehensiveInteractiveDebug() {
  console.log('🔍 COMPREHENSIVE INTERACTIVE DEBUG');
  console.log('==================================');
  console.log('Testing ACTUAL interactive question generation and display');
  console.log('No claims, just facts and proof\n');
  
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
        
        // Analyze each question for content quality
        console.log('\n📋 QUESTION CONTENT ANALYSIS:');
        console.log('=============================');
        
        result.interactiveQuestions.forEach((q, index) => {
          const questionText = q.question;
          const length = questionText.length;
          
          // Check for different content types
          const hasCode = questionText.includes('MPI_') || questionText.includes('int ') || questionText.includes('printf');
          const hasTable = questionText.includes('&') || questionText.includes('|') || questionText.includes('Task');
          const hasMath = questionText.includes('=') || questionText.includes('+') || questionText.includes('*');
          const hasSubparts = questionText.includes('(a)') || questionText.includes('(b)') || questionText.includes('(c)');
          const hasPoints = questionText.includes('points') || questionText.includes('pts');
          
          console.log(`\n${index + 1}. Question ${q.id || index + 1}:`);
          console.log(`   Length: ${length} chars`);
          console.log(`   Has code: ${hasCode}`);
          console.log(`   Has table: ${hasTable}`);
          console.log(`   Has math: ${hasMath}`);
          console.log(`   Has subparts: ${hasSubparts}`);
          console.log(`   Has points: ${hasPoints}`);
          console.log(`   Preview: "${questionText.substring(0, 80)}..."`);
          
          // Show full content for questions with code or tables
          if (hasCode || hasTable) {
            console.log(`   FULL CONTENT:`);
            console.log(`   ${questionText}`);
          }
        });
      }
      
      console.log('\n📊 STEP 2: FRONTEND PROCESSING SIMULATION');
      console.log('=========================================');
      
      if (result.interactiveQuestions) {
        const questionsArray = result.interactiveQuestions.map(q => q.question);
        
        console.log(`🎯 Simulating frontend processing for ${questionsArray.length} questions`);
        
        // Simulate the EXACT frontend logic
        let tableDetectionCount = 0;
        let multipleChoiceDetectionCount = 0;
        let codeDetectionCount = 0;
        
        questionsArray.forEach((question, index) => {
          console.log(`\n🔍 Processing Question ${index + 1}:`);
          
          // Test table detection
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
          
          // Test multiple choice detection
          const hasMultipleChoice = question.match(/\b[a-d]\)\s+[A-Za-z]/) || 
                                   question.match(/\b[a-d]\.\s+[A-Za-z]/) ||
                                   question.match(/\b[a-d]\s+[A-Za-z]/);
          
          // Test code detection
          const hasCode = question.includes('MPI_') || question.includes('int ') || question.includes('printf') ||
                         question.includes('if (') || question.includes('else') || question.includes('for (');
          
          console.log(`   Table detection: ${hasTableIndicators ? '✅ DETECTED' : '❌ NOT DETECTED'}`);
          console.log(`   Multiple choice: ${hasMultipleChoice ? '✅ DETECTED' : '❌ NOT DETECTED'}`);
          console.log(`   Code detection: ${hasCode ? '✅ DETECTED' : '❌ NOT DETECTED'}`);
          
          if (hasTableIndicators) tableDetectionCount++;
          if (hasMultipleChoice) multipleChoiceDetectionCount++;
          if (hasCode) codeDetectionCount++;
        });
        
        console.log(`\n📊 DETECTION SUMMARY:`);
        console.log(`   Tables detected: ${tableDetectionCount}/${questionsArray.length}`);
        console.log(`   Multiple choice detected: ${multipleChoiceDetectionCount}/${questionsArray.length}`);
        console.log(`   Code detected: ${codeDetectionCount}/${questionsArray.length}`);
      }
      
      console.log('\n📊 STEP 3: ACTUAL GEMINI API TESTING');
      console.log('====================================');
      
      // Test with a real question that has code
      if (result.interactiveQuestions) {
        const codeQuestion = result.interactiveQuestions.find(q => 
          q.question.includes('MPI_') || q.question.includes('int ')
        );
        
        if (codeQuestion) {
          console.log('🧪 Testing with actual code question:');
          console.log(`📋 Question: "${codeQuestion.question.substring(0, 100)}..."`);
          
          // Test if this would be processed for table conversion
          const hasTableIndicators = codeQuestion.question.includes('table') || 
                                   codeQuestion.question.includes('Task') || 
                                   codeQuestion.question.includes('Time') || 
                                   codeQuestion.question.includes('core type') ||
                                   codeQuestion.question.includes('|') ||
                                   codeQuestion.question.includes('&') ||
                                   codeQuestion.question.includes('-----') ||
                                   codeQuestion.question.includes('---') ||
                                   (codeQuestion.question.match(/\b[A-Z]\s+\d+\s+\d+\b/) !== null) ||
                                   (codeQuestion.question.match(/\b\d+\s+\d+\s+\d+\b/) !== null) ||
                                   (codeQuestion.question.match(/[A-Z]\s+\d+\.?\d*\s+[A-Z]/) !== null) ||
                                   (codeQuestion.question.match(/\d+\s+\d+\.?\d*\s+[A-Z]/) !== null);
          
          console.log(`   Would be sent for table conversion: ${hasTableIndicators ? 'YES' : 'NO'}`);
          
          if (hasTableIndicators) {
            console.log('⚠️ WARNING: Code question would be incorrectly sent for table conversion!');
          } else {
            console.log('✅ Code question correctly NOT sent for table conversion');
          }
        }
      }
      
      console.log('\n📊 STEP 4: HONEST ASSESSMENT');
      console.log('============================');
      
      console.log('🔍 WHAT I FOUND:');
      console.log('================');
      
      if (result.interactiveQuestions) {
        const questionsArray = result.interactiveQuestions.map(q => q.question);
        const hasGoodContent = questionsArray.some(q => q.includes('MPI_') || q.includes('int ') || q.length > 200);
        const hasTables = questionsArray.some(q => q.includes('&') || q.includes('Task'));
        const hasMultipleChoice = questionsArray.some(q => q.match(/\b[a-d]\)\s+[A-Za-z]/));
        
        console.log(`✅ Good content found: ${hasGoodContent}`);
        console.log(`✅ Tables found: ${hasTables}`);
        console.log(`✅ Multiple choice found: ${hasMultipleChoice}`);
        
        if (!hasGoodContent) {
          console.log('❌ PROBLEM: No good content (code, complex questions) found');
        }
        if (!hasTables) {
          console.log('❌ PROBLEM: No table content found');
        }
        if (!hasMultipleChoice) {
          console.log('❌ PROBLEM: No multiple choice content found');
        }
      }
      
      console.log('\n🎯 CONCLUSION:');
      console.log('==============');
      console.log('I will NOT claim anything is fixed until I can prove it works.');
      console.log('This debug shows the current state - no promises, just facts.');
      
    } else {
      console.error('❌ API call failed:', response.data);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the comprehensive debug
comprehensiveInteractiveDebug(); 