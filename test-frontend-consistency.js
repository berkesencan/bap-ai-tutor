const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testFrontendConsistency() {
  console.log('🔍 TESTING FRONTEND PROCESSING CONSISTENCY');
  console.log('==========================================');
  console.log('Running multiple tests to check consistency\n');
  
  const pdfPath = './midterm-sp24.pdf';
  
  if (!fs.existsSync(pdfPath)) {
    console.error('❌ Test PDF not found:', pdfPath);
    return;
  }
  
  console.log('📄 Using test PDF:', pdfPath);
  
  const results = [];
  
  // Run 3 tests
  for (let i = 1; i <= 3; i++) {
    console.log(`\n🔄 RUN ${i}/3`);
    console.log('==========');
    
    try {
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
        
        if (result.interactiveQuestions) {
          const questionsArray = result.interactiveQuestions.map(q => q.question);
          
          // Count different types
          const tableQuestions = questionsArray.filter(q => 
            q.includes('&') || q.includes('|') || q.includes('Task')
          );
          
          const mcQuestions = questionsArray.filter(q => 
            q.match(/\b[a-d]\)\s+[A-Za-z]/) || q.match(/\b[a-d]\.\s+[A-Za-z]/)
          );
          
          const codeQuestions = questionsArray.filter(q => 
            q.includes('MPI_') || q.includes('int ') || q.includes('printf')
          );
          
          const runResult = {
            run: i,
            totalQuestions: questionsArray.length,
            tableQuestions: tableQuestions.length,
            mcQuestions: mcQuestions.length,
            codeQuestions: codeQuestions.length,
            sampleQuestion: questionsArray[0] ? questionsArray[0].substring(0, 100) + '...' : 'None'
          };
          
          results.push(runResult);
          
          console.log(`✅ Run ${i} results:`);
          console.log(`   Total questions: ${runResult.totalQuestions}`);
          console.log(`   Table questions: ${runResult.tableQuestions}`);
          console.log(`   MC questions: ${runResult.mcQuestions}`);
          console.log(`   Code questions: ${runResult.codeQuestions}`);
          console.log(`   Sample: "${runResult.sampleQuestion}"`);
          
        } else {
          console.log(`❌ Run ${i}: No interactive questions received`);
        }
      } else {
        console.log(`❌ Run ${i}: API call failed`);
      }
      
    } catch (error) {
      console.log(`❌ Run ${i} failed:`, error.message);
    }
    
    // Wait a bit between runs
    if (i < 3) {
      console.log('⏳ Waiting 2 seconds before next run...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('\n📊 CONSISTENCY ANALYSIS');
  console.log('=======================');
  
  if (results.length > 0) {
    console.log('📋 All runs summary:');
    results.forEach(result => {
      console.log(`   Run ${result.run}: ${result.totalQuestions} questions (${result.tableQuestions} tables, ${result.mcQuestions} MC, ${result.codeQuestions} code)`);
    });
    
    const totalQuestions = results.map(r => r.totalQuestions);
    const tableQuestions = results.map(r => r.tableQuestions);
    const mcQuestions = results.map(r => r.mcQuestions);
    
    console.log('\n📊 Consistency check:');
    console.log(`   Total questions: ${Math.min(...totalQuestions)} - ${Math.max(...totalQuestions)} (${totalQuestions.every(v => v === totalQuestions[0]) ? 'CONSISTENT' : 'INCONSISTENT'})`);
    console.log(`   Table questions: ${Math.min(...tableQuestions)} - ${Math.max(...tableQuestions)} (${tableQuestions.every(v => v === tableQuestions[0]) ? 'CONSISTENT' : 'INCONSISTENT'})`);
    console.log(`   MC questions: ${Math.min(...mcQuestions)} - ${Math.max(...mcQuestions)} (${mcQuestions.every(v => v === mcQuestions[0]) ? 'CONSISTENT' : 'INCONSISTENT'})`);
    
    if (totalQuestions.every(v => v === totalQuestions[0])) {
      console.log('\n✅ CONSISTENT: Backend extraction is reliable');
      console.log('   The frontend processing should work consistently');
    } else {
      console.log('\n❌ INCONSISTENT: Backend extraction varies');
      console.log('   This explains why frontend sometimes works and sometimes doesn\'t!');
    }
  }
}

// Run the consistency test
testFrontendConsistency(); 