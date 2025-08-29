const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function debugExtractionIssue() {
  console.log('🔍 DEBUGGING PDF EXTRACTION ISSUE');
  console.log('==================================');
  
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
      
      console.log('\n📊 EXTRACTION ANALYSIS:');
      console.log('=======================');
      
      // Check what's in the raw questions text
      if (result.questions) {
        console.log('📄 Raw questions text (first 2000 chars):');
        console.log(result.questions.substring(0, 2000));
        console.log('\n...');
        
        // Search for specific problem content
        console.log('\n🔍 SEARCHING FOR PROBLEM CONTENT:');
        console.log('==================================');
        
        const lines = result.questions.split('\n');
        let problemLines = [];
        
        lines.forEach((line, index) => {
          const trimmedLine = line.trim();
          if (trimmedLine.includes('Problem') || 
              trimmedLine.includes('Q2') || 
              trimmedLine.includes('Task') ||
              trimmedLine.includes('CPU type') ||
              trimmedLine.includes('&')) {
            problemLines.push({ line: trimmedLine, index: index + 1 });
          }
        });
        
        if (problemLines.length > 0) {
          console.log(`✅ Found ${problemLines.length} lines with problem content:`);
          problemLines.forEach(({ line, index }) => {
            console.log(`   Line ${index}: "${line}"`);
          });
        } else {
          console.log('❌ No problem content found in raw text');
        }
      }
      
      // Check interactive questions
      if (result.interactiveQuestions) {
        console.log('\n📊 INTERACTIVE QUESTIONS ANALYSIS:');
        console.log('==================================');
        console.log(`Total interactive questions: ${result.interactiveQuestions.length}`);
        
        // Show all questions
        result.interactiveQuestions.forEach((q, index) => {
          console.log(`\n${index + 1}. Question ${q.id || index + 1}:`);
          console.log(`   Text: "${q.question.substring(0, 100)}..."`);
          console.log(`   Length: ${q.question.length} chars`);
          
          // Check for specific content
          const hasProblem = q.question.includes('Problem');
          const hasQ2 = q.question.includes('Q2');
          const hasTask = q.question.includes('Task');
          const hasCPU = q.question.includes('CPU');
          const hasAmpersand = q.question.includes('&');
          
          if (hasProblem || hasQ2 || hasTask || hasCPU || hasAmpersand) {
            console.log(`   ✅ Contains problem content: Problem=${hasProblem}, Q2=${hasQ2}, Task=${hasTask}, CPU=${hasCPU}, &=${hasAmpersand}`);
          }
        });
      }
      
      // Check parsed questions (for PDF)
      if (result.parsedQuestions) {
        console.log('\n📊 PARSED QUESTIONS ANALYSIS (PDF):');
        console.log('===================================');
        console.log(`Total parsed questions: ${result.parsedQuestions.length}`);
        
        result.parsedQuestions.forEach((q, index) => {
          console.log(`\n${index + 1}. Question ${q.id || index + 1}:`);
          console.log(`   Text: "${q.question.substring(0, 100)}..."`);
          console.log(`   Length: ${q.question.length} chars`);
          
          // Check for specific content
          const hasProblem = q.question.includes('Problem');
          const hasQ2 = q.question.includes('Q2');
          const hasTask = q.question.includes('Task');
          const hasCPU = q.question.includes('CPU');
          const hasAmpersand = q.question.includes('&');
          
          if (hasProblem || hasQ2 || hasTask || hasCPU || hasAmpersand) {
            console.log(`   ✅ Contains problem content: Problem=${hasProblem}, Q2=${hasQ2}, Task=${hasTask}, CPU=${hasCPU}, &=${hasAmpersand}`);
          }
        });
      }
      
    } else {
      console.error('❌ API call failed:', response.data);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
debugExtractionIssue(); 