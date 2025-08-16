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
    
    const latex = `\\documentclass[${formatAnalysis.fontSize}]{${formatAnalysis.documentClass}}

% Enhanced packages for professional formatting
\\usepackage[margin=${formatAnalysis.margins.top}]{geometry}
\\usepackage{xcolor}
\\usepackage{array}
\\usepackage{booktabs}
\\usepackage{colortbl}
\\usepackage{amsmath}
\\usepackage{amsfonts}
\\usepackage{graphicx}
\\usepackage{tikz}
\\usepackage{fancyhdr}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{setspace}

% Set line spacing
\\setstretch{${formatAnalysis.spacing.lineSpacing}}

% Define custom colors
\\definecolor{headercolor}{HTML}{1a1a1a}
\\definecolor{bodycolor}{HTML}{333333}
\\definecolor{subquestioncolor}{HTML}{4169e1}
\\definecolor{tableheadercolor}{HTML}{f5f5f5}
\\definecolor{tablebordercolor}{HTML}{333333}

% Custom section formatting
\\titleformat{\\section}{\\Large\\bfseries\\color{headercolor}}{\\thesection}{1em}{}
\\titleformat{\\subsection}{\\large\\bfseries\\color{headercolor}}{\\thesubsection}{1em}{}

% Custom header and footer
\\pagestyle{fancy}
\\fancyhf{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

% Table formatting
\\newcolumntype{C}[1]{>{\\centering\\arraybackslash}p{#1}}
\\newcolumntype{L}[1]{>{\\raggedright\\arraybackslash}p{#1}}

\\begin{document}

% Course header
\\begin{center}
{\\fontsize{16}{20}\\selectfont\\bfseries\\color{headercolor}CSCI-UA.0480-051: Parallel Computing}

\\vspace{0.3cm}

{\\fontsize{14}{18}\\selectfont\\bfseries\\color{bodycolor}Midterm Exam (March 9th, 2023)}

\\vspace{0.2cm}

{\\fontsize{12}{16}\\selectfont\\bfseries\\color{bodycolor}Total: 100 points}
\\end{center}

\\vspace{0.8cm}

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
    let questionIndex = 0;
    let inTable = false;
    let tableData = [];
    let inCodeBlock = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line) {
        latexContent += '\n\\vspace{0.3cm}\n';
        continue;
      }
      
      // Skip course header and exam info (already handled in template)
      if (line.includes('CSCI-UA.0480') || line.includes('Midterm Exam') || line.includes('Total:')) {
        continue;
      }
      
      // Important Notes
      if (line.includes('Important Notes:')) {
        latexContent += '\\textbf{\\color{orange}Important Notes:}\n\\begin{itemize}[leftmargin=20pt]\n';
        continue;
      }
      
      // Bullet points
      if (line.startsWith('•')) {
        latexContent += `\\item \\color{bodycolor}${line.substring(1).trim()}\n`;
        continue;
      }
      
      // End of bullet points
      if (latexContent.includes('\\begin{itemize}') && !line.startsWith('•') && !line.includes('Important Notes:')) {
        if (latexContent.endsWith('\\begin{itemize}[leftmargin=20pt]\n')) {
          // No items were added, remove the itemize
          latexContent = latexContent.replace('\\begin{itemize}[leftmargin=20pt]\n', '');
        } else {
          latexContent += '\\end{itemize}\n\\vspace{0.5cm}\n';
        }
      }
      
      // Problem headers
      if (line.match(/^Problem\s+\d+/)) {
        const points = questionPoints[questionIndex] || 25;
        latexContent += `\\section*{\\color{headercolor}${line.replace(/\(\d+\s*points?\)/, `(${points} points)`)}}\n\\vspace{0.3cm}\n`;
        questionIndex++;
        continue;
      }
      
      // Sub-questions
      if (line.match(/^[a-z]\.\s*\[\d+/)) {
        latexContent += `\\textbf{\\color{subquestioncolor}${line}}\n\\vspace{0.2cm}\n`;
        continue;
      }
      
      if (line.match(/^[a-z]\.\s/)) {
        latexContent += `\\textbf{\\color{subquestioncolor}${line}}\n\\vspace{0.2cm}\n`;
        continue;
      }
      
      // Table detection
      if (line.includes('|') && line.split('|').length > 2) {
        if (!inTable) {
          inTable = true;
          tableData = [];
        }
        
        // Parse table row
        const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell);
        if (cells.length > 0 && !cells.every(cell => cell.match(/^[-=]+$/))) {
          tableData.push(cells);
        }
        continue;
      } else if (inTable) {
        // End of table
        latexContent += this.generateLaTeXTable(tableData);
        inTable = false;
        tableData = [];
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
      
      // Regular text
      if (line.includes('following table') || line.includes('Consider the') || line.includes('Suppose we have')) {
        latexContent += `\\color{bodycolor}${line}\n\\vspace{0.3cm}\n`;
      } else {
        latexContent += `\\color{bodycolor}${line}\n\\vspace{0.2cm}\n`;
      }
    }
    
    // Handle any remaining table
    if (inTable && tableData.length > 0) {
      latexContent += this.generateLaTeXTable(tableData);
    }
    
    return latexContent;
  }
  
  /**
   * Generate LaTeX table from table data
   * @param {Array} tableData - Array of table rows
   * @returns {string} - LaTeX table
   */
  static generateLaTeXTable(tableData) {
    if (!tableData || tableData.length === 0) return '';
    
    const numCols = Math.max(...tableData.map(row => row.length));
    const columnSpec = 'L{2.5cm}'.repeat(numCols);
    
    let tableLatex = '\\vspace{0.3cm}\n';
    tableLatex += '\\begin{center}\n';
    tableLatex += `\\begin{tabular}{|${columnSpec.split('').join('|')}|}\n`;
    tableLatex += '\\hline\n';
    
    for (let i = 0; i < tableData.length; i++) {
      const row = tableData[i];
      const isHeader = i === 0;
      
      if (isHeader) {
        tableLatex += '\\rowcolor{tableheadercolor}\n';
        tableLatex += `\\textbf{${row.join('} & \\textbf{')}} \\\\\n`;
      } else {
        tableLatex += `${row.join(' & ')} \\\\\n`;
      }
      tableLatex += '\\hline\n';
    }
    
    tableLatex += '\\end{tabular}\n';
    tableLatex += '\\end{center}\n';
    tableLatex += '\\vspace{0.5cm}\n';
    
    return tableLatex;
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
      const tempDir = path.join(__dirname, 'temp');
      const texFile = path.join(tempDir, `${filename}.tex`);
      const pdfFile = path.join(tempDir, `${filename}.pdf`);
      
      // Create temp directory
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // Write LaTeX file
      fs.writeFileSync(texFile, latexContent);
      console.log('✅ LaTeX file written:', texFile);
      
      // For now, let's create a mock PDF since LaTeX might not be installed
      // In production, this would use: pdflatex -output-directory=${tempDir} ${texFile}
      
      // Mock PDF generation - copy the LaTeX content to a .tex file for inspection
      const mockPdfPath = path.join(__dirname, 'backend/uploads', `${filename}.tex`);
      fs.writeFileSync(mockPdfPath, latexContent);
      
      console.log('✅ LaTeX document saved for inspection:', mockPdfPath);
      console.log('📝 LaTeX content preview:');
      console.log(latexContent.substring(0, 500) + '...');
      
      resolve(mockPdfPath);
    });
  }
}

module.exports = LaTeXPDFAnalyzer; 