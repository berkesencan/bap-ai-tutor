const PDFDocument = require('pdfkit');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const LaTeXPDFAnalyzer = require('./latex-pdf-analyzer');

/**
 * Service for generating PDF documents with professional formatting
 */
class PDFService {
  /**
   * Generate a PDF from exam content using LaTeX when template is available
   * @param {string} examContent - The exam content text
   * @param {string} subject - The subject/course name
   * @param {object} options - Additional options like difficulty, uploadedPdfPath, etc.
   * @returns {Promise<Buffer>} - PDF buffer
   */
  static async generateExamPDF(examContent, subject, options = {}) {
    console.log('=== PDF GENERATION START ===');
    console.log('Content length:', examContent ? examContent.length : 'No content');
    console.log('Subject:', subject);
    console.log('Options:', options);
    console.log('Uploaded PDF template path:', options.uploadedPdfPath || 'None');
    
    // Check if we have an uploaded PDF template for LaTeX-based generation
    if (options.uploadedPdfPath && await this.fileExists(options.uploadedPdfPath)) {
      console.log('=== USING LATEX-BASED PDF GENERATION ===');
      return this.generateLaTeXBasedPDF(examContent, subject, options);
    } else {
      console.log('=== USING TRADITIONAL PDFKIT GENERATION ===');
      return this.generateTraditionalPDF(examContent, subject, options);
    }
  }

  /**
   * Generate PDF using LaTeX approach with uploaded template
   * @param {string} examContent - The exam content text
   * @param {string} subject - The subject/course name
   * @param {object} options - Additional options
   * @returns {Promise<Buffer>} - PDF buffer
   */
  static async generateLaTeXBasedPDF(examContent, subject, options = {}) {
    try {
      console.log('=== LATEX-BASED PDF GENERATION ===');
      
      // Step 1: Analyze uploaded PDF for formatting
      console.log('📄 Step 1: Analyzing uploaded PDF formatting...');
      const formatAnalysis = await LaTeXPDFAnalyzer.analyzePDFFormatting(options.uploadedPdfPath);
      console.log('✅ PDF format analysis completed');
      
      // Step 2: Generate LaTeX document
      console.log('📝 Step 2: Converting content to LaTeX...');
      const latexDocument = LaTeXPDFAnalyzer.generateLaTeXDocument(
        examContent, 
        subject, 
        formatAnalysis, 
        options.questionPoints || []
      );
      console.log('✅ LaTeX document generated');
      
      // Step 3: Compile LaTeX to PDF
      console.log('🔧 Step 3: Compiling LaTeX to PDF...');
      const filename = `latex-exam-${subject.replace(/\s+/g, '-')}-${Date.now()}`;
      
      // Compile LaTeX to actual PDF
      const pdfPath = await LaTeXPDFAnalyzer.compileLaTeXToPDF(latexDocument, filename);
      console.log('✅ LaTeX compiled to PDF:', pdfPath);
      
      // Read the compiled PDF file and return as buffer
      const fs = require('fs');
      const pdfBuffer = fs.readFileSync(pdfPath);
      console.log('✅ PDF buffer created, size:', pdfBuffer.length);
      
      return pdfBuffer;
      
    } catch (error) {
      console.error('❌ LaTeX-based PDF generation failed:', error);
      console.log('🔄 Falling back to traditional PDF generation...');
      return this.generateTraditionalPDF(examContent, subject, options);
    }
  }

  /**
   * Generate PDF using traditional PDFKit approach
   * @param {string} examContent - The exam content text
   * @param {string} subject - The subject/course name
   * @param {object} options - Additional options
   * @returns {Promise<Buffer>} - PDF buffer
   */
  static async generateTraditionalPDF(examContent, subject, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        console.log('=== TRADITIONAL PDF GENERATION START ===');
        
        // Check if content is valid
        if (!examContent || typeof examContent !== 'string') {
          console.error('=== INVALID CONTENT ERROR ===');
          console.error('examContent:', examContent);
          console.error('Type:', typeof examContent);
          reject(new Error(`Invalid content: expected string, got ${typeof examContent}`));
          return;
        }
        
        // Sanitize content to handle potential issues
        let sanitizedContent = examContent.trim();
        
        if (sanitizedContent.length === 0) {
          console.error('=== EMPTY CONTENT ERROR ===');
          reject(new Error('Content is empty after sanitization'));
          return;
        }
        
        // Remove or replace problematic characters
        sanitizedContent = sanitizedContent
          .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
          .replace(/\r\n/g, '\n') // Normalize line endings
          .replace(/\r/g, '\n') // Convert remaining carriage returns
          .trim();
        
        console.log('Sanitized content length:', sanitizedContent.length);
        console.log('Content preview:', sanitizedContent.substring(0, 100) + '...');
        
        const doc = new PDFDocument({
          size: 'A4',
          margins: {
            top: 72,    // 1 inch
            bottom: 72, // 1 inch
            left: 72,   // 1 inch
            right: 72   // 1 inch
          }
        });

        const buffers = [];
        
        doc.on('data', (chunk) => {
          try {
            buffers.push(chunk);
          } catch (error) {
            console.error('Error in data event:', error);
            reject(error);
          }
        });
        
        doc.on('end', () => {
          try {
            console.log('PDF generation completed, buffer count:', buffers.length);
            const pdfBuffer = Buffer.concat(buffers);
            console.log('Final PDF buffer size:', pdfBuffer.length);
            resolve(pdfBuffer);
          } catch (error) {
            console.error('Error in end event:', error);
            reject(error);
          }
        });
        
        doc.on('error', (error) => {
          console.error('PDF document error:', error);
          reject(error);
        });

        // Add content with academic formatting
        try {
          console.log('About to call addProfessionalContent...');
          this.addProfessionalContent(doc, sanitizedContent, subject, options);
          console.log('addProfessionalContent completed successfully');
          console.log('Ending PDF document...');
          doc.end();
        } catch (contentError) {
          console.error('Error adding content to PDF:', contentError);
          reject(contentError);
        }
      } catch (error) {
        console.error('Error in PDF generation setup:', error);
        reject(error);
      }
    });
  }

  /**
   * Check if a file exists
   * @param {string} filePath - Path to check
   * @returns {Promise<boolean>} - Whether file exists
   */
  static async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Add professional content matching the uploaded exam format
   * @param {PDFDocument} doc - The PDF document
   * @param {string} content - The content to add
   * @param {string} subject - The subject name
   * @param {object} options - Additional options
   */
  static addProfessionalContent(doc, content, subject, options) {
    try {
      console.log('=== ADDING PROFESSIONAL CONTENT ===');
      
      // Check if content is already template-formatted
      const isTemplateFormatted = content.includes('CSCI-') || 
                                 content.includes('Midterm Exam') ||
                                 content.includes('Total:') ||
                                 content.includes('Important Notes') ||
                                 content.includes('READ BEFORE') ||
                                 content.match(/^[A-Z]{3,4}-[A-Z]{2}\.\d{4}-\d{3}:/m);
      
      if (isTemplateFormatted) {
        console.log('Using template-formatted content');
        this.addTemplateFormattedContent(doc, content);
      } else {
        console.log('Using standard academic formatting');
        this.addStandardAcademicContent(doc, content, subject, options);
      }
      
      console.log('=== PROFESSIONAL CONTENT FORMATTING COMPLETED ===');
    } catch (error) {
      console.error('=== ERROR IN PROFESSIONAL CONTENT ===');
      console.error('Error details:', error);
      throw error;
    }
  }

  /**
   * Add template-formatted content with professional styling
   * @param {PDFDocument} doc - The PDF document
   * @param {string} content - The pre-formatted content
   */
  static addTemplateFormattedContent(doc, content) {
    console.log('=== ADDING TEMPLATE-FORMATTED CONTENT ===');
    
    const lines = content.split('\n');
    let inCodeBlock = false;
    let inTable = false;
    let tableData = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      if (!trimmedLine) {
        // Empty line - end table if we're in one
        if (inTable) {
          this.renderProfessionalTable(doc, tableData);
          inTable = false;
          tableData = [];
          doc.moveDown(0.5);
        } else {
          doc.moveDown(0.4);
        }
        continue;
      }

      // Check if we need a new page
      if (doc.y > doc.page.height - 120) {
        doc.addPage();
      }

      // Detect table structures
      const isTableLine = this.isTableLine(trimmedLine);
      const isTableSeparator = this.isTableSeparator(trimmedLine);
      
      if (isTableLine) {
        if (!inTable) {
          inTable = true;
          tableData = [];
        }
        tableData.push(this.parseTableRow(trimmedLine));
        continue;
      } else if (isTableSeparator) {
        // Skip table separator lines but continue table processing
        continue;
      } else if (inTable) {
        // End of table, render it
        this.renderProfessionalTable(doc, tableData);
        inTable = false;
        tableData = [];
        doc.moveDown(0.5);
        // Fall through to process current line normally
      }

      // Detect ASCII art/diagram blocks
      const isAsciiArt = this.isAsciiArtLine(line);
      
      // Detect code blocks
      if (trimmedLine.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        continue;
      }
      
      // Handle diagrams with professional rendering
      if (inCodeBlock || isAsciiArt) {
        this.renderDiagram(doc, line);
        continue;
      }

      // Process content with professional formatting
      this.renderProfessionalLine(doc, trimmedLine);
    }
    
    // Render any remaining table
    if (inTable && tableData.length > 0) {
      this.renderProfessionalTable(doc, tableData);
    }
    
    console.log('=== TEMPLATE-FORMATTED CONTENT COMPLETED ===');
  }

  /**
   * Check if a line is part of a table structure
   * @param {string} line - The line to check
   * @returns {boolean} - True if line is part of a table
   */
  static isTableLine(line) {
    if (!line || typeof line !== 'string') return false;
    
    // Must contain at least 2 pipe characters
    const pipeCount = (line.match(/\|/g) || []).length;
    if (pipeCount < 2) return false;
    
    // Exclude separator lines (only dashes, equals, spaces, and pipes)
    if (line.match(/^\s*\|\s*[-=\s]*(\|\s*[-=\s]*)*\|\s*$/)) {
      return false;
    }
    
    // Must have actual content between pipes
    const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell.length > 0);
    const hasRealContent = cells.some(cell => cell.length > 0 && !cell.match(/^[-=\s]*$/));
    
    return hasRealContent && cells.length >= 2;
  }

  /**
   * Check if a line is a table separator (like |---|---|)
   * @param {string} line - Line to check
   * @returns {boolean} - True if line is a table separator
   */
  static isTableSeparator(line) {
    if (!line || typeof line !== 'string') return false;
    
    // Must contain pipes
    if (!line.includes('|')) return false;
    
    // Must be only dashes, equals, spaces, and pipes
    return line.match(/^\s*\|\s*[-=\s]*(\|\s*[-=\s]*)*\|\s*$/);
  }

  /**
   * Parse a table row into cells
   * @param {string} line - The table row line
   * @returns {Array} - Array of cell contents
   */
  static parseTableRow(line) {
    if (!line || typeof line !== 'string') return [];
    
    // Split by pipe and clean up cells
    const cells = line.split('|')
      .map(cell => cell.trim())
      .filter((cell, index, array) => {
        // Remove empty cells at start and end (from leading/trailing pipes)
        if (index === 0 || index === array.length - 1) {
          return cell.length > 0 && !cell.match(/^[-=\s]*$/);
        }
        return true; // Keep all middle cells, even if empty
      });
    
    return cells;
  }

  /**
   * Render a professional table matching the uploaded exam format
   * @param {PDFDocument} doc - The PDF document
   * @param {Array} tableData - Array of table rows
   */
  static renderProfessionalTable(doc, tableData) {
    if (!tableData || tableData.length === 0) return;
    
    console.log('=== RENDERING PROFESSIONAL TABLE ===');
    console.log('Raw table data:', tableData);
    
    // Clean and validate table data
    const cleanTableData = tableData.filter(row => 
      row && Array.isArray(row) && row.length > 0 && 
      !row.every(cell => !cell || cell.toString().match(/^[-=\s]*$/))
    );
    
    if (cleanTableData.length === 0) {
      console.log('No valid table data after cleaning');
      return;
    }
    
    console.log('Clean table data:', cleanTableData);
    
    // Determine number of columns and normalize rows
    const numCols = Math.max(...cleanTableData.map(row => row.length));
    console.log('Number of columns:', numCols);
    
    // Ensure all rows have the same number of columns
    const normalizedTableData = cleanTableData.map(row => {
      const normalizedRow = [...row];
      while (normalizedRow.length < numCols) {
        normalizedRow.push(''); // Fill missing cells
      }
      return normalizedRow.slice(0, numCols); // Trim extra columns
    });
    
    console.log('Normalized table data:', normalizedTableData);
    
    // Check if table will fit on current page
    const estimatedTableHeight = normalizedTableData.length * 28 + 50; // 28px per row + margins
    if (doc.y + estimatedTableHeight > doc.page.height - 100) {
      console.log('Table too large for current page, adding new page');
      doc.addPage();
    }
    
    // Use proper margins - left margin should be 72 (1 inch)
    const leftMargin = 72;
    const startX = leftMargin;
    const startY = doc.y;
    const availableWidth = doc.page.width - (leftMargin * 2); // Both left and right margins
    
    // Dynamic width calculation based on number of columns
    const maxTableWidth = Math.min(availableWidth, 500); // Don't exceed page width
    const tableWidth = Math.min(maxTableWidth, numCols * 80); // Minimum 80px per column
    const rowHeight = Math.max(28, Math.min(40, 280 / normalizedTableData.length)); // Dynamic row height
    const colWidth = tableWidth / numCols;
    
    console.log(`Table dimensions: ${tableWidth}px wide, ${rowHeight}px row height, ${colWidth}px column width`);
    
    // Enhanced professional styling
    const borderWidth = 1.2;
    const headerFontSize = Math.max(9, Math.min(11, 100 / numCols)); // Dynamic font size
    const cellFontSize = Math.max(8, Math.min(10, 90 / numCols));
    const borderColor = '#333333';
    const headerBgColor = '#f5f5f5';
    const headerTextColor = '#000000';
    const cellTextColor = '#222222';
    
    try {
      // Draw outer table border
      doc.lineWidth(borderWidth)
         .strokeColor(borderColor)
         .rect(startX, startY, tableWidth, normalizedTableData.length * rowHeight)
         .stroke();
      
      // Draw table content
      for (let i = 0; i < normalizedTableData.length; i++) {
        const row = normalizedTableData[i];
        const y = startY + (i * rowHeight);
        const isHeader = i === 0;
        
        console.log(`Rendering row ${i}:`, row);
        
        // Draw horizontal lines between rows
        if (i > 0) {
          doc.lineWidth(0.8)
             .strokeColor(borderColor)
             .moveTo(startX, y)
             .lineTo(startX + tableWidth, y)
             .stroke();
        }
        
        // Header row background
        if (isHeader) {
          doc.fillColor(headerBgColor)
             .rect(startX + 1, startY + 1, tableWidth - 2, rowHeight - 1)
             .fill();
          doc.fillColor(headerTextColor);
        }
        
        // Draw vertical lines and cell content
        for (let j = 0; j < numCols; j++) {
          const x = startX + (j * colWidth);
          
          // Draw vertical line
          if (j > 0) {
            doc.lineWidth(0.8)
               .strokeColor(borderColor)
               .moveTo(x, startY)
               .lineTo(x, startY + (normalizedTableData.length * rowHeight))
               .stroke();
          }
          
          // Add cell content
          const cellContent = (row[j] || '').toString();
          if (cellContent) {
            const fontSize = isHeader ? headerFontSize : cellFontSize;
            const fontWeight = isHeader ? 'Helvetica-Bold' : 'Helvetica';
            const textColor = isHeader ? headerTextColor : cellTextColor;
            
            const textX = x + 6;
            const textY = y + (rowHeight / 2) - (fontSize / 2) + 2;
            const maxWidth = colWidth - 12;
            
            // Handle text wrapping for long content
            doc.fontSize(fontSize)
               .font(fontWeight)
               .fillColor(textColor);
            
            // Simple text wrapping
            if (cellContent.length * fontSize * 0.6 > maxWidth) {
              // Text is too long, use smaller font or truncate
              const smallerFont = Math.max(6, fontSize - 1);
              doc.fontSize(smallerFont);
            }
            
            doc.text(cellContent, textX, textY, {
              width: maxWidth,
              align: 'left',
              baseline: 'middle',
              ellipsis: true
            });
          }
        }
      }
      
      // Draw outer border again
      doc.lineWidth(borderWidth)
         .strokeColor(borderColor)
         .rect(startX, startY, tableWidth, normalizedTableData.length * rowHeight)
         .stroke();
      
      // Reset colors and move cursor
      doc.fillColor('#000000').strokeColor('#000000');
      doc.y = startY + (normalizedTableData.length * rowHeight) + 20;
      
      console.log('=== TABLE RENDERING COMPLETED SUCCESSFULLY ===');
      
    } catch (error) {
      console.error('Error rendering table:', error);
      // Fallback: render as simple text
      doc.fillColor('#000000')
         .fontSize(10)
         .text('Table rendering failed - content:', startX, startY);
      
      normalizedTableData.forEach((row, i) => {
        doc.text(`Row ${i + 1}: ${row.join(' | ')}`, startX, doc.y + 5);
      });
      
      doc.moveDown(2);
    }
  }

  /**
   * Render a diagram with professional styling
   * @param {PDFDocument} doc - The PDF document
   * @param {string} line - The diagram line
   */
  static renderDiagram(doc, line) {
    const leftMargin = 72; // 1 inch left margin
    const availableWidth = doc.page.width - (leftMargin * 2); // Account for both margins
    
    // Enhanced diagram rendering for DAG structures
    if (this.isDAGLine(line)) {
      this.renderDAGLine(doc, line);
    } else {
      // Standard monospace rendering for other diagrams with proper positioning
      doc.fontSize(9)
         .font('Courier')
         .text(line, leftMargin, doc.y, { 
           width: availableWidth,
           align: 'left',
           lineGap: 1
         });
      doc.moveDown(0.1);
    }
  }

  /**
   * Check if line is part of a DAG diagram
   * @param {string} line - The line to check
   * @returns {boolean} - True if line is part of DAG
   */
  static isDAGLine(line) {
    // Look for DAG patterns like nodes with arrows
    return /[A-Z]\s*\([^)]*\)/.test(line) || // Node notation like A(2)
           /[\/\\|─→←↑↓]/.test(line) || // Arrow characters
           /^\s*[A-Z]\s*$/.test(line.trim()); // Single letter nodes
  }

  /**
   * Render a DAG line with professional styling
   * @param {PDFDocument} doc - The PDF document  
   * @param {string} line - The DAG line
   */
  static renderDAGLine(doc, line) {
    const leftMargin = 72; // 1 inch left margin
    const availableWidth = doc.page.width - (leftMargin * 2); // Account for both margins
    
    // Enhanced DAG rendering with better visual styling
    const trimmedLine = line.trim();
    
    // Check if this line contains nodes (like A(5), B(10))
    const nodeMatches = trimmedLine.match(/[A-Z]\(\d+\)/g);
    
    if (nodeMatches && nodeMatches.length > 0) {
      // This line contains nodes - render with enhanced node styling
      doc.fontSize(11)
         .font('Helvetica-Bold')
         .fillColor('#1a1a1a') // Dark gray for better contrast
         .text(trimmedLine, leftMargin, doc.y, { 
           width: availableWidth,
           align: 'center',
           lineGap: 3
         });
    } else if (trimmedLine.includes('→') || trimmedLine.includes('←') || trimmedLine.includes('↑') || trimmedLine.includes('↓')) {
      // This line contains arrows - render with arrow styling
      doc.fontSize(12)
         .font('Helvetica')
         .fillColor('#333333') // Medium gray for arrows
         .text(trimmedLine, leftMargin, doc.y, { 
           width: availableWidth,
           align: 'center',
           lineGap: 2
         });
    } else if (trimmedLine.match(/[\/\\|─\-_]/)) {
      // This line contains connection characters
      doc.fontSize(10)
         .font('Courier') // Monospace for better alignment
         .fillColor('#666666') // Light gray for connections
         .text(trimmedLine, leftMargin, doc.y, { 
           width: availableWidth,
           align: 'center',
           lineGap: 1
         });
    } else {
      // Regular diagram text
      doc.fontSize(10)
         .font('Courier')
         .fillColor('#444444') // Dark gray
         .text(trimmedLine, leftMargin, doc.y, { 
           width: availableWidth,
           align: 'center',
           lineGap: 2
         });
    }
    
    // Reset color to default
    doc.fillColor('#000000');
    doc.moveDown(0.15);
  }

  /**
   * Render a line with professional formatting
   * @param {PDFDocument} doc - The PDF document
   * @param {string} line - The line to render
   */
  static renderProfessionalLine(doc, line) {
    const leftMargin = 72; // 1 inch left margin
    const availableWidth = doc.page.width - (leftMargin * 2); // Account for both margins
    
    // Course code header (e.g., CSCI-UA.0480-051: Parallel Computing)
    if (line.match(/^[A-Z]{3,4}-[A-Z]{2}\.\d{4}-\d{3}:/)) {
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .fillColor('#1a1a1a') // Dark charcoal for better contrast
         .text(line, leftMargin, doc.y, { 
           width: availableWidth,
           align: 'center' 
         });
      doc.moveDown(0.4);
    }
    // Exam title
    else if (line.includes('Midterm Exam') || line.includes('Practice Exam') || line.includes('Final Exam')) {
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#2c2c2c') // Dark gray
         .text(line, leftMargin, doc.y, { 
           width: availableWidth,
           align: 'center' 
         });
      doc.moveDown(0.4);
    }
    // Total points
    else if (line.startsWith('Total:')) {
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor('#333333') // Medium dark gray
         .text(line, leftMargin, doc.y, { 
           width: availableWidth,
           align: 'center' 
         });
      doc.moveDown(0.8);
    }
    // Important Notes section
    else if (line.includes('Important Notes:') || line.includes('READ BEFORE')) {
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor('#b8860b') // Dark goldenrod for emphasis
         .text(line, leftMargin, doc.y, { 
           width: availableWidth,
           align: 'left' 
         });
      doc.moveDown(0.3);
    }
    // Bullet points for important notes
    else if (line.trim().startsWith('•')) {
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#4a4a4a') // Medium gray
         .text(line, leftMargin + 10, doc.y, { // Slight indent for bullets
           width: availableWidth - 10,
           align: 'left' 
         });
      doc.moveDown(0.2);
    }
    // Problem headers with points (e.g., "Problem 1 (25 points)")
    else if (line.match(/^Problem\s+\d+/) || line.match(/^\*\*Problem\s+\d+/)) {
      doc.fontSize(13)
         .font('Helvetica-Bold')
         .fillColor('#1a1a1a') // Dark charcoal
         .text(line.replace(/\*\*/g, ''), leftMargin, doc.y, { 
           width: availableWidth,
           align: 'left' 
         });
      doc.moveDown(0.5);
    }
    // Numbered questions (1., 2., 3.)
    else if (line.match(/^\d+\./)) {
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor('#2c2c2c') // Dark gray
         .text(line, leftMargin, doc.y, { 
           width: availableWidth,
           align: 'left' 
         });
      doc.moveDown(0.4);
    }
    // Sub-questions with points (a. [10], b. [15])
    else if (line.match(/^[a-z]\.\s*\[\d+\]/)) {
      doc.fontSize(11)
         .font('Helvetica-Bold')
         .fillColor('#4169e1') // Royal blue for sub-questions with points
         .text(line, leftMargin + 15, doc.y, { // Indent sub-questions
           width: availableWidth - 15,
           align: 'left' 
         });
      doc.moveDown(0.3);
    }
    // Sub-questions without points (a., b., c.)
    else if (line.match(/^[a-z]\.\s/)) {
      doc.fontSize(11)
         .font('Helvetica')
         .fillColor('#4169e1') // Royal blue for sub-questions
         .text(line, leftMargin + 15, doc.y, { // Indent sub-questions
           width: availableWidth - 15,
           align: 'left' 
         });
      doc.moveDown(0.3);
    }
    // Section headers or descriptive text before tables
    else if (line.includes('following table') || line.includes('Consider the') || 
             line.includes('The table') || line.includes('execution time') ||
             line.includes('Suppose we have') || line.includes('task dependency')) {
      doc.fontSize(11)
         .font('Helvetica')
         .fillColor('#2c2c2c') // Dark gray
         .text(line, leftMargin, doc.y, { 
           width: availableWidth,
           align: 'left',
           lineGap: 2
         });
      doc.moveDown(0.5);
    }
    // Regular content
    else {
      const cleanLine = line.replace(/\*\*(.*?)\*\*/g, '$1');
      doc.fontSize(11)
         .font('Helvetica')
         .fillColor('#333333') // Medium dark gray for body text
         .text(cleanLine, leftMargin, doc.y, { 
           width: availableWidth,
           align: 'left',
           lineGap: 2
         });
      doc.moveDown(0.4);
    }
    
    // Reset color to default black
    doc.fillColor('#000000');
  }

  /**
   * Add standard academic content with professional formatting
   * @param {PDFDocument} doc - The PDF document
   * @param {string} content - The content to add
   * @param {string} subject - The subject name
   * @param {object} options - Additional options
   */
  static addStandardAcademicContent(doc, content, subject, options) {
    // Add professional header matching the uploaded exam format
    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    // Generate course code based on subject
    let courseCode = '';
    if (subject.toLowerCase().includes('parallel computing')) {
      courseCode = 'CSCI-UA.0480-051: Parallel Computing';
    } else if (subject.toLowerCase().includes('computer science')) {
      courseCode = `CSCI-UA.${Math.floor(Math.random() * 900 + 100)}: ${subject}`;
    } else {
      const subjectAbbr = subject.split(' ').map(word => word.charAt(0).toUpperCase()).join('');
      courseCode = `${subjectAbbr}-UA.${Math.floor(Math.random() * 900 + 100)}: ${subject}`;
    }
    
    // Course header - exactly matching uploaded format
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text(courseCode, { align: 'center' });
    
    doc.moveDown(0.3);
    
    // Exam title
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('Practice Exam', { align: 'center' });
    
    doc.moveDown(0.3);
    
    // Date
    doc.fontSize(11)
       .font('Helvetica')
       .text(`Generated on ${currentDate}`, { align: 'center' });
    
    doc.moveDown(0.5);
    
    // Calculate total points
    const totalPoints = options.questionPoints ? 
      options.questionPoints.reduce((sum, points) => sum + points, 0) : 100;
    
    doc.fontSize(11)
       .font('Helvetica-Bold')
       .text(`Total: ${totalPoints} points`, { align: 'center' });
    
    doc.moveDown(0.8);
    
    // Add separator line matching uploaded format
    doc.lineWidth(0.5)
       .moveTo(72, doc.y)
       .lineTo(doc.page.width - 72, doc.y)
       .stroke();
    
    doc.moveDown(0.5);
    
    // Process content with enhanced formatting
    this.addTemplateFormattedContent(doc, content);
  }

  /**
   * Check if a line contains ASCII art or diagram elements
   * @param {string} line - The line to check
   * @returns {boolean} - True if line appears to be ASCII art
   */
  static isAsciiArtLine(line) {
    const asciiChars = /[┌┐└┘├┤┬┴┼│─╭╮╰╯╠╣╦╩╬║═╔╗╚╝╠╣╦╩╬]/;
    const drawingChars = /[\/\\|_\-+*=<>^v(){}\[\]]/;
    const spacedPattern = /\s+[\/\\|_\-+*=<>^v(){}\[\]]\s+/;
    
    const diagramPatterns = [
      /^\s*[A-Z]\(\d+\)\s*$/, // Node notation like A(2)
      /^\s*[\/\\|_\-+*=<>^v\s]{3,}\s*$/, // Lines with drawing characters
      /^\s*\d+\s*[\/\\|_\-+*=<>^v]\s*/, // Numbers with connectors
      /[A-Z]\(\d+\).*[\/\\|_\-+*=<>^v]/, // Nodes with connections
    ];
    
    return asciiChars.test(line) || 
           (drawingChars.test(line) && spacedPattern.test(line)) ||
           diagramPatterns.some(pattern => pattern.test(line)) ||
           (line.includes('(') && line.includes(')') && /[\/\\|_\-+*=<>^v]/.test(line));
  }

  /**
   * Save PDF to file system temporarily
   * @param {Buffer} pdfBuffer - The PDF buffer
   * @param {string} filename - The filename
   * @returns {Promise<string>} - File path
   */
  static async savePDFToFile(pdfBuffer, filename) {
    const uploadsDir = path.join(__dirname, '../uploads');
    await fs.mkdir(uploadsDir, { recursive: true });
    
    const filePath = path.join(uploadsDir, filename);
    await fs.writeFile(filePath, pdfBuffer);
    
    return filePath;
  }

  /**
   * Clean up temporary PDF files
   * @param {string} filePath - The file path to delete
   */
  static async cleanupPDF(filePath) {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.warn('Failed to cleanup PDF file:', error.message);
    }
  }

  /**
   * Extract text from PDF using pdftotext
   * @param {string} pdfPath - Path to the PDF file
   * @returns {Promise<string>} - Extracted text content
   */
  static async extractTextFromPDF(pdfPath) {
    return new Promise((resolve, reject) => {
      console.log('=== EXTRACTING TEXT FROM PDF ===');
      console.log('PDF path:', pdfPath);
      
      // Use pdftotext to extract text
      exec(`pdftotext "${pdfPath}" -`, (error, stdout, stderr) => {
        if (error) {
          console.error('pdftotext error:', error);
          console.error('stderr:', stderr);
          reject(new Error(`Failed to extract text from PDF: ${error.message}`));
          return;
        }
        
        console.log('✅ Text extracted successfully, length:', stdout.length);
        resolve(stdout);
      });
    });
  }
}

module.exports = PDFService; 