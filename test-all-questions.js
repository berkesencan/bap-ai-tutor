const fs = require('fs');
const FormData = require('form-data');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testAllQuestions() {
  console.log('🧪 Testing that backend returns ALL questions...');
  
  try {
    // Check if hw2 file exists
    const hw2Path = 'HW2-2.pdf';
    if (!fs.existsSync(hw2Path)) {
      console.log('❌ HW2-2.pdf not found in project root');
      return;
    }
    
    console.log(`✅ Found HW2 PDF: ${hw2Path}`);
    
    // Create form data for the API call
    const formData = new FormData();
    formData.append('pdf', fs.createReadStream(hw2Path));
    formData.append('subject', 'Design & Analysis of Algorithms');
    formData.append('numQuestions', '10'); // This should only affect PDF, not interactive questions
    formData.append('difficulty', 'medium');
    formData.append('instructions', 'Focus on complexity analysis');
    
    console.log('📤 Uploading to backend...');
    
    const response = await fetch('http://localhost:8000/api/ai/practice-exam', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Backend responded successfully!');
      console.log(`📊 Response data keys: ${Object.keys(result.data)}`);
      
      // Check parsedQuestions array
      if (result.data.parsedQuestions && Array.isArray(result.data.parsedQuestions)) {
        console.log(`\n🎯 INTERACTIVE QUESTIONS COUNT: ${result.data.parsedQuestions.length}`);
        console.log(`📝 Expected: ~33 questions (all sub-parts)`);
        console.log(`📝 Actual: ${result.data.parsedQuestions.length} questions`);
        
        if (result.data.parsedQuestions.length >= 30) {
          console.log('✅ SUCCESS! Now showing ALL questions (30+)');
        } else if (result.data.parsedQuestions.length === 10) {
          console.log('❌ ISSUE: Still limited to 10 questions');
        } else {
          console.log(`⚠️  PARTIAL: Got ${result.data.parsedQuestions.length} questions`);
        }
        
        // Show first 15 questions to verify format
        console.log('\n📋 First 15 Questions:');
        for (let i = 0; i < Math.min(15, result.data.parsedQuestions.length); i++) {
          const q = result.data.parsedQuestions[i];
          console.log(`   ${i+1}. ${q.question.substring(0, 80)}... (${q.points} pts)`);
        }
        
        // Show last 5 questions
        if (result.data.parsedQuestions.length > 15) {
          console.log('\n📋 Last 5 Questions:');
          const startIdx = Math.max(0, result.data.parsedQuestions.length - 5);
          for (let i = startIdx; i < result.data.parsedQuestions.length; i++) {
            const q = result.data.parsedQuestions[i];
            console.log(`   ${i+1}. ${q.question.substring(0, 80)}... (${q.points} pts)`);
          }
        }
        
      } else {
        console.log('❌ No parsedQuestions array found in response');
      }
      
    } else {
      console.log('❌ Backend returned error:', result.error || 'Unknown error');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Make sure the backend server is running on port 8000');
    }
  }
}

testAllQuestions(); 