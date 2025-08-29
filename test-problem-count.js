const fs = require('fs');
const FormData = require('form-data');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testProblemCount() {
  console.log('🧪 Testing Problem Count vs Sub-parts...');
  
  try {
    const hw2Path = 'HW2-2.pdf';
    if (!fs.existsSync(hw2Path)) {
      console.log('❌ HW2-2.pdf not found in project root');
      return;
    }
    
    // Test both scenarios
    await testScenario(hw2Path, 7);
    await new Promise(resolve => setTimeout(resolve, 2000));
    await testScenario(hw2Path, 10);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

async function testScenario(hw2Path, numQuestions) {
  console.log(`\n=== TESTING ${numQuestions} QUESTIONS ===`);
  
  const formData = new FormData();
  formData.append('pdf', fs.createReadStream(hw2Path));
  formData.append('subject', 'Design & Analysis of Algorithms');
  formData.append('numQuestions', numQuestions.toString());
  formData.append('difficulty', 'medium');
  formData.append('instructions', 'Focus on complexity analysis');
  
  const response = await fetch('http://localhost:8000/api/ai/practice-exam', {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const result = await response.json();
  
  if (result.success && result.data.parsedQuestions) {
    const questions = result.data.parsedQuestions;
    
    // Analyze problem numbers
    const problemNumbers = new Set();
    const subParts = [];
    let maxProblemNumber = 0;
    
    questions.forEach(q => {
      const match = q.question.match(/^Q(\d+)([a-z]?)\)/);
      if (match) {
        const problemNum = parseInt(match[1]);
        const subPart = match[2];
        
        problemNumbers.add(problemNum);
        maxProblemNumber = Math.max(maxProblemNumber, problemNum);
        
        if (subPart) {
          subParts.push(`Q${problemNum}${subPart}`);
        } else {
          subParts.push(`Q${problemNum}`);
        }
      }
    });
    
    console.log(`📊 ANALYSIS:`);
    console.log(`   🎯 Requested: ${numQuestions} problems`);
    console.log(`   📚 Unique problems generated: ${problemNumbers.size} (${Array.from(problemNumbers).sort((a,b) => a-b).join(', ')})`);
    console.log(`   🔢 Highest problem number: ${maxProblemNumber}`);
    console.log(`   🟢 Total sub-parts: ${questions.length}`);
    console.log(`   🎨 Green circles will show: ${questions.length} circles`);
    
    // Check success criteria
    console.log(`\n✅ SUCCESS CRITERIA:`);
    
    // Criterion 1: Highest problem number should equal requested
    if (maxProblemNumber === numQuestions) {
      console.log(`   ✅ Problem numbering: CORRECT (highest = ${maxProblemNumber})`);
    } else {
      console.log(`   ❌ Problem numbering: WRONG (highest = ${maxProblemNumber}, expected = ${numQuestions})`);
    }
    
    // Criterion 2: Should have exactly the requested number of unique problems
    if (problemNumbers.size === numQuestions) {
      console.log(`   ✅ Problem count: CORRECT (${problemNumbers.size} unique problems)`);
    } else {
      console.log(`   ❌ Problem count: WRONG (${problemNumbers.size} unique, expected = ${numQuestions})`);
    }
    
    // Criterion 3: Should have sub-parts (more green circles than problems)
    if (questions.length >= numQuestions) {
      console.log(`   ✅ Sub-parts: CORRECT (${questions.length} total >= ${numQuestions} problems)`);
    } else {
      console.log(`   ❌ Sub-parts: WRONG (${questions.length} total < ${numQuestions} problems)`);
    }
    
    // Show first 10 sub-parts
    console.log(`\n📋 First 10 Sub-parts:`);
    for (let i = 0; i < Math.min(10, questions.length); i++) {
      const q = questions[i];
      const match = q.question.match(/^(Q\d+[a-z]?\))/);
      const identifier = match ? match[1] : `Q${i+1}`;
      console.log(`   ${i+1}. ${identifier} (${q.points} pts)`);
    }
    
    // Overall verdict
    const isCorrect = (maxProblemNumber === numQuestions) && (problemNumbers.size === numQuestions);
    console.log(`\n🎯 OVERALL: ${isCorrect ? '✅ SUCCESS' : '❌ NEEDS FIX'}`);
    
  } else {
    console.log('❌ No parsedQuestions found in response');
  }
}

testProblemCount(); 