require('dotenv').config();
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function simpleGeminiConversion() {
  console.log('🚀 Simple Gemini HTML+TXT to LaTeX Conversion');
  console.log('==============================================');
  
  try {
    // Read the exact files
    const txtContent = fs.readFileSync('step1-output/extracted-text.txt', 'utf-8');
    const htmlContent = fs.readFileSync('step1-output/extracted-html.html', 'utf-8');
    
    console.log(`📄 TXT content: ${txtContent.length} characters`);
    console.log(`🎨 HTML content: ${htmlContent.length} characters`);
    
    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Create simple prompt - exactly like you did manually
    const prompt = `Here is the extracted text content:

${txtContent}

Here is the extracted HTML layout:

${htmlContent}

Can you convert this to LaTeX?`;
    
    console.log('🤖 Sending to Gemini 1.5 Flash...');
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
    const outputDir = 'simple-gemini-output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const latexPath = `${outputDir}/gemini-generated.tex`;
    fs.writeFileSync(latexPath, cleanedLatex);
    
    console.log(`💾 LaTeX saved to: ${latexPath}`);
    
    // Show preview
    console.log('\n📝 LaTeX Preview (first 500 characters):');
    console.log('=' .repeat(50));
    console.log(cleanedLatex.substring(0, 500) + '...');
    console.log('=' .repeat(50));
    
    console.log('\n✅ Simple conversion completed!');
    console.log(`📄 Generated LaTeX file: ${latexPath}`);
    
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
  simpleGeminiConversion()
    .then(() => {
      console.log('\n🎉 Done! You can now compile the LaTeX file to PDF.');
    })
    .catch(error => {
      console.error('💥 Failed:', error.message);
    });
}

module.exports = { simpleGeminiConversion }; 