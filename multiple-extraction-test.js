const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function runExtractionTest(testNumber) {
  console.log(`\n🧪 EXTRACTION TEST #${testNumber}`);
  console.log('='.repeat(50));
  
  try {
    const pdfPath = './midterm-sp24.pdf';
    
    if (!fs.existsSync(pdfPath)) {
      console.error('❌ Test PDF not found:', pdfPath);
      return null;
    }
    
    // Create form data
    const formData = new FormData();
    formData.append('pdf', fs.createReadStream(pdfPath));
    formData.append('subject', 'Computer Science');
    formData.append('numQuestions', '10');
    formData.append('difficulty', 'medium');
    formData.append('includeMultipleChoice', 'true');
    
    const response = await axios.post('http://localhost:8000/api/ai/practice-exam', formData, {
      headers: {
        ...formData.getHeaders(),
      },
      timeout: 60000
    });
    
    if (response.data.success) {
      const result = response.data.data;
      
      if (result.interactiveQuestions) {
        console.log(`✅ interactiveQuestions count: ${result.interactiveQuestions.length}`);
        
        // Show first 3 questions
        result.interactiveQuestions.slice(0, 3).forEach((q, index) => {
          console.log(`   ${index + 1}. [${q.question.length} chars] "${q.question.substring(0, 60)}..."`);
        });
        
        // Check for good content
        const hasGoodContent = result.interactiveQuestions.some(q => 
          q.question.length > 100 || 
          q.question.includes('MPI_') || 
          q.question.includes('int ') ||
          q.question.includes('printf')
        );
        
        const hasTables = result.interactiveQuestions.some(q => 
          q.question.includes('&') || q.question.includes('Task')
        );
        
        const hasCode = result.interactiveQuestions.some(q => 
          q.question.includes('MPI_') || q.question.includes('int ')
        );
        
        console.log(`   Has good content: ${hasGoodContent}`);
        console.log(`   Has tables: ${hasTables}`);
        console.log(`   Has code: ${hasCode}`);
        
        return {
          count: result.interactiveQuestions.length,
          hasGoodContent,
          hasTables,
          hasCode,
          questions: result.interactiveQuestions
        };
      }
    } else {
      console.error('❌ API call failed:', response.data);
      return null;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return null;
  }
}

async function multipleExtractionTest() {
  console.log('🔍 MULTIPLE EXTRACTION TEST');
  console.log('===========================');
  console.log('Testing midterm-sp24.pdf extraction consistency');
  console.log('Running the same test 4 times to check for patterns\n');
  
  const results = [];
  
  // Run the test 4 times
  for (let i = 1; i <= 4; i++) {
    const result = await runExtractionTest(i);
    if (result) {
      results.push(result);
    }
    
    // Wait a bit between tests
    if (i < 4) {
      console.log('\n⏳ Waiting 2 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('\n📊 ANALYSIS OF ALL TESTS');
  console.log('========================');
  
  if (results.length > 0) {
    console.log(`✅ Completed ${results.length} tests`);
    
    // Analyze consistency
    const counts = results.map(r => r.count);
    const uniqueCounts = [...new Set(counts)];
    
    console.log(`📊 Question counts across tests: ${counts.join(', ')}`);
    console.log(`📊 Unique counts: ${uniqueCounts.join(', ')}`);
    
    if (uniqueCounts.length === 1) {
      console.log('✅ CONSISTENT: All tests extracted the same number of questions');
    } else {
      console.log('❌ INCONSISTENT: Different tests extracted different numbers of questions');
    }
    
    // Check content consistency
    const goodContentCount = results.filter(r => r.hasGoodContent).length;
    const tablesCount = results.filter(r => r.hasTables).length;
    const codeCount = results.filter(r => r.hasCode).length;
    
    console.log(`\n📊 Content Analysis:`);
    console.log(`   Tests with good content: ${goodContentCount}/${results.length}`);
    console.log(`   Tests with tables: ${tablesCount}/${results.length}`);
    console.log(`   Tests with code: ${codeCount}/${results.length}`);
    
    // Show detailed comparison
    console.log('\n📋 DETAILED COMPARISON:');
    console.log('=======================');
    
    results.forEach((result, index) => {
      console.log(`\nTest ${index + 1}:`);
      console.log(`   Questions: ${result.count}`);
      console.log(`   Good content: ${result.hasGoodContent}`);
      console.log(`   Tables: ${result.hasTables}`);
      console.log(`   Code: ${result.hasCode}`);
      
      // Show first question from each test
      if (result.questions.length > 0) {
        const firstQ = result.questions[0];
        console.log(`   First question: "${firstQ.question.substring(0, 80)}..."`);
      }
    });
    
    console.log('\n🎯 CONCLUSION:');
    console.log('==============');
    
    if (uniqueCounts.length === 1 && uniqueCounts[0] <= 5) {
      console.log('❌ CONFIRMED: Extraction is consistently poor (≤5 questions)');
      console.log('❌ This suggests a systematic issue with this PDF');
    } else if (uniqueCounts.length > 1) {
      console.log('❌ CONFIRMED: Extraction is inconsistent');
      console.log('❌ This suggests randomness or timing issues');
    } else if (uniqueCounts[0] > 10) {
      console.log('✅ CONFIRMED: Extraction is consistently good');
      console.log('✅ The issue might be elsewhere');
    }
    
  } else {
    console.log('❌ No successful tests completed');
  }
}

// Run the multiple extraction test
multipleExtractionTest(); 