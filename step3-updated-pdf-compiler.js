const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

async function updatedPdfCompiler() {
  console.log('🚀 Step 3: Updated PDF Compiler (New Exam)');
  console.log('============================================');
  
  try {
    const latexPath = 'step2-updated-output/new-exam-latex.tex';
    
    if (!fs.existsSync(latexPath)) {
      throw new Error('Updated LaTeX file not found. Run step2-updated-gemini-conversion.js first.');
    }
    
    console.log(`📄 Compiling new exam: ${latexPath}`);
    
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
    console.log('🔧 Compiling new exam LaTeX to PDF...');
    
    try {
      const command = `cd "${outputDir}" && "${pdflatexPath}" -interaction=nonstopmode "${baseName}.tex"`;
      console.log(`🔧 Executing: ${command}`);
      
      const output = execSync(command, { encoding: 'utf-8' });
      console.log('✅ New exam LaTeX compilation successful!');
      
      // Check if PDF was created
      const pdfPath = path.join(outputDir, `${baseName}.pdf`);
      if (fs.existsSync(pdfPath)) {
        const stats = fs.statSync(pdfPath);
        console.log(`✅ New exam PDF created: ${pdfPath}`);
        console.log(`📊 PDF size: ${stats.size} bytes`);
        
        // Show compilation summary
        console.log('\n📊 New Exam Compilation Summary:');
        console.log('=================================');
        console.log(`📄 LaTeX file: ${latexPath}`);
        console.log(`📄 PDF file: ${pdfPath}`);
        console.log(`📊 PDF size: ${stats.size} bytes`);
        console.log(`🎯 This PDF contains NEW questions on the SAME topics!`);
        
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
  updatedPdfCompiler()
    .then((result) => {
      console.log('\n🎉 NEW EXAM PDF compilation completed successfully!');
      console.log(`📄 Open your new exam PDF: open "${result.pdfPath}"`);
      console.log(`🎯 This exam has NEW questions on the same topics with the same formatting!`);
    })
    .catch(error => {
      console.error('💥 Compilation failed:', error.message);
    });
}

module.exports = { updatedPdfCompiler }; 