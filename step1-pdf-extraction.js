const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

class PDFExtractor {
  /**
   * Extract both text content and HTML layout from PDF with enhanced table and diagram support
   */
  static async extractPDFContent(pdfPath) {
    console.log('=== STEP 1: PDF → HTML + TXT EXTRACTION (ENHANCED) ===\n');
    
    const results = {
      pdfPath: pdfPath,
      textContent: null,
      htmlContent: null,
      textLength: 0,
      htmlLength: 0,
      pageCount: 0,
      fontSizes: [],
      colors: [],
      tables: [],
      images: [],
      errors: []
    };

    try {
      // 1. Extract clean text content using pdftotext
      console.log('🔄 Extracting text content with pdftotext...');
      const textOutput = execSync(`pdftotext "${pdfPath}" -`, { encoding: 'utf8' });
      results.textContent = textOutput;
      results.textLength = textOutput.length;
      console.log(`✅ Text extracted: ${results.textLength} characters`);
      
      // 2. Extract HTML layout with enhanced options for better table and diagram preservation
      console.log('🔄 Extracting HTML layout with enhanced options...');
      const htmlContent = this.extractHTMLLayout(pdfPath);
      results.htmlContent = htmlContent;
      results.htmlLength = htmlContent.length;
      results.pageCount = (htmlContent.match(/<!-- PAGE BREAK -->/g) || []).length + 1;
      console.log(`✅ HTML extracted: ${results.htmlLength} characters from ${results.pageCount} pages`);
      
      // Extract font sizes from HTML
      const fontMatches = results.htmlContent.match(/font-size:(\d+)px/g);
      if (fontMatches) {
        results.fontSizes = [...new Set(fontMatches.map(m => parseInt(m.match(/\d+/)[0])))].sort((a,b) => b-a);
      }
      
      // Extract colors from HTML
      const colorMatches = results.htmlContent.match(/color:(#[0-9a-f]{6})/gi);
      if (colorMatches) {
        results.colors = [...new Set(colorMatches.map(m => m.match(/#[0-9a-f]{6}/i)[0].toLowerCase()))];
      }
      
      // Extract table information
      results.tables = this.detectTables(results.htmlContent);
      
      // Extract image references
      results.images = this.extractImageInfo(results.htmlContent);
      
    } catch (error) {
      console.error('❌ Extraction error:', error.message);
      results.errors.push(error.message);
    }

    return results;
  }

  /**
   * Extract HTML layout with enhanced options for better table and diagram preservation
   */
  static extractHTMLLayout(pdfPath) {
    try {
      const outputDir = 'step1-output';
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 8);
      const uniqueId = `${timestamp}-${randomId}`;
      const htmlPath = path.join(outputDir, `extracted-layout-${uniqueId}`);
      
      // Enhanced pdftohtml command with better options for diagrams and tables
      const command = `pdftohtml -c -hidden -noframes -zoom 1.5 -fontfullname "${pdfPath}" "${htmlPath}"`;
      console.log('🔄 Extracting HTML layout with enhanced options...');
      
      const output = execSync(command, { 
        encoding: 'utf8',
        cwd: process.cwd()
      });
      
      // Read the main HTML file
      const htmlFile = `${htmlPath}.html`;
      if (!fs.existsSync(htmlFile)) {
        throw new Error(`HTML file not generated: ${htmlFile}`);
      }
      
      let htmlContent = fs.readFileSync(htmlFile, 'utf8');
      
      // Find and preserve all page images
      const imageFiles = [];
      let pageNum = 1;
      while (true) {
        const pageImageFile = `${htmlPath}${String(pageNum).padStart(3, '0')}.png`;
        if (fs.existsSync(pageImageFile)) {
          // Copy image to permanent location
          const permanentImagePath = path.join(outputDir, `page-${pageNum}-${uniqueId}.png`);
          fs.copyFileSync(pageImageFile, permanentImagePath);
          imageFiles.push(permanentImagePath);
          
          // Update HTML to use permanent image paths
          const tempImageName = path.basename(pageImageFile);
          const permanentImageName = path.basename(permanentImagePath);
          htmlContent = htmlContent.replace(
            new RegExp(tempImageName, 'g'), 
            permanentImageName
          );
          
          pageNum++;
        } else {
          break;
        }
      }
      
      // Clean up temporary files but keep the images we copied
      try {
        fs.unlinkSync(htmlFile);
        pageNum = 1;
        while (true) {
          const tempImageFile = `${htmlPath}${String(pageNum).padStart(3, '0')}.png`;
          if (fs.existsSync(tempImageFile)) {
            fs.unlinkSync(tempImageFile);
            pageNum++;
          } else {
            break;
          }
        }
      } catch (cleanupError) {
        console.log('⚠️  Some temporary files could not be cleaned up:', cleanupError.message);
      }
      
      // Save the updated HTML with permanent image paths
      const finalHtmlPath = path.join(outputDir, 'extracted-layout.html');
      fs.writeFileSync(finalHtmlPath, htmlContent);
      
      console.log(`✅ HTML extracted: ${htmlContent.length} characters from ${pageNum - 1} pages`);
      console.log(`🖼️  Images preserved: ${imageFiles.length} files`);
      
      return htmlContent;
      
    } catch (error) {
      console.error('❌ HTML extraction failed:', error.message);
      throw error;
    }
  }

  /**
   * Create enhanced HTML with better table structure and styling - DYNAMIC VERSION
   */
  static createEnhancedHTML(originalHtml, tables) {
    // Remove all mathematical highlighting - preserve original PDF format exactly
    let enhancedHtml = originalHtml;

    // Add tables if detected
    if (tables && tables.length > 0) {
      const tableHtml = tables.map(table => this.createHTMLTable(table)).join('\n\n');
      enhancedHtml += '\n\n' + tableHtml;
    }

    // Create final HTML with clean, professional styling that doesn't modify content
    const finalHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PDF Content Extraction</title>
    <style>
        body {
            font-family: 'Times New Roman', serif;
            margin: 20px;
            background-color: #ffffff;
            color: #000000;
            line-height: 1.2;
        }
        .content-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            position: relative;
        }
        /* Preserve exact positioning and styling from original PDF */
        p {
            margin: 0;
            padding: 0;
        }
        /* Table styling */
        table {
            border-collapse: collapse;
            margin: 20px 0;
            width: 100%;
        }
        th, td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
            font-size: 12px;
        }
        th {
            background-color: #f0f0f0;
            font-weight: bold;
        }
        .section-header {
            font-size: 18px;
            font-weight: bold;
            margin: 20px 0 10px 0;
            color: #333;
        }
    </style>
</head>
<body>
    <div class="content-container">
        <div class="section-header">📄 Extracted PDF Content</div>
        ${enhancedHtml}
    </div>
</body>
</html>`;

    return finalHtml;
  }

  /**
   * Enhanced table detection that creates proper HTML table structure - DYNAMIC VERSION
   */
  static detectTables(htmlContent) {
    const tables = [];
    
    try {
      // Look for table-like patterns in the positioned text
      const lines = htmlContent.split('\n');
      const textElements = [];
      
      // Extract all positioned text elements with coordinates
      for (const line of lines) {
        const match = line.match(/<p style="position:absolute;top:(\d+)px;left:(\d+)px[^"]*"[^>]*>([^<]+)</);
        if (match) {
          const top = parseInt(match[1]);
          const left = parseInt(match[2]);
          const text = match[3].replace(/&#160;/g, ' ').trim();
          
          if (text && text !== ' ') {
            textElements.push({ top, left, text, line });
          }
        }
      }
      
      // Group elements by rows (similar top values)
      const rowTolerance = 10;
      const rows = [];
      
      for (const element of textElements) {
        let foundRow = false;
        for (const row of rows) {
          if (Math.abs(row.top - element.top) <= rowTolerance) {
            row.elements.push(element);
            foundRow = true;
            break;
          }
        }
        if (!foundRow) {
          rows.push({
            top: element.top,
            elements: [element]
          });
        }
      }
      
      // Sort rows by top position
      rows.sort((a, b) => a.top - b.top);
      
      // Look for potential table structures
      for (let i = 0; i < rows.length - 2; i++) {
        const currentRow = rows[i];
        const nextRow = rows[i + 1];
        const thirdRow = rows[i + 2];
        
        // Check if we have multiple aligned elements that could form a table
        if (currentRow.elements.length >= 2 && nextRow.elements.length >= 2 && thirdRow.elements.length >= 2) {
          
          // Sort elements in each row by left position
          currentRow.elements.sort((a, b) => a.left - b.left);
          nextRow.elements.sort((a, b) => a.left - b.left);
          thirdRow.elements.sort((a, b) => a.left - b.left);
          
          // Check if elements are roughly aligned (similar left positions across rows)
          const columnTolerance = 50; // pixels
          let alignedColumns = 0;
          
          for (let col = 0; col < Math.min(currentRow.elements.length, nextRow.elements.length); col++) {
            if (Math.abs(currentRow.elements[col].left - nextRow.elements[col].left) <= columnTolerance) {
              alignedColumns++;
            }
          }
          
          // If we have good alignment, this might be a table
          if (alignedColumns >= 2) {
            const tableRows = [];
            const maxRows = Math.min(10, rows.length - i); // Limit table size
            
            // Extract table data
            for (let rowIdx = i; rowIdx < i + maxRows; rowIdx++) {
              const row = rows[rowIdx];
              if (row.elements.length >= 2) {
                row.elements.sort((a, b) => a.left - b.left);
                tableRows.push(row.elements.map(e => e.text));
              } else {
                break; // Stop if row doesn't have enough elements
              }
            }
            
            // Only create table if we have at least 3 rows
            if (tableRows.length >= 3) {
              const table = {
                type: 'structured_table',
                rows: tableRows.length,
                columns: Math.max(...tableRows.map(row => row.length)),
                data: tableRows,
                htmlTable: this.createHTMLTable(tableRows),
                position: { top: currentRow.top, left: Math.min(...currentRow.elements.map(e => e.left)) },
                description: 'Extracted Table Data'
              };
              
              tables.push(table);
              break; // Only extract first table found
            }
          }
        }
      }
      
    } catch (error) {
      console.log('⚠️  Table detection error:', error.message);
    }
    
    return tables;
  }
  
  /**
   * Create proper HTML table from row data
   */
  static createHTMLTable(table) {
    try {
      // If table already has an htmlTable property, return it
      if (table && table.htmlTable) {
        return table.htmlTable;
      }
      
      // If table has rows property that's an array
      if (table && table.rows && Array.isArray(table.rows) && table.rows.length > 0) {
        const tableRows = table.rows;
        
        let html = '<table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; margin: 20px 0;">\n';
        
        // First row as header
        html += '  <thead>\n    <tr>\n';
        for (const cell of tableRows[0]) {
          const cellContent = String(cell || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          html += `      <th style="background-color: #f0f0f0; padding: 8px; text-align: center;">${cellContent}</th>\n`;
        }
        html += '    </tr>\n  </thead>\n';
        
        // Remaining rows as data
        if (tableRows.length > 1) {
          html += '  <tbody>\n';
          for (let i = 1; i < tableRows.length; i++) {
            html += '    <tr>\n';
            for (const cell of tableRows[i]) {
              const cellContent = String(cell || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
              html += `      <td style="padding: 8px; text-align: center;">${cellContent}</td>\n`;
            }
            html += '    </tr>\n';
          }
          html += '  </tbody>\n';
        }
        
        html += '</table>\n';
        return html;
      }
      
      // Fallback for unsupported table structure
      return '<p>Table structure not supported</p>';
      
    } catch (error) {
      console.log('Table creation error:', error.message);
      return '<p>Error creating table</p>';
    }
  }

  /**
   * Extract image information from HTML content
   */
  static extractImageInfo(htmlContent) {
    const images = [];
    
    // Extract background images
    const bgImageMatches = htmlContent.match(/src="([^"]*\.png)"/gi);
    if (bgImageMatches) {
      bgImageMatches.forEach((match, index) => {
        const src = match.match(/src="([^"]*)"/i)[1];
        images.push({
          type: 'background',
          index: index,
          src: src,
          purpose: 'diagram_or_visual_content'
        });
      });
    }
    
    // Extract inline images
    const imgMatches = htmlContent.match(/<img[^>]*>/gi);
    if (imgMatches) {
      imgMatches.forEach((img, index) => {
        const srcMatch = img.match(/src="([^"]*)"/i);
        const altMatch = img.match(/alt="([^"]*)"/i);
        
        images.push({
          type: 'inline',
          index: index,
          src: srcMatch ? srcMatch[1] : '',
          alt: altMatch ? altMatch[1] : '',
          purpose: 'content_image'
        });
      });
    }
    
    return images;
  }

  /**
   * Analyze and display extraction results with enhanced table and diagram info
   */
  static analyzeExtractionResults(results) {
    console.log('\n=== STEP 1 ANALYSIS (ENHANCED) ===\n');
    
    console.log('📊 EXTRACTION SUMMARY:');
    console.log(`PDF File: ${results.pdfPath}`);
    console.log(`Text Content: ${results.textLength} characters`);
    console.log(`HTML Content: ${results.htmlLength} characters`);
    console.log(`Pages Extracted: ${results.pageCount || 'Unknown'}`);
    console.log(`Tables Found: ${results.tables.length}`);
    console.log(`Images Found: ${results.images.length}`);
    console.log(`Errors: ${results.errors.length}`);
    
    if (results.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      results.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    console.log('\n🎨 FORMATTING DETECTED:');
    console.log(`Font sizes found: [${results.fontSizes.join(', ')}]px`);
    console.log(`Colors found: [${results.colors.join(', ')}]`);
    
    // Table analysis
    if (results.tables.length > 0) {
      console.log('\n📋 TABLES DETECTED:');
      results.tables.forEach((table, index) => {
        console.log(`  Table ${index + 1}: ${table.type}`);
        if (table.type === 'structured_table') {
          console.log(`    - ${table.rows} rows × ${table.columns} columns`);
          console.log(`    - HTML Table: ${table.htmlTable}`);
        } else {
          console.log(`    - ${table.rows} rows, ${table.columns} columns`);
        }
      });
    }
    
    // Image analysis
    if (results.images.length > 0) {
      console.log('\n🖼️  IMAGES/DIAGRAMS DETECTED:');
      results.images.forEach((image, index) => {
        console.log(`  Image ${index + 1}: ${image.type} - ${image.src}`);
        console.log(`    - Purpose: ${image.purpose}`);
      });
    }
    
    console.log('\n📝 TEXT CONTENT PREVIEW (first 500 chars):');
    console.log('"' + (results.textContent || '').substring(0, 500) + '"');
    
    console.log('\n🔍 HTML STRUCTURE PREVIEW (first 300 chars):');
    const htmlPreview = (results.htmlContent || '').replace(/\s+/g, ' ').substring(0, 300);
    console.log('"' + htmlPreview + '"');
    
    // Check for key elements
    console.log('\n✅ CONTENT VALIDATION:');
    const hasAcademicContent = (results.textContent || '').length > 1000; // Has substantial content
    const hasStructuredContent = (results.textContent || '').includes('Problem') || 
                                 (results.textContent || '').includes('Question') ||
                                 (results.textContent || '').includes('Exercise') ||
                                 (results.textContent || '').includes('Homework');
    const hasEducationalKeywords = (results.textContent || '').toLowerCase().includes('university') ||
                                   (results.textContent || '').toLowerCase().includes('course') ||
                                   (results.textContent || '').toLowerCase().includes('exam') ||
                                   (results.textContent || '').toLowerCase().includes('assignment');
    const hasFormattingElements = results.fontSizes.length > 2; // Multiple font sizes suggest structure
    const hasVisualElements = results.images.length > 0;
    
    console.log(`Academic content length: ${hasAcademicContent ? '✅' : '❌'} (${results.textLength} characters)`);
    console.log(`Structured content: ${hasStructuredContent ? '✅' : '❌'}`);
    console.log(`Educational context: ${hasEducationalKeywords ? '✅' : '❌'}`);
    console.log(`Multiple font sizes: ${hasFormattingElements ? '✅' : '❌'} (${results.fontSizes.length} sizes)`);
    console.log(`Visual elements: ${hasVisualElements ? '✅' : '❌'} (${results.images.length} images)`);
    console.log(`Tables detected: ${results.tables.length > 0 ? '✅' : '❌'} (${results.tables.length} tables)`);
    
    return {
      isValid: results.textLength > 0 && results.htmlLength > 0 && results.errors.length === 0,
      hasRequiredContent: hasAcademicContent && hasStructuredContent && hasEducationalKeywords,
      hasFormatting: hasFormattingElements,
      hasStructure: hasVisualElements && results.tables.length > 0
    };
  }

  /**
   * Save extraction results to files for inspection with enhanced data
   */
  static saveExtractionResults(results, outputDir = 'step1-output') {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
    
    // Save text content
    if (results.textContent) {
      fs.writeFileSync(path.join(outputDir, 'extracted-text.txt'), results.textContent);
      console.log(`💾 Text content saved to: ${outputDir}/extracted-text.txt`);
    }
    
    // Save HTML content  
    if (results.htmlContent) {
      // Create enhanced HTML with better table structure
      const enhancedHtml = PDFExtractor.createEnhancedHTML(results.htmlContent, results.tables);
      fs.writeFileSync(path.join(outputDir, 'extracted-layout.html'), enhancedHtml);
      console.log(`💾 Enhanced HTML layout saved to: ${outputDir}/extracted-layout.html`);
    }
    
    // Save structured table data
    if (results.tables.length > 0) {
      const tableData = results.tables.map((table, index) => ({
        tableIndex: index,
        type: table.type,
        data: table.data || 'See HTML content',
        metadata: {
          rows: table.rows,
          columns: table.columns
        }
      }));
      fs.writeFileSync(path.join(outputDir, 'extracted-tables.json'), JSON.stringify(tableData, null, 2));
      console.log(`💾 Table data saved to: ${outputDir}/extracted-tables.json`);
    }
    
    // Save image information
    if (results.images.length > 0) {
      fs.writeFileSync(path.join(outputDir, 'extracted-images.json'), JSON.stringify(results.images, null, 2));
      console.log(`💾 Image data saved to: ${outputDir}/extracted-images.json`);
    }
    
    // Save analysis results
    const analysis = {
      summary: {
        pdfPath: results.pdfPath,
        textLength: results.textLength,
        htmlLength: results.htmlLength,
        pageCount: results.pageCount,
        fontSizes: results.fontSizes,
        colors: results.colors,
        tableCount: results.tables.length,
        imageCount: results.images.length,
        errors: results.errors
      },
      tables: results.tables,
      images: results.images,
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync(path.join(outputDir, 'extraction-analysis.json'), JSON.stringify(analysis, null, 2));
    console.log(`💾 Analysis saved to: ${outputDir}/extraction-analysis.json`);
  }
}

// Test the extraction if this file is run directly
if (require.main === module) {
  async function testExtraction() {
    const pdfPath = process.argv[2] || 'midterm-sp24.pdf'; // Changed from 'midterm-fall21.pdf' to analyze generated PDF
    
    if (!fs.existsSync(pdfPath)) {
      console.error(`❌ PDF file not found: ${pdfPath}`);
      console.log('Usage: node step1-pdf-extraction.js <pdf-file-path>');
      process.exit(1);
    }
    
    console.log(`🎯 Testing PDF extraction with: ${pdfPath}\n`);
    
    const results = await PDFExtractor.extractPDFContent(pdfPath);
    const analysis = PDFExtractor.analyzeExtractionResults(results);
    PDFExtractor.saveExtractionResults(results);
    
    console.log('\n=== STEP 1 COMPLETION STATUS ===');
    console.log(`Extraction successful: ${analysis.isValid ? '✅' : '❌'}`);
    console.log(`Required content found: ${analysis.hasRequiredContent ? '✅' : '❌'}`);
    console.log(`Formatting preserved: ${analysis.hasFormatting ? '✅' : '❌'}`);
    console.log(`Structure preserved: ${analysis.hasStructure ? '✅' : '❌'}`);
    
    if (analysis.isValid && analysis.hasRequiredContent && analysis.hasFormatting && analysis.hasStructure) {
      console.log('\n🎉 STEP 1 PASSED! Ready for Step 2.');
    } else {
      console.log('\n⚠️  STEP 1 ISSUES DETECTED. Review the output files before proceeding.');
    }
  }
  
  testExtraction().catch(console.error);
}

module.exports = PDFExtractor; 