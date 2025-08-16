const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

async function enhancedPdfCompiler() {
  console.log('🚀 Step 3: Enhanced PDF Compiler for Step 2.5 Output');
  console.log('====================================================');
  
  try {
    const latexPath = 'step2.5-output/latex-with-new-questions.tex';
    
    if (!fs.existsSync(latexPath)) {
      throw new Error('Step 2.5 LaTeX file not found. Run step2.5-replace-questions.js first.');
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
      console.log('\n📊 Compilation Output Summary:');
      console.log('===============================');
      const outputLines = output.split('\n');
      const importantLines = outputLines.filter(line => 
        line.includes('Output written') || 
        line.includes('pages,') || 
        line.includes('bytes') ||
        line.includes('Warning') ||
        line.includes('Error')
      );
      importantLines.forEach(line => console.log(line));
      
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
        
        console.log('\n🎯 SUCCESS! Your perfect workflow is complete:');
        console.log('===============================================');
        console.log('✅ Step 1: PDF extraction (step1-pdf-extraction.js)');
        console.log('✅ Step 1.5: Generate new questions (step1.5-generate-new-questions.js)');
        console.log('✅ Step 2: Simple LaTeX conversion (simple-gemini-conversion.js)');
        console.log('✅ Step 2.5: Replace questions (step2.5-replace-questions.js)');
        console.log('✅ Step 3: PDF compilation (step3-enhanced-pdf-compiler.js)');
        console.log(`\n📄 Final PDF: ${pdfPath}`);
        
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
        console.log('\n📄 LaTeX Log File (last 50 lines):');
        console.log('===================================');
        const logContent = fs.readFileSync(logPath, 'utf-8');
        const logLines = logContent.split('\n');
        const lastLines = logLines.slice(-50);
        lastLines.forEach(line => console.log(line));
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
  enhancedPdfCompiler()
    .then((result) => {
      console.log('\n🎉 Enhanced PDF compilation completed successfully!');
      console.log(`📄 Open your PDF: open "${result.pdfPath}"`);
      console.log('\n🏆 PERFECT WORKFLOW COMPLETED! 🏆');
      console.log('Your approach was brilliant - using the successful simple method');
      console.log('and just replacing the questions worked perfectly!');
    })
    .catch(error => {
      console.error('💥 Compilation failed:', error.message);
    });
}

module.exports = { enhancedPdfCompiler }; 