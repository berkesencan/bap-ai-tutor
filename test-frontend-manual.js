// Manual frontend test - generate exam and check frontend display
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const API_BASE = 'http://localhost:8000';

const generateAndCheck = async () => {
  console.log('🧪 MANUAL FRONTEND TEST');
  console.log('='.repeat(50));
  
  try {
    // Generate an exam
    console.log('📄 Using midterm PDF...');
    const pdfPath = './backend/uploads/1754522304600-midterm-sp24.pdf';
    
    if (!fs.existsSync(pdfPath)) {
      console.log(`❌ PDF not found: ${pdfPath}`);
      return;
    }
    
    const formData = new FormData();
    formData.append('subject', 'Parallel Computing');
    formData.append('numQuestions', '10');
    formData.append('difficulty', 'medium');
    formData.append('generatePDF', 'true');
    formData.append('instructions', '');
    formData.append('questionPoints', JSON.stringify(Array(10).fill(10)));
    formData.append('pdf', fs.createReadStream(pdfPath));
    
    console.log('🚀 Generating exam...');
    
    const response = await axios.post(`${API_BASE}/api/ai/practice-exam`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      timeout: 120000
    });
    
    console.log('✅ Exam generated successfully');
    
    const data = response.data.data;
    
    // Check backend response
    console.log('\n📊 BACKEND ANALYSIS:');
    console.log(`- Interactive questions: ${data.interactiveQuestions?.length || 0}`);
    
    let backendHasContent = false;
    if (data.interactiveQuestions) {
      const hasCode = data.interactiveQuestions.some(q => 
        q.question.includes('[CODE SNIPPET]') || q.question.includes('\\begin{verbatim}')
      );
      const hasTable = data.interactiveQuestions.some(q => 
        q.question.includes('[TABLE]') || q.question.includes('\\begin{tabular}')
      );
      const hasDiagram = data.interactiveQuestions.some(q => 
        q.question.includes('[DIAGRAM]') || q.question.includes('\\begin{tikzpicture}')
      );
      
      backendHasContent = hasCode || hasTable || hasDiagram;
      
      console.log(`- Backend has code snippets: ${hasCode}`);
      console.log(`- Backend has tables: ${hasTable}`);
      console.log(`- Backend has diagrams: ${hasDiagram}`);
      console.log(`- Backend has content: ${backendHasContent}`);
      
      if (backendHasContent) {
        console.log('\n🔍 QUESTIONS WITH CONTENT IN BACKEND:');
        data.interactiveQuestions.forEach((q, index) => {
          const hasCode = q.question.includes('[CODE SNIPPET]') || q.question.includes('\\begin{verbatim}');
          const hasTable = q.question.includes('[TABLE]') || q.question.includes('\\begin{tabular}');
          const hasDiagram = q.question.includes('[DIAGRAM]') || q.question.includes('\\begin{tikzpicture}');
          
          if (hasCode || hasTable || hasDiagram) {
            console.log(`  Q${index + 1}: Code=${hasCode}, Table=${hasTable}, Diagram=${hasDiagram}`);
            console.log(`    Preview: ${q.question.substring(0, 150)}...`);
          }
        });
      }
    }
    
    // Save response for inspection
    fs.writeFileSync('manual-test-response.json', JSON.stringify(data, null, 2));
    console.log('\n💾 Response saved to: manual-test-response.json');
    
    console.log('\n🌐 FRONTEND VERIFICATION INSTRUCTIONS:');
    console.log('1. Open http://localhost:5173 in your browser');
    console.log('2. Go to the AI Tutor tab');
    console.log('3. Generate a practice exam with the same settings:');
    console.log('   - Subject: Parallel Computing');
    console.log('   - Questions: 10');
    console.log('   - Difficulty: medium');
    console.log('   - Upload the midterm PDF');
    console.log('4. After generation, check the interactive questions section');
    console.log('5. Look for:');
    console.log('   - Code snippets in <pre><code> blocks');
    console.log('   - Tables in <table> elements');
    console.log('   - Diagrams in <pre> blocks');
    console.log('6. Open browser console (F12) and look for:');
    console.log('   - "🔍 Enhanced conversion called with text:" messages');
    console.log('   - Any errors in the console');
    
    console.log('\n🔍 MANUAL CHECKLIST:');
    console.log(`Backend has content: ${backendHasContent ? '✅ YES' : '❌ NO'}`);
    console.log('Frontend should show:');
    console.log('  - Code snippets: [Check if you see formatted code blocks]');
    console.log('  - Tables: [Check if you see formatted tables]');
    console.log('  - Diagrams: [Check if you see formatted diagrams]');
    
    console.log('\n📋 REPEAT TEST:');
    console.log('Generate the exam multiple times to see if the inconsistency persists');
    console.log('Sometimes it should show content, sometimes it should not');
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
};

generateAndCheck().catch(console.error); 