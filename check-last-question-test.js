const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function checkLastQuestionTest() {
  console.log('🔍 CHECKING LAST QUESTION NUMBER');
  console.log('================================');
  console.log('Verifying extraction completeness by checking last question number\n');
  
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
      console.log('======================');
      
      if (result.interactiveQuestions) {
        console.log(`✅ interactiveQuestions count: ${result.interactiveQuestions.length}`);
        
        // Find all question numbers
        const questionNumbers = [];
        const lastQuestions = [];
        
        result.interactiveQuestions.forEach((q, index) => {
          // Extract question number from text
          const questionMatch = q.question.match(/^Q(\d+)/);
          if (questionMatch) {
            const questionNum = parseInt(questionMatch[1]);
            questionNumbers.push(questionNum);
            
            // Store last question of each number
            if (index === result.interactiveQuestions.length - 1 || 
                (index < result.interactiveQuestions.length - 1 && 
                 !result.interactiveQuestions[index + 1].question.match(/^Q(\d+)/) ||
                 parseInt(result.interactiveQuestions[index + 1].question.match(/^Q(\d+)/)?.[1] || 0) > questionNum)) {
              lastQuestions.push({
                number: questionNum,
                text: q.question.substring(0, 100) + '...',
                fullText: q.question
              });
            }
          }
        });
        
        console.log(`📊 Question numbers found: ${questionNumbers.join(', ')}`);
        console.log(`📊 Unique question numbers: ${[...new Set(questionNumbers)].join(', ')}`);
        console.log(`📊 Highest question number: ${Math.max(...questionNumbers)}`);
        
        // Check if we have Q10 (since we requested 10 questions)
        const hasQ10 = questionNumbers.includes(10);
        console.log(`📊 Has Q10: ${hasQ10 ? '✅ YES' : '❌ NO'}`);
        
        // Show last questions
        console.log('\n📋 LAST QUESTIONS BY NUMBER:');
        console.log('============================');
        lastQuestions.forEach((lastQ, index) => {
          console.log(`\nQ${lastQ.number} (last question):`);
          console.log(`   Text: "${lastQ.text}"`);
          console.log(`   Length: ${lastQ.fullText.length} chars`);
          
          // Check for specific content in last questions
          const hasCode = lastQ.fullText.includes('MPI_') || lastQ.fullText.includes('int ') || lastQ.fullText.includes('printf');
          const hasTable = lastQ.fullText.includes('&') || lastQ.fullText.includes('|') || lastQ.fullText.includes('Task');
          const hasSubparts = lastQ.fullText.includes('(a)') || lastQ.fullText.includes('(b)') || lastQ.fullText.includes('(c)');
          
          console.log(`   Has code: ${hasCode}`);
          console.log(`   Has table: ${hasTable}`);
          console.log(`   Has subparts: ${hasSubparts}`);
        });
        
        // Check if extraction is complete
        console.log('\n🎯 EXTRACTION COMPLETENESS CHECK:');
        console.log('================================');
        
        if (hasQ10) {
          console.log('✅ EXTRACTION IS COMPLETE: Found Q10 as requested');
          console.log('✅ The backend is extracting the full range of questions');
        } else {
          console.log('❌ EXTRACTION IS INCOMPLETE: Missing Q10');
          console.log('❌ The backend is not extracting the full range');
        }
        
        // Check content quality of last questions
        const lastQuestionsWithContent = lastQuestions.filter(q => 
          q.fullText.length > 50 || 
          q.fullText.includes('MPI_') || 
          q.fullText.includes('&') ||
          q.fullText.includes('(a)')
        );
        
        console.log(`\n📊 Last questions with good content: ${lastQuestionsWithContent.length}/${lastQuestions.length}`);
        
        if (lastQuestionsWithContent.length === lastQuestions.length) {
          console.log('✅ All last questions have good content');
        } else {
          console.log('❌ Some last questions have poor content');
        }
        
        // Show full content of Q10 if it exists
        if (hasQ10) {
          const q10Question = result.interactiveQuestions.find(q => q.question.match(/^Q10/));
          if (q10Question) {
            console.log('\n📋 FULL Q10 CONTENT:');
            console.log('===================');
            console.log(q10Question.question);
          }
        }
        
      }
      
    } else {
      console.error('❌ API call failed:', response.data);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the last question test
checkLastQuestionTest(); 