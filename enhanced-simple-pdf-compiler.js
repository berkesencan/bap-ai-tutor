const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

async function enhancedSimplePdfCompiler() {
  console.log('🚀 Enhanced Simple PDF Compiler');
  console.log('================================');
  
  try {
    const latexPath = 'enhanced-simple-output/phase3-final-latex.tex';
    
    if (!fs.existsSync(latexPath)) {
      throw new Error('Final LaTeX file not found. Run enhanced-simple-gemini-conversion.js first.');
    }
    
    console.log(`📄 Compiling: ${latexPath}`);
    
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
    console.log('🔧 Compiling LaTeX to PDF...');
    
    try {
      const command = `cd "${outputDir}" && "${pdflatexPath}" -interaction=nonstopmode "${baseName}.tex"`;
      console.log(`🔧 Executing: ${command}`);
      
      const output = execSync(command, { encoding: 'utf-8' });
      console.log('✅ LaTeX compilation successful!');
      
      // Show compilation output for debugging
      console.log('\n📊 Compilation Output:');
      console.log('========================');
      console.log(output);
      
      // Check if PDF was created
      const pdfPath = path.join(outputDir, `${baseName}.pdf`);
      if (fs.existsSync(pdfPath)) {
        const stats = fs.statSync(pdfPath);
        console.log(`✅ PDF created: ${pdfPath}`);
        console.log(`📊 PDF size: ${stats.size} bytes`);
        
        // Show compilation summary
        console.log('\n📊 Final Compilation Summary:');
        console.log('==============================');
        console.log(`📄 LaTeX file: ${latexPath}`);
        console.log(`📄 PDF file: ${pdfPath}`);
        console.log(`📊 PDF size: ${stats.size} bytes`);
        
        // Check if PDF size indicates successful compilation
        if (stats.size > 10000) {
          console.log('✅ PDF size looks good - likely successful compilation');
        } else {
          console.log('⚠️  PDF size is small - may indicate compilation issues');
        }
        
        return {
          success: true,
          pdfPath,
          pdfSize: stats.size,
          latexPath,
          compilationOutput: output
        };
      } else {
        throw new Error('PDF file was not created');
      }
      
    } catch (error) {
      console.error('❌ LaTeX compilation failed');
      console.error('Error output:', error.message);
      
      // Try to show the log file for debugging
      const logPath = path.join(outputDir, `${baseName}.log`);
      if (fs.existsSync(logPath)) {
        console.log('\n📄 LaTeX Log File:');
        console.log('==================');
        const logContent = fs.readFileSync(logPath, 'utf-8');
        console.log(logContent.substring(0, 2000) + '...');
      }
      
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  enhancedSimplePdfCompiler()
    .then((result) => {
      console.log('\n🎉 Enhanced PDF compilation completed successfully!');
      console.log(`📄 Open your PDF: open "${result.pdfPath}"`);
      console.log('\n📋 Summary of all generated files:');
      console.log('- enhanced-simple-output/phase1-latex-template.tex (LaTeX template from HTML)');
      console.log('- enhanced-simple-output/phase2-new-questions.txt (Generated questions)');
      console.log('- enhanced-simple-output/phase3-final-latex.tex (Final combined LaTeX)');
      console.log(`- ${result.pdfPath} (Final compiled PDF)`);
    })
    .catch(error => {
      console.error('💥 Compilation failed:', error.message);
    });
}

module.exports = { enhancedSimplePdfCompiler }; 