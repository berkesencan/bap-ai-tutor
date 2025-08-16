require('dotenv').config();
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * STEP 2.5: SIMPLE NEW QUESTIONS
 * 
 * Your simple approach:
 * 1. Take the LaTeX format from Step 2
 * 2. Tell Gemini: "Use this format but generate NEW questions"
 * 3. That's it!
 */

async function generateSimpleNewQuestions() {
  console.log('🚀 STEP 2.5: SIMPLE NEW QUESTIONS GENERATOR');
  console.log('==========================================');
  
  try {
    // Load the golden LaTeX format from Step 2
    const goldenLatexPath = 'simple-gemini-output/gemini-generated.tex';
    if (!fs.existsSync(goldenLatexPath)) {
      throw new Error('❌ Step 2 golden LaTeX not found. Run simple-gemini-conversion.js first');
    }
    
    const goldenLatex = fs.readFileSync(goldenLatexPath, 'utf8');
    console.log(`📄 Golden LaTeX format loaded: ${goldenLatex.length} characters`);
    
    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Simple prompt: Use this format, generate new questions
    const prompt = `Here is a LaTeX exam format:

${goldenLatex}

Please generate a NEW exam using this EXACT LaTeX format and structure, but with COMPLETELY DIFFERENT questions. 

Requirements:
- Keep the exact same LaTeX formatting, packages, and structure
- Keep the same title/header style and academic formatting
- Generate 3-5 TOTALLY NEW problems that are different from the original
- Make the questions challenging and academic-level
- Keep the same point structure and formatting
- Return ONLY the complete LaTeX document

Generate NEW questions now:`;

    console.log(`🤖 Sending simple request to Gemini...`);
    console.log(`📝 Prompt length: ${prompt.length} characters`);
    
    const result = await model.generateContent(prompt);
    let newExamLatex = result.response.text();
    
    // Clean up markdown code blocks if present
    newExamLatex = cleanLatexContent(newExamLatex);
    
    console.log(`✅ New exam generated: ${newExamLatex.length} characters`);
    
    // Save the new exam
    const timestamp = Date.now();
    const outputDir = 'step2.5-output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputPath = `${outputDir}/simple-new-exam-${timestamp}.tex`;
    fs.writeFileSync(outputPath, newExamLatex);
    
    console.log(`💾 Simple new exam saved: ${outputPath}`);
    
    // Show preview
    console.log(`\\n📝 New Exam Preview (first 800 chars):`);
    console.log('='.repeat(60));
    console.log(newExamLatex.substring(0, 800));
    console.log('='.repeat(60));
    
    console.log(`\\n✅ SIMPLE STEP 2.5 COMPLETED!`);
    console.log(`📄 File: ${outputPath}`);
    console.log(`🎯 This exam has COMPLETELY NEW questions!`);
    console.log(`🔧 Next: Compile with pdflatex`);
    
    return outputPath;
    
  } catch (error) {
    console.error('❌ Simple Step 2.5 failed:', error.message);
    throw error;
  }
}

function cleanLatexContent(content) {
  // Remove markdown code blocks
  let cleaned = content.replace(/```latex\n?/g, '');
  cleaned = cleaned.replace(/```\n?/g, '');
  
  // Remove any leading/trailing whitespace
  cleaned = cleaned.trim();
  
  return cleaned;
}

// Run the simple new questions generation
generateSimpleNewQuestions()
  .then((outputPath) => {
    console.log(`\\n🎉 SIMPLE STEP 2.5 SUCCESS!`);
    console.log(`📄 New exam with fresh questions: ${outputPath}`);
    console.log(`🆕 Questions are COMPLETELY DIFFERENT from original!`);
    console.log(`\\n🔧 Next: Compile to PDF`);
  })
  .catch((error) => {
    console.error('💥 Simple Step 2.5 failed:', error);
    process.exit(1);
  }); 