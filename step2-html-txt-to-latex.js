const fs = require('fs');
const path = require('path');

/**
 * Step 2: HTML + TXT → LaTeX Conversion (ENHANCED)
 * 
 * Intelligently converts HTML layout + TXT content to professional LaTeX
 * that preserves the original PDF formatting exactly.
 */
class HTMLTXTToLatexConverter {

  /**
   * Main conversion method - converts Step 1 output to LaTeX
   */
  static async convertToLatex(step1OutputDir = 'step1-output', questionsText = null) {
    console.log('🎯 Starting Step 2: ENHANCED HTML + TXT → LaTeX Conversion\n');
    
    try {
      // Load Step 1 outputs
      const step1Data = this.loadStep1Outputs(step1OutputDir);
      
      // Parse HTML structure intelligently
      const htmlStructure = this.parseHTMLStructure(step1Data.htmlContent);
      
      // Extract precise formatting specifications
      const formattingSpecs = this.extractPreciseFormatting(step1Data.htmlContent);
      
      // Analyze text content structure
      const contentStructure = this.analyzeTextStructure(step1Data.textContent);
      
      // Create intelligent LaTeX mapping
      const latexMapping = this.createLatexMapping(htmlStructure, contentStructure, formattingSpecs);
      
      // Generate high-quality LaTeX
      const latexContent = this.generateIntelligentLatex(
        step1Data.textContent,
        latexMapping,
        formattingSpecs,
        questionsText
      );
      
      // Validate and optimize LaTeX
      const optimizedLatex = this.validateAndOptimizeLatex(latexContent);
      
      // Save and analyze results
      const results = {
        originalTextLength: step1Data.textContent.length,
        originalHtmlLength: step1Data.htmlContent.length,
        htmlStructure: htmlStructure,
        formattingSpecs: formattingSpecs,
        contentStructure: contentStructure,
        latexMapping: latexMapping,
        latexContent: optimizedLatex,
        latexLength: optimizedLatex.length,
        questionsIncluded: questionsText ? true : false,
        timestamp: new Date().toISOString()
      };
      
      this.saveStep2Results(results);
      this.analyzeConversionResults(results);
      
      return results;
      
    } catch (error) {
      console.error('❌ Step 2 conversion failed:', error.message);
      throw error;
    }
  }

  /**
   * Load all outputs from Step 1
   */
  static loadStep1Outputs(outputDir) {
    console.log('📂 Loading Step 1 outputs...');
    
    const textPath = path.join(outputDir, 'extracted-text.txt');
    const htmlPath = path.join(outputDir, 'extracted-layout.html');
    const analysisPath = path.join(outputDir, 'extraction-analysis.json');
    
    if (!fs.existsSync(textPath) || !fs.existsSync(htmlPath)) {
      throw new Error(`Step 1 outputs not found in ${outputDir}. Run Step 1 first.`);
    }
    
    const textContent = fs.readFileSync(textPath, 'utf8');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    let analysisData = {};
    if (fs.existsSync(analysisPath)) {
      analysisData = JSON.parse(fs.readFileSync(analysisPath, 'utf8'));
    }
    
    console.log(`✅ Loaded text content: ${textContent.length} characters`);
    console.log(`✅ Loaded HTML content: ${htmlContent.length} characters`);
    
    return {
      textContent,
      htmlContent,
      analysisData
    };
  }

  /**
   * Parse HTML structure intelligently
   */
  static parseHTMLStructure(htmlContent) {
    console.log('🔍 Parsing HTML structure intelligently...');
    
    const structure = {
      elements: [],
      pages: [],
      hierarchy: {},
      positioning: {}
    };
    
    // Extract positioned elements (p tags with absolute positioning)
    const positionedElements = this.extractPositionedElements(htmlContent);
    structure.elements = positionedElements;
    
    // STORE ELEMENTS FOR LATER USE
    this._currentHTMLElements = positionedElements;
    
    // Group elements by vertical position (rows)
    const rows = this.groupElementsByRows(positionedElements);
    structure.hierarchy = rows;
    
    // Detect page breaks and sections
    const pages = this.detectPageStructure(positionedElements);
    structure.pages = pages;
    
    console.log(`✅ Found ${structure.elements.length} positioned elements`);
    console.log(`✅ Organized into ${Object.keys(structure.hierarchy).length} rows`);
    console.log(`✅ Detected ${structure.pages.length} page sections`);
    console.log(`📦 Stored ${this._currentHTMLElements.length} elements for HTML-TXT mapping`);
    
    return structure;
  }

  /**
   * Extract positioned elements from HTML
   */
  static extractPositionedElements(htmlContent) {
    const elements = [];
    
    // Match positioned p elements with style attributes
    const pElementRegex = /<p\s+style="position:absolute;top:(\d+)px;left:(\d+)px;[^"]*"[^>]*>([^<]*(?:<[^p][^>]*>[^<]*<\/[^p][^>]*>)*[^<]*)<\/p>/g;
    
    let match;
    while ((match = pElementRegex.exec(htmlContent)) !== null) {
      const top = parseInt(match[1]);
      const left = parseInt(match[2]);
      let content = match[3].replace(/<[^>]*>/g, '').trim(); // Remove HTML tags
      
      // DECODE HTML ENTITIES
      content = this.decodeHTMLEntities(content);
      
      if (content.length > 0) {
        // Extract font size and color from style
        const fontSize = this.extractFontSize(match[0]);
        const color = this.extractColor(match[0]);
        
        elements.push({
          top: top,
          left: left,
          content: content,
          fontSize: fontSize,
          color: color,
          rawHtml: match[0]
        });
      }
    }
    
    // Sort by top position, then by left position
    elements.sort((a, b) => {
      if (Math.abs(a.top - b.top) < 5) { // Same row (within 5px)
        return a.left - b.left;
      }
      return a.top - b.top;
    });
    
    return elements;
  }

  /**
   * Decode HTML entities
   */
  static decodeHTMLEntities(text) {
    const entities = {
      '&#160;': ' ',
      '&nbsp;': ' ',
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&apos;': "'"
    };
    
    let decoded = text;
    Object.keys(entities).forEach(entity => {
      decoded = decoded.replace(new RegExp(entity, 'g'), entities[entity]);
    });
    
    return decoded;
  }

  /**
   * Extract font size from HTML element
   */
  static extractFontSize(htmlElement) {
    const fontSizeMatch = htmlElement.match(/font-size:(\d+)px/);
    return fontSizeMatch ? parseInt(fontSizeMatch[1]) : 12;
  }

  /**
   * Extract color from HTML element
   */
  static extractColor(htmlElement) {
    const colorMatch = htmlElement.match(/color:(#[0-9a-fA-F]{6})/);
    return colorMatch ? colorMatch[1] : '#000000';
  }

  /**
   * Group elements by rows (similar vertical positions)
   */
  static groupElementsByRows(elements) {
    const rows = {};
    const rowThreshold = 5; // Elements within 5px are considered same row
    
    elements.forEach(element => {
      let rowKey = null;
      
      // Find existing row within threshold
      for (const existingRow of Object.keys(rows)) {
        const rowTop = parseInt(existingRow);
        if (Math.abs(element.top - rowTop) <= rowThreshold) {
          rowKey = existingRow;
          break;
        }
      }
      
      // Create new row if none found
      if (!rowKey) {
        rowKey = element.top.toString();
        rows[rowKey] = [];
      }
      
      rows[rowKey].push(element);
    });
    
    // Sort elements within each row by left position
    Object.keys(rows).forEach(rowKey => {
      rows[rowKey].sort((a, b) => a.left - b.left);
    });
    
    return rows;
  }

  /**
   * Detect page structure and sections
   */
  static detectPageStructure(elements) {
    const pages = [];
    const pageHeight = 800; // Approximate page height in pixels
    
    let currentPage = { elements: [], startTop: 0, endTop: 0 };
    
    elements.forEach(element => {
      if (element.top > currentPage.endTop + pageHeight) {
        // New page detected
        if (currentPage.elements.length > 0) {
          pages.push(currentPage);
        }
        currentPage = { elements: [element], startTop: element.top, endTop: element.top };
      } else {
        currentPage.elements.push(element);
        currentPage.endTop = Math.max(currentPage.endTop, element.top);
      }
    });
    
    // Add last page
    if (currentPage.elements.length > 0) {
      pages.push(currentPage);
    }
    
    return pages;
  }

  /**
   * Extract precise formatting specifications
   */
  static extractPreciseFormatting(htmlContent) {
    console.log('🎨 Extracting precise formatting specifications...');
    
    // Extract all font sizes with frequency
    const fontSizeMap = {};
    const fontMatches = htmlContent.match(/font-size:(\d+)px/g);
    if (fontMatches) {
      fontMatches.forEach(match => {
        const size = parseInt(match.match(/\d+/)[0]);
        fontSizeMap[size] = (fontSizeMap[size] || 0) + 1;
      });
    }
    
    // Sort font sizes by frequency (most used first)
    const fontSizes = Object.keys(fontSizeMap)
      .map(size => parseInt(size))
      .sort((a, b) => fontSizeMap[b] - fontSizeMap[a]);
    
    // Extract colors
    const colorMap = {};
    const colorMatches = htmlContent.match(/color:(#[0-9a-fA-F]{6})/g);
    if (colorMatches) {
      colorMatches.forEach(match => {
        const color = match.match(/#[0-9a-fA-F]{6}/)[0];
        colorMap[color] = (colorMap[color] || 0) + 1;
      });
    }
    
    const colors = Object.keys(colorMap);
    
    // Map font sizes to semantic roles
    const fontMapping = this.mapFontsToSemanticRoles(fontSizes, fontSizeMap);
    
    const specs = {
      fontSizes: fontSizes,
      fontSizeFrequency: fontSizeMap,
      colors: colors,
      colorFrequency: colorMap,
      fontMapping: fontMapping,
      hasRedText: colors.includes('#ff0000'),
      documentStyle: this.detectDocumentStyle(fontSizes, colors, htmlContent)
    };
    
    console.log(`✅ Font sizes by frequency: [${fontSizes.join(', ')}]px`);
    console.log(`✅ Colors detected: [${colors.join(', ')}]`);
    console.log(`✅ Document style: ${specs.documentStyle}`);
    
    return specs;
  }

  /**
   * Map font sizes to semantic roles based on frequency and size
   */
  static mapFontsToSemanticRoles(fontSizes, fontSizeMap) {
    const mapping = {};
    
    // Largest font is typically title
    if (fontSizes.length > 0) {
      mapping.title = Math.max(...fontSizes);
    }
    
    // Most frequent font is typically body text
    const mostFrequentSize = fontSizes.find(size => 
      fontSizeMap[size] === Math.max(...Object.values(fontSizeMap))
    );
    if (mostFrequentSize) {
      mapping.body = mostFrequentSize;
    }
    
    // Second largest is typically headers
    const sortedBySizeDesc = [...fontSizes].sort((a, b) => b - a);
    if (sortedBySizeDesc.length > 1) {
      mapping.header = sortedBySizeDesc[1];
    }
    
    // Smaller fonts for captions, footnotes
    const sortedBySizeAsc = [...fontSizes].sort((a, b) => a - b);
    if (sortedBySizeAsc.length > 0) {
      mapping.small = sortedBySizeAsc[0];
    }
    if (sortedBySizeAsc.length > 1) {
      mapping.tiny = sortedBySizeAsc[1];
    }
    
    // Fill defaults
    mapping.title = mapping.title || 21;
    mapping.header = mapping.header || 18;
    mapping.body = mapping.body || 17;
    mapping.small = mapping.small || 15;
    mapping.tiny = mapping.tiny || 13;
    
    return mapping;
  }

  /**
   * Detect document style based on formatting patterns
   */
  static detectDocumentStyle(fontSizes, colors, htmlContent) {
    const hasRedText = colors.includes('#ff0000');
    const hasLargeTitles = fontSizes.some(size => size >= 20);
    const hasMultipleHierarchy = fontSizes.length >= 4;
    
    const content = htmlContent.toLowerCase();
    
    if (content.includes('exam') || content.includes('midterm')) {
      return hasRedText ? 'formal_exam_with_red' : 'formal_exam';
    } else if (content.includes('homework') || content.includes('assignment')) {
      return 'academic_homework';
    } else if (content.includes('lab') || content.includes('exercise')) {
      return 'lab_manual';
    } else {
      return 'standard_academic';
    }
  }

  /**
   * Analyze text content structure
   */
  static analyzeTextStructure(textContent) {
    console.log('📝 Analyzing text content structure...');
    
    const structure = {
      title: this.extractTitle(textContent),
      sections: this.extractSections(textContent),
      problems: this.extractProblems(textContent),
      hasMath: this.detectMathematicalContent(textContent),
      hasCode: this.detectCodeContent(textContent),
      hasRedText: this.detectRedTextContent(textContent),
      contentType: this.detectContentType(textContent)
    };
    
    console.log(`✅ Title: ${structure.title ? structure.title.substring(0, 50) + '...' : 'Not found'}`);
    console.log(`✅ Sections: ${structure.sections.length}`);
    console.log(`✅ Problems: ${structure.problems.length}`);
    console.log(`✅ Mathematical content: ${structure.hasMath ? 'Yes' : 'No'}`);
    
    return structure;
  }

  /**
   * Extract title from text content
   */
  static extractTitle(textContent) {
    const lines = textContent.split('\n');
    
    // Look for course codes or formal titles
    for (const line of lines.slice(0, 10)) {
      const trimmed = line.trim();
      if (trimmed.length > 10 && trimmed.length < 100) {
        // Check if it looks like a course title
        if (/^[A-Z]{2,4}[-\s][A-Z]{0,2}[\d.]+/i.test(trimmed) || 
            /exam|midterm|homework|assignment/i.test(trimmed)) {
          return trimmed;
        }
      }
    }
    
    return lines[0] ? lines[0].trim() : null;
  }

  /**
   * Extract sections from text content
   */
  static extractSections(textContent) {
    const sections = [];
    const lines = textContent.split('\n');
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      // Look for section headers (Problem X, Question X, Part X, etc.)
      if (/^(Problem|Question|Part|Section)\s+\d+/i.test(trimmed) ||
          /^\d+\.\s+[A-Z]/.test(trimmed)) {
        sections.push({
          title: trimmed,
          lineNumber: index,
          content: []
        });
      }
    });
    
    return sections;
  }

  /**
   * Extract problems from text content
   */
  static extractProblems(textContent) {
    const problems = [];
    const problemRegex = /(?:Problem|Question)\s+(\d+)([^]*?)(?=(?:Problem|Question)\s+\d+|$)/gi;
    
    let match;
    while ((match = problemRegex.exec(textContent)) !== null) {
      problems.push({
        number: parseInt(match[1]),
        content: match[2].trim()
      });
    }
    
    return problems;
  }

  /**
   * Detect mathematical content
   */
  static detectMathematicalContent(textContent) {
    const mathPatterns = [
      /[∑∏∫∂∇∆]/g,
      /[αβγδεζηθικλμνξοπρστυφχψω]/g,
      /[≤≥≠≈∞±×÷]/g,
      /\b[O]\([^)]+\)/g,
      /\b[Θω]\([^)]+\)/g,
      /log_?\d*/g,
      /\b\d*[a-zA-Z]\^\d+/g
    ];
    
    return mathPatterns.some(pattern => pattern.test(textContent));
  }

  /**
   * Detect code content
   */
  static detectCodeContent(textContent) {
    const codePatterns = [
      /#include/g,
      /function\s+\w+/g,
      /class\s+\w+/g,
      /def\s+\w+/g,
      /int\s+main/g,
      /printf\s*\(/g,
      /\bfor\s*\(/g,
      /\bwhile\s*\(/g
    ];
    
    return codePatterns.some(pattern => pattern.test(textContent));
  }

  /**
   * Detect red text content markers
   */
  static detectRedTextContent(textContent) {
    const redTextMarkers = [
      /\[.*?\]/g,  // Bracketed text often red
      /IMPORTANT/gi,
      /NOTE/gi,
      /WARNING/gi,
      /DEADLINE/gi
    ];
    
    return redTextMarkers.some(pattern => pattern.test(textContent));
  }

  /**
   * Detect content type
   */
  static detectContentType(textContent) {
    const lower = textContent.toLowerCase();
    
    if (lower.includes('exam') || lower.includes('midterm') || lower.includes('final')) {
      return 'exam';
    } else if (lower.includes('homework') || lower.includes('assignment')) {
      return 'homework';
    } else if (lower.includes('lab') || lower.includes('exercise')) {
      return 'lab';
    } else if (lower.includes('quiz') || lower.includes('test')) {
      return 'quiz';
    } else {
      return 'academic_document';
    }
  }

  /**
   * Create intelligent LaTeX mapping
   */
  static createLatexMapping(htmlStructure, contentStructure, formattingSpecs) {
    console.log('🧠 Creating intelligent LaTeX mapping...');
    
    const mapping = {
      documentClass: 'article',
      fontSize: '12pt',
      geometry: 'margin=1in',
      fontCommands: this.createFontCommands(formattingSpecs.fontMapping),
      colorCommands: this.createColorCommands(formattingSpecs.colors),
      sectionMapping: this.createSectionMapping(contentStructure),
      layoutStrategy: this.determineLayoutStrategy(htmlStructure, contentStructure)
    };
    
    console.log(`✅ Layout strategy: ${mapping.layoutStrategy}`);
    console.log(`✅ Font commands: ${Object.keys(mapping.fontCommands).length}`);
    console.log(`✅ Color commands: ${Object.keys(mapping.colorCommands).length}`);
    
    return mapping;
  }

  /**
   * Create font commands for LaTeX
   */
  static createFontCommands(fontMapping) {
    const commands = {};
    
    Object.keys(fontMapping).forEach(role => {
      const size = fontMapping[role];
      const lineHeight = Math.round(size * 1.2);
      
      switch (role) {
        case 'title':
          commands.titlefont = `\\fontsize{${size}}{${lineHeight}}\\selectfont\\bfseries`;
          break;
        case 'header':
          commands.headerfont = `\\fontsize{${size}}{${lineHeight}}\\selectfont\\bfseries`;
          break;
        case 'body':
          commands.bodyfont = `\\fontsize{${size}}{${lineHeight}}\\selectfont`;
          break;
        case 'small':
          commands.smallfont = `\\fontsize{${size}}{${lineHeight}}\\selectfont`;
          break;
        case 'tiny':
          commands.tinyfont = `\\fontsize{${size}}{${lineHeight}}\\selectfont`;
          break;
      }
    });
    
    return commands;
  }

  /**
   * Create color commands for LaTeX
   */
  static createColorCommands(colors) {
    const commands = {};
    
    colors.forEach(color => {
      if (color === '#ff0000') {
        commands.redtext = `\\textcolor{red}`;
      } else if (color === '#0000ff') {
        commands.bluetext = `\\textcolor{blue}`;
      } else if (color !== '#000000') {
        const colorName = color.replace('#', 'color');
        commands[colorName] = `\\textcolor[HTML]{${color.substring(1)}}`;
      }
    });
    
    return commands;
  }

  /**
   * Create section mapping for LaTeX
   */
  static createSectionMapping(contentStructure) {
    const mapping = {};
    
    if (contentStructure.problems.length > 0) {
      mapping.problemFormat = '\\headerfont{Problem %d}';
      mapping.useEnumerate = true;
    }
    
    if (contentStructure.sections.length > 0) {
      mapping.sectionFormat = '\\headerfont{%s}';
      mapping.useSubsections = true;
    }
    
    return mapping;
  }

  /**
   * Determine layout strategy
   */
  static determineLayoutStrategy(htmlStructure, contentStructure) {
    if (htmlStructure.elements.length > 100) {
      return 'complex_positioning';
    } else if (contentStructure.problems.length > 0) {
      return 'problem_based';
    } else if (contentStructure.sections.length > 0) {
      return 'section_based';
    } else {
      return 'simple_flow';
    }
  }

  /**
   * Generate intelligent LaTeX - COMPLETELY REWRITTEN
   * Now properly maps HTML positioning/formatting to TXT content
   */
  static generateIntelligentLatex(textContent, latexMapping, formattingSpecs, questionsText) {
    console.log('🤖 Generating intelligent LaTeX with HTML-TXT mapping...');
    
    // Create document preamble
    const preamble = this.createIntelligentPreamble(latexMapping, formattingSpecs);
    
    // NEW APPROACH: Map HTML elements to text content
    const mappedContent = this.mapHTMLElementsToText(textContent, latexMapping, formattingSpecs);
    
    // Add questions if provided
    let processedContent = mappedContent;
    if (questionsText) {
      processedContent += '\n\n\\newpage\n\n';
      processedContent += '\\titlefont{Practice Exam Questions}\n\n';
      processedContent += this.escapeLatexCharacters(questionsText);
    }
    
    // Combine preamble and content
    const fullLatex = preamble + '\n\n\\begin{document}\n\n' + processedContent + '\n\n\\end{document}';
    
    console.log(`✅ Generated intelligent LaTeX: ${fullLatex.length} characters`);
    
    return fullLatex;
  }

  /**
   * NEW METHOD: Map HTML elements to text content with proper formatting
   */
  static mapHTMLElementsToText(textContent, latexMapping, formattingSpecs) {
    console.log('🎯 Mapping HTML elements to text content...');
    
    // Get HTML structure (elements with positioning and formatting)
    const htmlElements = this.getCurrentHTMLElements();
    
    if (!htmlElements || htmlElements.length === 0) {
      console.log('⚠️  No HTML elements found, using text-based approach');
      return this.processTextWithFormatting(textContent, latexMapping, formattingSpecs);
    }
    
    console.log(`📍 Found ${htmlElements.length} positioned HTML elements`);
    
    // Split text content into lines for mapping
    const textLines = textContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let latexContent = '';
    let usedTextLines = new Set();
    
    // Group HTML elements by vertical position (rows)
    const rows = this.groupElementsByVerticalPosition(htmlElements);
    
    console.log(`📏 Organized into ${rows.length} rows`);
    
    // Process each row
    rows.forEach((row, rowIndex) => {
      // Sort elements in row by horizontal position
      row.sort((a, b) => a.left - b.left);
      
      // Combine text from all elements in this row
      const rowText = row.map(element => element.content).join(' ').trim();
      
      if (rowText.length === 0) return;
      
      // Find best matching text line
      const matchingLine = this.findBestMatchingTextLine(rowText, textLines, usedTextLines);
      
      if (matchingLine) {
        usedTextLines.add(matchingLine);
        
        // Determine formatting based on HTML element properties
        const primaryElement = row[0]; // Use first element for formatting
        const formatting = this.determineFormattingFromElement(primaryElement, formattingSpecs);
        
        // Apply formatting to the text
        const formattedText = this.applyFormattingToText(matchingLine, formatting);
        
        latexContent += formattedText + '\n\n';
        
        console.log(`✅ Row ${rowIndex}: "${rowText.substring(0, 50)}..." → ${formatting}`);
      } else {
        console.log(`⚠️  Row ${rowIndex}: No matching text found for "${rowText.substring(0, 50)}..."`);
      }
    });
    
    // Add any remaining unmatched text lines
    textLines.forEach(line => {
      if (!usedTextLines.has(line) && line.trim().length > 0) {
        const formattedText = this.applyFormattingToText(line, 'bodyfont');
        latexContent += formattedText + '\n\n';
        console.log(`📝 Added unmatched line: "${line.substring(0, 50)}..."`);
      }
    });
    
    return latexContent.trim();
  }

  /**
   * Get current HTML elements from the last parsing
   */
  static getCurrentHTMLElements() {
    // This should be set during parseHTMLStructure - we need to store it
    return this._currentHTMLElements || [];
  }

  /**
   * Group elements by vertical position (rows)
   */
  static groupElementsByVerticalPosition(elements) {
    const rows = [];
    const rowThreshold = 10; // Elements within 10px vertically are in same row
    
    elements.forEach(element => {
      let addedToRow = false;
      
      for (let row of rows) {
        if (Math.abs(row[0].top - element.top) <= rowThreshold) {
          row.push(element);
          addedToRow = true;
          break;
        }
      }
      
      if (!addedToRow) {
        rows.push([element]);
      }
    });
    
    // Sort rows by vertical position
    rows.sort((a, b) => a[0].top - b[0].top);
    
    return rows;
  }

  /**
   * Find best matching text line for HTML row content - IMPROVED
   */
  static findBestMatchingTextLine(htmlText, textLines, usedLines) {
    // Clean and normalize HTML text
    const cleanHtmlText = htmlText.replace(/\s+/g, ' ').trim().toLowerCase();
    const htmlWords = cleanHtmlText.split(/\s+/).filter(w => w.length > 2);
    
    let bestMatch = null;
    let bestScore = 0;
    
    textLines.forEach(line => {
      if (usedLines.has(line)) return;
      
      const cleanLine = line.replace(/\s+/g, ' ').trim().toLowerCase();
      const lineWords = cleanLine.split(/\s+/).filter(w => w.length > 2);
      
      // Calculate multiple similarity scores
      let exactScore = 0;
      let partialScore = 0;
      let orderScore = 0;
      
      // Exact word matches
      htmlWords.forEach(htmlWord => {
        if (lineWords.includes(htmlWord)) {
          exactScore += htmlWord.length;
        }
      });
      
      // Partial word matches (substring)
      htmlWords.forEach(htmlWord => {
        lineWords.forEach(lineWord => {
          if (htmlWord.includes(lineWord) || lineWord.includes(htmlWord)) {
            partialScore += Math.min(htmlWord.length, lineWord.length) * 0.5;
          }
        });
      });
      
      // Order preservation bonus
      let htmlIndex = 0;
      let lineIndex = 0;
      while (htmlIndex < htmlWords.length && lineIndex < lineWords.length) {
        if (htmlWords[htmlIndex] === lineWords[lineIndex] || 
            htmlWords[htmlIndex].includes(lineWords[lineIndex]) ||
            lineWords[lineIndex].includes(htmlWords[htmlIndex])) {
          orderScore += 5;
          htmlIndex++;
          lineIndex++;
        } else {
          lineIndex++;
        }
      }
      
      // Combine scores
      const totalScore = exactScore * 2 + partialScore + orderScore;
      const normalizedScore = totalScore / Math.max(cleanHtmlText.length, cleanLine.length);
      
      // Lower threshold for better matching
      if (normalizedScore > bestScore && normalizedScore > 0.15) {
        bestScore = normalizedScore;
        bestMatch = line;
      }
    });
    
    // If no good match found, try direct substring matching
    if (!bestMatch && cleanHtmlText.length > 10) {
      textLines.forEach(line => {
        if (usedLines.has(line)) return;
        
        const cleanLine = line.replace(/\s+/g, ' ').trim().toLowerCase();
        
        // Check if HTML text is a substring of line or vice versa
        if (cleanLine.includes(cleanHtmlText) || cleanHtmlText.includes(cleanLine)) {
          if (Math.min(cleanHtmlText.length, cleanLine.length) > 10) {
            bestMatch = line;
          }
        }
      });
    }
    
    return bestMatch;
  }

  /**
   * Determine formatting command from HTML element - IMPROVED
   */
  static determineFormattingFromElement(element, formattingSpecs) {
    const fontSize = element.fontSize;
    const color = element.color;
    const content = element.content.toLowerCase();
    
    console.log(`🎨 Formatting element: "${element.content.substring(0, 30)}..." (${fontSize}px, ${color})`);
    
    // First check for red text
    const isRed = color === '#ff0000';
    
    // Determine semantic role based on content and font size
    let semanticRole = 'body';
    
    // Title detection (course codes, main headers)
    if (fontSize >= 20 || 
        /^[A-Z]{2,4}[-\s][A-Z0-9.-]+/.test(content) ||
        /midterm|final|exam|homework|assignment/.test(content)) {
      semanticRole = 'title';
    }
    // Header detection (problems, sections, important notes)
    else if (fontSize >= 17 || 
             /^problem\s+\d+|^important\s+notes|^total:|^\d+\.\s+/.test(content)) {
      semanticRole = 'header';
    }
    // Small text detection (points, numbers, short text)
    else if (fontSize <= 12 || 
             /^\d+$|^[a-z]\.|points?$|^\d+\s*points?/.test(content)) {
      semanticRole = 'small';
    }
    // Body text (everything else)
    else {
      semanticRole = 'body';
    }
    
    // Map to LaTeX command
    let command;
    switch (semanticRole) {
      case 'title':
        command = isRed ? 'redtext{\\titlefont' : 'titlefont';
        break;
      case 'header':
        command = isRed ? 'redtext{\\headerfont' : 'headerfont';
        break;
      case 'small':
        command = isRed ? 'redtext{\\smallfont' : 'smallfont';
        break;
      default:
        command = isRed ? 'redtext{\\bodyfont' : 'bodyfont';
    }
    
    console.log(`   → ${semanticRole} → ${command}`);
    
    return command;
  }

  /**
   * Apply formatting to text - IMPROVED
   */
  static applyFormattingToText(text, formatting) {
    const escapedText = this.escapeLatexCharacters(text);
    
    if (formatting.startsWith('redtext{')) {
      // Extract inner formatting and apply red text
      const innerFormatting = formatting.replace('redtext{\\', '').replace('font', 'font');
      return `\\redtext{\\${innerFormatting}{${escapedText}}}`;
    } else {
      return `\\${formatting}{${escapedText}}`;
    }
  }

  /**
   * Fallback: Process text with formatting (when no HTML elements) - IMPROVED
   */
  static processTextWithFormatting(textContent, latexMapping, formattingSpecs) {
    console.log('📝 Processing text with pattern-based formatting...');
    
    const lines = textContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    let latexContent = '';
    
    lines.forEach(line => {
      const lowerLine = line.toLowerCase();
      let formatting = 'bodyfont';
      
      // Title detection (course codes, main headers)
      if (/^[A-Z]{2,4}[-\s][A-Z0-9.-]+/.test(line) ||
          /^(Midterm|Final|Homework|Assignment|Exam).*/.test(line)) {
        formatting = 'titlefont';
      }
      // Header detection (problems, sections, important notes)
      else if (/^Problem\s+\d+/.test(line) ||
               /^Important\s+Notes/.test(line) ||
               /^Total:\s*\d+\s*points?/.test(line) ||
               /^\d+\.\s+[A-Z]/.test(line)) {
        formatting = 'headerfont';
      }
      // Small text detection (points, short items)
      else if (/^\d+\s*points?$/.test(line) ||
               /^[a-z]\.\s/.test(line) ||
               /^\d+\.$/.test(line) ||
               line.length < 20) {
        formatting = 'smallfont';
      }
      
      // Check for red text indicators (points)
      let hasRedText = false;
      if (formattingSpecs.hasRedText && /\d+\s*points?/.test(line)) {
        hasRedText = true;
      }
      
      // Apply formatting
      const escapedText = this.escapeLatexCharacters(line);
      
      if (hasRedText) {
        // Apply red text to points only
        const redFormattedLine = line.replace(/(\d+\s*points?)/gi, '\\redtext{$1}');
        const escapedRedLine = this.escapeLatexCharacters(redFormattedLine);
        latexContent += `\\${formatting}{${escapedRedLine}}\n\n`;
      } else {
        latexContent += `\\${formatting}{${escapedText}}\n\n`;
      }
    });
    
    return latexContent.trim();
  }

  /**
   * Create intelligent preamble
   */
  static createIntelligentPreamble(latexMapping, formattingSpecs) {
    let preamble = `\\documentclass[${latexMapping.fontSize},letterpaper]{${latexMapping.documentClass}}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{geometry}
\\usepackage{xcolor}
\\usepackage{amsmath}
\\usepackage{amsfonts}
\\usepackage{amssymb}
\\usepackage{enumitem}
\\usepackage{fancyhdr}
\\usepackage{titlesec}

% Page setup
\\geometry{${latexMapping.geometry}}
\\pagestyle{fancy}
\\fancyhf{}
\\rhead{\\thepage}

% Font commands
`;
    
    // Add font commands
    Object.keys(latexMapping.fontCommands).forEach(command => {
      preamble += `\\newcommand{\\${command}}{${latexMapping.fontCommands[command]}}\n`;
    });
    
    // Add color commands
    if (Object.keys(latexMapping.colorCommands).length > 0) {
      preamble += '\n% Color commands\n';
      Object.keys(latexMapping.colorCommands).forEach(command => {
        preamble += `\\newcommand{\\${command}}[1]{${latexMapping.colorCommands[command]}{#1}}\n`;
      });
    }
    
    // Add spacing settings
    preamble += `
% Document spacing
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{6pt}
`;
    
    // Add red text support if needed (ONLY ONCE)
    if (formattingSpecs.hasRedText && !Object.keys(latexMapping.colorCommands).includes('redtext')) {
      preamble += '\n% Red text support\n\\newcommand{\\redtext}[1]{\\textcolor{red}{#1}}\n';
    }
    
    return preamble;
  }

  /**
   * Escape LaTeX special characters - ENHANCED
   */
  static escapeLatexCharacters(text) {
    return text
      .replace(/\\/g, '\\textbackslash{}')
      .replace(/[{}]/g, '\\$&')
      .replace(/[$&%#^_]/g, '\\$&')
      .replace(/~/g, '\\textasciitilde{}')
      .replace(/\^/g, '\\textasciicircum{}')
      // Handle Unicode bullet characters
      .replace(/[\u2022\u2023\u25E6\u2043\u204C\u204D\u2219\u25AA\u25AB\uF0B7]/g, '\\textbullet{}')
      // Handle other common Unicode characters
      .replace(/[\u2013\u2014]/g, '--') // en-dash, em-dash
      .replace(/[\u2018\u2019]/g, "'") // smart quotes
      .replace(/[\u201C\u201D]/g, '"') // smart double quotes
      .replace(/[\u2026]/g, '\\ldots{}') // ellipsis
      // Handle non-breaking spaces
      .replace(/[\u00A0\u2007\u202F]/g, ' ');
  }

  /**
   * Validate and optimize LaTeX
   */
  static validateAndOptimizeLatex(latexContent) {
    console.log('✅ Validating and optimizing LaTeX...');
    
    // Remove markdown artifacts
    let optimized = latexContent.replace(/```latex\n?/g, '').replace(/```\n?/g, '');
    
    // Validate document structure
    if (!optimized.includes('\\documentclass')) {
      throw new Error('Generated LaTeX missing document class');
    }
    
    if (!optimized.includes('\\begin{document}')) {
      throw new Error('Generated LaTeX missing document begin');
    }
    
    if (!optimized.includes('\\end{document}')) {
      throw new Error('Generated LaTeX missing document end');
    }
    
    // Optimize spacing
    optimized = optimized.replace(/\n{3,}/g, '\n\n');
    optimized = optimized.replace(/\\([a-zA-Z]+)\s*{/g, '\\$1{');
    optimized = optimized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    console.log('✅ LaTeX validation and optimization completed');
    
    return optimized;
  }

  /**
   * Save Step 2 results
   */
  static saveStep2Results(results, outputDir = 'step2-output') {
    console.log('\n💾 Saving Step 2 results...');
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
    
    // Save LaTeX content
    fs.writeFileSync(path.join(outputDir, 'generated.tex'), results.latexContent);
    console.log(`✅ LaTeX saved to: ${outputDir}/generated.tex`);
    
    // Save detailed analysis
    const analysis = {
      conversionSummary: {
        originalTextLength: results.originalTextLength,
        originalHtmlLength: results.originalHtmlLength,
        latexLength: results.latexLength,
        questionsIncluded: results.questionsIncluded
      },
      htmlStructure: {
        elementsFound: results.htmlStructure.elements.length,
        rowsDetected: Object.keys(results.htmlStructure.hierarchy).length,
        pagesDetected: results.htmlStructure.pages.length
      },
      formattingSpecs: results.formattingSpecs,
      contentStructure: results.contentStructure,
      latexMapping: results.latexMapping,
      timestamp: results.timestamp
    };
    
    fs.writeFileSync(path.join(outputDir, 'conversion-analysis.json'), JSON.stringify(analysis, null, 2));
    console.log(`✅ Analysis saved to: ${outputDir}/conversion-analysis.json`);
  }

  /**
   * Analyze conversion results
   */
  static analyzeConversionResults(results) {
    console.log('\n=== STEP 2 ENHANCED ANALYSIS ===\n');
    
    console.log('📊 CONVERSION SUMMARY:');
    console.log(`Original text: ${results.originalTextLength} characters`);
    console.log(`Original HTML: ${results.originalHtmlLength} characters`);
    console.log(`Generated LaTeX: ${results.latexLength} characters`);
    console.log(`Questions included: ${results.questionsIncluded ? 'Yes' : 'No'}`);
    
    console.log('\n🔍 HTML STRUCTURE ANALYSIS:');
    console.log(`Positioned elements: ${results.htmlStructure.elements.length}`);
    console.log(`Rows detected: ${Object.keys(results.htmlStructure.hierarchy).length}`);
    console.log(`Pages detected: ${results.htmlStructure.pages.length}`);
    
    console.log('\n🎨 FORMATTING PRESERVATION:');
    console.log(`Font sizes: [${results.formattingSpecs.fontSizes.join(', ')}]px`);
    console.log(`Colors: [${results.formattingSpecs.colors.join(', ')}]`);
    console.log(`Document style: ${results.formattingSpecs.documentStyle}`);
    console.log(`Red text support: ${results.formattingSpecs.hasRedText ? 'Yes' : 'No'}`);
    
    console.log('\n📝 CONTENT ANALYSIS:');
    console.log(`Content type: ${results.contentStructure.contentType}`);
    console.log(`Title: ${results.contentStructure.title ? results.contentStructure.title.substring(0, 50) + '...' : 'Not found'}`);
    console.log(`Sections: ${results.contentStructure.sections.length}`);
    console.log(`Problems: ${results.contentStructure.problems.length}`);
    console.log(`Mathematical content: ${results.contentStructure.hasMath ? 'Yes' : 'No'}`);
    console.log(`Code content: ${results.contentStructure.hasCode ? 'Yes' : 'No'}`);
    
    console.log('\n🧠 LATEX MAPPING:');
    console.log(`Layout strategy: ${results.latexMapping.layoutStrategy}`);
    console.log(`Font commands: ${Object.keys(results.latexMapping.fontCommands).length}`);
    console.log(`Color commands: ${Object.keys(results.latexMapping.colorCommands).length}`);
    
    return {
      conversionSuccessful: results.latexLength > 0,
      formattingPreserved: results.formattingSpecs.fontSizes.length > 0,
      contentStructured: results.contentStructure.sections.length > 0 || results.contentStructure.problems.length > 0,
      htmlParsed: results.htmlStructure.elements.length > 0,
      readyForStep3: true
    };
  }
}

// Test the conversion if this file is run directly
if (require.main === module) {
  async function testConversion() {
    const step1Dir = process.argv[2] || 'step1-output';
    const questionsFile = process.argv[3]; // Optional questions file
    
    let questionsText = null;
    if (questionsFile && fs.existsSync(questionsFile)) {
      questionsText = fs.readFileSync(questionsFile, 'utf8');
      console.log(`📄 Including questions from: ${questionsFile}`);
    }
    
    console.log(`🎯 Testing ENHANCED Step 2 conversion with: ${step1Dir}\n`);
    
    try {
      const results = await HTMLTXTToLatexConverter.convertToLatex(step1Dir, questionsText);
      const analysis = HTMLTXTToLatexConverter.analyzeConversionResults(results);
      
      console.log('\n=== STEP 2 COMPLETION STATUS ===');
      console.log(`Conversion successful: ${analysis.conversionSuccessful ? '✅' : '❌'}`);
      console.log(`Formatting preserved: ${analysis.formattingPreserved ? '✅' : '❌'}`);
      console.log(`Content structured: ${analysis.contentStructured ? '✅' : '❌'}`);
      console.log(`HTML parsed: ${analysis.htmlParsed ? '✅' : '❌'}`);
      console.log(`Ready for Step 3: ${analysis.readyForStep3 ? '✅' : '❌'}`);
      
      if (analysis.conversionSuccessful && analysis.formattingPreserved && analysis.contentStructured && analysis.htmlParsed) {
        console.log('\n🎉 ENHANCED STEP 2 PASSED! Ready for Step 3 (LaTeX → PDF).');
      } else {
        console.log('\n⚠️  STEP 2 ISSUES DETECTED. Review the output files before proceeding.');
      }
      
    } catch (error) {
      console.error('❌ Enhanced Step 2 failed:', error.message);
      process.exit(1);
    }
  }
  
  testConversion();
}

module.exports = HTMLTXTToLatexConverter; 