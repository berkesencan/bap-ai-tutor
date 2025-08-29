const fs = require('fs');
const FormData = require('form-data');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testFixedAPI() {
  console.log('🧪 Testing Fixed API with HW2...');
  
  try {
    // Check if hw2 file exists
    const hw2Path = 'HW2-2.pdf';
    if (!fs.existsSync(hw2Path)) {
      console.log('❌ HW2-2.pdf not found in project root');
      return;
    }
    
    console.log(`✅ Found HW2 PDF: ${hw2Path}`);
    console.log(`📄 Size: ${(fs.statSync(hw2Path).size / 1024).toFixed(1)}KB`);
    
    // Create form data for the API call
    const formData = new FormData();
    formData.append('pdf', fs.createReadStream(hw2Path));
    formData.append('subject', 'Design & Analysis of Algorithms');
    formData.append('numQuestions', '10');
    formData.append('difficulty', 'medium');
    formData.append('generatePDF', 'true');
    formData.append('instructions', 'Focus on complexity analysis and algorithms');
    formData.append('questionPoints', JSON.stringify([10, 8, 10, 8, 8, 6, 6, 10, 8, 6]));
    
    console.log('\n🚀 Sending request to API...');
    console.log('Parameters:');
    console.log('- Subject: Design & Analysis of Algorithms');
    console.log('- Questions: 10');
    console.log('- Difficulty: medium');
    console.log('- Instructions: Focus on complexity analysis and algorithms');
    
    const response = await fetch('http://localhost:8000/api/ai/practice-exam', {
      method: 'POST',
      body: formData,
      headers: {
        ...formData.getHeaders()
      }
    });
    
    if (!response.ok) {
      console.log(`❌ API request failed: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.log('Error response:', errorText);
      return;
    }
    
    const result = await response.json();
    console.log('\n✅ API request successful!');
    
    if (result.success) {
      console.log('\n📊 RESPONSE DATA:');
      console.log(`Success: ${result.success}`);
      console.log(`Subject: ${result.data.subject}`);
      console.log(`Difficulty: ${result.data.difficulty}`);
      console.log(`PDF Path: ${result.data.pdfPath}`);
      console.log(`Question Points: [${result.data.questionPoints}]`);
      
      if (result.data.parsedQuestions) {
        console.log(`\n📝 PARSED QUESTIONS (${result.data.parsedQuestions.length} total):`);
        
        result.data.parsedQuestions.slice(0, 15).forEach((q, index) => {
          console.log(`${index + 1}. ID:${q.id} [${q.points}pts] ${q.question.substring(0, 70)}...`);
        });
        
        if (result.data.parsedQuestions.length > 15) {
          console.log(`... and ${result.data.parsedQuestions.length - 15} more questions`);
        }
        
        console.log('\n🎯 CHECKING FOR PROPER Q1a), Q1b) FORMAT:');
        const expectedFormats = [
          'Q1a)', 'Q1b)', 'Q1c)', 'Q1d)', 'Q1e)',
          'Q2)', 
          'Q3a)', 'Q3b)', 'Q3c)', 'Q3d)',
          'Q4a)', 'Q4b)',
          'Q5a)', 'Q5b)', 'Q5c)'
        ];
        
        let correctFormatCount = 0;
        result.data.parsedQuestions.slice(0, 15).forEach((q, index) => {
          const hasCorrectFormat = expectedFormats.some(format => q.question.startsWith(format));
          if (hasCorrectFormat) {
            correctFormatCount++;
            console.log(`✅ ${q.question.split(' ')[0]} - Correct format`);
          } else {
            console.log(`❌ ${q.question.substring(0, 20)}... - Incorrect format`);
          }
        });
        
        console.log(`\n📊 FORMAT ANALYSIS:`);
        console.log(`Questions with Q1a), Q1b) format: ${correctFormatCount}/15`);
        console.log(`Total questions extracted: ${result.data.parsedQuestions.length}`);
        
        if (correctFormatCount >= 10) {
          console.log('\n🎉 SUCCESS! Backend extraction is working correctly!');
          console.log('Questions are properly formatted as Q1a), Q1b), Q2), Q3a), etc.');
          console.log('This should now display correctly in the frontend with proper numbering.');
        } else {
          console.log('\n❌ STILL BROKEN! Questions are not in the expected Q1a), Q1b) format.');
          console.log('The backend extraction logic still needs more work.');
        }
        
      } else {
        console.log('\n❌ No parsedQuestions in response!');
        console.log('Raw questions:', result.data.questions ? result.data.questions.substring(0, 200) + '...' : 'None');
      }
      
    } else {
      console.log('\n❌ API returned success: false');
      console.log('Error:', result.error || 'Unknown error');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Make sure the backend server is running on port 8000');
    }
  }
}

testFixedAPI(); 