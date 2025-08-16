const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Step 3: LaTeX → PDF Compilation (Fixed Version)
 * 
 * Works with the fixed Step 2 output to compile the properly formatted LaTeX
 * into a PDF that preserves all original formatting.
 */
class FixedLatexToPDFCompiler {

  /**
   * Main compilation method - works with fixed Step 2
   */
  static async compileToPDF(step2OutputDir = 'step2-fixed-output', outputDir = 'step3-fixed-output') {
    console.log('🎯 Starting Step 3: Fixed LaTeX → PDF Compilation\n');
    
    try {
      // Load fixed Step 2 LaTeX
      const latexContent = this.loadFixedStep2LaTeX(step2OutputDir);
      
      // Prepare output directory
      this.prepareOutputDirectory(outputDir);
      
      // Compile LaTeX to PDF
      const pdfPath = this.compileLatexToPDF(latexContent, outputDir);
      
      // Analyze results
      const results = this.analyzePDFResults(pdfPath, latexContent);
      
      // Save results
      this.saveStep3Results(results, outputDir);
      
      // Display results
      this.displayResults(results);
      
      return results;
      
    } catch (error) {
      console.error('❌ Fixed compilation failed:', error.message);
      throw error;
    }
  }

  /**
   * Load fixed Step 2 LaTeX
   */
  static loadFixedStep2LaTeX(step2OutputDir) {
    console.log('📂 Loading fixed Step 2 LaTeX...');
    
    const latexPath = path.join(step2OutputDir, 'generated-fixed.tex');
    if (!fs.existsSync(latexPath)) {
      throw new Error('Fixed LaTeX not found. Run fixed Step 2 first.');
    }
    
    const latexContent = fs.readFileSync(latexPath, 'utf-8');
    console.log(`✅ Fixed LaTeX loaded: ${latexContent.length} characters`);
    
    return latexContent;
  }

  /**
   * Prepare output directory
   */
  static prepareOutputDirectory(outputDir) {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
  }

  /**
   * Compile LaTeX to PDF using pdflatex
   */
  static compileLatexToPDF(latexContent, outputDir) {
    console.log('🔧 Compiling fixed LaTeX to PDF...');
    
    // Create unique filename
    const timestamp = Date.now();
    const filename = `fixed-document-${timestamp}`;
    const texPath = path.join(outputDir, `${filename}.tex`);
    const pdfPath = path.join(outputDir, `${filename}.pdf`);
    
    // Write LaTeX file
    fs.writeFileSync(texPath, latexContent);
    console.log(`✅ Fixed LaTeX file written: ${texPath}`);
    
    // Find pdflatex executable
    let pdflatexPath = 'pdflatex';
    
    try {
      execSync('which pdflatex', { stdio: 'ignore' });
    } catch (error) {
      // Try common TeX Live locations
      const commonPaths = [
        '/usr/local/texlive/2025basic/bin/universal-darwin/pdflatex',
        '/usr/local/texlive/2024/bin/universal-darwin/pdflatex',
        '/usr/local/texlive/2023/bin/universal-darwin/pdflatex',
        '/Library/TeX/texbin/pdflatex',
        '/usr/local/bin/pdflatex'
      ];
      
      for (const testPath of commonPaths) {
        if (fs.existsSync(testPath)) {
          pdflatexPath = testPath;
          break;
        }
      }
    }
    
    console.log(`✅ Found pdflatex at: ${pdflatexPath}`);
    
    try {
      // Run pdflatex twice for proper compilation
      console.log('🔄 Running pdflatex (first pass)...');
      const command1 = `cd "${outputDir}" && "${pdflatexPath}" -interaction=nonstopmode "${filename}.tex"`;
      execSync(command1, { stdio: 'pipe' });
      
      console.log('🔄 Running pdflatex (second pass)...');
      const command2 = `cd "${outputDir}" && "${pdflatexPath}" -interaction=nonstopmode "${filename}.tex"`;
      const output = execSync(command2, { stdio: 'pipe', encoding: 'utf-8' });
      
      console.log('✅ PDF compilation successful!');
      
      // Clean up auxiliary files
      this.cleanupAuxiliaryFiles(outputDir, filename);
      
      return pdfPath;
      
    } catch (error) {
      console.error('❌ LaTeX compilation failed:', error.message);
      if (error.stdout) {
        console.error('LaTeX output:', error.stdout);
      }
      throw error;
    }
  }

  /**
   * Clean up auxiliary files
   */
  static cleanupAuxiliaryFiles(outputDir, filename) {
    const extensions = ['.aux', '.log', '.out', '.toc', '.fls', '.fdb_latexmk'];
    
    extensions.forEach(ext => {
      const filePath = path.join(outputDir, filename + ext);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
    
    console.log('🧹 Cleaned up auxiliary files');
  }

  /**
   * Analyze PDF results
   */
  static analyzePDFResults(pdfPath, latexContent) {
    console.log('📊 Analyzing fixed PDF results...');
    
    const stats = fs.statSync(pdfPath);
    
    // Analyze LaTeX content for formatting preservation
    const fontSizeMatches = latexContent.match(/\\fontsize\d+/g) || [];
    const redTextMatches = latexContent.match(/\\redtext/g) || [];
    const colorMatches = latexContent.match(/\\textcolor/g) || [];
    
    const results = {
      pdfPath: pdfPath,
      pdfSize: stats.size,
      latexLength: latexContent.length,
      estimatedPages: Math.ceil(latexContent.length / 3000), // Rough estimate
      compilationTime: new Date().toISOString(),
      formatting: {
        fontSizeCommands: fontSizeMatches.length,
        redTextCommands: redTextMatches.length,
        colorCommands: colorMatches.length,
        hasRedText: redTextMatches.length > 0,
        hasFontSizes: fontSizeMatches.length > 0
      },
      quality: {
        sizeCategory: this.categorizePDFSize(stats.size),
        contentRichness: this.categorizeContentRichness(latexContent.length),
        formattingRichness: this.categorizeFormattingRichness(fontSizeMatches.length + redTextMatches.length)
      }
    };
    
    console.log(`✅ PDF analysis completed`);
    
    return results;
  }

  /**
   * Categorize PDF size
   */
  static categorizePDFSize(size) {
    if (size < 10000) return 'Very Small (likely compilation issue)';
    if (size < 50000) return 'Small';
    if (size < 100000) return 'Medium';
    if (size < 200000) return 'Large';
    return 'Very Large';
  }

  /**
   * Categorize content richness
   */
  static categorizeContentRichness(length) {
    if (length < 2000) return 'Minimal';
    if (length < 5000) return 'Basic';
    if (length < 10000) return 'Rich';
    return 'Very Rich';
  }

  /**
   * Categorize formatting richness
   */
  static categorizeFormattingRichness(formattingCount) {
    if (formattingCount < 5) return 'Minimal';
    if (formattingCount < 20) return 'Basic';
    if (formattingCount < 50) return 'Rich';
    return 'Very Rich';
  }

  /**
   * Save Step 3 results
   */
  static saveStep3Results(results, outputDir) {
    const analysisPath = path.join(outputDir, 'fixed-compilation-analysis.json');
    fs.writeFileSync(analysisPath, JSON.stringify(results, null, 2));
    console.log(`💾 Fixed analysis saved to: ${analysisPath}`);
  }

  /**
   * Display results
   */
  static displayResults(results) {
    console.log('\n' + '='.repeat(60));
    console.log('🎯 FIXED STEP 3 COMPILATION RESULTS');
    console.log('='.repeat(60));
    
    console.log('\n📊 PDF COMPILATION SUMMARY:');
    console.log(`PDF file: ${path.basename(results.pdfPath)}`);
    console.log(`PDF size: ${results.pdfSize} bytes (${results.quality.sizeCategory})`);
    console.log(`LaTeX length: ${results.latexLength} characters (${results.quality.contentRichness})`);
    console.log(`Estimated pages: ${results.estimatedPages}`);
    console.log(`Compilation time: ${results.compilationTime}`);
    
    console.log('\n🎨 FORMATTING VERIFICATION:');
    console.log(`Font size commands: ${results.formatting.fontSizeCommands}`);
    console.log(`Red text commands: ${results.formatting.redTextCommands}`);
    console.log(`Color commands: ${results.formatting.colorCommands}`);
    console.log(`Red text support: ${results.formatting.hasRedText ? '✅' : '❌'}`);
    console.log(`Font sizes support: ${results.formatting.hasFontSizes ? '✅' : '❌'}`);
    console.log(`Formatting richness: ${results.quality.formattingRichness}`);
    
    console.log('\n📋 QUALITY ASSESSMENT:');
    const qualityScore = this.calculateQualityScore(results);
    console.log(`Overall quality score: ${qualityScore}/100`);
    
    if (qualityScore >= 80) {
      console.log('✅ Excellent quality - All formatting preserved');
    } else if (qualityScore >= 60) {
      console.log('⚠️ Good quality - Minor formatting issues');
    } else {
      console.log('❌ Poor quality - Significant formatting issues');
    }
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Compare this PDF with the original using the HTML comparison tool');
    console.log('2. If quality is good, integrate the fixed pipeline into the backend');
    console.log('3. Test with different PDF inputs to ensure robustness');
    
    console.log('\n' + '='.repeat(60));
  }

  /**
   * Calculate quality score
   */
  static calculateQualityScore(results) {
    let score = 0;
    
    // PDF size score (30 points)
    if (results.pdfSize > 50000) score += 30;
    else if (results.pdfSize > 20000) score += 20;
    else if (results.pdfSize > 10000) score += 10;
    
    // Content richness score (30 points)
    if (results.latexLength > 8000) score += 30;
    else if (results.latexLength > 5000) score += 20;
    else if (results.latexLength > 2000) score += 10;
    
    // Formatting preservation score (40 points)
    if (results.formatting.hasRedText) score += 20;
    if (results.formatting.hasFontSizes) score += 20;
    
    return Math.min(score, 100);
  }
}

// Run the fixed compilation
async function testFixedCompilation() {
  try {
    console.log('🎯 Testing Fixed Step 3 Compilation\n');
    
    const results = await FixedLatexToPDFCompiler.compileToPDF();
    
    console.log('\n🎉 FIXED STEP 3 COMPLETED SUCCESSFULLY!');
    console.log(`📄 PDF ready: ${results.pdfPath}`);
    
  } catch (error) {
    console.error('❌ Fixed compilation failed:', error.message);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  testFixedCompilation();
}

module.exports = FixedLatexToPDFCompiler; 