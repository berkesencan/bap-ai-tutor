// Check the actual frontend display of interactive questions
const puppeteer = require('puppeteer');

const FRONTEND_URL = 'http://localhost:5173';

const checkFrontendDisplay = async () => {
  console.log('🌐 Checking frontend display...');
  
  try {
    const browser = await puppeteer.launch({ 
      headless: false, // Show the browser so we can see what's happening
      defaultViewport: null,
      args: ['--start-maximized']
    });
    
    const page = await browser.newPage();
    
    console.log('📱 Navigating to frontend...');
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle0' });
    
    console.log('⏳ Waiting for page to load...');
    await page.waitForTimeout(5000);
    
    // Look for interactive questions
    console.log('🔍 Looking for interactive questions...');
    
    const interactiveQuestions = await page.evaluate(() => {
      // Look for question containers
      const questions = document.querySelectorAll('.question-container, .question-block, [data-question], .question');
      console.log('Found questions:', questions.length);
      
      const results = [];
      
      questions.forEach((q, index) => {
        const text = q.textContent || q.innerText || '';
        const html = q.innerHTML || '';
        
        const hasTable = text.includes('[TABLE]') || html.includes('<table>') || text.includes('tabular');
        const hasCode = text.includes('[CODE SNIPPET]') || html.includes('<pre>') || text.includes('verbatim');
        const hasDiagram = text.includes('[DIAGRAM]') || text.includes('tikzpicture');
        
        results.push({
          questionNumber: index + 1,
          hasTable,
          hasCode,
          hasDiagram,
          text: text.substring(0, 200),
          html: html.substring(0, 200)
        });
      });
      
      return results;
    });
    
    console.log(`📊 Found ${interactiveQuestions.length} questions in frontend`);
    
    if (interactiveQuestions.length === 0) {
      console.log('❌ No questions found in frontend!');
      console.log('🔍 This could mean:');
      console.log('  1. No exam has been generated yet');
      console.log('  2. Questions are not being displayed');
      console.log('  3. CSS selectors are wrong');
    } else {
      const questionsWithTables = interactiveQuestions.filter(q => q.hasTable).length;
      const questionsWithCode = interactiveQuestions.filter(q => q.hasCode).length;
      const questionsWithDiagrams = interactiveQuestions.filter(q => q.hasDiagram).length;
      
      console.log(`📈 Frontend Analysis:`);
      console.log(`- Total questions: ${interactiveQuestions.length}`);
      console.log(`- Questions with tables: ${questionsWithTables}`);
      console.log(`- Questions with code: ${questionsWithCode}`);
      console.log(`- Questions with diagrams: ${questionsWithDiagrams}`);
      
      if (questionsWithTables > 0 || questionsWithCode > 0 || questionsWithDiagrams > 0) {
        console.log('✅ Frontend IS showing tables/code snippets!');
      } else {
        console.log('❌ Frontend is NOT showing tables/code snippets');
      }
      
      // Show details of questions with content
      const questionsWithContent = interactiveQuestions.filter(q => q.hasTable || q.hasCode || q.hasDiagram);
      if (questionsWithContent.length > 0) {
        console.log('\n🔍 Questions with content:');
        questionsWithContent.forEach(q => {
          console.log(`  Q${q.questionNumber}: Code=${q.hasCode}, Table=${q.hasTable}, Diagram=${q.hasDiagram}`);
          console.log(`    Text: ${q.text}...`);
        });
      }
    }
    
    // Take a screenshot
    await page.screenshot({ path: 'frontend-display.png', fullPage: true });
    console.log('📸 Screenshot saved as frontend-display.png');
    
    // Keep browser open for manual inspection
    console.log('🔍 Browser will stay open for manual inspection...');
    console.log('Press Ctrl+C to close');
    
    // Wait for user to close
    await new Promise(() => {});
    
  } catch (error) {
    console.log('❌ Error checking frontend:', error.message);
  }
};

checkFrontendDisplay().catch(console.error); 