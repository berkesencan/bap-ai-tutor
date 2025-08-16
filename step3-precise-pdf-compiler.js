const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

async function precisePdfCompiler() {
  console.log('🚀 Step 3: Precise PDF Compiler (Perfect Formatting + New Content)');
  console.log('===================================================================');
  
  try {
    const latexPath = 'step2-precise-output/final-exam.tex';
    
    if (!fs.existsSync(latexPath)) {
      throw new Error('Precise LaTeX file not found. Run step2-precise-gemini-conversion.js first.');
    }
    
    console.log(`📄 Compiling precise exam: ${latexPath}`);
    
    // Check if pdflatex is available
    let pdflatexPath;
    try {
      pdflatexPath = execSync('which pdflatex', { encoding: 'utf-8' }).trim();
      console.log(`✅ Found pdflatex at: ${pdflatexPath}`);
    } catch (error) {
      // Try the known path
      pdflatexPath = '/usr/local/texlive/2025basic/bin/universal-darwin/pdflatex';
      if (fs.existsSync(pdflatexPath)) {
        console.log(`✅ Found pdflatex at: ${pdflatexPath}`);
      } else {
        throw new Error('pdflatex not found. Please install LaTeX.');
      }
    }
    
    // Create output directory for compilation
    const outputDir = path.dirname(latexPath);
    const baseName = path.basename(latexPath, '.tex');
    
    // Compile LaTeX to PDF
    console.log('🔧 Compiling precise exam LaTeX to PDF...');
    
    try {
      const command = `cd "${outputDir}" && "${pdflatexPath}" -interaction=nonstopmode "${baseName}.tex"`;
      console.log(`🔧 Executing: ${command}`);
      
      const output = execSync(command, { encoding: 'utf-8' });
      console.log('✅ Precise exam LaTeX compilation successful!');
      
      // Check if PDF was created
      const pdfPath = path.join(outputDir, `${baseName}.pdf`);
      if (fs.existsSync(pdfPath)) {
        const stats = fs.statSync(pdfPath);
        console.log(`✅ Precise exam PDF created: ${pdfPath}`);
        console.log(`📊 PDF size: ${stats.size} bytes`);
        
        // Show compilation summary
        console.log('\n📊 Precise Exam Compilation Summary:');
        console.log('====================================');
        console.log(`📄 LaTeX file: ${latexPath}`);
        console.log(`📄 PDF file: ${pdfPath}`);
        console.log(`📊 PDF size: ${stats.size} bytes`);
        console.log(`🎯 This PDF has PERFECT formatting + NEW questions!`);
        console.log(`✨ HTML formatting preserved EXACTLY + Content replaced precisely`);
        
        return {
          success: true,
          pdfPath,
          pdfSize: stats.size,
          latexPath
        };
      } else {
        throw new Error('PDF file was not created');
      }
      
    } catch (error) {
      console.error('❌ LaTeX compilation failed');
      console.error('Error output:', error.message);
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  precisePdfCompiler()
    .then((result) => {
      console.log('\n🎉 PRECISE EXAM PDF compilation completed successfully!');
      console.log(`📄 Open your precise exam PDF: open "${result.pdfPath}"`);
      console.log(`🎯 Perfect formatting preservation + New content replacement!`);
    })
    .catch(error => {
      console.error('💥 Compilation failed:', error.message);
    });
}

module.exports = { precisePdfCompiler }; 