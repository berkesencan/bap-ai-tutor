require('dotenv').config();
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { execSync } = require('child_process');

async function generateSimpleExam(numQuestions = 5, difficulty = 'medium', subject = '', instructions = '') {
  console.log('🚀 SIMPLE STEP 2.5: Direct LaTeX Generation');
  console.log('==========================================');
  
  try {
    // Load the golden LaTeX format from Step 2
    const goldenLatexPath = 'simple-gemini-output/gemini-generated.tex';
    if (!fs.existsSync(goldenLatexPath)) {
      throw new Error('❌ Step 2 golden LaTeX not found. Run simple-gemini-conversion.js first');
    }
    
    const goldenLatex = fs.readFileSync(goldenLatexPath, 'utf8');
    console.log(`📄 Golden LaTeX loaded: ${goldenLatex.length} characters`);
    
    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Ultra-simple prompt that FORCES exact structure preservation
    let prompt = `${goldenLatex}

Copy this LaTeX exactly. Do not remove any LaTeX structures, tables, code snippets, or circuit diagrams, or any other content like graphs and more. Change the question text content to create new practice questions following the exact same complexity and structure.`;

    if (numQuestions) {
      // Very explicit about the exact number of PROBLEMS (not sub-parts)
      prompt += ` CRITICAL REQUIREMENT: Generate exactly ${numQuestions} PROBLEMS total. This means the highest problem number should be ${numQuestions} (e.g., Problem 1, Problem 2, ..., Problem ${numQuestions}). Each problem can have sub-parts (a, b, c, etc.) but the total number of main PROBLEMS must be exactly ${numQuestions}. Do not count sub-parts when determining if you have generated enough problems.`;
      
      // Clarify the structure
      prompt += ` STRUCTURE CLARIFICATION: If you generate Problem 1 with parts (a), (b), (c) and Problem 2 with parts (a), (b), that counts as 2 problems total, not 5. The sub-parts within each problem are allowed and encouraged, but the main problem numbering should go from 1 to ${numQuestions}.`;
      
      // Update any references to total number of problems
      prompt += ` Update any text that mentions the total number of problems to "${numQuestions} problems".`;
      
      // CRITICAL: Prevent placeholder comments
      prompt += ` IMPORTANT: Generate COMPLETE content for every single problem. Do NOT use placeholder comments, do NOT write things like "(This section needs...)" or "(Add a problem...)" or "(Imagine a DAG here...)". Every problem must have actual, complete questions with specific content.`;
      
      // Add quality maintenance for higher question counts
      if (numQuestions > 6) {
        prompt += ` STRUCTURE REQUIREMENTS: Each problem must maintain the same structural complexity as the original:
- If original problems have sub-parts (a, b, c, etc.), your problems must also have sub-parts
- If original problems have specific point values, maintain similar point distributions
- If original problems have code blocks, include code blocks in your problems
- If original problems have itemized lists, include itemized lists
- If original problems have tables or mathematical expressions, include similar elements
- Maintain the same length and detail level per problem as the original
- Do not create shorter or simpler problems just because there are more of them`;
      }
    }
    
    if (difficulty && difficulty !== 'medium') {
      prompt += ` Make them ${difficulty} difficulty.`;
    }
    
    // if (subject) {
    //   prompt += ` Focus on ${subject}.`;
    // }
    
    if (instructions) {
      prompt += ` ${instructions}.`;
    }
    
    console.log(`🤖 Sending to Gemini...`);
    console.log(`📝 Prompt: "${prompt.substring(goldenLatex.length)}"`);
    
    const result = await model.generateContent(prompt);
    let newExamLatex = result.response.text();
    
    // Clean up markdown code blocks if present
    newExamLatex = newExamLatex.replace(/```latex\n?/g, '');
    newExamLatex = newExamLatex.replace(/```\n?/g, '');
    newExamLatex = newExamLatex.trim();
    
    console.log(`✅ Generated: ${newExamLatex.length} characters`);
    
    // Save the new exam
    const timestamp = Date.now();
    const outputDir = 'step2.5-output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputPath = `${outputDir}/simple-exam-${timestamp}.tex`;
    fs.writeFileSync(outputPath, newExamLatex);
    
    console.log(`💾 Saved: ${outputPath}`);
    
    // Show preview
    console.log(`\n📝 Preview (first 300 chars):`);
    console.log('='.repeat(50));
    console.log(newExamLatex.substring(0, 300));
    console.log('='.repeat(50));
    
    return outputPath;
    
  } catch (error) {
    console.error('❌ Simple Step 2.5 failed:', error.message);
    throw error;
  }
}

// Parse command line arguments
if (require.main === module) {
  const pdfPath = process.argv[2]; // Not used but kept for consistency
  const numQuestions = process.argv[3] ? parseInt(process.argv[3]) : 5;
  const difficulty = process.argv[4] || 'medium';
  const subject = process.argv[5] || '';
  const instructions = process.argv[6] || '';

  console.log(`📋 Parameters: ${numQuestions} questions, ${difficulty} difficulty`);
  if (subject) console.log(`🎯 Subject: ${subject}`);
  if (instructions) console.log(`📝 Instructions: ${instructions}`);

  generateSimpleExam(numQuestions, difficulty, subject, instructions)
    .then(async (outputPath) => {
      console.log(`\n🎉 SUCCESS!`);
      console.log(`📄 Generated: ${outputPath}`);
      
      // Compile to PDF
      const texFileName = outputPath.split('/').pop();
      const pdfFileName = texFileName.replace('.tex', '.pdf');
      const outputDir = outputPath.split('/').slice(0, -1).join('/');
      
      try {
        const compileCommand = `cd "${outputDir}" && /usr/local/texlive/2025basic/bin/universal-darwin/pdflatex -interaction=nonstopmode "${texFileName}"`;
        
        console.log(`🔧 Compiling PDF...`);
        const result = execSync(compileCommand, { encoding: 'utf8' });
        
        const pdfPath = `${outputDir}/${pdfFileName}`;
        if (fs.existsSync(pdfPath)) {
          const pdfStats = fs.statSync(pdfPath);
          console.log(`✅ PDF: ${pdfPath} (${(pdfStats.size / 1024).toFixed(1)}KB)`);
          
          // Open the PDF
          try {
            execSync(`open "${pdfPath}"`);
            console.log(`🚀 PDF opened successfully!`);
          } catch (openError) {
            console.log(`📄 PDF created but couldn't auto-open: ${pdfPath}`);
          }
        } else {
          console.log(`❌ PDF compilation failed - no output file created`);
        }
        
      } catch (error) {
        // Check if PDF was still created despite errors
        const pdfPath = `${outputDir}/${pdfFileName}`;
        if (fs.existsSync(pdfPath)) {
          const pdfStats = fs.statSync(pdfPath);
          console.log(`⚠️  PDF created with warnings: ${pdfPath} (${(pdfStats.size / 1024).toFixed(1)}KB)`);
          
          try {
            execSync(`open "${pdfPath}"`);
            console.log(`🚀 PDF opened successfully!`);
          } catch (openError) {
            console.log(`📄 PDF created but couldn't auto-open: ${pdfPath}`);
          }
        } else {
          console.log(`❌ PDF compilation failed: ${error.message}`);
        }
      }
    })
    .catch((error) => {
      console.error('💥 Failed:', error);
      process.exit(1);
    });
}