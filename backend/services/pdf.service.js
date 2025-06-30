const PDFDocument = require('pdfkit');
const fs = require('fs').promises;
const path = require('path');

/**
 * Service for generating PDF documents
 */
class PDFService {
  /**
   * Generate a PDF from exam content
   * @param {string} examContent - The exam content text
   * @param {string} subject - The subject/course name
   * @param {object} options - Additional options like difficulty, etc.
   * @returns {Promise<Buffer>} - PDF buffer
   */
  static async generateExamPDF(examContent, subject, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        console.log('=== PDF GENERATION START ===');
        console.log('Content length:', examContent ? examContent.length : 'No content');
        console.log('Content type:', typeof examContent);
        console.log('Subject:', subject);
        console.log('Options:', options);
        
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
          console.log('About to call addAcademicFormattedContent...');
          this.addAcademicFormattedContent(doc, sanitizedContent, subject, options);
          console.log('addAcademicFormattedContent completed successfully');
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
   * Add academic-style formatted content to the PDF document
   * @param {PDFDocument} doc - The PDF document
   * @param {string} content - The content to add
   * @param {string} subject - The subject name
   * @param {object} options - Additional options
   */
  static addAcademicFormattedContent(doc, content, subject, options) {
    try {
      console.log('=== ADDING ACADEMIC FORMATTED CONTENT ===');
      
      // Check if content is already template-formatted (from Gemini template matching)
      const isTemplateFormatted = content.includes('CSCI-') || 
                                 content.includes('Midterm Exam') ||
                                 content.includes('Total:') ||
                                 content.includes('Important Notes') ||
                                 content.includes('READ BEFORE') ||
                                 content.match(/^[A-Z]{3,4}-[A-Z]{2}\.\d{4}-\d{3}:/m) ||
                                 content.includes('Honor code') ||
                                 content.includes('points]') || // Points already formatted
                                 content.includes('pts)') ||
                                 content.includes('Problem \\d+') ||
                                 content.match(/^\d+\.\s+.*\[\d+\s+points?\]/m); // Question with points
      
      console.log('Template formatted content detected:', isTemplateFormatted);
      console.log('Content preview for detection:', content.substring(0, 300));
      
      if (isTemplateFormatted) {
        // Content is already properly formatted by Gemini template matching
        console.log('Using template-formatted content directly');
        this.addTemplateFormattedContent(doc, content);
      } else {
        // Content needs standard academic formatting
        console.log('Using standard academic formatting');
        this.addStandardAcademicContent(doc, content, subject, options);
      }
      
      console.log('=== ACADEMIC CONTENT FORMATTING COMPLETED ===');
    } catch (error) {
      console.error('=== ERROR IN ACADEMIC FORMATTED CONTENT ===');
      console.error('Error details:', error);
      throw error;
    }
  }

  /**
   * Add template-formatted content directly (when Gemini has already formatted it)
   * @param {PDFDocument} doc - The PDF document
   * @param {string} content - The pre-formatted content
   */
  static addTemplateFormattedContent(doc, content) {
    console.log('=== ADDING TEMPLATE-FORMATTED CONTENT ===');
    
    const lines = content.split('\n');
    let currentY = doc.y;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      if (!trimmedLine) {
        doc.moveDown(0.3);
        continue;
      }

      // Check if we need a new page
      if (doc.y > doc.page.height - 100) {
        doc.addPage();
      }

      // Course code header (e.g., CSCI-UA.0480-051: Parallel Computing)
      if (trimmedLine.match(/^[A-Z]{3,4}-[A-Z]{2}\.\d{4}-\d{3}:/)) {
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .text(trimmedLine, { align: 'center' });
        doc.moveDown(0.3);
      }
      // Exam title (e.g., Midterm Exam (Mar 9th, 2023))
      else if (trimmedLine.includes('Midterm Exam') || trimmedLine.includes('Practice Exam') || trimmedLine.includes('Final Exam')) {
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .text(trimmedLine, { align: 'center' });
        doc.moveDown(0.3);
      }
      // Total points
      else if (trimmedLine.startsWith('Total:')) {
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text(trimmedLine, { align: 'center' });
        doc.moveDown(0.8);
      }
      // Important Notes header
      else if (trimmedLine.includes('Important Notes') || trimmedLine.includes('READ BEFORE')) {
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor('red')
           .text(trimmedLine, { align: 'left' });
        doc.fillColor('black');
        doc.moveDown(0.4);
      }
      // Bullet points
      else if (trimmedLine.startsWith('•') || trimmedLine.startsWith('*') || trimmedLine.startsWith('-')) {
        doc.fontSize(10)
           .font('Helvetica')
           .text(`    ${trimmedLine}`, { align: 'left' });
        doc.moveDown(0.2);
      }
      // Honor code section
      else if (trimmedLine.includes('Honor code') || trimmedLine.includes('honor code')) {
        doc.fontSize(11)
           .font('Helvetica-Bold')
           .text(trimmedLine, { align: 'left' });
        doc.moveDown(0.3);
      }
      // Questions with numbers and points
      else if (trimmedLine.match(/^\d+\./)) {
        doc.fontSize(11)
           .font('Helvetica')
           .text(trimmedLine, { align: 'left' });
        doc.moveDown(0.5);
      }
      // Problem headers
      else if (trimmedLine.startsWith('Problem ')) {
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text(trimmedLine, { align: 'left' });
        doc.moveDown(0.3);
      }
      // Regular text
      else {
        doc.fontSize(10)
           .font('Helvetica')
           .text(trimmedLine, { align: 'left' });
        doc.moveDown(0.3);
      }
    }
    
    console.log('=== TEMPLATE-FORMATTED CONTENT COMPLETED ===');
  }

  /**
   * Add standard academic content (when content needs formatting)
   * @param {PDFDocument} doc - The PDF document
   * @param {string} content - The content to add
   * @param {string} subject - The subject name
   * @param {object} options - Additional options
   */
  static addStandardAcademicContent(doc, content, subject, options) {
    // Add academic header similar to the uploaded example
    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    // Generate course code based on subject
    let courseCode = '';
    if (subject.toLowerCase().includes('parallel computing')) {
      courseCode = 'CSCI-UA.0480-051: Parallel Computing';
    } else if (subject.toLowerCase().includes('computer science') || subject.toLowerCase().includes('cs')) {
      courseCode = `CS-${Math.floor(Math.random() * 900 + 100)}: ${subject}`;
    } else if (subject.toLowerCase().includes('math')) {
      courseCode = `MATH-${Math.floor(Math.random() * 900 + 100)}: ${subject}`;
    } else {
      // Generic course code
      const subjectAbbr = subject.split(' ').map(word => word.charAt(0).toUpperCase()).join('');
      courseCode = `${subjectAbbr}-${Math.floor(Math.random() * 900 + 100)}: ${subject}`;
    }
    
    // Course header - centered and bold
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text(courseCode, { align: 'center' });
    
    doc.moveDown(0.3);
    
    // Practice Exam title - centered and bold
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Practice Exam', { align: 'center' });
    
    doc.moveDown(0.5);
    
    // Date and difficulty info - centered
    doc.fontSize(12)
       .font('Helvetica')
       .text(`Generated on ${currentDate}`, { align: 'center' });
    
    if (options.difficulty) {
      doc.text(`Difficulty: ${options.difficulty.charAt(0).toUpperCase() + options.difficulty.slice(1)}`, { align: 'center' });
    }
    
    doc.moveDown(1);
    
    // Add Important Notes section (similar to uploaded example)
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('Important Notes:', { align: 'left' });
    
    doc.moveDown(0.3);
    
    doc.fontSize(10)
       .font('Helvetica')
       .text('• Answer all questions to the best of your ability', { align: 'left', indent: 0 });
    doc.text('• Show all work for partial credit', { align: 'left', indent: 0 });
    doc.text('• Use additional paper if needed', { align: 'left', indent: 0 });
    doc.text('• Time limit: 90 minutes', { align: 'left', indent: 0 });
    
    doc.moveDown(1);
    
    // Add a separator line
    doc.moveTo(72, doc.y)
       .lineTo(doc.page.width - 72, doc.y)
       .stroke();
    
    doc.moveDown(0.5);
    
    // Process the content with enhanced formatting
    const lines = content.split('\n');
    let currentSection = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      if (!trimmedLine) {
        doc.moveDown(0.3);
        continue;
      }

      // Check if we need a new page
      if (doc.y > doc.page.height - 100) {
        doc.addPage();
      }

      // Question headers (lines starting with numbers)
      if (/^\d+\./.test(trimmedLine)) {
        doc.moveDown(0.5);
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text(trimmedLine);
        doc.moveDown(0.3);
      }
      // Section headers (lines in ALL CAPS or with colons)
      else if (trimmedLine === trimmedLine.toUpperCase() && trimmedLine.length > 5 || trimmedLine.includes(':')) {
        doc.moveDown(0.3);
        doc.fontSize(11)
           .font('Helvetica-Bold')
           .text(trimmedLine);
        doc.moveDown(0.2);
      }
      // Multiple choice options (lines starting with letters)
      else if (/^[A-D]\)/.test(trimmedLine) || /^[a-d]\)/.test(trimmedLine)) {
        doc.fontSize(10)
           .font('Helvetica')
           .text(`   ${trimmedLine}`);
        doc.moveDown(0.1);
      }
      // Regular content
      else {
        doc.fontSize(10)
           .font('Helvetica')
           .text(trimmedLine, {
             width: 450,
             align: 'left'
           });
        doc.moveDown(0.2);
      }
    }
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
   * Add formatted content to the PDF document (original method, kept for compatibility)
   * @param {PDFDocument} doc - The PDF document
   * @param {string} content - The content to add
   */
  static addFormattedContent(doc, content) {
    try {
      console.log('=== ADDING FORMATTED CONTENT ===');
      console.log('Content length:', content.length);
      
      const lines = content.split('\n');
      console.log('Number of lines:', lines.length);

      for (let i = 0; i < lines.length; i++) {
        try {
          const line = lines[i];
          const trimmedLine = line.trim();
          
          if (!trimmedLine) {
            doc.moveDown(0.5);
            continue;
          }

          // Check if we need a new page
          if (doc.y > doc.page.height - 100) {
            doc.addPage();
          }

          // Question headers (lines starting with numbers)
          if (/^\d+\./.test(trimmedLine)) {
            doc.moveDown(0.5);
            doc.fontSize(12)
               .font('Helvetica-Bold')
               .text(trimmedLine);
            doc.moveDown(0.3);
          }
          // Section headers (lines in ALL CAPS or with colons)
          else if (trimmedLine === trimmedLine.toUpperCase() && trimmedLine.length > 5 || trimmedLine.includes(':')) {
            doc.moveDown(0.3);
            doc.fontSize(11)
               .font('Helvetica-Bold')
               .text(trimmedLine);
            doc.moveDown(0.2);
          }
          // Multiple choice options (lines starting with letters)
          else if (/^[A-D]\)/.test(trimmedLine) || /^[a-d]\)/.test(trimmedLine)) {
            doc.fontSize(11)
               .font('Helvetica')
               .text(`   ${trimmedLine}`);
          }
          // Regular content
          else {
            doc.fontSize(11)
               .font('Helvetica')
               .text(trimmedLine, {
                 width: 450,
                 align: 'left'
               });
          }
        } catch (lineError) {
          console.error(`Error processing line ${i}:`, lineError);
          console.error('Problematic line:', lines[i]);
          // Continue with next line instead of failing completely
          try {
            doc.fontSize(11)
               .font('Helvetica')
               .text(`[Error processing line: ${lines[i].substring(0, 50)}...]`);
          } catch (fallbackError) {
            console.error('Fallback text also failed:', fallbackError);
          }
        }
      }

      // Add answer space at the end
      try {
        doc.moveDown();
        doc.fontSize(10)
           .font('Helvetica-Oblique')
           .text('_'.repeat(80));
        doc.moveDown(0.5);
      } catch (footerError) {
        console.error('Error adding footer:', footerError);
      }
      
      console.log('=== CONTENT FORMATTING COMPLETED ===');
    } catch (error) {
      console.error('=== ERROR IN FORMATTED CONTENT ===');
      console.error('Error details:', error);
      throw error;
    }
  }
}

module.exports = PDFService; 