const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function visualFormatComparison() {
  console.log('=== VISUAL FORMAT COMPARISON ANALYSIS ===');
  
  const originalPdf = 'midterm-sp24.pdf';
  
  if (!fs.existsSync(originalPdf)) {
    console.log('❌ Original PDF file not found:', originalPdf);
    return;
  }
  
  console.log('📄 Starting visual format comparison with:', originalPdf);
  
  // Step 1: Generate a practice exam
  console.log('\n🤖 STEP 1: GENERATING PRACTICE EXAM');
  console.log('='.repeat(60));
  
  let generatedPdfPath = null;
  
  try {
    const form = new FormData();
    form.append('subject', 'Parallel Computing Format Test');
    form.append('questionCount', '3');
    form.append('difficulty', 'medium');
    form.append('generatePDF', 'true');
    form.append('questionPoints', '[30,35,35]');
    form.append('pdf', fs.createReadStream(originalPdf));
    
    console.log('📡 Generating practice exam...');
    
    const response = await axios.post('http://localhost:8000/api/ai/practice-exam', form, {
      headers: {
        ...form.getHeaders()
      },
      timeout: 60000
    });
    
    if (response.data.data.pdfPath && fs.existsSync(response.data.data.pdfPath)) {
      generatedPdfPath = response.data.data.pdfPath;
      const stats = fs.statSync(generatedPdfPath);
      console.log('✅ Practice exam generated successfully');
      console.log('📄 Generated PDF:', generatedPdfPath);
      console.log('📊 Size:', stats.size, 'bytes');
    } else {
      console.log('❌ Failed to generate practice exam PDF');
      return;
    }
    
  } catch (error) {
    console.error('❌ Practice exam generation failed:', error.message);
    return;
  }
  
  // Step 2: Convert both PDFs to HTML for visual comparison
  console.log('\n🎨 STEP 2: CONVERTING PDFs TO HTML FOR VISUAL COMPARISON');
  console.log('='.repeat(60));
  
  const timestamp = Date.now();
  
  try {
    // Convert original PDF to HTML
    console.log('🔄 Converting original PDF to HTML...');
    const originalHtmlPath = `original-${timestamp}.html`;
    await execAsync(`pdftohtml -c -hidden -noframes "${originalPdf}" "${originalHtmlPath.replace('.html', '')}"`);
    
    if (fs.existsSync(originalHtmlPath)) {
      console.log('✅ Original PDF converted to HTML:', originalHtmlPath);
    } else {
      console.log('❌ Original PDF HTML conversion failed');
      return;
    }
    
    // Convert generated PDF to HTML
    console.log('🔄 Converting generated PDF to HTML...');
    const generatedHtmlPath = `generated-${timestamp}.html`;
    await execAsync(`pdftohtml -c -hidden -noframes "${generatedPdfPath}" "${generatedHtmlPath.replace('.html', '')}"`);
    
    if (fs.existsSync(generatedHtmlPath)) {
      console.log('✅ Generated PDF converted to HTML:', generatedHtmlPath);
    } else {
      console.log('❌ Generated PDF HTML conversion failed');
      return;
    }
    
    // Step 3: Analyze formatting differences
    console.log('\n🔍 STEP 3: ANALYZING FORMATTING DIFFERENCES');
    console.log('='.repeat(60));
    
    const originalHtml = fs.readFileSync(originalHtmlPath, 'utf8');
    const generatedHtml = fs.readFileSync(generatedHtmlPath, 'utf8');
    
    console.log('📊 Original HTML length:', originalHtml.length);
    console.log('📊 Generated HTML length:', generatedHtml.length);
    
    // Extract and compare font information
    const originalFonts = extractFontInfo(originalHtml);
    const generatedFonts = extractFontInfo(generatedHtml);
    
    console.log('\n🔤 FONT SIZE COMPARISON:');
    console.log('Original font sizes:', originalFonts.sizes);
    console.log('Generated font sizes:', generatedFonts.sizes);
    
    console.log('\n🎨 COLOR COMPARISON:');
    console.log('Original colors:', originalFonts.colors);
    console.log('Generated colors:', generatedFonts.colors);
    
    console.log('\n📝 FONT FAMILY COMPARISON:');
    console.log('Original families:', originalFonts.families.slice(0, 5));
    console.log('Generated families:', generatedFonts.families.slice(0, 5));
    
    // Extract specific formatting elements
    const originalFormatting = analyzeFormatting(originalHtml);
    const generatedFormatting = analyzeFormatting(generatedHtml);
    
    console.log('\n📋 STRUCTURE COMPARISON:');
    console.log('Original headers:', originalFormatting.headers);
    console.log('Generated headers:', generatedFormatting.headers);
    
    console.log('\n🔴 RED TEXT COMPARISON:');
    console.log('Original red text:', originalFormatting.redText);
    console.log('Generated red text:', generatedFormatting.redText);
    
    console.log('\n📐 POSITIONING COMPARISON:');
    console.log('Original positioning style:', originalFormatting.hasAbsolutePositioning ? 'Absolute positioning' : 'Flow layout');
    console.log('Generated positioning style:', generatedFormatting.hasAbsolutePositioning ? 'Absolute positioning' : 'Flow layout');
    
    // Step 4: Generate side-by-side comparison HTML
    console.log('\n📋 STEP 4: CREATING SIDE-BY-SIDE COMPARISON');
    console.log('='.repeat(60));
    
    const comparisonHtml = createComparisonHTML(originalHtml, generatedHtml, originalFormatting, generatedFormatting);
    const comparisonPath = `comparison-${timestamp}.html`;
    fs.writeFileSync(comparisonPath, comparisonHtml);
    console.log('✅ Comparison HTML created:', comparisonPath);
    
    // Step 5: Open files for visual inspection
    console.log('\n👀 STEP 5: OPENING FILES FOR VISUAL INSPECTION');
    console.log('='.repeat(60));
    
    console.log('📖 Opening original PDF...');
    exec(`open "${originalPdf}"`);
    
    console.log('📖 Opening generated PDF...');
    exec(`open "${generatedPdfPath}"`);
    
    console.log('📖 Opening side-by-side HTML comparison...');
    exec(`open "${comparisonPath}"`);
    
    console.log('📖 Opening original HTML...');
    exec(`open "${originalHtmlPath}"`);
    
    console.log('📖 Opening generated HTML...');
    exec(`open "${generatedHtmlPath}"`);
    
    // Step 6: Generate formatting recommendations
    console.log('\n💡 STEP 6: FORMATTING RECOMMENDATIONS');
    console.log('='.repeat(60));
    
    const recommendations = generateRecommendations(originalFormatting, generatedFormatting, originalFonts, generatedFonts);
    console.log(recommendations);
    
    // Save analysis report
    const report = generateAnalysisReport(originalFormatting, generatedFormatting, originalFonts, generatedFonts, recommendations);
    fs.writeFileSync(`format-analysis-report-${timestamp}.txt`, report);
    console.log('\n📄 Detailed analysis report saved to:', `format-analysis-report-${timestamp}.txt`);
    
  } catch (error) {
    console.error('❌ Visual comparison failed:', error.message);
  }
  
  console.log('\n🎉 VISUAL FORMAT COMPARISON COMPLETED');
  console.log('📁 Files created for inspection:');
  console.log(`  - ${originalPdf} (original PDF)`);
  console.log(`  - ${generatedPdfPath} (generated PDF)`);
  console.log(`  - original-${timestamp}.html (original as HTML)`);
  console.log(`  - generated-${timestamp}.html (generated as HTML)`);
  console.log(`  - comparison-${timestamp}.html (side-by-side comparison)`);
  console.log(`  - format-analysis-report-${timestamp}.txt (detailed analysis)`);
  console.log('\n💡 Compare all files to identify formatting issues!');
}

function extractFontInfo(html) {
  const sizes = [...html.matchAll(/font-size:(\d+)px/g)].map(m => parseInt(m[1]));
  const uniqueSizes = [...new Set(sizes)].sort((a, b) => b - a);
  
  const colors = [...html.matchAll(/color:(#[0-9a-fA-F]{6})/g)].map(m => m[1]);
  const uniqueColors = [...new Set(colors)];
  
  const families = [...html.matchAll(/font-family:([^;]+)/g)].map(m => m[1].trim());
  const uniqueFamilies = [...new Set(families)];
  
  return {
    sizes: uniqueSizes,
    colors: uniqueColors,
    families: uniqueFamilies
  };
}

function analyzeFormatting(html) {
  const headers = [];
  const redText = [];
  
  // Extract headers
  const headerMatches = html.match(/<p[^>]*>.*?<b[^>]*>.*?(CSCI-UA|Midterm|Total:|Problem \d+|Important Notes).*?<\/b>.*?<\/p>/gi) || [];
  headerMatches.forEach(match => {
    const text = match.replace(/<[^>]*>/g, '').trim();
    if (text) headers.push(text);
  });
  
  // Extract red text
  const redMatches = html.match(/color:#ff0000[^>]*>([^<]+)/gi) || [];
  redMatches.forEach(match => {
    const text = match.replace(/.*>/, '').trim();
    if (text) redText.push(text);
  });
  
  const hasAbsolutePositioning = html.includes('position:absolute');
  const hasBoldText = html.includes('<b>');
  const hasRedText = html.includes('#ff0000');
  
  return {
    headers,
    redText,
    hasAbsolutePositioning,
    hasBoldText,
    hasRedText
  };
}

function createComparisonHTML(originalHtml, generatedHtml, originalFormatting, generatedFormatting) {
  return `<!DOCTYPE html>
<html>
<head>
    <title>PDF Format Comparison</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .comparison { display: flex; gap: 20px; }
        .column { flex: 1; border: 1px solid #ccc; padding: 10px; }
        .column h2 { background: #f5f5f5; padding: 10px; margin: -10px -10px 10px -10px; }
        .original { border-color: #4CAF50; }
        .generated { border-color: #FF9800; }
        .analysis { background: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .issue { color: #d32f2f; font-weight: bold; }
        .good { color: #388e3c; font-weight: bold; }
        iframe { width: 100%; height: 600px; border: 1px solid #ddd; }
    </style>
</head>
<body>
    <h1>PDF Format Comparison Analysis</h1>
    
    <div class="analysis">
        <h3>Key Differences Detected:</h3>
        <ul>
            <li class="${originalFormatting.hasRedText === generatedFormatting.hasRedText ? 'good' : 'issue'}">
                Red Text: Original=${originalFormatting.hasRedText}, Generated=${generatedFormatting.hasRedText}
            </li>
            <li class="${originalFormatting.hasAbsolutePositioning === generatedFormatting.hasAbsolutePositioning ? 'good' : 'issue'}">
                Positioning: Original=${originalFormatting.hasAbsolutePositioning ? 'Absolute' : 'Flow'}, Generated=${generatedFormatting.hasAbsolutePositioning ? 'Absolute' : 'Flow'}
            </li>
            <li>Headers Found: Original=${originalFormatting.headers.length}, Generated=${generatedFormatting.headers.length}</li>
            <li>Red Text Elements: Original=${originalFormatting.redText.length}, Generated=${generatedFormatting.redText.length}</li>
        </ul>
    </div>
    
    <div class="comparison">
        <div class="column original">
            <h2>Original PDF (as HTML)</h2>
            <iframe srcdoc="${originalHtml.replace(/"/g, '&quot;')}"></iframe>
        </div>
        <div class="column generated">
            <h2>Generated PDF (as HTML)</h2>
            <iframe srcdoc="${generatedHtml.replace(/"/g, '&quot;')}"></iframe>
        </div>
    </div>
</body>
</html>`;
}

function generateRecommendations(originalFormatting, generatedFormatting, originalFonts, generatedFonts) {
  const recommendations = [];
  
  if (!generatedFormatting.hasRedText && originalFormatting.hasRedText) {
    recommendations.push('❌ CRITICAL: Missing red text formatting. Original has red warnings, generated does not.');
  }
  
  if (originalFonts.sizes.length > generatedFonts.sizes.length) {
    recommendations.push('❌ FONT ISSUE: Generated PDF has fewer font sizes than original. Missing size hierarchy.');
  }
  
  if (!originalFonts.colors.every(color => generatedFonts.colors.includes(color))) {
    recommendations.push('❌ COLOR ISSUE: Generated PDF missing some colors from original.');
  }
  
  if (originalFormatting.hasAbsolutePositioning && !generatedFormatting.hasAbsolutePositioning) {
    recommendations.push('⚠️  LAYOUT: Original uses absolute positioning, generated uses flow layout.');
  }
  
  if (originalFormatting.headers.length !== generatedFormatting.headers.length) {
    recommendations.push(`⚠️  HEADERS: Header count mismatch. Original=${originalFormatting.headers.length}, Generated=${generatedFormatting.headers.length}`);
  }
  
  if (recommendations.length === 0) {
    recommendations.push('✅ No major formatting issues detected!');
  }
  
  return recommendations.join('\n');
}

function generateAnalysisReport(originalFormatting, generatedFormatting, originalFonts, generatedFonts, recommendations) {
  return `PDF FORMAT ANALYSIS REPORT
Generated: ${new Date().toISOString()}

=== FONT ANALYSIS ===
Original Font Sizes: ${originalFonts.sizes.join(', ')}
Generated Font Sizes: ${generatedFonts.sizes.join(', ')}

Original Colors: ${originalFonts.colors.join(', ')}
Generated Colors: ${generatedFonts.colors.join(', ')}

Original Font Families: ${originalFonts.families.slice(0, 3).join(', ')}
Generated Font Families: ${generatedFonts.families.slice(0, 3).join(', ')}

=== STRUCTURE ANALYSIS ===
Original Headers: ${originalFormatting.headers.join(' | ')}
Generated Headers: ${generatedFormatting.headers.join(' | ')}

Original Red Text: ${originalFormatting.redText.join(' | ')}
Generated Red Text: ${generatedFormatting.redText.join(' | ')}

=== LAYOUT ANALYSIS ===
Original Uses Absolute Positioning: ${originalFormatting.hasAbsolutePositioning}
Generated Uses Absolute Positioning: ${generatedFormatting.hasAbsolutePositioning}

=== RECOMMENDATIONS ===
${recommendations}

=== NEXT STEPS ===
1. Compare the side-by-side HTML view to identify visual differences
2. Update LaTeX template to match original formatting exactly
3. Ensure red text is properly implemented with \\color{red}
4. Verify font size hierarchy matches original (21px, 18px, 17px, etc.)
5. Test with different PDFs to ensure consistency
`;
}

// Run the visual comparison
visualFormatComparison()
  .then(() => {
    console.log('\n✅ Visual format comparison completed successfully');
  })
  .catch(error => {
    console.error('\n💥 Visual comparison failed:', error.message);
  }); 