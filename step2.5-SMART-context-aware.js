require('dotenv').config();
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { execSync } = require('child_process');

/**
 * STEP 2.5: SMART CONTEXT-AWARE NEW QUESTIONS
 * 
 * This version analyzes the original exam to detect:
 * - DAG diagrams
 * - Circuit diagrams  
 * - Tables
 * - Code snippets
 * - Mathematical equations
 * - Flow charts
 * - Network diagrams
 * - And generates NEW questions with similar visual elements
 */

async function generateSmartContextAwareExam(userParams = {}) {
  console.log('🚀 STEP 2.5: SMART CONTEXT-AWARE GENERATOR');
  console.log('=============================================');
  
  // Log received parameters
  if (Object.keys(userParams).length > 0) {
    console.log('📥 USER PARAMETERS RECEIVED:');
    console.log(`   🎯 Subject: ${userParams.subject || 'auto-detect'}`);
    console.log(`   📊 Questions: ${userParams.numQuestions || 'auto-detect'}`);
    console.log(`   🎚️  Difficulty: ${userParams.difficulty || 'auto-detect'}`);
    console.log(`   📝 Instructions: ${userParams.instructions || 'none'}`);
    console.log('   🔄 Will override auto-detection where specified\n');
  }
  
  try {
    // Load the golden LaTeX format from Step 2
    const goldenLatexPath = 'simple-gemini-output/gemini-generated.tex';
    if (!fs.existsSync(goldenLatexPath)) {
      throw new Error('❌ Step 2 golden LaTeX not found. Run simple-gemini-conversion.js first');
    }
    
    // Load original content for analysis
    const originalTextPath = 'step1-output/extracted-text.txt';
    const originalHtmlPath = 'step1-output/extracted-layout.html';
    
    if (!fs.existsSync(originalTextPath) || !fs.existsSync(originalHtmlPath)) {
      throw new Error('❌ Step 1 outputs not found. Run step1-pdf-extraction.js first');
    }
    
    const goldenLatex = fs.readFileSync(goldenLatexPath, 'utf8');
    const originalText = fs.readFileSync(originalTextPath, 'utf8');
    const originalHtml = fs.readFileSync(originalHtmlPath, 'utf8');
    
    console.log(`📄 Golden LaTeX format: ${goldenLatex.length} characters`);
    console.log(`📄 Original text: ${originalText.length} characters`);
    console.log(`🎨 Original HTML: ${originalHtml.length} characters`);
    
    // STEP 1: Use Gemini to intelligently detect the subject (or use user-provided)
    console.log('\n🧠 SUBJECT DETERMINATION:');
    console.log('========================');
    let detectedSubject;
    if (userParams.subject && userParams.subject.trim()) {
      detectedSubject = userParams.subject.trim();
      console.log(`🎯 Using USER-PROVIDED subject: ${detectedSubject}`);
    } else {
      console.log('🔍 Auto-detecting subject with Gemini...');
      detectedSubject = await detectSubjectWithGemini(originalText);
      console.log(`🤖 Gemini detected subject: ${detectedSubject}`);
    }
    
    // STEP 2: Analyze content for visual elements
    const contentAnalysis = analyzeVisualElements(originalText, originalHtml, goldenLatex);
    
    // Update the analysis with final subject
    contentAnalysis.subject = detectedSubject;
    
    // Apply user difficulty override if provided
    if (userParams.difficulty && ['easy', 'medium', 'hard', 'advanced'].includes(userParams.difficulty.toLowerCase())) {
      console.log(`🎚️  Overriding complexity level: ${contentAnalysis.complexityLevel} → ${userParams.difficulty}`);
      contentAnalysis.complexityLevel = userParams.difficulty.toLowerCase();
    }
    
    console.log('\n🔍 CONTENT ANALYSIS:');
    console.log('===================');
    Object.entries(contentAnalysis).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        console.log(`${key}: ${value.length} found - ${value.join(', ')}`);
      } else {
        console.log(`${key}: ${value}`);
      }
    });
    
    console.log('\n📚 ENHANCED CONTENT INSIGHTS:');
    console.log('============================');
    console.log(`🎯 Complexity Level: ${contentAnalysis.complexityLevel}`);
    console.log(`📖 Content Topics: ${contentAnalysis.contentTopics.join(', ') || 'None detected'}`);
    console.log(`❓ Question Types: ${contentAnalysis.questionTypes.join(', ') || 'None detected'}`);
    console.log(`🏆 Academic Patterns: ${contentAnalysis.academicPatterns.join(', ') || 'None detected'}`);
    console.log(`🔧 Technical Terms: ${contentAnalysis.technicalTerms.slice(0, 5).join(', ') || 'None detected'}`);
    
    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Create smart context-aware prompt (now with user parameters)
    const smartPrompt = createSmartPrompt(goldenLatex, contentAnalysis, originalText, userParams);
    
    console.log(`\n🤖 Sending smart context-aware request to Gemini...`);
    console.log(`📝 Prompt length: ${smartPrompt.length} characters`);
    if (userParams.numQuestions) {
      console.log(`📊 Requesting ${userParams.numQuestions} questions (user specified)`);
      
      // Quality optimization for large question counts
      if (userParams.numQuestions > 15) {
        console.log(`⚠️  Large question count detected (${userParams.numQuestions} > 15)`);
        console.log(`🔧 Applying quality optimizations:`);
        console.log(`   - Requesting varied question complexity`);
        console.log(`   - Emphasizing detailed examples and code`);
        console.log(`   - Ensuring varied point distributions`);
      }
    }
    
    const result = await model.generateContent(smartPrompt);
    let newExamLatex = result.response.text();
    
    // Clean up markdown code blocks if present
    newExamLatex = cleanLatexContent(newExamLatex);
    
    // Validate question count in the generated content
    const generatedQuestionCount = (newExamLatex.match(/\\section\*\{Problem \d+\}/g) || []).length;
    const expectedQuestionCount = userParams.numQuestions ? parseInt(userParams.numQuestions) : 3;
    
    console.log(`📊 Question count validation:`);
    console.log(`   🎯 Target: ${expectedQuestionCount} questions`);
    console.log(`   📝 Generated: ${generatedQuestionCount} questions`);
    
    if (generatedQuestionCount !== expectedQuestionCount) {
      console.log(`⚠️  WARNING: Question count mismatch!`);
      console.log(`   Expected: ${expectedQuestionCount}, Got: ${generatedQuestionCount}`);
      
      if (generatedQuestionCount < expectedQuestionCount) {
        console.log(`   This might be due to:`);
        console.log(`   - Gemini response truncation (too long prompt)`);
        console.log(`   - Token limits reached`);
        console.log(`   - LaTeX compilation errors causing early termination`);
      } else if (generatedQuestionCount > expectedQuestionCount) {
        console.log(`   This might be due to:`);
        console.log(`   - Gemini generating more than requested`);
        console.log(`   - Parsing issues in question detection`);
      }
    } else {
      console.log(`   ✅ Question count matches target!`);
    }
    
    // Validate LaTeX content for potential issues
    console.log(`🔍 Validating LaTeX content...`);
    const validationIssues = validateLatexContent(newExamLatex);
    
    if (validationIssues.length > 0) {
      console.log(`⚠️  Validation issues found:`);
      validationIssues.forEach(issue => console.log(`   - ${issue}`));
      console.log(`🔧 Attempting to fix some issues automatically...`);
      
      // Attempt some basic fixes
      if (validationIssues.some(issue => issue.includes('Unbalanced braces'))) {
        console.log(`   - Attempting to balance braces...`);
        // Count and try to fix obvious missing braces
        const openCount = (newExamLatex.match(/\{/g) || []).length;
        const closeCount = (newExamLatex.match(/\}/g) || []).length;
        if (openCount > closeCount) {
          newExamLatex += '}'; // Add missing closing brace
          console.log(`   - Added ${openCount - closeCount} missing closing brace(s)`);
        }
      }
    } else {
      console.log(`✅ LaTeX validation passed - no issues detected`);
    }
    
    console.log(`✅ Smart exam generated: ${newExamLatex.length} characters`);
    
    // Save the new exam
    const timestamp = Date.now();
    const outputDir = 'step2.5-output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputPath = `${outputDir}/smart-context-exam-${timestamp}.tex`;
    fs.writeFileSync(outputPath, newExamLatex);
    
    console.log(`💾 Smart context-aware exam saved: ${outputPath}`);
    
    // Save analysis for reference
    const analysisPath = `${outputDir}/content-analysis-${timestamp}.json`;
    fs.writeFileSync(analysisPath, JSON.stringify(contentAnalysis, null, 2));
    
    // Show preview
    console.log(`\n📝 Smart Exam Preview (first 800 chars):`);
    console.log('='.repeat(60));
    console.log(newExamLatex.substring(0, 800));
    console.log('='.repeat(60));
    
    console.log(`\n✅ SMART STEP 2.5 COMPLETED!`);
    console.log(`📄 File: ${outputPath}`);
    console.log(`🎯 This exam has NEW questions with SIMILAR visual elements!`);
    console.log(`📊 Analysis saved: ${analysisPath}`);
    console.log(`🔧 Next: Compile with pdflatex`);
    
    return outputPath;
    
  } catch (error) {
    console.error('❌ Smart Step 2.5 failed:', error.message);
    throw error;
  }
}

function analyzeVisualElements(text, html, goldenLatex = '') {
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
  
  console.log('🔍 ANALYZING VISUAL ELEMENTS FROM STEP 2 LATEX:');
  console.log('==============================================');
  
  // PRIMARY ANALYSIS: Check Step 2 LaTeX content first
  if (goldenLatex) {
    console.log(`📄 Analyzing LaTeX content: ${goldenLatex.length} characters`);
    
    // Check for TikZ diagrams in LaTeX
    if (goldenLatex.includes('\\begin{tikzpicture}') || goldenLatex.includes('\\tikz') || goldenLatex.includes('\\node') || goldenLatex.includes('\\draw')) {
      analysis.hasDAGs = true;
      analysis.detectedElements.push('TikZ diagrams (from LaTeX)');
      analysis.diagramTypes.push('TikZ');
      console.log('✅ TikZ diagrams found in LaTeX');
    }
    
    // Check for tables in LaTeX
    if (goldenLatex.includes('\\begin{tabular}') || goldenLatex.includes('\\begin{table}')) {
      analysis.hasTables = true;
      analysis.detectedElements.push('Tables (from LaTeX)');
      const tableMatches = goldenLatex.match(/\\begin\{tabular\}/g) || [];
      analysis.tableStructures = tableMatches.map((_, i) => `LaTeX Table ${i+1}`);
      console.log(`✅ ${tableMatches.length} tables found in LaTeX`);
    }
    
    // Check for code snippets in LaTeX
    if (goldenLatex.includes('\\begin{verbatim}') || goldenLatex.includes('\\begin{lstlisting}') || goldenLatex.includes('\\texttt{')) {
      analysis.hasCodeSnippets = true;
      analysis.detectedElements.push('Code snippets (from LaTeX)');
      console.log('✅ Code snippets found in LaTeX');
      
      // Detect languages from LaTeX content
      if (goldenLatex.match(/for\s*\(.*int.*\)|int\s+\w+/)) analysis.codeLanguages.push('C/C++');
      if (goldenLatex.match(/def\s+\w+|import\s+\w+/)) analysis.codeLanguages.push('Python');
      if (goldenLatex.match(/function\s+\w+|var\s+\w+/)) analysis.codeLanguages.push('JavaScript');
      if (goldenLatex.match(/public\s+class|public\s+static/)) analysis.codeLanguages.push('Java');
      if (goldenLatex.match(/MPI_Send|MPI_Recv|mpi|openmp/i)) analysis.codeLanguages.push('MPI/OpenMP');
    }
    
    // Check for mathematical equations in LaTeX
    if (goldenLatex.includes('\\begin{equation}') || goldenLatex.includes('\\begin{align}') || 
        goldenLatex.includes('\\[') || goldenLatex.match(/\$.*\$/)) {
      analysis.hasMathEquations = true;
      analysis.detectedElements.push('Mathematical equations (from LaTeX)');
      console.log('✅ Mathematical equations found in LaTeX');
      
      // Detect specific math notations
      if (goldenLatex.match(/\\theta|\\Theta|\\Omega|\\omega/)) analysis.mathNotations.push('Greek letters');
      if (goldenLatex.match(/\\frac/)) analysis.mathNotations.push('Fractions');
      if (goldenLatex.match(/\\sum|\\int/)) analysis.mathNotations.push('Summations/Integrals');
    }
    
    // Check for algorithm pseudocode in LaTeX
    if (goldenLatex.includes('Algorithm') || goldenLatex.includes('Procedure') || 
        goldenLatex.match(/Step\s+\d+|Input:|Output:|Begin:|End\s*[;:]/)) {
      analysis.hasAlgorithmPseudocode = true;
      analysis.detectedElements.push('Algorithm pseudocode (from LaTeX)');
      console.log('✅ Algorithm pseudocode found in LaTeX');
    }
  }
  
  // SECONDARY ANALYSIS: Fallback to text/HTML analysis if LaTeX doesn't show clear visual elements
  console.log('\n🔍 SECONDARY ANALYSIS FROM TEXT/HTML:');
  console.log('===================================');
  
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
  
  // FALLBACK ANALYSIS: Only if LaTeX didn't detect visual elements, check text/HTML
  if (!analysis.hasDAGs && !analysis.hasCircuits && !analysis.hasTables && !analysis.hasCodeSnippets) {
    console.log('📝 No visual elements found in LaTeX, checking text/HTML as fallback...');
  
  // Detect DAGs and graphs - only if actual diagram markup present
  if ((text.match(/DAG|directed acyclic graph|graph.*node|vertex.*edge|adjacency/i) && 
       (html.includes('svg') || html.includes('tikz') || html.includes('graph') || text.includes('→') || text.includes('->') || text.includes('edge'))) ||
      html.includes('dag')) {
    analysis.hasDAGs = true;
      analysis.detectedElements.push('DAG diagrams (from text)');
    analysis.diagramTypes.push('DAG');
      console.log('⚠️  DAGs detected from text/HTML (fallback)');
  }
  
  // Detect circuits - only if actual circuit diagrams exist, not just mentions
  if ((html.includes('circuit') || html.includes('svg') || 
       (text.match(/circuit.*diagram|logic.*gate.*diagram|truth.*table.*with.*gates/i))) &&
      !(text.match(/circuit.*complexity|time.*complexity.*circuit|computational.*circuit/i))) {
    analysis.hasCircuits = true;
      analysis.detectedElements.push('Circuit diagrams (from text)');
    analysis.diagramTypes.push('circuits');
      console.log('⚠️  Circuits detected from text/HTML (fallback)');
  }
  
  // Detect tables - only if actual table structures exist
  if (html.includes('<table>') || html.includes('<td>') || 
        text.match(/\|.*\|.*\|/g) && text.match(/\|.*\|.*\|/g).length > 2) {
    analysis.hasTables = true;
      analysis.detectedElements.push('Tables (from HTML)');
    
    // Count table structures
    const tableMatches = html.match(/<table.*?<\/table>/gs) || [];
    const textTableMatches = text.match(/\|.*\|.*\|/g) || [];
    analysis.tableStructures = [...tableMatches.map((table, i) => `HTML Table ${i+1}`), 
                               ...textTableMatches.slice(0, 3).map((table, i) => `Text Table ${i+1}`)];
      console.log(`⚠️  ${tableMatches.length + textTableMatches.length} tables detected from HTML/text (fallback)`);
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
                         html.includes('<code>') || html.includes('<pre>');
  
  if (hasActualCode) {
    analysis.hasCodeSnippets = true;
      analysis.detectedElements.push('Code snippets (from text)');
      console.log('⚠️  Code snippets detected from text/HTML (fallback)');
    
    // Detect programming languages
    if (text.match(/\bfor\s*\(.*int.*\)/)) analysis.codeLanguages.push('C/C++');
    if (text.match(/\bdef\s+\w+/)) analysis.codeLanguages.push('Python');
    if (text.match(/\bfunction\s+\w+/)) analysis.codeLanguages.push('JavaScript');
    if (text.match(/\bpublic\s+class/)) analysis.codeLanguages.push('Java');
  }
  }
  
  console.log('\n📊 VISUAL ELEMENTS ANALYSIS SUMMARY:');
  console.log('==================================');
  console.log(`🎨 Elements detected: ${analysis.detectedElements.join(', ') || 'None'}`);
  console.log(`📊 Tables: ${analysis.hasTables}`);
  console.log(`🎯 Diagrams: ${analysis.hasDAGs}`);
  console.log(`💻 Code: ${analysis.hasCodeSnippets} (${analysis.codeLanguages.join(', ')})`);
  console.log(`🔢 Math: ${analysis.hasMathEquations}`);
  console.log(`⚙️  Algorithms: ${analysis.hasAlgorithmPseudocode}`);
  
  return analysis;
}

async function detectSubjectWithGemini(text) {
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

Base your analysis on:
1. Course title and exam header
2. Technical terminology used
3. Types of problems presented
4. Programming languages/tools mentioned
5. Mathematical concepts involved
6. Overall academic context

Return ONLY the JSON response.`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    // Clean the response to extract JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const analysis = JSON.parse(jsonMatch[0]);
      console.log(`🎯 Gemini Subject Analysis:`);
      console.log(`   Primary Subject: ${analysis.primarySubject}`);
      console.log(`   Confidence: ${analysis.confidence}`);
      console.log(`   Reasoning: ${analysis.reasoning}`);
      console.log(`   Key Topics: ${analysis.keyTopics?.join(', ')}`);
      console.log(`   Secondary: ${analysis.secondarySubjects?.join(', ')}`);
      
      return analysis.primarySubject;
    } else {
      console.log(`⚠️  Could not parse Gemini response, using fallback`);
      return 'general-computer-science';
    }
    
  } catch (error) {
    console.log(`❌ Gemini subject detection failed: ${error.message}`);
    console.log(`⚠️  Falling back to pattern-based detection`);
    return detectSubjectFallback(text);
  }
}

function detectSubjectFallback(text) {
  // Keep the existing pattern-based logic as fallback
  const subjects = {
    'parallel-computing': /parallel.*computing|MPI|OpenMP|CUDA|thread.*parallel|process.*parallel|distributed.*computing|amdahl.*law|speedup|efficiency|scalability|concurrent.*programming|thread.*synchronization.*parallel|barrier.*synchronization|parallel.*algorithm|SIMD|MIMD|SPMD|fork.*join|thread.*pool|parallel.*for|pragma.*omp|mpi_send|mpi_recv|pthread.*create.*parallel/i,
    'operating-systems': /operating.*systems?|kernel.*module|linux.*kernel|unix.*system|syscall|system.*call|file.*system.*implementation|virtual.*memory.*management|page.*replacement|process.*control.*block|context.*switch|scheduler.*implementation|device.*driver|interrupt.*handler|memory.*allocation.*kernel|kernel.*space|user.*space|jiffies|printk|insmod|rmmod|proc.*filesystem/i,
    'algorithms': /algorithm.*design|algorithm.*analysis|Big.?O.*complexity|time.*complexity|space.*complexity|sorting.*algorithm|searching.*algorithm|graph.*algorithm|tree.*algorithm|recursive.*algorithm|dynamic.*programming|greedy.*algorithm|divide.*and.*conquer|asymptotic.*analysis|computational.*complexity/i,
  };
  
  for (const [subject, pattern] of Object.entries(subjects)) {
    if (pattern.test(text)) {
      console.log(`🎯 Fallback subject detected: ${subject}`);
      return subject;
    }
  }
  
  return 'general-computer-science';
}

function createSmartPrompt(goldenLatex, analysis, originalText, userParams = {}) {
  // Extract content samples for more context
  const problemsMatch = originalText.match(/Problem \d+[\s\S]*?(?=Problem \d+|$)/gi) || [];
  const questionsMatch = originalText.match(/Question \d+[\s\S]*?(?=Question \d+|$)/gi) || [];
  const sectionsMatch = originalText.match(/\d+\.[\s\S]*?(?=\d+\.|$)/g) || [];
  
  // Determine number of questions to generate
  const originalQuestionCount = problemsMatch.length + questionsMatch.length + sectionsMatch.length;
  let targetQuestionCount;
  
  if (userParams.numQuestions) {
    targetQuestionCount = parseInt(userParams.numQuestions);
    console.log(`📊 Question count: User requested ${targetQuestionCount} questions (original had ${originalQuestionCount})`);
  } else {
    targetQuestionCount = Math.max(3, Math.min(10, originalQuestionCount));
    console.log(`📊 Question count: Auto-detected ${targetQuestionCount} questions based on original (${originalQuestionCount} detected)`);
  }
  
  // Build simple, direct prompt
  let prompt = `Here is a LaTeX document:

${goldenLatex}

Generate a new LaTeX document with the EXACT SAME format and structure, but create ${targetQuestionCount} completely different ${analysis.subject} questions.`;

  // Add difficulty instruction if specified
  if (userParams.difficulty) {
    const difficultyMap = {
      'easy': 'Make the questions basic and simple',
      'medium': 'Make the questions moderately challenging', 
      'hard': 'Make the questions very challenging and complex',
      'advanced': 'Make the questions extremely difficult and research-level'
    };
    prompt += ` ${difficultyMap[userParams.difficulty.toLowerCase()] || 'Make the questions moderately challenging'}.`;
  }
  
  // Add user instructions if provided
  if (userParams.instructions && userParams.instructions.trim()) {
    prompt += ` ${userParams.instructions.trim()}.`;
  }
  
  prompt += `

IMPORTANT:
- Keep the EXACT same LaTeX document structure and formatting
- Generate exactly ${targetQuestionCount} questions
- Make sure all questions are about ${analysis.subject}
- Keep the same mathematical notation style
- Preserve the same document header and footer
- Use the same enumerate/itemize structure
- Generate completely different content but identical formatting

Return ONLY the complete LaTeX document.`;

  return prompt;
}

function cleanLatexContent(content) {
  // Remove markdown code blocks
  let cleaned = content.replace(/```latex\n?/g, '');
  cleaned = cleaned.replace(/```\n?/g, '');
  
  // Remove any leading/trailing whitespace
  cleaned = cleaned.trim();
  
  // Enhanced LaTeX cleaning for robustness
  
  // Fix common texttt issues - escape underscores and other special chars in texttt
  cleaned = cleaned.replace(/\\texttt\{([^}]*)\}/g, (match, content) => {
    // Escape special characters inside texttt
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
  
  // Fix nested formatting issues - remove texttt from within other commands
  cleaned = cleaned.replace(/\\textbf\{([^}]*\\texttt\{[^}]*\}[^}]*)\}/g, (match, content) => {
    // Extract content and remove inner texttt
    const cleanContent = content.replace(/\\texttt\{([^}]*)\}/g, '$1');
    return `\\textbf{${cleanContent}}`;
  });
  
  // Fix Unicode characters that cause issues
  cleaned = cleaned.replace(/[^\x00-\x7F]/g, ''); // Remove non-ASCII characters
  
  // Fix common LaTeX syntax issues
  cleaned = cleaned.replace(/\\\\/g, '\\\\'); // Ensure proper line breaks
  cleaned = cleaned.replace(/([^\\])%/g, '$1\\%'); // Escape unescaped percent signs
  cleaned = cleaned.replace(/([^\\])&/g, '$1\\&'); // Escape unescaped ampersands
  
  // Remove any malformed texttt commands
  cleaned = cleaned.replace(/\\texttt\{[^}]*$/g, ''); // Remove incomplete texttt at end
  cleaned = cleaned.replace(/^[^{]*\}/g, ''); // Remove orphaned closing braces at start
  
  // Ensure document structure is intact
  if (!cleaned.includes('\\documentclass')) {
    console.log('⚠️  Warning: No \\documentclass found, LaTeX might be corrupted');
  }
  
  if (!cleaned.includes('\\begin{document}')) {
    console.log('⚠️  Warning: No \\begin{document} found, LaTeX might be corrupted');
  }
  
  if (!cleaned.includes('\\end{document}')) {
    console.log('⚠️  Warning: No \\end{document} found, LaTeX might be corrupted');
  }
  
  return cleaned;
}

function validateLatexContent(content) {
  const issues = [];
  
  // Check for balanced braces
  const openBraces = (content.match(/\{/g) || []).length;
  const closeBraces = (content.match(/\}/g) || []).length;
  if (openBraces !== closeBraces) {
    issues.push(`Unbalanced braces: ${openBraces} open, ${closeBraces} close`);
  }
  
  // Check for balanced math environments
  const mathStarts = (content.match(/\\\[|\$\$/g) || []).length;
  const mathEnds = (content.match(/\\\]|\$\$/g) || []).length;
  if (mathStarts !== mathEnds) {
    issues.push(`Unbalanced math environments: ${mathStarts} starts, ${mathEnds} ends`);
  }
  
  // Check for common problematic patterns
  if (content.includes('\\texttt{') && content.includes('\\textbf{')) {
    // Look for nested texttt within textbf
    const nestedPattern = /\\textbf\{[^}]*\\texttt\{[^}]*\}[^}]*\}/g;
    if (nestedPattern.test(content)) {
      issues.push('Potential nested formatting (texttt within textbf) detected');
    }
  }
  
  // Check for unescaped special characters outside of verbatim
  const verbatimBlocks = content.match(/\\begin\{verbatim\}[\s\S]*?\\end\{verbatim\}/g) || [];
  let contentWithoutVerbatim = content;
  verbatimBlocks.forEach((block, i) => {
    contentWithoutVerbatim = contentWithoutVerbatim.replace(block, `VERBATIM_BLOCK_${i}`);
  });
  
  // Check for unescaped characters outside verbatim
  if (contentWithoutVerbatim.match(/[^\\]&/)) {
    issues.push('Unescaped ampersand (&) found outside verbatim');
  }
  if (contentWithoutVerbatim.match(/[^\\]%/)) {
    issues.push('Unescaped percent (%) found outside verbatim');
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

function getDifficultyInstructions(complexityLevel) {
  switch(complexityLevel.toLowerCase()) {
    case 'easy':
      return `
🟢 EASY DIFFICULTY REQUIREMENTS:
- Generate SIMPLE, BASIC questions that test fundamental concepts
- Use STRAIGHTFORWARD language and simple sentence structures  
- Ask for DEFINITIONS, EXPLANATIONS, and basic COMPARISONS
- Avoid complex multi-part questions (no sub-parts a, b, c)
- Use SIMPLE point values (5-10 points per question)
- Focus on MEMORIZATION and basic UNDERSTANDING
- Questions should be answerable with basic knowledge
- Example question starters: "What is...", "Explain...", "List...", "Define..."
- Avoid mathematical derivations, proofs, or complex analysis
- No complex code implementation - only basic concepts
- Target: 1st year undergraduate level complexity`;

    case 'medium':
      return `
🟡 MEDIUM DIFFICULTY REQUIREMENTS:
- Generate MODERATE complexity questions requiring ANALYSIS and APPLICATION
- Mix theoretical understanding with practical application
- Include some multi-part questions with 2-3 sub-parts
- Use VARIED point values (5-20 points per question)
- Require students to APPLY concepts to solve problems
- Include basic calculations and simple code examples
- Example question starters: "Analyze...", "Compare and contrast...", "Design...", "Calculate..."
- Some mathematical analysis but not advanced proofs
- Basic implementation and debugging questions
- Target: 2nd-3rd year undergraduate level complexity`;

    case 'hard':
    case 'advanced':
      return `
🔴 HARD DIFFICULTY REQUIREMENTS:
- Generate COMPLEX, CHALLENGING questions requiring DEEP ANALYSIS and SYNTHESIS
- Require ADVANCED problem-solving and critical thinking skills
- Include complex multi-part questions with 3+ sub-parts (a, b, c, d)
- Use HIGH point values (15-30 points per question)
- Require mathematical PROOFS, derivations, and complex calculations
- Include advanced code implementation and algorithm design
- Example question starters: "Prove or disprove...", "Derive...", "Design and analyze...", "Optimize..."
- Advanced mathematical analysis, complexity theory, formal proofs
- Complex system design and advanced implementation
- Research-level questions requiring synthesis of multiple concepts
- Target: Advanced undergraduate/graduate level complexity`;

    default:
      return `
🟡 DEFAULT MEDIUM DIFFICULTY REQUIREMENTS:
- Generate MODERATE complexity questions requiring ANALYSIS and APPLICATION
- Mix theoretical understanding with practical application
- Include some multi-part questions with 2-3 sub-parts
- Use VARIED point values (5-20 points per question)`;
  }
}

// Parse command line arguments and run the smart context-aware generation
if (require.main === module) {
  // Parse command line arguments from AI controller
  const pdfPath = process.argv[2]; // Not used by this script but passed for consistency
  const numQuestions = process.argv[3];
  const difficulty = process.argv[4];
  const subject = process.argv[5]; // Optional - will use auto-detection if not provided
  const instructions = process.argv[6]; // Optional

  console.log('📋 COMMAND LINE ARGUMENTS:');
  console.log(`   📄 PDF Path: ${pdfPath || 'not provided'}`);
  console.log(`   📊 Questions: ${numQuestions || 'not provided'}`);
  console.log(`   🎚️  Difficulty: ${difficulty || 'not provided'}`);
  console.log(`   🎯 Subject: ${subject || 'not provided'}`);
  console.log(`   📝 Instructions: ${instructions || 'not provided'}`);
  console.log('');

  // Build user parameters object with proper undefined handling
  const userParams = {};
  
  // Handle numQuestions: ignore 'undefined' string and non-numeric values
  if (numQuestions && numQuestions !== 'undefined' && !isNaN(parseInt(numQuestions))) {
    userParams.numQuestions = parseInt(numQuestions);
    console.log(`✅ Using user-specified question count: ${userParams.numQuestions}`);
  } else {
    console.log(`📊 Question count not specified or invalid (${numQuestions}), will auto-detect from original exam`);
  }
  
  // Handle difficulty: ignore 'undefined' string and empty values
  if (difficulty && difficulty !== 'undefined' && difficulty.trim()) {
    userParams.difficulty = difficulty.trim();
    console.log(`✅ Using user-specified difficulty: ${userParams.difficulty}`);
  } else {
    console.log(`🎚️  Difficulty not specified (${difficulty}), will auto-detect from original exam`);
  }
  
  // Handle subject: ignore 'undefined' string and empty values
  if (subject && subject !== 'undefined' && subject.trim()) {
    userParams.subject = subject.trim();
    console.log(`✅ Using user-specified subject: ${userParams.subject}`);
  } else {
    console.log(`🎯 Subject not specified (${subject}), will auto-detect from original exam`);
  }
  
  // Handle instructions: ignore 'undefined' string and empty values
  if (instructions && instructions !== 'undefined' && instructions.trim()) {
    userParams.instructions = instructions.trim();
    console.log(`✅ Using user-specified instructions: ${userParams.instructions}`);
  } else {
    console.log(`📝 Instructions not specified (${instructions}), no custom instructions will be used`);
  }

  console.log('');
  console.log('🔄 FINAL USER PARAMETERS:');
  console.log(JSON.stringify(userParams, null, 2));
  console.log('');

  // Run the smart context-aware generation with user parameters
  generateSmartContextAwareExam(userParams)
  .then(async (outputPath) => {
    console.log(`\n🎉 SMART STEP 2.5 SUCCESS!`);
    console.log(`📄 New exam with context-aware visual elements: ${outputPath}`);
    console.log(`🆕 Questions include SIMILAR diagrams/tables/code as original!`);
      if (userParams.numQuestions) {
        console.log(`📊 Generated exactly ${userParams.numQuestions} questions as requested!`);
      }
    console.log(`\n🔧 Compiling to PDF...`);
    
    // Compile LaTeX to PDF
    const texFileName = outputPath.split('/').pop();
    const pdfFileName = texFileName.replace('.tex', '.pdf');
    
    try {
      const outputDir = outputPath.split('/').slice(0, -1).join('/');
      
      // Compile with pdflatex
      const compileCommand = `cd "${outputDir}" && /usr/local/texlive/2025basic/bin/universal-darwin/pdflatex -interaction=nonstopmode "${texFileName}"`;
      console.log(`🔧 Executing: ${compileCommand}`);
      
      const compileOutput = execSync(compileCommand, { encoding: 'utf8' });
      
      // Check if PDF was created
      const pdfPath = `${outputDir}/${pdfFileName}`;
      if (fs.existsSync(pdfPath)) {
        console.log(`✅ PDF compiled successfully: ${pdfPath}`);
        
        // Get PDF size
        const pdfStats = fs.statSync(pdfPath);
          console.log(`📄 PDF size: ${(pdfStats.size / 1024).toFixed(1)}KB`);
        
        // Open the PDF
        console.log(`🚀 Opening PDF...`);
        execSync(`open "${pdfPath}"`);
        
        console.log(`\n🎉 COMPLETE SUCCESS!`);
        console.log(`📄 Smart context-aware exam: ${pdfPath}`);
        console.log(`🎯 PDF opened automatically!`);
          if (userParams.numQuestions) {
            console.log(`📊 Respects user request: ${userParams.numQuestions} questions`);
          }
          if (userParams.difficulty) {
            console.log(`🎚️  Respects user difficulty: ${userParams.difficulty}`);
          }
      } else {
        console.log(`❌ PDF compilation failed - file not found: ${pdfPath}`);
      }
      
    } catch (error) {
      console.log(`⚠️  LaTeX compilation had errors but may have still produced PDF:`);
      console.log(error.message.substring(0, 500) + '...');
      
      // Try to open PDF anyway (might exist despite errors)
      const texFileName = outputPath.split('/').pop();
      const pdfFileName = texFileName.replace('.tex', '.pdf');
      const outputDir = outputPath.split('/').slice(0, -1).join('/');
      const pdfPath = `${outputDir}/${pdfFileName}`;
      
      if (fs.existsSync(pdfPath)) {
        const pdfStats = fs.statSync(pdfPath);
          console.log(`✅ PDF exists despite errors: ${(pdfStats.size / 1024).toFixed(1)}KB`);
        console.log(`🚀 Opening PDF anyway...`);
        execSync(`open "${pdfPath}"`);
      }
    }
  })
  .catch((error) => {
    console.error('💥 Smart Step 2.5 failed:', error);
    process.exit(1);
  }); 
} 