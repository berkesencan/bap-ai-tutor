const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function debugHW2Content() {
  console.log('🔍 DEBUGGING HW2-2.PDF CONTENT EXTRACTION');
  console.log('=========================================');
  
  try {
    // Step 1: Check if HW2-2.pdf exists
    console.log('\n📄 STEP 1: Checking HW2-2.pdf file...');
    const pdfPath = 'HW2-2.pdf';
    
    if (!fs.existsSync(pdfPath)) {
      console.log('❌ HW2-2.pdf not found in current directory');
      console.log('📂 Files in current directory:');
      fs.readdirSync('.').filter(f => f.endsWith('.pdf')).forEach(file => {
        console.log(`   - ${file}`);
      });
      return;
    }
    
    const fileSize = fs.statSync(pdfPath).size;
    console.log(`✅ HW2-2.pdf found: ${(fileSize / 1024).toFixed(1)}KB`);
    
    // Step 2: Upload and process with backend
    console.log('\n📤 STEP 2: Uploading to backend for extraction...');
    
    const formData = new FormData();
    formData.append('subject', 'Computer Science');
    formData.append('numQuestions', '20'); // Request more questions to see all content
    formData.append('difficulty', 'medium');
    formData.append('generatePDF', 'true');
    formData.append('instructions', '');
    formData.append('pdf', fs.createReadStream(pdfPath));
    
    const response = await axios.post('http://localhost:8000/api/ai/practice-exam', formData, {
      headers: formData.getHeaders(),
      timeout: 120000
    });
    
    if (!response.data.success) {
      console.log('❌ Backend processing failed:', response.data.error);
      return;
    }
    
    const result = response.data.data;
    console.log('✅ Backend processing successful');
    
    // Step 3: Analyze all extracted content
    console.log('\n📊 STEP 3: Analyzing extracted content...');
    
    console.log('Raw questions text length:', result.questions?.length || 0);
    console.log('Interactive questions count:', result.interactiveQuestions?.length || 0);
    console.log('Parsed questions count:', result.parsedQuestions?.length || 0);
    
    // Step 4: Show raw text content
    console.log('\n📝 STEP 4: Raw text content from backend:');
    console.log('='.repeat(80));
    console.log(result.questions || 'No raw questions text');
    console.log('='.repeat(80));
    
    // Step 5: Show structured interactive questions
    console.log('\n🎯 STEP 5: Interactive questions (ALL extracted):');
    if (result.interactiveQuestions && result.interactiveQuestions.length > 0) {
      result.interactiveQuestions.forEach((q, i) => {
        console.log(`\nQ${i + 1} (ID: ${q.id}, Points: ${q.points}):`);
        console.log(`"${q.question}"`);
        console.log('-'.repeat(40));
      });
    } else {
      console.log('No interactive questions found');
    }
    
    // Step 6: Show parsed questions (limited)
    console.log('\n📄 STEP 6: Parsed questions (limited for PDF):');
    if (result.parsedQuestions && result.parsedQuestions.length > 0) {
      result.parsedQuestions.forEach((q, i) => {
        console.log(`\nParsed Q${i + 1} (ID: ${q.id}, Points: ${q.points}):`);
        console.log(`"${q.question}"`);
        console.log('-'.repeat(40));
      });
    } else {
      console.log('No parsed questions found');
    }
    
    // Step 7: Check for mathematical content
    console.log('\n🔢 STEP 7: Checking for mathematical content...');
    const allQuestions = result.interactiveQuestions || result.parsedQuestions || [];
    
    const mathKeywords = ['f(n)', 'g(n)', 'T(n)', 'O(', 'Θ(', 'Ω(', 'big-O', 'algorithm', 'complexity', '(a)', '(b)', '(c)', '(d)', '='];
    
    const mathQuestions = allQuestions.filter(q => 
      mathKeywords.some(keyword => q.question.toLowerCase().includes(keyword.toLowerCase()))
    );
    
    console.log(`Mathematical questions found: ${mathQuestions.length}/${allQuestions.length}`);
    
    if (mathQuestions.length > 0) {
      console.log('Mathematical questions:');
      mathQuestions.forEach((q, i) => {
        console.log(`   Math Q${i + 1}: "${q.question.substring(0, 100)}..."`);
      });
    }
    
    // Step 8: Check for function analysis content
    console.log('\n📈 STEP 8: Checking for function analysis content...');
    const functionQuestions = allQuestions.filter(q => 
      q.question.includes('f(n)') && q.question.includes('g(n)')
    );
    
    console.log(`Function analysis questions: ${functionQuestions.length}`);
    if (functionQuestions.length > 0) {
      functionQuestions.forEach((q, i) => {
        console.log(`   Function Q${i + 1}: "${q.question}"`);
      });
    }
    
    // Step 9: Final summary
    console.log('\n📋 STEP 9: Summary...');
    console.log('='.repeat(60));
    console.log('CONTENT ANALYSIS:');
    console.log(`- Total questions extracted: ${allQuestions.length}`);
    console.log(`- Mathematical content: ${mathQuestions.length} questions`);
    console.log(`- Function analysis: ${functionQuestions.length} questions`);
    console.log(`- Raw text length: ${result.questions?.length || 0} characters`);
    console.log('\nCONTENT PREVIEW:');
    if (allQuestions.length > 0) {
      console.log(`First question: "${allQuestions[0].question.substring(0, 150)}..."`);
      if (allQuestions.length > 1) {
        console.log(`Second question: "${allQuestions[1].question.substring(0, 150)}..."`);
      }
    }
    
    // Step 10: Compare with expected content
    console.log('\n🎯 STEP 10: Comparison with expected content...');
    console.log('Expected (from screenshots): Mathematical subparts like "(b) f(n) = n^3, g(n) = 2^n"');
    console.log('Actual (from backend):', allQuestions.length > 0 ? 
      allQuestions[0].question.substring(0, 100) + '...' : 'No content');
    
    const hasExpectedContent = allQuestions.some(q => 
      q.question.includes('f(n)') && q.question.includes('g(n)') && 
      (q.question.includes('n^3') || q.question.includes('2^n'))
    );
    
    console.log(`Has expected mathematical content: ${hasExpectedContent ? '✅ YES' : '❌ NO'}`);
    
    if (!hasExpectedContent) {
      console.log('\n⚠️ ISSUE IDENTIFIED: Backend extracted different content than expected');
      console.log('This suggests either:');
      console.log('1. Different PDF version is being processed');
      console.log('2. Backend extraction is not working correctly for this PDF');
      console.log('3. Caching issue with previous extraction');
    }
    
  } catch (error) {
    console.error('❌ Debug test failed:', error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the debug test
if (require.main === module) {
  debugHW2Content()
    .then(() => {
      console.log('\n🎉 DEBUG TEST COMPLETE');
    })
    .catch(error => {
      console.error('Debug test execution failed:', error);
    });
}

module.exports = { debugHW2Content }; 