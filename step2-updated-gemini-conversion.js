require('dotenv').config();
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function updatedGeminiConversion() {
  console.log('🚀 Step 2: Updated Gemini HTML+TXT to LaTeX Conversion');
  console.log('=====================================================');
  
  try {
    // Check if Step 1.5 was run first
    const newTextPath = 'step1.5-output/new-questions-text.txt';
    const layoutHtmlPath = 'step1.5-output/layout-html.html';
    
    if (!fs.existsSync(newTextPath) || !fs.existsSync(layoutHtmlPath)) {
      throw new Error('Step 1.5 output not found. Please run step1.5-generate-new-questions.js first.');
    }
    
    // Read the NEW questions text and original HTML layout
    const newQuestionsText = fs.readFileSync(newTextPath, 'utf-8');
    const originalHtmlLayout = fs.readFileSync(layoutHtmlPath, 'utf-8');
    
    console.log(`📄 New questions text: ${newQuestionsText.length} characters`);
    console.log(`🎨 Original HTML layout: ${originalHtmlLayout.length} characters`);
    
    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Create prompt - use NEW questions with ORIGINAL formatting
    const prompt = `Here is the new exam content with updated questions:

${newQuestionsText}

Here is the original HTML layout for formatting reference:

${originalHtmlLayout}

Can you convert this to LaTeX using the formatting information from the HTML layout?`;
    
    console.log('🤖 Sending NEW questions + original layout to Gemini 1.5 Flash...');
    console.log(`📝 Prompt length: ${prompt.length} characters`);
    
    // Send to Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const latexContent = response.text();
    
    console.log(`✅ Gemini response: ${latexContent.length} characters`);
    
    // Clean any markdown formatting
    let cleanedLatex = latexContent;
    cleanedLatex = cleanedLatex.replace(/```latex\s*/g, '');
    cleanedLatex = cleanedLatex.replace(/```\s*$/g, '');
    cleanedLatex = cleanedLatex.replace(/```/g, '');
    cleanedLatex = cleanedLatex.trim();
    
    // Save the result
    const outputDir = 'step2-updated-output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const latexPath = `${outputDir}/new-exam-latex.tex`;
    fs.writeFileSync(latexPath, cleanedLatex);
    
    console.log(`💾 New exam LaTeX saved to: ${latexPath}`);
    
    // Show preview
    console.log('\n📝 New Exam LaTeX Preview (first 500 characters):');
    console.log('=' .repeat(50));
    console.log(cleanedLatex.substring(0, 500) + '...');
    console.log('=' .repeat(50));
    
    // Create summary
    const summary = {
      newQuestionsLength: newQuestionsText.length,
      htmlLayoutLength: originalHtmlLayout.length,
      latexOutputLength: cleanedLatex.length,
      latexFile: latexPath,
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync(`${outputDir}/conversion-summary.json`, JSON.stringify(summary, null, 2));
    
    console.log('\n✅ Updated conversion completed!');
    console.log(`📄 Generated LaTeX file: ${latexPath}`);
    console.log(`🎯 Ready for Step 3: Compile new exam to PDF`);
    
    return {
      latexContent: cleanedLatex,
      latexPath,
      success: true
    };
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  updatedGeminiConversion()
    .then(() => {
      console.log('\n🎉 Done! You can now compile the new exam LaTeX file to PDF.');
    })
    .catch(error => {
      console.error('💥 Failed:', error.message);
    });
}

module.exports = { updatedGeminiConversion }; 