require('dotenv').config();
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function preciseGeminiConversion() {
  console.log('🚀 Step 2: Precise Gemini Conversion (HTML→LaTeX, then Content Replacement)');
  console.log('==============================================================================');
  
  try {
    // Check if Step 1.5 was run first
    const newTextPath = 'step1.5-output/new-questions-text.txt';
    const layoutHtmlPath = 'step1.5-output/layout-html.html';
    const originalTextPath = 'step1-output/extracted-text.txt';
    
    if (!fs.existsSync(newTextPath) || !fs.existsSync(layoutHtmlPath) || !fs.existsSync(originalTextPath)) {
      throw new Error('Required files not found. Please run step1-pdf-extraction.js and step1.5-generate-new-questions.js first.');
    }
    
    // Read all required files
    const newQuestionsText = fs.readFileSync(newTextPath, 'utf-8');
    const originalHtmlLayout = fs.readFileSync(layoutHtmlPath, 'utf-8');
    const originalText = fs.readFileSync(originalTextPath, 'utf-8');
    
    console.log(`📄 New questions text: ${newQuestionsText.length} characters`);
    console.log(`🎨 Original HTML layout: ${originalHtmlLayout.length} characters`);
    console.log(`📄 Original text: ${originalText.length} characters`);
    
    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // STEP 2A: Generate LaTeX that follows HTML formatting exactly
    console.log('\n🎯 STEP 2A: Generate LaTeX following HTML formatting exactly...');
    const formatPrompt = `I need you to convert this HTML layout to LaTeX, following the formatting EXACTLY.

Here is the original text content for reference:
${originalText}

Here is the HTML layout that shows the exact formatting:
${originalHtmlLayout}

Please convert this to LaTeX following the HTML formatting EXACTLY:
- Use the exact font sizes shown in the HTML
- Follow the positioning and spacing
- Preserve all colors (especially red text)
- Keep the exact structure and layout

Generate LaTeX that matches this formatting precisely:`;
    
    console.log(`📝 Format prompt length: ${formatPrompt.length} characters`);
    
    const formatResult = await model.generateContent(formatPrompt);
    const formatResponse = await formatResult.response;
    let baseLatex = formatResponse.text();
    
    // Clean markdown formatting
    baseLatex = baseLatex.replace(/```latex\s*/g, '');
    baseLatex = baseLatex.replace(/```\s*$/g, '');
    baseLatex = baseLatex.replace(/```/g, '');
    baseLatex = baseLatex.trim();
    
    console.log(`✅ Base LaTeX generated: ${baseLatex.length} characters`);
    
    // STEP 2B: Replace content with new questions
    console.log('\n🎯 STEP 2B: Replace content with new questions...');
    const contentPrompt = `I have LaTeX code with the correct formatting, but I need to replace the content with new questions.

Here is the LaTeX with correct formatting:
${baseLatex}

Here is the new content that should replace the old content:
${newQuestionsText}

Please:
1. Keep the EXACT same LaTeX formatting, packages, and structure
2. Replace ONLY the content (questions, text) with the new content
3. Do NOT change any formatting commands, font sizes, colors, or layout
4. Preserve all LaTeX structure and styling

Generate the final LaTeX with new content but same formatting:`;
    
    console.log(`📝 Content replacement prompt length: ${contentPrompt.length} characters`);
    
    const contentResult = await model.generateContent(contentPrompt);
    const contentResponse = await contentResult.response;
    let finalLatex = contentResponse.text();
    
    // Clean markdown formatting
    finalLatex = finalLatex.replace(/```latex\s*/g, '');
    finalLatex = finalLatex.replace(/```\s*$/g, '');
    finalLatex = finalLatex.replace(/```/g, '');
    finalLatex = finalLatex.trim();
    
    console.log(`✅ Final LaTeX generated: ${finalLatex.length} characters`);
    
    // Save the results
    const outputDir = 'step2-precise-output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Save both versions for comparison
    const baseLatexPath = `${outputDir}/base-formatting.tex`;
    const finalLatexPath = `${outputDir}/final-exam.tex`;
    
    fs.writeFileSync(baseLatexPath, baseLatex);
    fs.writeFileSync(finalLatexPath, finalLatex);
    
    console.log(`💾 Base LaTeX saved to: ${baseLatexPath}`);
    console.log(`💾 Final LaTeX saved to: ${finalLatexPath}`);
    
    // Show preview
    console.log('\n📝 Final LaTeX Preview (first 500 characters):');
    console.log('=' .repeat(50));
    console.log(finalLatex.substring(0, 500) + '...');
    console.log('=' .repeat(50));
    
    // Create summary
    const summary = {
      step2A: {
        formatPromptLength: formatPrompt.length,
        baseLatexLength: baseLatex.length
      },
      step2B: {
        contentPromptLength: contentPrompt.length,
        finalLatexLength: finalLatex.length
      },
      outputFiles: {
        baseLatex: baseLatexPath,
        finalLatex: finalLatexPath
      },
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync(`${outputDir}/conversion-summary.json`, JSON.stringify(summary, null, 2));
    
    console.log('\n✅ Precise conversion completed!');
    console.log(`📄 Final LaTeX file: ${finalLatexPath}`);
    console.log(`🎯 Ready for Step 3: Compile precise exam to PDF`);
    
    return {
      baseLatex,
      finalLatex,
      finalLatexPath,
      success: true
    };
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  preciseGeminiConversion()
    .then(() => {
      console.log('\n🎉 Done! Precise LaTeX with perfect formatting and new content ready.');
    })
    .catch(error => {
      console.error('💥 Failed:', error.message);
    });
}

module.exports = { preciseGeminiConversion }; 