const fs = require('fs');
const FormData = require('form-data');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testBothScenarios() {
  console.log('🧪 Testing 7-question vs 10-question scenarios...');
  
  try {
    // Check if hw2 file exists
    const hw2Path = 'HW2-2.pdf';
    if (!fs.existsSync(hw2Path)) {
      console.log('❌ HW2-2.pdf not found in project root');
      return;
    }
    
    // Test Scenario 1: 7 questions
    console.log('\n=== SCENARIO 1: 7 QUESTIONS ===');
    await testScenario(hw2Path, 7);
    
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test Scenario 2: 10 questions
    console.log('\n=== SCENARIO 2: 10 QUESTIONS ===');
    await testScenario(hw2Path, 10);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

async function testScenario(hw2Path, numQuestions) {
  console.log(`🎯 Testing ${numQuestions} questions scenario...`);
  
  // Create form data for the API call
  const formData = new FormData();
  formData.append('pdf', fs.createReadStream(hw2Path));
  formData.append('subject', 'Design & Analysis of Algorithms');
  formData.append('numQuestions', numQuestions.toString());
  formData.append('difficulty', 'medium');
  formData.append('instructions', 'Focus on complexity analysis');
  
  console.log(`📤 Uploading with ${numQuestions} questions...`);
  
  const response = await fetch('http://localhost:8000/api/ai/practice-exam', {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const result = await response.json();
  
  if (result.success) {
    console.log(`✅ Backend responded successfully for ${numQuestions} questions!`);
    
    // Check parsedQuestions array
    if (result.data.parsedQuestions && Array.isArray(result.data.parsedQuestions)) {
      console.log(`📊 INTERACTIVE QUESTIONS COUNT: ${result.data.parsedQuestions.length}`);
      console.log(`📝 Requested: ${numQuestions} questions`);
      console.log(`📝 Actual: ${result.data.parsedQuestions.length} questions`);
      
      // Check if we got exactly what we asked for
      if (result.data.parsedQuestions.length === numQuestions) {
        console.log('✅ Count matches request');
      } else {
        console.log(`❌ Count mismatch! Got ${result.data.parsedQuestions.length}, expected ${numQuestions}`);
      }
      
      // Check question format - look for sub-parts
      let hasSubParts = false;
      let wholeProblemCount = 0;
      let subPartCount = 0;
      
      console.log('\n📋 Question Format Analysis:');
      for (let i = 0; i < Math.min(15, result.data.parsedQuestions.length); i++) {
        const q = result.data.parsedQuestions[i];
        const questionStart = q.question.substring(0, 10);
        console.log(`   ${i+1}. ${questionStart}... (${q.points} pts)`);
        
        // Check if this is a sub-part (like Q1a)) or whole problem (like Q1))
        if (questionStart.match(/Q\d+[a-z]\)/)) {
          hasSubParts = true;
          subPartCount++;
        } else if (questionStart.match(/Q\d+\)/)) {
          wholeProblemCount++;
        }
      }
      
      console.log(`\n📊 Question Type Analysis:`);
      console.log(`   🔢 Whole problems: ${wholeProblemCount}`);
      console.log(`   🔤 Sub-parts: ${subPartCount}`);
      console.log(`   📝 Format: ${hasSubParts ? 'Mixed (has sub-parts)' : 'Whole problems only'}`);
      
      // Show what the frontend green circles would display
      console.log('\n🟢 Frontend Green Circles Would Show:');
      for (let i = 0; i < Math.min(10, result.data.parsedQuestions.length); i++) {
        const q = result.data.parsedQuestions[i];
        const questionMatch = q.question.match(/^(Q\d+[a-z]?\))/);
        const circleNumber = questionMatch ? questionMatch[1] : `Q${i+1}`;
        const displayNumber = circleNumber.replace('Q', '').replace(')', '');
        console.log(`   Circle ${i+1}: "${displayNumber}"`);
      }
      
    } else {
      console.log('❌ No parsedQuestions array found in response');
    }
    
  } else {
    console.log(`❌ Backend returned error for ${numQuestions} questions:`, result.error || 'Unknown error');
  }
}

testBothScenarios(); 