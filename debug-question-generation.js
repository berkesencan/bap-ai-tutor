const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

async function debugQuestionGeneration() {
  console.log('=== DEBUGGING QUESTION GENERATION ===');
  
  const pdfFile = 'midterm-sp24.pdf';
  
  if (!fs.existsSync(pdfFile)) {
    console.log('❌ PDF file not found:', pdfFile);
    return;
  }
  
  try {
    const form = new FormData();
    form.append('subject', 'Parallel Computing Debug Test');
    form.append('questionCount', '3');
    form.append('difficulty', 'medium');
    form.append('generatePDF', 'false'); // Just generate questions, no PDF
    form.append('questionPoints', '[30,35,35]');
    form.append('pdf', fs.createReadStream(pdfFile));
    
    console.log('📡 Requesting question generation only...');
    
    const response = await axios.post('http://localhost:8000/api/ai/practice-exam', form, {
      headers: {
        ...form.getHeaders()
      },
      timeout: 60000
    });
    
    console.log('✅ Response received');
    console.log('📊 Status:', response.status);
    
    if (response.data && response.data.data && response.data.data.questions) {
      const questions = response.data.data.questions;
      console.log('\n📝 GENERATED QUESTIONS:');
      console.log('Type:', typeof questions);
      console.log('Length:', typeof questions === 'string' ? questions.length : 'N/A');
      console.log('\n📄 Content:');
      console.log('='.repeat(80));
      
      if (typeof questions === 'string') {
        console.log(questions);
      } else if (questions.text) {
        console.log(questions.text);
      } else {
        console.log('Questions object:', JSON.stringify(questions, null, 2));
      }
      
      console.log('='.repeat(80));
      
      // Save to file for inspection
      const questionsText = typeof questions === 'string' ? questions : (questions.text || JSON.stringify(questions, null, 2));
      fs.writeFileSync('debug-generated-questions.txt', questionsText);
      console.log('💾 Questions saved to: debug-generated-questions.txt');
      
      // Analyze question structure
      const lines = questionsText.split('\n');
      const problemLines = lines.filter(line => line.includes('Problem') || line.includes('problem'));
      console.log('\n🔍 ANALYSIS:');
      console.log('📊 Total lines:', lines.length);
      console.log('🔢 Problem-related lines:', problemLines.length);
      console.log('📋 Problem lines:', problemLines);
      
      // Check for blank or incomplete problems
      const blankProblems = lines.filter(line => 
        line.includes('intentionally left blank') || 
        line.includes('[This problem would go here]') ||
        line.includes('TODO') ||
        line.includes('placeholder')
      );
      
      if (blankProblems.length > 0) {
        console.log('⚠️ BLANK PROBLEMS DETECTED:');
        blankProblems.forEach(line => console.log('  -', line));
      }
      
    } else {
      console.log('❌ No questions found in response');
      console.log('Response data:', JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Question generation failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the debug
debugQuestionGeneration()
  .then(() => {
    console.log('\n✅ Question generation debug completed');
  })
  .catch(error => {
    console.error('\n💥 Debug failed:', error.message);
  }); 