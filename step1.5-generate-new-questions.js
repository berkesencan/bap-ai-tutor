require('dotenv').config();
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function generateNewQuestions() {
  console.log('🚀 Step 1.5: Generate New Similar Questions');
  console.log('============================================');
  
  try {
    // Read the extracted text from Step 1
    const originalTextPath = 'step1-output/extracted-text.txt';
    if (!fs.existsSync(originalTextPath)) {
      throw new Error('Step 1 output not found. Please run step1-pdf-extraction.js first.');
    }
    
    const originalText = fs.readFileSync(originalTextPath, 'utf-8');
    console.log(`📄 Original text loaded: ${originalText.length} characters`);
    
    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Create prompt to generate new similar questions
    const prompt = `I have an exam with questions that I want you to analyze and generate NEW similar questions on the SAME topics but with DIFFERENT content.

Here is the original exam text:

${originalText}

Please:
1. Analyze the structure and topics of each question
2. Generate NEW questions on the SAME topics but with DIFFERENT scenarios, numbers, examples
3. Keep the EXACT same structure, formatting, point values, and academic style
4. Keep the same course information, instructions, and honor code
5. Make sure the new questions test the same concepts but are NOT identical

Generate the complete new exam text with the same formatting and structure but with new questions:`;
    
    console.log('🤖 Sending to Gemini 1.5 Flash to generate new questions...');
    console.log(`📝 Prompt length: ${prompt.length} characters`);
    
    // Send to Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const newQuestionsText = response.text();
    
    console.log(`✅ Gemini response: ${newQuestionsText.length} characters`);
    
    // Clean any markdown formatting
    let cleanedText = newQuestionsText;
    cleanedText = cleanedText.replace(/```\w*\s*/g, '');
    cleanedText = cleanedText.replace(/```/g, '');
    cleanedText = cleanedText.trim();
    
    // Create output directory
    const outputDir = 'step1.5-output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Save the new questions text
    const newTextPath = `${outputDir}/new-questions-text.txt`;
    fs.writeFileSync(newTextPath, cleanedText);
    
    console.log(`💾 New questions saved to: ${newTextPath}`);
    
    // Copy the HTML layout from Step 1 (formatting stays the same)
    const originalHtmlPath = 'step1-output/extracted-html.html';
    const newHtmlPath = `${outputDir}/layout-html.html`;
    if (fs.existsSync(originalHtmlPath)) {
      fs.copyFileSync(originalHtmlPath, newHtmlPath);
      console.log(`📋 HTML layout copied to: ${newHtmlPath}`);
    }
    
    // Show preview of new questions
    console.log('\n📝 New Questions Preview (first 800 characters):');
    console.log('=' .repeat(60));
    console.log(cleanedText.substring(0, 800) + '...');
    console.log('=' .repeat(60));
    
    // Create summary
    const summary = {
      originalTextLength: originalText.length,
      newTextLength: cleanedText.length,
      outputFiles: {
        newQuestionsText: newTextPath,
        layoutHtml: newHtmlPath
      },
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync(`${outputDir}/generation-summary.json`, JSON.stringify(summary, null, 2));
    
    console.log('\n✅ Step 1.5 completed successfully!');
    console.log(`📊 Original text: ${originalText.length} characters`);
    console.log(`📊 New questions: ${cleanedText.length} characters`);
    console.log(`📄 Ready for Step 2: Use new questions with original formatting`);
    
    return {
      success: true,
      newTextPath,
      newHtmlPath,
      originalLength: originalText.length,
      newLength: cleanedText.length
    };
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  generateNewQuestions()
    .then(() => {
      console.log('\n🎉 New questions generated! Ready for Step 2.');
    })
    .catch(error => {
      console.error('💥 Failed:', error.message);
    });
}

module.exports = { generateNewQuestions }; 