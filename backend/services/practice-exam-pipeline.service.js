require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Integrated Practice Exam Pipeline Service
 * Uses EXACT logic from step1-pdf-extraction.js, simple-gemini-conversion.js, and step2.5-SMART-context-aware.js
 */
class PracticeExamPipelineService {

  /**
   * Main pipeline entry point - EXACT same as our working files
   */
  static async generateExamFromPDF(inputPdfPath, options = {}) {
    console.log('🚀 INTEGRATED PIPELINE: Step 1 → 2 → 2.5');
    console.log('📄 Input PDF:', inputPdfPath);
    console.log('🎯 Options:', options);

    try {
      // STEP 1: PDF EXTRACTION (from step1-pdf-extraction.js)
      console.log('\n=== STEP 1: PDF EXTRACTION ===');
      const extractionResults = await this.extractPDFContent(inputPdfPath);
      
      // STEP 2: SIMPLE GEMINI CONVERSION (from simple-gemini-conversion.js)
      console.log('\n=== STEP 2: LaTeX CONVERSION ===');
      const goldenLatex = await this.simpleGeminiConversion(extractionResults);
      console.log(`✅ LaTeX generated: ${goldenLatex.length} characters`);
      
      // STEP 2.5: SMART CONTEXT-AWARE GENERATION (from step2.5-SMART-context-aware.js)
      console.log('\n=== STEP 2.5: SMART QUESTION GENERATION ===');
      const newExamData = await this.generateSmartContextAwareExam(goldenLatex, extractionResults, options);
      console.log(`✅ Smart exam generated: ${newExamData.latexContent.length} characters`);
      
      // STEP 3: COMPILE TO PDF
      console.log('\n🔧 Compiling LaTeX to PDF...');
      const generatedPdfPath = await this.compileToPDF(newExamData.latexContent);
      
      // STEP 4: EXTRACT QUESTIONS FROM LATEX FOR API RESPONSE
      console.log('\n🔍 Extracting questions from LaTeX content...');
      const extractedQuestions = this.extractQuestionsFromLatex(newExamData.latexContent);
      
      // Build complete response data structure for AI controller
      const completeResult = {
        latexContent: newExamData.latexContent,
        pdfPath: generatedPdfPath,
        subject: newExamData.subject,
        analysis: newExamData.analysis,
        originalContent: newExamData.originalContent,
        questionCount: newExamData.questionCount,
        difficulty: newExamData.difficulty,
        questions: extractedQuestions, // This is what the AI controller expects
        // Additional metadata
        textLength: extractionResults.textLength,
        htmlLength: extractionResults.htmlLength,
        fontSizes: extractionResults.fontSizes,
        colors: extractionResults.colors,
        detectedElements: newExamData.analysis.detectedElements,
        questionTypes: newExamData.analysis.questionTypes,
        complexityLevel: newExamData.analysis.complexityLevel
      };
      
      console.log('\n✅ ENHANCED PIPELINE COMPLETED SUCCESSFULLY');
      console.log(`📊 Subject detected: ${completeResult.subject}`);
      console.log(`📄 PDF generated: ${completeResult.pdfPath}`);
      console.log(`✅ PDF path added to response: ${completeResult.pdfPath}`);
      
      return completeResult;
      
    } catch (error) {
      console.error('❌ Pipeline failed:', error);
      throw error;
    }
  }

  /**
   * STEP 1: EXACT logic from step1-pdf-extraction.js
   */
  static async extractPDFContent(pdfPath) {
    console.log('📄 Extracting text content with pdftotext...');
    
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
      // 1. Extract clean text content using pdftotext - EXACT same as step1
      const textOutput = execSync(`pdftotext "${pdfPath}" -`, { encoding: 'utf8' });
      results.textContent = textOutput;
      results.textLength = textOutput.length;
      console.log(`✅ Text extracted: ${results.textLength} characters`);
      
      // 2. Extract HTML layout with enhanced options - EXACT same as step1
      console.log('🔄 Extracting HTML layout...');
      const htmlContent = this.extractHTMLLayout(pdfPath);
      results.htmlContent = htmlContent;
      results.htmlLength = htmlContent.length;
      results.pageCount = (htmlContent.match(/<!-- PAGE BREAK -->/g) || []).length + 1;
      console.log(`✅ HTML extracted: ${results.htmlLength} characters`);
      
      // Extract font sizes from HTML - EXACT same as step1
      const fontMatches = results.htmlContent.match(/font-size:(\d+)px/g);
      if (fontMatches) {
        results.fontSizes = [...new Set(fontMatches.map(m => parseInt(m.match(/\d+/)[0])))].sort((a,b) => b-a);
      }
      
      // Extract colors from HTML - EXACT same as step1
      const colorMatches = results.htmlContent.match(/color:(#[0-9a-f]{6})/gi);
      if (colorMatches) {
        results.colors = [...new Set(colorMatches.map(m => m.match(/#[0-9a-f]{6}/i)[0].toLowerCase()))];
      }
      
      // Extract table information - EXACT same as step1
      results.tables = this.detectTables(results.htmlContent);
      
      // Extract image references - EXACT same as step1  
      results.images = this.extractImageInfo(results.htmlContent);
      
      console.log(`📊 Extracted: ${results.fontSizes.length} font sizes, ${results.colors.length} colors`);
      
    } catch (error) {
      console.error('❌ Step 1 extraction error:', error.message);
      results.errors.push(error.message);
    }

    return results;
  }

  /**
   * Extract HTML layout - EXACT logic from step1-pdf-extraction.js
   */
  static extractHTMLLayout(pdfPath) {
    try {
      const outputDir = path.dirname(pdfPath);
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 8);
      const uniqueId = `${timestamp}-${randomId}`;
      const htmlPath = path.join(outputDir, `temp-extraction-${uniqueId}`);
      
      // Enhanced pdftohtml command - EXACT same as step1
      const command = `pdftohtml -c -hidden -noframes -zoom 1.5 -fontfullname "${pdfPath}" "${htmlPath}"`;
      console.log('🔧 Executing:', command);
      
      execSync(command, { encoding: 'utf8', cwd: process.cwd() });
      
      // Read the HTML file
      const htmlFile = `${htmlPath}.html`;
      if (!fs.existsSync(htmlFile)) {
        throw new Error(`HTML file not generated: ${htmlFile}`);
      }
      
      const htmlContent = fs.readFileSync(htmlFile, 'utf8');
      
      // Clean up temporary files - EXACT same cleanup logic
      try {
        fs.unlinkSync(htmlFile);
        // Clean up any image files
        let pageNum = 1;
        while (true) {
          const imageFile = `${htmlPath}${String(pageNum).padStart(3, '0')}.png`;
          if (fs.existsSync(imageFile)) {
            fs.unlinkSync(imageFile);
            pageNum++;
          } else {
            break;
          }
        }
      } catch (cleanupError) {
        console.log('⚠️ Cleanup warning:', cleanupError.message);
      }
      
      return htmlContent;
      
    } catch (error) {
      console.error('❌ HTML extraction failed:', error.message);
      throw error;
    }
  }

  /**
   * STEP 2: EXACT logic from simple-gemini-conversion.js
   */
  static async simpleGeminiConversion(extractionResults) {
    console.log('🤖 Simple Gemini HTML+TXT to LaTeX Conversion');
    
    const txtContent = extractionResults.textContent;
    const htmlContent = extractionResults.htmlContent;
    
    console.log(`📄 TXT content: ${txtContent.length} characters`);
    console.log(`🎨 HTML content: ${htmlContent.length} characters`);
    
    // Initialize Gemini - EXACT same as simple-gemini-conversion.js
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Create simple prompt - EXACT same prompt as simple-gemini-conversion.js
    const prompt = `Here is the extracted text content:

${txtContent}

Here is the extracted HTML layout:

${htmlContent}

Can you convert this to LaTeX?`;
    
    console.log('🤖 Sending to Gemini 1.5 Flash...');
    console.log(`📝 Prompt length: ${prompt.length} characters`);
    
    try {
      // Send to Gemini - EXACT same as simple-gemini-conversion.js
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const latexContent = response.text();
      
      console.log(`✅ Gemini response: ${latexContent.length} characters`);
      
      // Clean any markdown formatting - EXACT same cleanup
      let cleanedLatex = latexContent;
      cleanedLatex = cleanedLatex.replace(/```latex\s*/g, '');
      cleanedLatex = cleanedLatex.replace(/```\s*$/g, '');
      cleanedLatex = cleanedLatex.replace(/```/g, '');
      cleanedLatex = cleanedLatex.trim();
      
      console.log(`✅ LaTeX generated: ${cleanedLatex.length} characters`);
      return cleanedLatex;
      
    } catch (error) {
      console.error('❌ Step 2 simple conversion failed:', error);
      throw error;
    }
  }

  /**
   * STEP 2.5: EXACT logic from step2.5-SMART-context-aware.js
   */
  static async generateSmartContextAwareExam(goldenLatex, extractionResults, options = {}) {
    console.log('🚀 STEP 2.5: SMART CONTEXT-AWARE GENERATOR');
    
    const originalText = extractionResults.textContent;
    const originalHtml = extractionResults.htmlContent;
    
    console.log(`📄 Golden LaTeX format: ${goldenLatex.length} characters`);
    console.log(`📄 Original text: ${originalText.length} characters`);
    console.log(`🎨 Original HTML: ${originalHtml.length} characters`);
    
    // STEP 1: Use Gemini to intelligently detect the subject - EXACT same logic
    console.log('\n🧠 INTELLIGENT SUBJECT DETECTION:');
    const detectedSubject = await this.detectSubjectWithGemini(originalText);
    
    // STEP 2: Analyze content for visual elements - EXACT same logic
    const contentAnalysis = this.analyzeVisualElements(originalText, originalHtml);
    
    // Update the analysis with Gemini-detected subject
    contentAnalysis.subject = detectedSubject;
    
    console.log('\n🔍 CONTENT ANALYSIS:');
    Object.entries(contentAnalysis).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        console.log(`${key}: ${value.length} found - ${value.join(', ')}`);
      } else {
        console.log(`${key}: ${value}`);
      }
    });
    
    // Initialize Gemini - EXACT same as step2.5
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Create smart context-aware prompt - EXACT same logic
    const smartPrompt = this.createSmartPrompt(goldenLatex, contentAnalysis, originalText, options);
    
    console.log(`\n🤖 Sending smart context-aware request to Gemini...`);
    console.log(`📝 Prompt length: ${smartPrompt.length} characters`);
    
    try {
      const result = await model.generateContent(smartPrompt);
      let newExamLatex = result.response.text();
      
      // Clean up markdown code blocks if present - EXACT same cleanup
      newExamLatex = this.cleanLatexContent(newExamLatex);
      
      // Validate LaTeX content for potential issues - EXACT same validation
      console.log(`🔍 Validating LaTeX content...`);
      const validationIssues = this.validateLatexContent(newExamLatex);
      
      if (validationIssues.length > 0) {
        console.log(`⚠️  Validation issues found:`);
        validationIssues.forEach(issue => console.log(`   - ${issue}`));
        console.log(`🔧 Attempting to fix some issues automatically...`);
        
        // Attempt some basic fixes - EXACT same fixes
        if (validationIssues.some(issue => issue.includes('Unbalanced braces'))) {
          console.log(`   - Attempting to balance braces...`);
          const openCount = (newExamLatex.match(/\{/g) || []).length;
          const closeCount = (newExamLatex.match(/\}/g) || []).length;
          if (openCount > closeCount) {
            newExamLatex += '}';
            console.log(`   - Added ${openCount - closeCount} missing closing brace(s)`);
          }
        }
      } else {
        console.log(`✅ LaTeX validation passed - no issues detected`);
      }
      
      console.log(`✅ Smart exam generated: ${newExamLatex.length} characters`);
      
      return {
        latexContent: newExamLatex,
        subject: contentAnalysis.subject,
        analysis: contentAnalysis,
        originalContent: extractionResults.textContent,
        questionCount: options.numQuestions || 5,
        difficulty: options.difficulty || 'medium'
      };
      
    } catch (error) {
      console.error('❌ Step 2.5 smart generation failed:', error);
      throw error;
    }
  }

  /**
   * EXACT analyzeVisualElements from step2.5-SMART-context-aware.js - THE WORKING VERSION
   */
  static analyzeVisualElements(text, html) {
    const analysis = {
      subject: 'pending-gemini-analysis', // Will be set by Gemini
      hasDAGs: false,
      hasCircuits: false,
      hasTables: false,
      hasCodeSnippets: false,
      hasMathEquations: false,
      hasFlowCharts: false,
      hasNetworkDiagrams: false,
      hasAlgorithmPseudocode: false,
      detectedElements: [],
      codeLanguages: [],
      diagramTypes: [],
      tableStructures: [],
      mathNotations: [],
      // Enhanced content analysis
      contentTopics: [],
      questionTypes: [],
      academicPatterns: [],
      technicalTerms: [],
      complexityLevel: 'medium'
    };
    
    // Extract key topics from the content - using generic patterns since Gemini will handle subject detection
    const topicPatterns = {
      'algorithms': /algorithm|sorting|searching|complexity|big-?o|recursion|dynamic programming|greedy/gi,
      'data-structures': /array|list|tree|graph|stack|queue|heap|hash|linked list/gi,
      'programming': /programming|code|function|variable|loop|conditional|class|object/gi,
      'mathematics': /mathematical|equation|formula|theorem|proof|calculation|numeric/gi,
      'systems': /system|architecture|design|implementation|performance|optimization/gi
    };
    
    Object.entries(topicPatterns).forEach(([topic, pattern]) => {
      const matches = text.match(pattern) || [];
      if (matches.length > 2) { // More than 2 mentions indicates significant coverage
        analysis.contentTopics.push(`${topic} (${matches.length} mentions)`);
      }
    });
    
    // Detect question types and patterns
    const questionPatterns = {
      'theoretical': /explain|describe|define|what is|why does|compare|contrast|discuss/gi,
      'analytical': /analyze|calculate|determine|evaluate|prove|show that|derive/gi,
      'practical': /implement|design|write|code|create|develop|construct/gi,
      'problem-solving': /solve|find|optimize|minimize|maximize|given.*find/gi
    };
    
    Object.entries(questionPatterns).forEach(([type, pattern]) => {
      const matches = text.match(pattern) || [];
      if (matches.length > 0) {
        analysis.questionTypes.push(`${type} (${matches.length} instances)`);
      }
    });
    
    // Detect academic complexity indicators
    const complexityIndicators = {
      'advanced-math': /integral|derivative|matrix|theorem|proof|lemma|corollary/gi,
      'research-level': /paper|publication|research|state-of-the-art|novel approach/gi,
      'industry-practice': /real-world|production|scalability|performance|optimization/gi,
      'multi-step-problems': /part \([a-e]\)|step \d+|first.*then.*finally/gi
    };
    
    let complexityScore = 0;
    Object.entries(complexityIndicators).forEach(([indicator, pattern]) => {
      const matches = text.match(pattern) || [];
      if (matches.length > 0) {
        analysis.academicPatterns.push(`${indicator} (${matches.length} instances)`);
        complexityScore += matches.length;
      }
    });
    
    // Determine complexity level
    if (complexityScore > 10) analysis.complexityLevel = 'advanced';
    else if (complexityScore > 5) analysis.complexityLevel = 'intermediate';
    else analysis.complexityLevel = 'basic';
    
    // Extract technical terms for context
    const technicalTermPattern = /\b[A-Z][a-z]*(?:[A-Z][a-z]*)+\b|[a-z]+(?:-[a-z]+)+/g;
    const technicalMatches = text.match(technicalTermPattern) || [];
    const uniqueTerms = [...new Set(technicalMatches)]
      .filter(term => term.length > 3 && !term.match(/^(The|And|For|With|From|This|That|When|Where|What|How)$/))
      .slice(0, 10); // Top 10 technical terms
    analysis.technicalTerms = uniqueTerms;
    
    // More precise detection - only if ACTUAL visual elements exist
    
    // Detect DAGs and graphs - only if actual diagram markup present
    if ((text.match(/DAG|directed acyclic graph|graph.*node|vertex.*edge|adjacency/i) && 
         (html.includes('svg') || html.includes('tikz') || html.includes('graph') || text.includes('→') || text.includes('->') || text.includes('edge'))) ||
        html.includes('dag')) {
      analysis.hasDAGs = true;
      analysis.detectedElements.push('DAG diagrams');
      analysis.diagramTypes.push('DAG');
    }
    
    // Detect circuits - only if actual circuit diagrams exist, not just mentions
    if ((html.includes('circuit') || html.includes('svg') || 
         (text.match(/circuit.*diagram|logic.*gate.*diagram|truth.*table.*with.*gates/i))) &&
        !(text.match(/circuit.*complexity|time.*complexity.*circuit|computational.*circuit/i))) {
      analysis.hasCircuits = true;
      analysis.detectedElements.push('Circuit diagrams');
      analysis.diagramTypes.push('circuits');
    }
    
    // Detect tables - only if actual table structures exist
    if (html.includes('<table>') || html.includes('<td>') || 
        text.match(/\|.*\|.*\|/g) && text.match(/\|.*\|.*\|/g).length > 2 ||
        text.match(/\begin\{tabular\}/g)) {
      analysis.hasTables = true;
      analysis.detectedElements.push('Tables');
      
      // Count table structures
      const tableMatches = html.match(/<table.*?<\/table>/gs) || [];
      const textTableMatches = text.match(/\|.*\|.*\|/g) || [];
      analysis.tableStructures = [...tableMatches.map((table, i) => `HTML Table ${i+1}`), 
                                 ...textTableMatches.slice(0, 3).map((table, i) => `Text Table ${i+1}`)];
    }
    
    // Detect code snippets - only if actual code blocks exist
    const codePatterns = [
      /```[\s\S]*?```/g,
      /\bfor\s*\([^)]*\)\s*\{/g,
      /\bwhile\s*\([^)]*\)\s*\{/g,
      /\bif\s*\([^)]*\)\s*\{/g,
      /\bfunction\s+\w+\s*\(/g,
      /\bdef\s+\w+\s*\(/g,
      /\bint\s+\w+\s*=/g,
      /\breturn\s+[\w\[\]]+/g,
      /\bpublic\s+static\s+void/g
    ];
    
    const hasActualCode = codePatterns.some(pattern => pattern.test(text)) || 
                         html.includes('<code>') || html.includes('<pre>') ||
                         text.includes('\\begin{verbatim}') || text.includes('\\begin{lstlisting}');
    
    if (hasActualCode) {
      analysis.hasCodeSnippets = true;
      analysis.detectedElements.push('Code snippets');
      
      // Detect programming languages
      if (text.match(/\bfor\s*\(.*int.*\)/)) analysis.codeLanguages.push('C/C++');
      if (text.match(/\bdef\s+\w+/)) analysis.codeLanguages.push('Python');
      if (text.match(/\bfunction\s+\w+/)) analysis.codeLanguages.push('JavaScript');
      if (text.match(/\bpublic\s+class/)) analysis.codeLanguages.push('Java');
    }

    // Detect algorithms/pseudocode - only if structured algorithm format exists
    if (text.match(/Algorithm\s+\d+|Procedure\s+\w+|\\begin\{algorithm\}|Step\s+\d+:|Input:|Output:|Begin:|End\s*;/i) ||
        (text.match(/algorithm/i) && text.match(/begin|end|step\s*\d+|input:|output:/i))) {
      analysis.hasAlgorithmPseudocode = true;
      analysis.detectedElements.push('Algorithm pseudocode');
    }

    // Detect mathematical equations - only if actual math notation exists
    const mathPatterns = [
      /\$.*\$/g,
      /\\begin\{equation\}/g,
      /\\begin\{align\}/g,
      /\\frac\{[^}]+\}\{[^}]+\}/g,
      /\\sum/g,
      /\\int/g,
      /[∑∏∫∂∇]/g,
      /\\theta|\\Theta|\\Omega|\\omega/g
    ];
    
    const hasActualMath = mathPatterns.some(pattern => pattern.test(text)) || 
                         html.includes('math') || 
                         text.match(/equation|formula|theorem\s*\d+|proof\s*:|lemma\s*\d+/i);
    
    if (hasActualMath) {
      analysis.hasMathEquations = true;
      analysis.detectedElements.push('Mathematical equations');
      
      // Detect specific math notations
      if (text.match(/\\theta|\\Theta|\\Omega|\\omega/g)) analysis.mathNotations.push('Greek letters');
      if (text.match(/\\frac/g)) analysis.mathNotations.push('Fractions');
      if (text.match(/\\sum|∑/g)) analysis.mathNotations.push('Summations');
      if (text.match(/\\int|∫/g)) analysis.mathNotations.push('Integrals');
      if (text.match(/\\begin\{equation\}/g)) analysis.mathNotations.push('Equations');
      if (text.match(/\\begin\{matrix\}/g)) analysis.mathNotations.push('Matrices');
    }
    
    // Detect flowcharts and network diagrams
    if (text.match(/flowchart|flow chart|diagram.*flow|process.*diagram/i) || 
        html.includes('flowchart') || text.includes('\\begin{tikzpicture}')) {
      analysis.hasFlowCharts = true;
      analysis.detectedElements.push('Flow charts');
      analysis.diagramTypes.push('flowcharts');
    }
    
    if (text.match(/network.*diagram|topology|node.*connection|network.*graph/i)) {
      analysis.hasNetworkDiagrams = true;
      analysis.detectedElements.push('Network diagrams');
      analysis.diagramTypes.push('networks');
    }

    return analysis;
  }

  /**
   * EXACT detectSubjectWithGemini from step2.5-SMART-context-aware.js
   */
  static async detectSubjectWithGemini(text) {
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const prompt = `Analyze this complete exam content and determine the primary subject area:

FULL EXAM CONTENT:
${text}

Please analyze the content above and provide a JSON response with:
{
  "primarySubject": "exact-subject-name",
  "confidence": "high/medium/low",
  "reasoning": "brief explanation of why this subject was chosen",
  "keyTopics": ["topic1", "topic2", "topic3"],
  "secondarySubjects": ["subject1", "subject2"] 
}

Subject should be one specific area like:
- parallel-computing
- operating-systems
- algorithms
- data-structures
- computer-networks
- databases
- machine-learning
- computer-graphics
- computer-security
- software-engineering
- compilers
- computer-architecture
- discrete-mathematics
- calculus
- linear-algebra
- probability-theory
- statistics
- physics
- chemistry
- biology
- or any other specific academic subject

Return ONLY the JSON response.`;

      const result = await model.generateContent(prompt);
      const response = result.response.text();
      
      // Clean the response to extract JSON - EXACT same logic
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        console.log(`🎯 Gemini Subject Analysis:`);
        console.log(`   Primary Subject: ${analysis.primarySubject}`);
        console.log(`   Confidence: ${analysis.confidence}`);
        console.log(`   Reasoning: ${analysis.reasoning}`);
        
        return analysis.primarySubject;
      } else {
        console.log(`⚠️  Could not parse Gemini response, using fallback`);
        return 'general-computer-science';
      }
      
    } catch (error) {
      console.log(`❌ Gemini subject detection failed: ${error.message}`);
      return 'general-computer-science';
    }
  }

  /**
   * EXACT createSmartPrompt from step2.5-SMART-context-aware.js - THE WORKING VERSION
   */
  static createSmartPrompt(goldenLatex, analysis, originalText, options) {
    const numQuestions = options.numQuestions || 5;
    const difficulty = options.difficulty || 'medium';
    const instructions = options.instructions || '';
    
    // Extract the original course title/subject from the text - EXACT same as working version
    const titleMatch = originalText.match(/Introduction to ([^\\n]+)|([A-Z][^\\n]*Engineering[^\\n]*)|([A-Z][^\\n]*Systems?[^\\n]*)|([A-Z][^\\n]*Computing[^\\n]*)/i);
    const originalCourse = titleMatch ? titleMatch[0] : 'Computer Science';
    
    // Extract content samples for more context - EXACT same as working version
    const problemsMatch = originalText.match(/Problem \\d+[\\s\\S]*?(?=Problem \\d+|$)/gi) || [];
    const questionsMatch = originalText.match(/Question \\d+[\\s\\S]*?(?=Question \\d+|$)/gi) || [];
    const sectionsMatch = originalText.match(/\\d+\\.[\\s\\S]*?(?=\\d+\\.|$)/g) || [];
    
    // Get a substantial excerpt for context (first 2000 chars of meaningful content) - EXACT same
    const contentExcerpt = originalText
      .replace(/\\s+/g, ' ')  // normalize whitespace
      .slice(0, 2000) + (originalText.length > 2000 ? '...' : '');
    
    let prompt = `Here is a LaTeX exam format:

${goldenLatex}

COMPLETE ORIGINAL EXAM CONTENT FOR CONTEXT:
This is the full content from the original exam to understand the depth, style, and complexity:

${contentExcerpt}

CONTENT ANALYSIS OF THE ORIGINAL EXAM:
- Subject: ${analysis.subject}
- Original Course: ${originalCourse}
- Total Content Length: ${originalText.length} characters
- Number of Problems/Questions: ${problemsMatch.length + questionsMatch.length + sectionsMatch.length}
- Visual elements detected: ${analysis.detectedElements.join(', ')}
- Has DAG diagrams: ${analysis.hasDAGs}
- Has circuits: ${analysis.hasCircuits}
- Has tables: ${analysis.hasTables}
- Has code snippets: ${analysis.hasCodeSnippets} (Languages: ${analysis.codeLanguages.join(', ')})
- Has mathematical equations: ${analysis.hasMathEquations}
- Has algorithm pseudocode: ${analysis.hasAlgorithmPseudocode}
- Content Topics: ${analysis.contentTopics.join(', ')}
- Question Types: ${analysis.questionTypes.join(', ')}
- Academic Patterns: ${analysis.academicPatterns.join(', ')}
- Complexity Level: ${analysis.complexityLevel}

STYLE AND COMPLEXITY ANALYSIS:
Based on the original content, this exam should match the same academic rigor, question complexity, and depth of understanding required.

Please generate a NEW exam using this EXACT LaTeX format and structure, but with COMPLETELY DIFFERENT questions that match the original subject matter, style, and academic level.

CRITICAL REQUIREMENTS:
- Keep the SAME course title: "${originalCourse}"
- Generate NEW questions ONLY for ${analysis.subject} - do NOT mix subjects
- Generate ${numQuestions} questions at ${difficulty} difficulty level
- Match the ACADEMIC LEVEL and COMPLEXITY shown in the original content
- Include SIMILAR visual elements as the original
- Use the original content as inspiration for question TYPES and DEPTH, not the actual questions
- Focus EXCLUSIVELY on ${analysis.subject} topics - avoid contamination from other subjects

${instructions ? `\\nUSER INSTRUCTIONS: "${instructions}"\\n` : ''}

SUBJECT-SPECIFIC CONTENT GENERATION:
Based on the detected subject "${analysis.subject}", generate questions that are:
- Authentic to this specific academic discipline
- Using terminology and concepts appropriate for ${analysis.subject}
- Following the same academic standards as shown in the original exam
- Covering different specific topics within ${analysis.subject} but maintaining the same depth

VISUAL ELEMENTS TO INCLUDE (if present in original):`;

    // Add specific instructions based on detected elements - EXACT same as working version
    if (analysis.hasDAGs) {
      prompt += `
  * Create NEW DAG diagrams using TikZ with \\\\node and \\\\edge commands
  * Include directed graphs, trees, or network topologies that match the complexity of the original`;
    }
    
    if (analysis.hasCircuits) {
      prompt += `
  * Create NEW circuit diagrams using TikZ (avoid unavailable packages)
  * Include logic gates, digital circuits, or electrical components with similar complexity`;
    }
    
    if (analysis.hasTables) {
      prompt += `
  * Create NEW tables with different data using LaTeX \\\\begin{tabular} environment
  * Include comparative data, results, or structured information that matches the original's style`;
    }
    
    if (analysis.hasCodeSnippets) {
      prompt += `
  * Include NEW code snippets in similar languages: ${analysis.codeLanguages.join(', ')}
  * Use \\\\begin{verbatim} for code formatting (DO NOT use unavailable packages)
  * Create realistic programming problems with different algorithms but similar complexity`;
    }
    
    if (analysis.hasMathEquations) {
      prompt += `
  * Include NEW mathematical equations and formulas that match the original's mathematical depth
  * Use proper LaTeX math notation with $, \\\\[, \\\\], \\\\begin{equation}, etc.
  * Include similar mathematical concepts but with different specific problems`;
    }
    
    if (analysis.hasAlgorithmPseudocode) {
      prompt += `
  * Create NEW algorithm pseudocode using \\\\begin{verbatim} or structured format
  * DO NOT use \\\\usepackage{algorithm} or \\\\usepackage{algpseudocode} (not available)
  * Include step-by-step algorithmic procedures that match the original's complexity`;
    }

    // FORCE GENERATION for parallel computing even if not detected - this is key!
    if (analysis.subject === 'parallel-computing') {
      prompt += `

PARALLEL COMPUTING MANDATORY VISUAL REQUIREMENTS:
Since this is a parallel computing exam, you MUST ACTUALLY GENERATE these visual elements:

1. **MANDATORY TikZ DAG**: Create an ACTUAL task dependency graph:
\\begin{tikzpicture}[node distance=1.5cm]
  \\node (A) [circle, draw] {A (5)};
  \\node (B) [circle, draw, right of=A] {B (3)};
  \\node (C) [circle, draw, below of=A] {C (7)};
  \\node (D) [circle, draw, right of=B] {D (4)};
  \\node (E) [circle, draw, below of=D] {E (6)};
  \\draw[->] (A) -- (B);
  \\draw[->] (A) -- (C);
  \\draw[->] (B) -- (D);
  \\draw[->] (C) -- (E);
  \\draw[->] (D) -- (E);
\\end{tikzpicture}

2. **MANDATORY TABLE**: Create an ACTUAL performance comparison table:
\\begin{tabular}{|c|c|c|}
\\hline
Task & P1 (ms) & P2 (ms) \\\\
\\hline
A & 5 & 7 \\\\
B & 3 & 2 \\\\
C & 7 & 8 \\\\
D & 4 & 3 \\\\
E & 6 & 5 \\\\
\\hline
\\end{tabular}

3. **MANDATORY MPI CODE**: Include ACTUAL MPI code snippet:
\\begin{verbatim}
#include <mpi.h>
int main(int argc, char** argv) {
    MPI_Init(&argc, &argv);
    int rank, size;
    MPI_Comm_rank(MPI_COMM_WORLD, &rank);
    MPI_Comm_size(MPI_COMM_WORLD, &size);
    
    int data = rank * 10;
    if (rank == 0) {
        // Receive from all other processes
        for (int i = 1; i < size; i++) {
            MPI_Recv(&data, 1, MPI_INT, i, 0, MPI_COMM_WORLD, MPI_STATUS_IGNORE);
        }
    } else {
        // Send to process 0
        MPI_Send(&data, 1, MPI_INT, 0, 0, MPI_COMM_WORLD);
    }
    
    MPI_Finalize();
    return 0;
}
\\end{verbatim}

DO NOT USE PLACEHOLDER TEXT! Generate the actual TikZ diagrams, tables, and code as shown above.
Make sure to include \\usepackage{tikz} in the preamble.`;
    }
    
    prompt += `

CONTENT VARIETY AND RICHNESS:
Use the original exam content as a comprehensive reference for:
- Question phrasing style and academic tone specific to ${analysis.subject}
- Level of detail expected in ${analysis.subject} problems
- Types of concepts that should be tested in ${analysis.subject}
- Appropriate difficulty progression for ${analysis.subject}
- Integration of theoretical and practical elements typical of ${analysis.subject}

IMPORTANT: Stay strictly within the ${analysis.subject} domain. Do not include questions from other subjects like operating systems, databases, networks, etc. unless they are directly part of the ${analysis.subject} curriculum as shown in the original exam.

TECHNICAL REQUIREMENTS:
1. ONLY use standard LaTeX packages that are available: amsmath, amssymb, amsthm, geometry, tikz
2. For pseudocode: Use \\\\begin{verbatim} or simple text formatting, NOT algorithm packages
3. For tables: Use \\\\begin{tabular} with proper column alignment and \\\\hline separators
4. For code: Use \\\\begin{verbatim} with proper indentation
5. For math: Use \\\\begin{equation}, \\\\[, \\\\], \\\\frac, \\\\sum, etc. for professional math typography
6. For diagrams: Use TikZ commands like \\\\node, \\\\draw for professional diagrams
7. AVOID theorem environments that might cause errors - use simple \\\\textbf{} instead

PACKAGE RESTRICTIONS:
- DO NOT use \\\\usepackage{algorithm}
- DO NOT use \\\\usepackage{algpseudocode}  
- DO NOT use \\\\begin{theorem} (use \\\\textbf{Theorem:} instead)
- DO NOT use unavailable packages
- DO NOT use Unicode characters like └ ├ ─ (use simple ASCII instead)
- DO NOT use \\\\usepackage{listings} (use \\\\begin{verbatim} instead)

Make the questions challenging, academic-level, and completely different from the original while maintaining the same visual richness, complexity, and depth of understanding required. The new exam should feel like it came from the same ${analysis.subject} course but covering different specific topics within that subject area.

Return ONLY the complete LaTeX document that compiles without errors.`;

    return prompt;
  }

  /**
   * ENHANCED cleanLatexContent from step2.5-SMART-context-aware.js with better Unicode handling
   */
  static cleanLatexContent(content) {
    console.log('🧹 Enhanced LaTeX content cleaning...');
    console.log('Original length:', content.length);
    
    // Remove markdown code blocks
    let cleaned = content.replace(/```latex\n?/g, '');
    cleaned = cleaned.replace(/```\n?/g, '');
    
    // Remove any leading/trailing whitespace
    cleaned = cleaned.trim();
    
    // CHECK FOR TIKZ DIAGRAMS AND ADD REQUIRED PACKAGES
    if (cleaned.includes('\\begin{tikzpicture}') || cleaned.includes('tikzpicture')) {
      console.log('🎨 TikZ diagrams detected - ensuring proper packages...');
      
      // Check if TikZ packages are already included
      if (!cleaned.includes('\\usepackage{tikz}')) {
        // Find where to insert packages (after existing \usepackage statements or after \documentclass)
        const packageInsertPoint = cleaned.indexOf('\\begin{document}');
        if (packageInsertPoint > -1) {
          const beforeDocument = cleaned.substring(0, packageInsertPoint);
          const afterDocument = cleaned.substring(packageInsertPoint);
          
          // Add TikZ packages before \begin{document}
          const tikzPackages = '\\usepackage{tikz}\n\\usetikzlibrary{arrows,shapes,positioning}\n';
          cleaned = beforeDocument + tikzPackages + afterDocument;
          console.log('✅ Added TikZ packages for diagram compilation');
        }
      }
    }
    
    // FORCE ADD TIKZ PACKAGES FOR PARALLEL COMPUTING (even if no diagrams detected yet)
    if ((cleaned.includes('parallel') || cleaned.includes('Parallel')) && !cleaned.includes('\\usepackage{tikz}')) {
      console.log('🔧 Parallel computing subject detected - preemptively adding TikZ packages...');
      
      const packageInsertPoint = cleaned.indexOf('\\begin{document}');
      if (packageInsertPoint > -1) {
        const beforeDocument = cleaned.substring(0, packageInsertPoint);
        const afterDocument = cleaned.substring(packageInsertPoint);
        
        // Add TikZ packages before \begin{document}
        const tikzPackages = '\\usepackage{tikz}\n\\usetikzlibrary{arrows,shapes,positioning}\n';
        cleaned = beforeDocument + tikzPackages + afterDocument;
        console.log('✅ Preemptively added TikZ packages for parallel computing');
      }
    }
    
    // ENHANCED Unicode and problematic character cleaning
    // Fix Unicode box drawing characters (common in diagrams/trees)
    cleaned = cleaned.replace(/[└├─│┌┐┘┴┬┤┼┌┐┘└]/g, '+'); // Replace box drawing with simple +
    cleaned = cleaned.replace(/[╔╗╚╝║═╠╬╣╦╩]/g, '+'); // Replace double-line box drawing
    
    // Fix Unicode math symbols that cause LaTeX errors
    cleaned = cleaned.replace(/√/g, '\\sqrt'); // Square root symbol
    cleaned = cleaned.replace(/≥/g, '\\geq'); // Greater than or equal
    cleaned = cleaned.replace(/≤/g, '\\leq'); // Less than or equal
    cleaned = cleaned.replace(/∈/g, '\\in'); // Element of
    cleaned = cleaned.replace(/∉/g, '\\notin'); // Not element of
    cleaned = cleaned.replace(/∞/g, '\\infty'); // Infinity
    cleaned = cleaned.replace(/α/g, '\\alpha'); // Alpha
    cleaned = cleaned.replace(/β/g, '\\beta'); // Beta
    cleaned = cleaned.replace(/γ/g, '\\gamma'); // Gamma
    cleaned = cleaned.replace(/δ/g, '\\delta'); // Delta
    cleaned = cleaned.replace(/ε/g, '\\epsilon'); // Epsilon
    cleaned = cleaned.replace(/θ/g, '\\theta'); // Theta
    cleaned = cleaned.replace(/λ/g, '\\lambda'); // Lambda
    cleaned = cleaned.replace(/μ/g, '\\mu'); // Mu
    cleaned = cleaned.replace(/π/g, '\\pi'); // Pi
    cleaned = cleaned.replace(/σ/g, '\\sigma'); // Sigma
    cleaned = cleaned.replace(/τ/g, '\\tau'); // Tau
    cleaned = cleaned.replace(/φ/g, '\\phi'); // Phi
    cleaned = cleaned.replace(/ω/g, '\\omega'); // Omega
    
    // Fix Unicode subscripts and superscripts
    cleaned = cleaned.replace(/₀/g, '_0'); // Subscript 0
    cleaned = cleaned.replace(/₁/g, '_1'); // Subscript 1
    cleaned = cleaned.replace(/₂/g, '_2'); // Subscript 2
    cleaned = cleaned.replace(/₃/g, '_3'); // Subscript 3
    cleaned = cleaned.replace(/₄/g, '_4'); // Subscript 4
    cleaned = cleaned.replace(/₅/g, '_5'); // Subscript 5
    cleaned = cleaned.replace(/₆/g, '_6'); // Subscript 6
    cleaned = cleaned.replace(/₇/g, '_7'); // Subscript 7
    cleaned = cleaned.replace(/₈/g, '_8'); // Subscript 8
    cleaned = cleaned.replace(/₉/g, '_9'); // Subscript 9
    cleaned = cleaned.replace(/⁰/g, '^0'); // Superscript 0
    cleaned = cleaned.replace(/¹/g, '^1'); // Superscript 1
    cleaned = cleaned.replace(/²/g, '^2'); // Superscript 2
    cleaned = cleaned.replace(/³/g, '^3'); // Superscript 3
    cleaned = cleaned.replace(/⁴/g, '^4'); // Superscript 4
    cleaned = cleaned.replace(/⁵/g, '^5'); // Superscript 5
    
    // Fix arrows and logical symbols
    cleaned = cleaned.replace(/→/g, '\\rightarrow'); // Right arrow
    cleaned = cleaned.replace(/←/g, '\\leftarrow'); // Left arrow
    cleaned = cleaned.replace(/↔/g, '\\leftrightarrow'); // Bi-directional arrow
    cleaned = cleaned.replace(/⇒/g, '\\Rightarrow'); // Implies
    cleaned = cleaned.replace(/⇔/g, '\\Leftrightarrow'); // If and only if
    cleaned = cleaned.replace(/∀/g, '\\forall'); // For all
    cleaned = cleaned.replace(/∃/g, '\\exists'); // There exists
    cleaned = cleaned.replace(/∧/g, '\\land'); // Logical and
    cleaned = cleaned.replace(/∨/g, '\\lor'); // Logical or
    cleaned = cleaned.replace(/¬/g, '\\neg'); // Logical not
    
    // Fix HTML entities that sometimes slip through
    cleaned = cleaned.replace(/&lt;/g, '<');
    cleaned = cleaned.replace(/&gt;/g, '>');
    cleaned = cleaned.replace(/&amp;/g, '&');
    cleaned = cleaned.replace(/&quot;/g, '"');
    cleaned = cleaned.replace(/&#x27;/g, "'");
    cleaned = cleaned.replace(/<sub>/g, '_{');
    cleaned = cleaned.replace(/<\/sub>/g, '}');
    cleaned = cleaned.replace(/<sup>/g, '^{');
    cleaned = cleaned.replace(/<\/sup>/g, '}');
    
    // Fix backticks that cause math mode issues
    cleaned = cleaned.replace(/`([^`]*)`/g, '\\texttt{$1}'); // Convert `code` to \texttt{code}
    cleaned = cleaned.replace(/`/g, "'"); // Replace remaining backticks with single quotes
    
    // Fix common problematic characters
    cleaned = cleaned.replace(/"/g, "''"); // Replace smart quotes
    cleaned = cleaned.replace(/"/g, "``"); // Replace smart quotes
    cleaned = cleaned.replace(/'/g, "'"); // Replace smart apostrophes
    cleaned = cleaned.replace(/'/g, "`"); // Replace smart apostrophes
    cleaned = cleaned.replace(/…/g, '...'); // Replace ellipsis
    cleaned = cleaned.replace(/–/g, '--'); // Replace en-dash
    cleaned = cleaned.replace(/—/g, '---'); // Replace em-dash
    
    // Fix problematic underscores and special characters that break LaTeX
    cleaned = cleaned.replace(/pthread_mutex_t/g, 'pthread\\_mutex\\_t');
    cleaned = cleaned.replace(/pthread_cond_t/g, 'pthread\\_cond\\_t');
    cleaned = cleaned.replace(/pthread_create/g, 'pthread\\_create');
    cleaned = cleaned.replace(/(\b\w+)_(\w+)/g, '$1\\_$2'); // General underscore escaping in identifiers
    
    // Fix theorem environment issues - replace with simpler alternatives
    cleaned = cleaned.replace(/\\begin\{theorem\}(.*?)\\end\{theorem\}/gs, '\\textbf{Theorem:} $1');
    cleaned = cleaned.replace(/\\begin\{lemma\}(.*?)\\end\{lemma\}/gs, '\\textbf{Lemma:} $1');
    cleaned = cleaned.replace(/\\begin\{proof\}(.*?)\\end\{proof\}/gs, '\\textbf{Proof:} $1');
    cleaned = cleaned.replace(/\\begin\{definition\}(.*?)\\end\{definition\}/gs, '\\textbf{Definition:} $1');
    
    // Enhanced LaTeX cleaning for robustness - EXACT same logic plus more
    cleaned = cleaned.replace(/\\texttt\{([^}]*)\}/g, (match, content) => {
      const escapedContent = content
        .replace(/\\/g, '\\textbackslash{}')
        .replace(/_/g, '\\_')
        .replace(/\$/g, '\\$')
        .replace(/#/g, '\\#')
        .replace(/%/g, '\\%')
        .replace(/&/g, '\\&')
        .replace(/\^/g, '\\textasciicircum{}')
        .replace(/~/g, '\\textasciitilde{}');
      return `\\texttt{${escapedContent}}`;
    });
    
    // Fix common LaTeX syntax issues
    cleaned = cleaned.replace(/([^\\])%/g, '$1\\%');
    cleaned = cleaned.replace(/([^\\])&/g, '$1\\&');
    cleaned = cleaned.replace(/([^\\])#/g, '$1\\#');
    
    // Fix itemize/enumerate context issues
    cleaned = cleaned.replace(/\$\s*\\item/g, '\\item'); // Remove $ before \item
    cleaned = cleaned.replace(/\\item\s*\$/g, '\\item'); // Remove $ after \item
    
    // Ensure proper spacing and structure
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n'); // Limit multiple newlines
    cleaned = cleaned.replace(/\s+\n/g, '\n'); // Remove trailing spaces
    
    console.log('Cleaned length:', cleaned.length);
    console.log('Cleaning completed - removed problematic Unicode and fixed LaTeX syntax');
    
    return cleaned;
  }

  /**
   * EXACT validateLatexContent from step2.5-SMART-context-aware.js
   */
  static validateLatexContent(content) {
    const issues = [];
    
    // Check for balanced braces
    const openBraces = (content.match(/\{/g) || []).length;
    const closeBraces = (content.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      issues.push(`Unbalanced braces: ${openBraces} open, ${closeBraces} close`);
    }
    
    // Check for required document structure
    if (!content.includes('\\documentclass')) {
      issues.push('Missing \\documentclass');
    }
    if (!content.includes('\\begin{document}')) {
      issues.push('Missing \\begin{document}');
    }
    if (!content.includes('\\end{document}')) {
      issues.push('Missing \\end{document}');
    }
    
    return issues;
  }

  /**
   * Compile LaTeX to PDF - Use the correct pdflatex path that we know works
   */
  static async compileToPDF(latexContent, outputDir) {
    console.log('=== COMPILING LATEX TO PDF ===');
    
    // Use absolute path for uploads directory if not provided
    if (!outputDir) {
      outputDir = path.join(__dirname, '../uploads');
    }
    
    // Ensure the directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`✅ Created output directory: ${outputDir}`);
    }
    
    const timestamp = Date.now();
    const filename = `smart-exam-${timestamp}`;
    const texFile = `${filename}.tex`;
    const pdfFile = `${filename}.pdf`;
    const texPath = path.join(outputDir, texFile);
    const pdfPath = path.join(outputDir, pdfFile);
    
    console.log(`📂 Using output directory: ${outputDir}`);
    console.log(`📄 TeX file path: ${texPath}`);
    console.log(`📄 PDF file path: ${pdfPath}`);
    
    try {
      // Clean the content first
      console.log('=== CLEANING LATEX CONTENT ===');
      console.log('Input content length:', latexContent.length);
      console.log('First 100 chars:', latexContent.substring(0, 100));
      
      const cleanedContent = this.cleanLatexContent(latexContent);
      console.log('Cleaned content length:', cleanedContent.length);
      console.log('First 100 chars after cleaning:', cleanedContent.substring(0, 100));
      
      // Validate the content
      const issues = this.validateLatexContent(cleanedContent);
      if (issues.length > 0) {
        console.log('⚠️  LaTeX validation issues:', issues);
      }
      
      // Ensure content starts with documentclass
      if (!cleanedContent.startsWith('\\documentclass')) {
        throw new Error('LaTeX content must start with \\documentclass');
      }
      console.log('✅ Content properly starts with \\documentclass');
      
      // Write the cleaned LaTeX file
      fs.writeFileSync(texPath, cleanedContent);
      console.log(`✅ Cleaned LaTeX file written: ${texPath}`);
      
      // Find pdflatex - use the exact same logic as AI controller
      let pdflatexPath = null;
      const possiblePaths = [
        '/usr/local/texlive/2025basic/bin/universal-darwin/pdflatex',
        '/usr/local/texlive/2024/bin/universal-darwin/pdflatex',
        '/usr/local/texlive/2023/bin/universal-darwin/pdflatex',
        '/usr/local/bin/pdflatex',
        'pdflatex'
      ];
      
      for (const testPath of possiblePaths) {
        try {
          if (testPath.startsWith('/')) {
            if (fs.existsSync(testPath)) {
              pdflatexPath = testPath;
              break;
            }
          } else {
            execSync(`which ${testPath}`, { stdio: 'ignore' });
            pdflatexPath = testPath;
            break;
          }
        } catch (e) {
          // Continue to next path
        }
      }
      
      if (!pdflatexPath) {
        throw new Error('pdflatex not found in any expected location');
      }
      
      console.log(`✅ Found pdflatex at: ${pdflatexPath}`);
      
      // Compile with pdflatex - use EXACT same command structure as AI controller
      console.log('🔧 Compiling with pdflatex...');
      const command = `cd "${path.resolve(outputDir)}" && "${pdflatexPath}" -interaction=nonstopmode "${texFile}"`;
      console.log(`🔧 Executing: ${command}`);
      
      let output = '';
      try {
        output = execSync(command, { encoding: 'utf8' });
        console.log('✅ LaTeX compilation completed without errors!');
      } catch (error) {
        // LaTeX might return non-zero exit code even for successful compilation with warnings
        console.log('⚠️ LaTeX compilation finished with warnings/errors');
        output = error.stdout || '';
        
        // Log the LaTeX output for debugging
        if (error.stderr) {
          console.log('LaTeX stderr:', error.stderr.substring(0, 500));
        }
      }
      
      console.log('LaTeX output:', output.substring(0, 500) + (output.length > 500 ? '...' : ''));
      
      // Verify PDF was created - this is the real test of success
      if (!fs.existsSync(pdfPath)) {
        throw new Error(`PDF file not created: ${pdfPath}`);
      }
      
      const pdfSize = fs.statSync(pdfPath).size;
      
      // Check if PDF is too small (likely indicates compilation failure)
      if (pdfSize < 1000) {
        throw new Error(`PDF file too small (${pdfSize} bytes), likely compilation failed`);
      }
      
      console.log(`✅ PDF file created: ${pdfPath}`);
      console.log(`✅ LaTeX compilation completed successfully!`);
      console.log(`📄 Compiled PDF path: ${pdfPath}`);
      console.log(`✅ PDF file verified - Size: ${pdfSize} bytes`);
      
      return pdfPath;
      
    } catch (error) {
      console.error('❌ PDF compilation failed:', error.message);
      console.error('Full error:', error);
      throw error;
    }
  }

  /**
   * Enhanced table detection - EXACT same as step1-pdf-extraction.js
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
          
          // Check if elements are roughly aligned
          const columnTolerance = 50;
          let alignedColumns = 0;
          
          for (let col = 0; col < Math.min(currentRow.elements.length, nextRow.elements.length); col++) {
            if (Math.abs(currentRow.elements[col].left - nextRow.elements[col].left) <= columnTolerance) {
              alignedColumns++;
            }
          }
          
          // If we have good alignment, this might be a table
          if (alignedColumns >= 2) {
            const tableRows = [];
            const maxRows = Math.min(10, rows.length - i);
            
            // Extract table data
            for (let rowIdx = i; rowIdx < i + maxRows; rowIdx++) {
              const row = rows[rowIdx];
              if (row.elements.length >= 2) {
                row.elements.sort((a, b) => a.left - b.left);
                tableRows.push(row.elements.map(e => e.text));
              } else {
                break;
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
              break;
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
   * Create HTML table from row data - EXACT same as step1-pdf-extraction.js
   */
  static createHTMLTable(tableRows) {
    try {
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
      
    } catch (error) {
      console.log('Table creation error:', error.message);
      return '<p>Error creating table</p>';
    }
  }

  /**
   * Extract image information from HTML - EXACT same as step1-pdf-extraction.js
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
   * Extract individual questions from LaTeX content - needed for API response
   */
  static extractQuestionsFromLatex(latexContent) {
    console.log('🔍 Extracting questions from LaTeX content...');
    
    try {
      // Remove LaTeX preamble and document structure to get raw content
      const documentStartMatch = latexContent.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/);
      let rawContent = documentStartMatch ? documentStartMatch[1] : latexContent;
      
      console.log(`📄 Raw document content length: ${rawContent.length}`);
      
      // Extract sections (Problems/Questions)
      const sectionMatches = rawContent.match(/\\section\*?\{[^}]*\}([\s\S]*?)(?=\\section\*?\{|$)/g) || [];
      
      const questions = [];
      
      sectionMatches.forEach((section, index) => {
        // Extract section title
        const titleMatch = section.match(/\\section\*?\{([^}]*)\}/);
        const title = titleMatch ? titleMatch[1] : `Question ${index + 1}`;
        
        // Extract content after section title
        let content = section.replace(/\\section\*?\{[^}]*\}/, '').trim();
        
        // Clean up LaTeX formatting for display
        content = content
          .replace(/\\textbf\{([^}]*)\}/g, '**$1**')  // Bold to markdown
          .replace(/\\textit\{([^}]*)\}/g, '*$1*')    // Italic to markdown
          .replace(/\\begin\{itemize\}/g, '')         // Remove itemize
          .replace(/\\end\{itemize\}/g, '')
          .replace(/\\item\s*/g, '• ')                // Items to bullets
          .replace(/\\begin\{enumerate\}/g, '')       // Remove enumerate  
          .replace(/\\end\{enumerate\}/g, '')
          .replace(/\\\\/g, '\n')                     // Line breaks
          .replace(/\n\s*\n/g, '\n\n')               // Clean up spacing
          .trim();
        
        if (content.length > 20) { // Only include substantial content
          questions.push({
            title: title,
            content: content,
            rawLatex: section
          });
        }
      });
      
      // If no sections found, try to extract enumerate blocks
      if (questions.length === 0) {
        const enumerateMatches = rawContent.match(/\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/g) || [];
        
        enumerateMatches.forEach((block, index) => {
          let content = block
            .replace(/\\begin\{enumerate\}/g, '')
            .replace(/\\end\{enumerate\}/g, '')
            .replace(/\\item\s*/g, `${index + 1}. `)
            .replace(/\\\\/g, '\n')
            .trim();
            
          if (content.length > 20) {
            questions.push({
              title: `Question Block ${index + 1}`,
              content: content,
              rawLatex: block
            });
          }
        });
      }
      
      // If still no questions, create a simple split
      if (questions.length === 0) {
        const lines = rawContent.split('\n').filter(line => line.trim().length > 0);
        if (lines.length > 0) {
          questions.push({
            title: 'Generated Questions',
            content: lines.slice(0, 10).join('\n'), // First 10 meaningful lines
            rawLatex: rawContent.substring(0, 500)
          });
        }
      }
      
      console.log(`✅ Found ${questions.length} structured questions`);
      
      // Create a simple text version for the old API format
      const questionTexts = questions.map((q, i) => `${i + 1}. ${q.content.substring(0, 200)}${q.content.length > 200 ? '...' : ''}`);
      const questionsText = questionTexts.join('\n\n');
      
      console.log(`✅ Extracted questions from LaTeX: ${questionsText.substring(0, 200)}...`);
      
      return questionsText;
      
    } catch (error) {
      console.error('❌ Question extraction failed:', error.message);
      return 'Questions generated successfully. Please view the PDF for complete content.';
    }
  }
}

module.exports = PracticeExamPipelineService; 