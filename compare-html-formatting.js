const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * HTML Formatting Comparison Tool
 * 
 * Compares the HTML structure of:
 * 1. Original PDF (from step1-output)
 * 2. Generated PDF (from step3-output) 
 * 
 * This helps identify what formatting Step 2 is losing.
 */
class HTMLFormattingComparator {

  /**
   * Main comparison method
   */
  static async compareFormats() {
    console.log('🔍 Starting HTML Formatting Comparison\n');
    
    try {
      // Step 1: Load original PDF HTML (already extracted)
      const originalHTML = this.loadOriginalHTML();
      
      // Step 2: Extract HTML from generated PDF
      const generatedHTML = await this.extractGeneratedHTML();
      
      // Step 3: Compare formatting structures
      const comparison = this.compareHTMLStructures(originalHTML, generatedHTML);
      
      // Step 4: Save comparison results
      this.saveComparisonResults(comparison);
      
      // Step 5: Display results
      this.displayResults(comparison);
      
    } catch (error) {
      console.error('❌ Comparison failed:', error.message);
    }
  }

  /**
   * Load original PDF HTML from Step 1
   */
  static loadOriginalHTML() {
    console.log('📂 Loading original PDF HTML from Step 1...');
    
    const htmlPath = 'step1-output/extracted-layout.html';
    if (!fs.existsSync(htmlPath)) {
      throw new Error('Original HTML not found. Run Step 1 first.');
    }
    
    const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
    console.log(`✅ Original HTML loaded: ${htmlContent.length} characters`);
    
    return htmlContent;
  }

  /**
   * Extract HTML from generated PDF using Step 1 process
   */
  static async extractGeneratedHTML() {
    console.log('🔄 Extracting HTML from generated PDF...');
    
    // Find the generated PDF
    const step3Dir = 'step3-output';
    const pdfFiles = fs.readdirSync(step3Dir).filter(f => f.endsWith('.pdf'));
    
    if (pdfFiles.length === 0) {
      throw new Error('No generated PDF found in step3-output. Run Step 3 first.');
    }
    
    const pdfPath = path.join(step3Dir, pdfFiles[pdfFiles.length - 1]); // Latest PDF
    console.log(`📄 Using generated PDF: ${pdfPath}`);
    
    // Create output directory for generated PDF analysis
    const outputDir = 'comparison-output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
    
    // Extract HTML from generated PDF
    const timestamp = Date.now();
    const baseFilename = `generated-pdf-${timestamp}`;
    
    try {
      // Extract HTML layout
      const htmlCommand = `pdftohtml -c -hidden -noframes "${pdfPath}" "${outputDir}/${baseFilename}"`;
      console.log('🔧 Executing:', htmlCommand);
      execSync(htmlCommand, { stdio: 'pipe' });
      
      // Read the generated HTML
      const htmlFile = `${outputDir}/${baseFilename}.html`;
      if (!fs.existsSync(htmlFile)) {
        // Try with page suffix
        const htmlFileWithPage = `${outputDir}/${baseFilename}-1.html`;
        if (fs.existsSync(htmlFileWithPage)) {
          const htmlContent = fs.readFileSync(htmlFileWithPage, 'utf-8');
          console.log(`✅ Generated PDF HTML extracted: ${htmlContent.length} characters`);
          return htmlContent;
        } else {
          throw new Error('Generated HTML file not found');
        }
      }
      
      const htmlContent = fs.readFileSync(htmlFile, 'utf-8');
      console.log(`✅ Generated PDF HTML extracted: ${htmlContent.length} characters`);
      return htmlContent;
      
    } catch (error) {
      console.error('❌ HTML extraction failed:', error.message);
      throw error;
    }
  }

  /**
   * Compare HTML structures to identify formatting differences
   */
  static compareHTMLStructures(originalHTML, generatedHTML) {
    console.log('🔍 Comparing HTML structures...\n');
    
    const comparison = {
      original: this.analyzeHTMLStructure(originalHTML, 'Original PDF'),
      generated: this.analyzeHTMLStructure(generatedHTML, 'Generated PDF'),
      differences: {}
    };
    
    // Compare key metrics
    comparison.differences = {
      fontSizes: this.compareFontSizes(comparison.original.fontSizes, comparison.generated.fontSizes),
      colors: this.compareColors(comparison.original.colors, comparison.generated.colors),
      elements: this.compareElementCounts(comparison.original.elementCount, comparison.generated.elementCount),
      structure: this.compareStructure(comparison.original, comparison.generated)
    };
    
    return comparison;
  }

  /**
   * Analyze HTML structure for formatting details
   */
  static analyzeHTMLStructure(htmlContent, label) {
    console.log(`📊 Analyzing ${label}...`);
    
    const analysis = {
      label,
      totalLength: htmlContent.length,
      fontSizes: this.extractFontSizes(htmlContent),
      colors: this.extractColors(htmlContent),
      elementCount: this.countElements(htmlContent),
      positioning: this.analyzePositioning(htmlContent),
      textContent: this.extractTextContent(htmlContent)
    };
    
    console.log(`  📏 Font sizes: [${analysis.fontSizes.join(', ')}]px`);
    console.log(`  🎨 Colors: [${analysis.colors.join(', ')}]`);
    console.log(`  📝 Elements: ${analysis.elementCount} positioned elements`);
    console.log(`  📄 Text content: ${analysis.textContent.length} characters\n`);
    
    return analysis;
  }

  /**
   * Extract font sizes from HTML
   */
  static extractFontSizes(htmlContent) {
    const fontSizeRegex = /font-size:(\d+)px/g;
    const sizes = new Set();
    let match;
    
    while ((match = fontSizeRegex.exec(htmlContent)) !== null) {
      sizes.add(parseInt(match[1]));
    }
    
    return Array.from(sizes).sort((a, b) => b - a); // Descending order
  }

  /**
   * Extract colors from HTML
   */
  static extractColors(htmlContent) {
    const colorRegex = /color:(#[0-9a-fA-F]{6})/g;
    const colors = new Set();
    let match;
    
    while ((match = colorRegex.exec(htmlContent)) !== null) {
      colors.add(match[1].toLowerCase());
    }
    
    return Array.from(colors);
  }

  /**
   * Count positioned elements
   */
  static countElements(htmlContent) {
    const elementRegex = /<p\s+style="position:absolute/g;
    const matches = htmlContent.match(elementRegex);
    return matches ? matches.length : 0;
  }

  /**
   * Analyze positioning patterns
   */
  static analyzePositioning(htmlContent) {
    const positionRegex = /<p\s+style="position:absolute;top:(\d+)px;left:(\d+)px/g;
    const positions = [];
    let match;
    
    while ((match = positionRegex.exec(htmlContent)) !== null) {
      positions.push({
        top: parseInt(match[1]),
        left: parseInt(match[2])
      });
    }
    
    return {
      count: positions.length,
      topRange: positions.length > 0 ? {
        min: Math.min(...positions.map(p => p.top)),
        max: Math.max(...positions.map(p => p.top))
      } : null,
      leftRange: positions.length > 0 ? {
        min: Math.min(...positions.map(p => p.left)),
        max: Math.max(...positions.map(p => p.left))
      } : null
    };
  }

  /**
   * Extract text content from HTML
   */
  static extractTextContent(htmlContent) {
    // Remove HTML tags and get clean text
    return htmlContent
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Compare font sizes between original and generated
   */
  static compareFontSizes(original, generated) {
    return {
      original: original,
      generated: generated,
      missing: original.filter(size => !generated.includes(size)),
      extra: generated.filter(size => !original.includes(size)),
      match: original.length === generated.length && original.every(size => generated.includes(size))
    };
  }

  /**
   * Compare colors between original and generated
   */
  static compareColors(original, generated) {
    return {
      original: original,
      generated: generated,
      missing: original.filter(color => !generated.includes(color)),
      extra: generated.filter(color => !original.includes(color)),
      match: original.length === generated.length && original.every(color => generated.includes(color))
    };
  }

  /**
   * Compare element counts
   */
  static compareElementCounts(original, generated) {
    return {
      original: original,
      generated: generated,
      difference: generated - original,
      ratio: original > 0 ? (generated / original).toFixed(2) : 'N/A'
    };
  }

  /**
   * Compare overall structure
   */
  static compareStructure(original, generated) {
    return {
      lengthRatio: (generated.totalLength / original.totalLength).toFixed(2),
      textContentRatio: (generated.textContent.length / original.textContent.length).toFixed(2),
      positioningMatch: original.positioning.count === generated.positioning.count
    };
  }

  /**
   * Save comparison results to file
   */
  static saveComparisonResults(comparison) {
    const outputDir = 'comparison-output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
    
    const resultsPath = path.join(outputDir, 'formatting-comparison.json');
    fs.writeFileSync(resultsPath, JSON.stringify(comparison, null, 2));
    console.log(`💾 Comparison results saved to: ${resultsPath}`);
  }

  /**
   * Display comparison results
   */
  static displayResults(comparison) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 HTML FORMATTING COMPARISON RESULTS');
    console.log('='.repeat(60));
    
    // Font Size Comparison
    console.log('\n🔤 FONT SIZE COMPARISON:');
    console.log(`Original: [${comparison.original.fontSizes.join(', ')}]px`);
    console.log(`Generated: [${comparison.generated.fontSizes.join(', ')}]px`);
    console.log(`Match: ${comparison.differences.fontSizes.match ? '✅' : '❌'}`);
    if (comparison.differences.fontSizes.missing.length > 0) {
      console.log(`Missing sizes: [${comparison.differences.fontSizes.missing.join(', ')}]px`);
    }
    if (comparison.differences.fontSizes.extra.length > 0) {
      console.log(`Extra sizes: [${comparison.differences.fontSizes.extra.join(', ')}]px`);
    }
    
    // Color Comparison
    console.log('\n🎨 COLOR COMPARISON:');
    console.log(`Original: [${comparison.original.colors.join(', ')}]`);
    console.log(`Generated: [${comparison.generated.colors.join(', ')}]`);
    console.log(`Match: ${comparison.differences.colors.match ? '✅' : '❌'}`);
    if (comparison.differences.colors.missing.length > 0) {
      console.log(`Missing colors: [${comparison.differences.colors.missing.join(', ')}]`);
    }
    if (comparison.differences.colors.extra.length > 0) {
      console.log(`Extra colors: [${comparison.differences.colors.extra.join(', ')}]`);
    }
    
    // Element Count Comparison
    console.log('\n📝 ELEMENT COUNT COMPARISON:');
    console.log(`Original: ${comparison.differences.elements.original} elements`);
    console.log(`Generated: ${comparison.differences.elements.generated} elements`);
    console.log(`Difference: ${comparison.differences.elements.difference > 0 ? '+' : ''}${comparison.differences.elements.difference}`);
    console.log(`Ratio: ${comparison.differences.elements.ratio}`);
    
    // Structure Comparison
    console.log('\n🏗️  STRUCTURE COMPARISON:');
    console.log(`HTML Length Ratio: ${comparison.differences.structure.lengthRatio}`);
    console.log(`Text Content Ratio: ${comparison.differences.structure.textContentRatio}`);
    console.log(`Positioning Match: ${comparison.differences.structure.positioningMatch ? '✅' : '❌'}`);
    
    // Summary
    console.log('\n📋 SUMMARY:');
    const issues = [];
    if (!comparison.differences.fontSizes.match) issues.push('Font sizes mismatch');
    if (!comparison.differences.colors.match) issues.push('Colors mismatch');
    if (Math.abs(comparison.differences.elements.difference) > 5) issues.push('Element count significantly different');
    if (!comparison.differences.structure.positioningMatch) issues.push('Positioning structure mismatch');
    
    if (issues.length === 0) {
      console.log('✅ All formatting appears to be preserved correctly!');
    } else {
      console.log('❌ Issues found:');
      issues.forEach(issue => console.log(`   • ${issue}`));
    }
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Review the detailed comparison in comparison-output/formatting-comparison.json');
    console.log('2. Fix Step 2 based on the identified formatting losses');
    console.log('3. Focus on preserving font sizes, colors, and element positioning');
    
    console.log('\n' + '='.repeat(60));
  }
}

// Run the comparison
async function runComparison() {
  try {
    await HTMLFormattingComparator.compareFormats();
  } catch (error) {
    console.error('❌ Comparison failed:', error.message);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  runComparison();
}

module.exports = HTMLFormattingComparator; 