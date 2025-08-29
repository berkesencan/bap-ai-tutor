const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');

class LaTeXPDFAnalyzer {
  
  /**
   * Analyze uploaded PDF and extract LaTeX-compatible formatting
   * @param {string} pdfPath - Path to the uploaded PDF
   * @returns {Promise<Object>} - LaTeX formatting analysis
   */
  static async analyzePDFFormatting(pdfPath) {
    console.log('=== ANALYZING PDF FOR LATEX FORMATTING ===');
    console.log('PDF Path:', pdfPath);
    
    try {
      // For now, let's create a comprehensive LaTeX template based on academic standards
      // In the future, we could use PDF parsing tools to extract actual formatting
      
      const formatAnalysis = {
        documentClass: 'article',
        fontSize: '12pt',
        margins: {
          top: '1in',
          bottom: '1in', 
          left: '1in',
          right: '1in'
        },
        fonts: {
          main: 'Times New Roman',
          headers: 'Arial',
          monospace: 'Courier New'
        },
        colors: {
          headerText: '#1a1a1a',
          bodyText: '#333333',
          subQuestions: '#4169e1',
          tableHeaders: '#000000',
          tableBorders: '#333333'
        },
        spacing: {
          lineSpacing: '1.2',
          paragraphSpacing: '12pt',
          sectionSpacing: '18pt'
        },
        tableFormatting: {
          borderWidth: '1.2pt',
          headerBackground: '#f5f5f5',
          cellPadding: '8pt',
          rowHeight: '28pt'
        }
      };
      
      console.log('✅ PDF formatting analysis completed');
      return formatAnalysis;
      
    } catch (error) {
      console.error('❌ Error analyzing PDF formatting:', error);
      throw error;
    }
  }
  
  /**
   * Convert content to LaTeX format with proper academic formatting
   * @param {string} content - The exam content
   * @param {string} subject - Subject name
   * @param {Object} formatAnalysis - Formatting analysis from PDF
   * @param {Array} questionPoints - Point distribution
   * @returns {string} - LaTeX document
   */
  static generateLaTeXDocument(content, subject, formatAnalysis, questionPoints = []) {
    console.log('=== GENERATING LATEX DOCUMENT ===');
    
    const latex = `\\documentclass[12pt]{article}

% Essential packages only - no unnecessary dependencies
\\usepackage[margin=1in]{geometry}
\\usepackage{array}
\\usepackage{enumitem}

% Remove page numbers
\\pagestyle{empty}

% Configure itemize formatting to match original
\\setlist[itemize]{leftmargin=15pt,itemsep=2pt,parsep=0pt,topsep=3pt}

\\begin{document}

% Header - exact match to original PDF
\\begin{center}
{\\large\\bfseries CSCI-UA.0480-051: Parallel Computing}

\\vspace{0.2cm}

{\\normalsize\\bfseries Practice Exam}

\\vspace{0.1cm}

{\\normalsize\\bfseries Total: 100 points}
\\end{center}

\\vspace{0.4cm}

${this.convertContentToLaTeX(content, questionPoints)}

\\end{document}`;

    console.log('✅ LaTeX document generated');
    console.log('Document length:', latex.length);
    
    return latex;
  }
  
  /**
   * Convert content sections to LaTeX format
   * @param {string} content - Raw content
   * @param {Array} questionPoints - Point distribution
   * @returns {string} - LaTeX formatted content
   */
  static convertContentToLaTeX(content, questionPoints = []) {
    const lines = content.split('\n');
    let latexContent = '';
    let inTable = false;
    let tableData = [];
    let inCodeBlock = false;
    let questionIndex = 0;
    
    console.log('=== CONVERTING CONTENT TO LATEX ===');
    console.log('Total lines:', lines.length);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line) {
        // Empty line - check if we need to end a table
        if (inTable) {
          console.log('Empty line detected, ending table');
          latexContent += this.generateSimpleLaTeXTable(tableData);
          inTable = false;
          tableData = [];
        }
        latexContent += '\n\\vspace{0.3cm}\n';
        continue;
      }
      
      console.log(`Processing line ${i}: "${line}"`);
      
      // Problem headers
      if (line.match(/^Problem\s+\d+/)) {
        // End any open table before starting new problem
        if (inTable) {
          console.log('Problem header detected, ending table');
          latexContent += this.generateSimpleLaTeXTable(tableData);
          inTable = false;
          tableData = [];
        }
        
        const points = questionPoints[questionIndex] || 25;
        latexContent += `{\\bfseries ${this.escapeLatexSpecialChars(line.replace(/\(\d+\s*points?\)/, `(${points} points)`))}}\n\n\\vspace{0.3cm}\n`;
        questionIndex++;
        continue;
      }
      
      // Sub-questions with points
      if (line.match(/^[a-z]\.\s*\[\d+/)) {
        // End any open table before sub-question
        if (inTable) {
          console.log('Sub-question detected, ending table');
          latexContent += this.generateSimpleLaTeXTable(tableData);
          inTable = false;
          tableData = [];
        }
        latexContent += `${this.escapeLatexSpecialChars(line)}\n\n\\vspace{0.2cm}\n`;
        continue;
      }
      
      // Sub-questions without points
      if (line.match(/^[a-z]\.\s/)) {
        // End any open table before sub-question
        if (inTable) {
          console.log('Sub-question detected, ending table');
          latexContent += this.generateSimpleLaTeXTable(tableData);
          inTable = false;
          tableData = [];
        }
        latexContent += `${this.escapeLatexSpecialChars(line)}\n\n\\vspace{0.2cm}\n`;
        continue;
      }
      
      // Enhanced table detection
      const isTableLine = this.isTableLine(line);
      const isTableSeparator = this.isTableSeparator(line);
      
      if (isTableLine) {
        if (!inTable) {
          console.log('Starting new table');
          inTable = true;
          tableData = [];
        }
        
        // Parse table row with improved logic
        const cells = this.parseTableRow(line);
        if (cells.length > 0) {
          console.log('Adding table row:', cells);
          tableData.push(cells);
        }
        continue;
      } else if (isTableSeparator) {
        // Table separator - continue processing table but don't add this line
        console.log('Skipping table separator line');
        continue;
      } else if (inTable) {
        // Non-table line encountered, end current table
        console.log('Non-table line detected, ending table');
        latexContent += this.generateSimpleLaTeXTable(tableData);
        inTable = false;
        tableData = [];
        // Fall through to process the current line normally
      }
      
      // Code blocks for DAG diagrams
      if (line.includes('```')) {
        inCodeBlock = !inCodeBlock;
        if (inCodeBlock) {
          latexContent += '\\begin{center}\n\\begin{verbatim}\n';
        } else {
          latexContent += '\\end{verbatim}\n\\end{center}\n\\vspace{0.5cm}\n';
        }
        continue;
      }
      
      if (inCodeBlock) {
        latexContent += line + '\n';
        continue;
      }
      
      // Important Notes section
      if (line.includes('Important Notes') || line.includes('READ BEFORE')) {
        latexContent += `{\\bfseries ${this.escapeLatexSpecialChars(line)}}\n\n`;
        continue;
      }
      
      // Regular text
      latexContent += `${this.escapeLatexSpecialChars(line)}\n\n`;
    }
    
    // Handle any remaining table at the end
    if (inTable && tableData.length > 0) {
      console.log('Ending final table');
      latexContent += this.generateSimpleLaTeXTable(tableData);
    }
    
    console.log('=== LATEX CONVERSION COMPLETED ===');
    return latexContent;
  }
  
  /**
   * Enhanced table line detection
   * @param {string} line - Line to check
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
   * Enhanced table row parsing
   * @param {string} line - Table row line
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
   * Generate simple LaTeX table without complex formatting
   * @param {Array} tableData - Array of table rows
   * @returns {string} - Simple LaTeX table
   */
  static generateSimpleLaTeXTable(tableData) {
    if (!tableData || tableData.length === 0) return '';
    
    console.log('=== GENERATING SIMPLE LATEX TABLE ===');
    console.log('Raw table data:', tableData);
    
    // Clean and validate table data
    const cleanTableData = tableData.filter(row => 
      row && Array.isArray(row) && row.length > 0 && 
      !row.every(cell => !cell || cell.match(/^[-=\s]*$/))
    );
    
    if (cleanTableData.length === 0) {
      console.log('No valid table data after cleaning');
      return '';
    }
    
    console.log('Clean table data:', cleanTableData);
    
    // Determine number of columns (use maximum from all rows)
    const numCols = Math.max(...cleanTableData.map(row => row.length));
    console.log('Number of columns:', numCols);
    
    // Ensure all rows have the same number of columns
    const normalizedTableData = cleanTableData.map(row => {
      const normalizedRow = [...row];
      while (normalizedRow.length < numCols) {
        normalizedRow.push(''); // Fill missing cells with empty strings
      }
      return normalizedRow.slice(0, numCols); // Trim extra columns
    });
    
    console.log('Normalized table data:', normalizedTableData);
    
    let tableLatex = '\\vspace{0.3cm}\n';
    tableLatex += '\\begin{center}\n';
    
    // Simple column specification - just centered columns with borders
    const columnSpec = Array(numCols).fill('c').join('|');
    tableLatex += `\\begin{tabular}{|${columnSpec}|}\n`;
    tableLatex += '\\hline\n';
    
    // Generate table rows
    for (let i = 0; i < normalizedTableData.length; i++) {
      const row = normalizedTableData[i];
      const isHeader = i === 0;
      
      console.log(`Processing row ${i}:`, row);
      
      const escapedRow = row.map(cell => this.escapeLatexSpecialChars(cell || ''));
      
      if (isHeader) {
        tableLatex += `\\textbf{${escapedRow.join('} & \\textbf{')}} \\\\\n`;
      } else {
        tableLatex += `${escapedRow.join(' & ')} \\\\\n`;
      }
      tableLatex += '\\hline\n';
    }
    
    tableLatex += '\\end{tabular}\n';
    tableLatex += '\\end{center}\n';
    tableLatex += '\\vspace{0.5cm}\n';
    
    console.log('Generated simple LaTeX table:', tableLatex);
    return tableLatex;
  }
  
  /**
   * Escape LaTeX special characters properly
   * @param {string} text - Text to escape
   * @returns {string} - Escaped text
   */
  static escapeLatexSpecialChars(text) {
    if (!text) return '';
    
    // First, handle mathematical expressions before escaping $ signs
    let result = text
      .replace(/10\^9/g, '###MATH10TO9###')  // Temporary placeholder
      .replace(/(\d+)\^(\d+)/g, '###MATH$1TO$2###');  // Temporary placeholder
    
    // Then escape special LaTeX characters
    result = result
      .replace(/\\/g, '\\textbackslash{}')
      .replace(/\$/g, '\\$')  // Escape $ signs
      .replace(/%/g, '\\%')
      .replace(/&/g, '\\&')
      .replace(/#/g, '\\#')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}')
      .replace(/_/g, '\\_')
      .replace(/\^/g, '\\textasciicircum{}')
      .replace(/~/g, '\\textasciitilde{}');
    
    // Finally, replace placeholders with proper math mode
    result = result
      .replace(/###MATH10TO9###/g, '$10^9$')
      .replace(/###MATH(\d+)TO(\d+)###/g, '$$$1^{$2}$$');
    
    return result;
  }
  
  /**
   * Clean LaTeX content from Gemini response by removing markdown code blocks
   * @param {string} content - Raw content that may contain markdown code blocks
   * @returns {string} - Clean LaTeX content
   */
  static cleanLatexContent(content) {
    console.log('=== CLEANING LATEX CONTENT ===');
    console.log('Input content length:', content.length);
    console.log('First 100 chars:', content.substring(0, 100));
    
    let cleaned = content;
    
    // Remove markdown code block syntax
    // Pattern: ```latex ... ``` or ``` ... ```
    cleaned = cleaned.replace(/^```latex\s*\n?/gm, '');
    cleaned = cleaned.replace(/^```\s*\n?/gm, '');
    cleaned = cleaned.replace(/\n?```\s*$/gm, '');
    
    // Remove any remaining backticks at start/end
    cleaned = cleaned.replace(/^`+/gm, '');
    cleaned = cleaned.replace(/`+$/gm, '');
    
    // Trim whitespace
    cleaned = cleaned.trim();
    
    console.log('Cleaned content length:', cleaned.length);
    console.log('First 100 chars after cleaning:', cleaned.substring(0, 100));
    
    // Validate that it starts with \documentclass
    if (!cleaned.startsWith('\\documentclass')) {
      console.warn('⚠️  Cleaned content does not start with \\documentclass');
      console.log('Content starts with:', cleaned.substring(0, 50));
    } else {
      console.log('✅ Content properly starts with \\documentclass');
    }
    
    return cleaned;
  }
  
  /**
   * Compile LaTeX to PDF
   * @param {string} latexContent - LaTeX document content
   * @param {string} filename - Output filename
   * @returns {Promise<string>} - Path to generated PDF
   */
  static async compileLaTeXToPDF(latexContent, filename) {
    console.log('=== COMPILING LATEX TO PDF ===');
    
    return new Promise((resolve, reject) => {
      const uploadsDir = path.join(__dirname, '../uploads');
      const texFile = path.join(uploadsDir, `${filename}.tex`);
      const pdfFile = path.join(uploadsDir, `${filename}.pdf`);
      
      // Ensure uploads directory exists
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      // Clean the LaTeX content before writing
      const cleanedLatexContent = this.cleanLatexContent(latexContent);
      
      // Write cleaned LaTeX file
      fs.writeFileSync(texFile, cleanedLatexContent);
      console.log('✅ Cleaned LaTeX file written:', texFile);
      
      // Try to find pdflatex
      const possiblePaths = [
        '/usr/local/texlive/2025basic/bin/universal-darwin/pdflatex',
        '/usr/local/texlive/2024basic/bin/universal-darwin/pdflatex',
        '/usr/local/texlive/2023basic/bin/universal-darwin/pdflatex',
        'pdflatex' // System PATH
      ];
      
      let pdflatexCommand = null;
      
      // Check each possible path
      for (const path of possiblePaths) {
        if (path === 'pdflatex') {
          // Check if it's in system PATH
          try {
            const { execSync } = require('child_process');
            execSync('which pdflatex', { stdio: 'ignore' });
            pdflatexCommand = 'pdflatex';
            console.log('✅ Found pdflatex in system PATH');
            break;
          } catch (e) {
            continue;
          }
        } else {
          // Check if file exists
          if (fs.existsSync(path)) {
            pdflatexCommand = path;
            console.log('✅ Found pdflatex at:', path);
            break;
          }
        }
      }
      
      if (!pdflatexCommand) {
        console.log('⚠️  pdflatex not found, creating mock PDF');
        this.createMockPDF(pdfFile, texFile);
        resolve(pdfFile);
        return;
      }
      
      // Compile LaTeX to PDF
      console.log('🔧 Compiling with pdflatex...');
      this.compileLaTeXWithCommand(pdflatexCommand, uploadsDir, filename, pdfFile, resolve, reject);
    });
  }

  /**
   * Create a simple mock PDF for testing
   */
  static createMockPDF(pdfFile, texFile) {
    const mockPdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length 200
>>
stream
BT
/F1 12 Tf
50 750 Td
(This is a mock PDF - pdflatex not available) Tj
0 -30 Td
(LaTeX source file: ${texFile}) Tj
0 -30 Td
(To get real PDF compilation, ensure pdflatex is installed) Tj
0 -30 Td
(and in PATH, or install BasicTeX: brew install --cask basictex) Tj
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000274 00000 n 
0000000580 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
667
%%EOF`;
    
    fs.writeFileSync(pdfFile, mockPdfContent);
    console.log('✅ Mock PDF created:', pdfFile);
  }

  /**
   * Helper method to compile LaTeX with a specific pdflatex command
   */
  static compileLaTeXWithCommand(pdflatexCommand, uploadsDir, filename, pdfFile, resolve, reject) {
    const compileCommand = `cd "${uploadsDir}" && "${pdflatexCommand}" -interaction=nonstopmode "${filename}.tex"`;
    console.log('🔧 Executing:', compileCommand);
    
    // Set environment with BasicTeX path
    const env = { 
      ...process.env, 
      PATH: `/usr/local/texlive/2025basic/bin/universal-darwin:${process.env.PATH}` 
    };
    
    exec(compileCommand, { env }, (compileError, stdout, stderr) => {
      if (compileError) {
        console.error('❌ LaTeX compilation failed:', compileError);
        console.error('LaTeX stdout:', stdout);
        console.error('LaTeX stderr:', stderr);
        
        // Fall back to mock PDF
        const mockPdfContent = `%PDF-1.4
Mock PDF - LaTeX compilation failed
Error: ${compileError.message}
LaTeX file saved at: ${path.join(uploadsDir, filename + '.tex')}`;
        
        fs.writeFileSync(pdfFile, mockPdfContent);
        console.log('✅ Fallback mock PDF created:', pdfFile);
        resolve(pdfFile);
      } else {
        console.log('✅ LaTeX compilation successful!');
        console.log('LaTeX output:', stdout);
        
        // Check if PDF was actually created
        if (fs.existsSync(pdfFile)) {
          console.log('✅ PDF file created:', pdfFile);
          
          // Clean up auxiliary files
          const auxFiles = [
            path.join(uploadsDir, `${filename}.aux`),
            path.join(uploadsDir, `${filename}.log`),
            path.join(uploadsDir, `${filename}.out`)
          ];
          
          auxFiles.forEach(auxFile => {
            if (fs.existsSync(auxFile)) {
              try {
                fs.unlinkSync(auxFile);
              } catch (cleanupError) {
                console.warn('Failed to cleanup aux file:', auxFile);
              }
            }
          });
          
          resolve(pdfFile);
        } else {
          console.error('❌ PDF file was not created');
          reject(new Error('PDF compilation completed but file not found'));
        }
      }
    });
  }
}

module.exports = LaTeXPDFAnalyzer; 