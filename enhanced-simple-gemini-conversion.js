require('dotenv').config();
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function enhancedSimpleGeminiConversion() {
  console.log('🚀 Enhanced Simple Gemini HTML+TXT to LaTeX Conversion');
  console.log('======================================================');
  
  try {
    // Read the Step 1 extracted files (much better quality now)
    const txtContent = fs.readFileSync('step1-output/extracted-text.txt', 'utf-8');
    const htmlContent = fs.readFileSync('step1-output/extracted-html.html', 'utf-8');
    
    console.log(`📄 TXT content: ${txtContent.length} characters`);
    console.log(`🎨 HTML content: ${htmlContent.length} characters`);
    
    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    console.log('\n=== PHASE 1: Create LaTeX Template from HTML Format ===');
    
    // PHASE 1: Ask Gemini to create LaTeX that follows the HTML format exactly
    const phase1Prompt = `Here is the complete HTML layout extracted from an academic PDF:

${htmlContent}

Please analyze this HTML layout and create a LaTeX document template that follows this EXACT format:
- Use the same font sizes (21px, 18px, 17px, 15px, 13px, 10px)
- Use the same colors (especially red #ff0000 for important text)
- Follow the same spacing and structure
- Include the same header/footer layout
- Match the academic formatting style exactly

Convert this HTML layout to LaTeX format, keeping the structure identical. Focus on creating a professional academic exam template.`;
    
    console.log('🤖 Phase 1: Sending HTML layout to Gemini for LaTeX template creation...');
    console.log(`📝 Phase 1 prompt length: ${phase1Prompt.length} characters`);
    
    const phase1Result = await model.generateContent(phase1Prompt);
    const phase1Response = await phase1Result.response;
    let latexTemplate = phase1Response.text();
    
    console.log(`✅ Phase 1 response: ${latexTemplate.length} characters`);
    
    // Clean markdown formatting from Phase 1
    latexTemplate = latexTemplate.replace(/```latex\s*/g, '');
    latexTemplate = latexTemplate.replace(/```\s*$/g, '');
    latexTemplate = latexTemplate.replace(/```/g, '');
    latexTemplate = latexTemplate.trim();
    
    console.log('\n=== PHASE 2: Generate New Questions and Replace Content ===');
    
    // PHASE 2: Generate new practice questions based on the original content
    const phase2Prompt = `Here is the original text content from an academic exam:

${txtContent}

Based on this content, generate 5 new practice exam questions that:
1. Are similar in style and difficulty to the original
2. Cover the same topics and concepts
3. Have appropriate point values (20 points each)
4. Follow the same academic format
5. Include clear problem statements and any necessary diagrams/tables

Generate ONLY the question content (not the full LaTeX document). I will insert these into the LaTeX template.

Format the questions as:
Problem 1 (20 points)
[Question content]

Problem 2 (20 points) 
[Question content]

etc.`;
    
    console.log('🤖 Phase 2: Generating new practice questions...');
    console.log(`📝 Phase 2 prompt length: ${phase2Prompt.length} characters`);
    
    const phase2Result = await model.generateContent(phase2Prompt);
    const phase2Response = await phase2Result.response;
    const newQuestions = phase2Response.text();
    
    console.log(`✅ Phase 2 response: ${newQuestions.length} characters`);
    
    console.log('\n=== PHASE 3: Combine Template with New Questions ===');
    
    // PHASE 3: Combine the LaTeX template with new questions
    const phase3Prompt = `Here is the LaTeX template created from the original format:

${latexTemplate}

Here are the new practice questions to insert:

${newQuestions}

Please combine these by:
1. Taking the LaTeX template structure, headers, formatting
2. Replacing the question content with the new practice questions
3. Keeping all the formatting, colors, fonts, spacing exactly the same
4. Making sure the final LaTeX compiles properly

Provide the complete final LaTeX document ready for compilation.`;
    
    console.log('🤖 Phase 3: Combining template with new questions...');
    console.log(`📝 Phase 3 prompt length: ${phase3Prompt.length} characters`);
    
    const phase3Result = await model.generateContent(phase3Prompt);
    const phase3Response = await phase3Result.response;
    let finalLatex = phase3Response.text();
    
    console.log(`✅ Phase 3 response: ${finalLatex.length} characters`);
    
    // Clean markdown formatting from final result
    finalLatex = finalLatex.replace(/```latex\s*/g, '');
    finalLatex = finalLatex.replace(/```\s*$/g, '');
    finalLatex = finalLatex.replace(/```/g, '');
    finalLatex = finalLatex.trim();
    
    // Save all results
    const outputDir = 'enhanced-simple-output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Save phase results for debugging
    fs.writeFileSync(`${outputDir}/phase1-latex-template.tex`, latexTemplate);
    fs.writeFileSync(`${outputDir}/phase2-new-questions.txt`, newQuestions);
    fs.writeFileSync(`${outputDir}/phase3-final-latex.tex`, finalLatex);
    
    console.log(`💾 Phase 1 template saved to: ${outputDir}/phase1-latex-template.tex`);
    console.log(`💾 Phase 2 questions saved to: ${outputDir}/phase2-new-questions.txt`);
    console.log(`💾 Final LaTeX saved to: ${outputDir}/phase3-final-latex.tex`);
    
    // Show preview of final result
    console.log('\n📝 Final LaTeX Preview (first 500 characters):');
    console.log('=' .repeat(50));
    console.log(finalLatex.substring(0, 500) + '...');
    console.log('=' .repeat(50));
    
    console.log('\n✅ Enhanced simple conversion completed!');
    console.log(`📄 Final LaTeX file: ${outputDir}/phase3-final-latex.tex`);
    
    return {
      latexTemplate,
      newQuestions,
      finalLatex,
      finalLatexPath: `${outputDir}/phase3-final-latex.tex`,
      success: true
    };
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  enhancedSimpleGeminiConversion()
    .then(() => {
      console.log('\n🎉 Done! You can now compile the final LaTeX file to PDF.');
      console.log('Next step: node enhanced-simple-pdf-compiler.js');
    })
    .catch(error => {
      console.error('💥 Failed:', error.message);
    });
}

module.exports = { enhancedSimpleGeminiConversion }; 