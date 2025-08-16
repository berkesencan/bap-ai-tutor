require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiLatexGenerator {
  static async generateLatexFromStep1(step1OutputDir = 'step1-output') {
    console.log('🚀 STEP 2: Gemini LaTeX Generation');
    console.log('=====================================');
    
    try {
      // Load Step 1 outputs
      const step1Data = this.loadStep1Outputs(step1OutputDir);
      
      // Send to Gemini for LaTeX generation
      const latexContent = await this.sendToGemini(step1Data);
      
      // Save results
      const results = {
        latexContent,
        contentLength: latexContent.length,
        step1Data: {
          textLength: step1Data.textContent.length,
          htmlLength: step1Data.htmlContent.length,
          fontSizes: step1Data.analysis.fontSizes,
          colors: step1Data.analysis.colors
        }
      };
      
      this.saveStep2Results(results);
      this.displayResults(results);
      
      return results;
      
    } catch (error) {
      console.error('❌ Error in Step 2:', error.message);
      throw error;
    }
  }
  
  static loadStep1Outputs(outputDir) {
    console.log(`📂 Loading Step 1 outputs from: ${outputDir}`);
    
    const textPath = path.join(outputDir, 'extracted-text.txt');
    const htmlPath = path.join(outputDir, 'extracted-html.html');
    const analysisPath = path.join(outputDir, 'analysis-results.json');
    
    if (!fs.existsSync(textPath) || !fs.existsSync(htmlPath) || !fs.existsSync(analysisPath)) {
      throw new Error('Step 1 outputs not found. Please run step1-pdf-extraction.js first.');
    }
    
    const textContent = fs.readFileSync(textPath, 'utf-8');
    const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
    const analysisData = JSON.parse(fs.readFileSync(analysisPath, 'utf-8'));
    
    // Handle the actual structure where data is under 'summary'
    const analysis = analysisData.summary || analysisData;
    
    console.log(`✅ Text content loaded: ${textContent.length} characters`);
    console.log(`✅ HTML content loaded: ${htmlContent.length} characters`);
    console.log(`✅ Analysis loaded: ${analysis.fontSizes.length} font sizes, ${analysis.colors.length} colors`);
    
    return { textContent, htmlContent, analysis };
  }
  
  static async sendToGemini(step1Data) {
    console.log('🤖 Sending content to Gemini 1.5 Flash for LaTeX generation...');
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = this.createGeminiPrompt(step1Data);
    
    console.log(`📝 Prompt length: ${prompt.length} characters`);
    
    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const latexContent = response.text();
      
      console.log(`✅ Gemini generated LaTeX: ${latexContent.length} characters`);
      
      // Clean the LaTeX content (remove markdown code blocks if present)
      const cleanedLatex = this.cleanLatexContent(latexContent);
      
      return cleanedLatex;
      
    } catch (error) {
      console.error('❌ Gemini API error:', error.message);
      throw error;
    }
  }
  
  static createGeminiPrompt(step1Data) {
    return `You are an expert LaTeX document generator. I have extracted content from an academic PDF and need you to generate a perfect LaTeX document that recreates the original formatting.

Here is the EXTRACTED TEXT CONTENT:
================================
${step1Data.textContent}
================================

Here is the EXTRACTED HTML LAYOUT:
=================================
${step1Data.htmlContent}
=================================

FORMATTING ANALYSIS:
- Font sizes found: ${step1Data.analysis.fontSizes.join(', ')}px
- Colors found: ${step1Data.analysis.colors.join(', ')}
- Total elements: ${step1Data.analysis.totalElements}

REQUIREMENTS:
1. Generate a complete LaTeX document that recreates this academic content
2. Use the exact font sizes from the analysis (convert px to LaTeX font commands)
3. Include red text where specified in the HTML (color: #ff0000)
4. Maintain the academic structure: title, problems, sections, honor code
5. Use proper LaTeX packages: geometry, xcolor, amsmath, amsfonts, amssymb, enumitem, fancyhdr
6. Create professional academic formatting with proper spacing
7. Include all mathematical content, tables, and structured elements
8. Make it look exactly like the original academic document

IMPORTANT:
- Return ONLY the LaTeX code, no explanations
- Start with \\documentclass and end with \\end{document}
- Use \\fontsize{X}{Y}\\selectfont for exact font sizes
- Use \\textcolor{red}{text} for red text elements
- Ensure the document compiles without errors

Generate the complete LaTeX document now:`;
  }
  
  static cleanLatexContent(content) {
    console.log('🧹 Cleaning LaTeX content...');
    
    // Remove markdown code blocks if present
    let cleaned = content;
    
    // Remove ```latex and ``` blocks
    cleaned = cleaned.replace(/```latex\s*/g, '');
    cleaned = cleaned.replace(/```\s*$/g, '');
    cleaned = cleaned.replace(/```/g, '');
    
    // Trim whitespace
    cleaned = cleaned.trim();
    
    console.log(`✅ Cleaned LaTeX content: ${cleaned.length} characters`);
    
    return cleaned;
  }
  
  static saveStep2Results(results, outputDir = 'step2-output') {
    console.log(`💾 Saving Step 2 results to: ${outputDir}`);
    
    // Create output directory
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Save LaTeX content
    const latexPath = path.join(outputDir, 'generated-latex.tex');
    fs.writeFileSync(latexPath, results.latexContent);
    
    // Save analysis
    const analysisPath = path.join(outputDir, 'step2-analysis.json');
    fs.writeFileSync(analysisPath, JSON.stringify({
      contentLength: results.contentLength,
      step1Data: results.step1Data,
      timestamp: new Date().toISOString()
    }, null, 2));
    
    console.log(`✅ LaTeX saved to: ${latexPath}`);
    console.log(`✅ Analysis saved to: ${analysisPath}`);
  }
  
  static displayResults(results) {
    console.log('\n📊 STEP 2 RESULTS');
    console.log('==================');
    console.log(`✅ LaTeX content generated: ${results.contentLength} characters`);
    console.log(`📄 Based on text: ${results.step1Data.textLength} chars`);
    console.log(`🎨 Based on HTML: ${results.step1Data.htmlLength} chars`);
    console.log(`🔤 Font sizes: ${results.step1Data.fontSizes.join(', ')}px`);
    console.log(`🎨 Colors: ${results.step1Data.colors.join(', ')}`);
    
    // Show first 300 characters of LaTeX
    console.log('\n📝 LaTeX Preview:');
    console.log('==================');
    console.log(results.latexContent.substring(0, 300) + '...');
    
    console.log('\n✅ Step 2 completed successfully!');
    console.log('Next: Run step3-latex-to-pdf.js to compile the LaTeX to PDF');
  }
}

// Test function
async function testGeminiLatexGeneration() {
  console.log('🧪 Testing Gemini LaTeX Generation');
  console.log('===================================');
  
  try {
    // Check if Step 1 outputs exist
    if (!fs.existsSync('step1-output')) {
      console.log('❌ Step 1 outputs not found. Please run step1-pdf-extraction.js first.');
      return;
    }
    
    // Generate LaTeX using Gemini
    const results = await GeminiLatexGenerator.generateLatexFromStep1();
    
    console.log('\n🎉 Test completed successfully!');
    console.log('Files created in step2-output/');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testGeminiLatexGeneration();
}

module.exports = { GeminiLatexGenerator }; 