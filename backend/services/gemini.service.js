const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config/config');

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

/**
 * Service for interacting with the Gemini AI model
 */
class GeminiService {
  /**
   * Generate content using the Gemini model with retry logic and exponential backoff
   * @param {string} prompt - The prompt to send to the model
   * @param {string} modelName - e.g., 'gemini-pro', 'gemini-1.5-flash'
   * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
   * @param {number} baseDelay - Base delay in milliseconds for exponential backoff (default: 1000)
   * @returns {Promise<object>} - An object containing { text: string, usageMetadata: object | null }
   */
  static async _generateWithUsage(prompt, modelName, maxRetries = 3, baseDelay = 1000) {
    let lastError = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
        const usageMetadata = response.usageMetadata || null;
      
      // Log usage in development only
      if (process.env.NODE_ENV === 'development') {
          if (attempt > 0) {
            console.log(`✅ Gemini success on attempt ${attempt + 1}/${maxRetries + 1}`);
          }
        console.log(`Gemini Response (${modelName}) Usage:`, usageMetadata);
      }
      
        return { text, usageMetadata };
        
    } catch (error) {
        lastError = error;
        const isRetryableError = this._isRetryableError(error);
        const isLastAttempt = attempt === maxRetries;
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`❌ Gemini attempt ${attempt + 1}/${maxRetries + 1} failed:`, error.message);
          console.log(`🔄 Retryable error: ${isRetryableError}, Last attempt: ${isLastAttempt}`);
        }
        
        // If it's not a retryable error or we've exhausted retries, throw immediately
        if (!isRetryableError || isLastAttempt) {
          console.error(`❌ Final Gemini error after ${attempt + 1} attempts (${modelName}):`, error);
          break;
        }
        
        // Calculate exponential backoff delay
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000; // Add jitter
        console.log(`⏳ Retrying Gemini request in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // If we get here, all retries failed
    throw new Error(`Failed to generate content with Gemini (${modelName}) after ${maxRetries + 1} attempts: ${lastError.message}`);
    }
  
  /**
   * Determine if an error is retryable (transient)
   * @param {Error} error - The error to check
   * @returns {boolean} - True if the error should be retried
   */
  static _isRetryableError(error) {
    // Check for specific error codes and messages that indicate transient issues
    if (error.status) {
      // HTTP status codes that are retryable
      const retryableStatusCodes = [503, 502, 504, 429, 500]; // Service Unavailable, Bad Gateway, Gateway Timeout, Too Many Requests, Internal Server Error
      if (retryableStatusCodes.includes(error.status)) {
        return true;
      }
    }
    
    // Check error message for specific patterns
    const retryableMessages = [
      'overloaded',
      'rate limit',
      'timeout',
      'temporary',
      'try again',
      'service unavailable',
      'internal error',
      'connection reset',
      'network error'
    ];
    
    const errorMessage = error.message?.toLowerCase() || '';
    return retryableMessages.some(msg => errorMessage.includes(msg));
  }
  
  // --- Public Methods Using _generateWithUsage --- //

  /**
   * Generate simple content (backward compatible)
   * @param {string} prompt
   * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
   * @returns {Promise<string>} - The generated text only
   */
  static async generateContent(prompt, maxRetries = 3) {
    const { text } = await this._generateWithUsage(prompt, 'gemini-1.5-flash', maxRetries);
      return text;
  }
  
  /**
   * Generate chat response (history handled by caller sending full prompt)
   * This now calls the function that returns usage metadata
   * @param {string} fullPrompt - The combined history and new message
   * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
   * @returns {Promise<object>} - Object with { text: string, usageMetadata: object | null }
   */
  static async generateChatResponseFromPrompt(fullPrompt, maxRetries = 3) {
     // We are using the testGeminiFlash model as decided earlier
    return this._generateWithUsage(fullPrompt, 'gemini-1.5-flash', maxRetries); 
  }

  /**
   * Test Gemini 1.5 Flash model with a prompt
   * Returns text and usage metadata
   * @param {string} prompt 
   * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
   * @returns {Promise<object>} - Object with { text: string, usageMetadata: object | null }
   */
  static async testGeminiFlash(prompt, maxRetries = 3) {
    // Use the internal method that returns metadata
    return this._generateWithUsage(prompt, 'gemini-1.5-flash', maxRetries); 
  }
  
  // Add more methods as needed, e.g., for specific tutoring tasks like explaining concepts, generating questions, etc.
  
  /**
   * Generates a study plan based on user inputs.
   * @param {object} options - Options for generating the plan.
   * @param {string} options.topic - The main topic or course.
   * @param {number} options.durationDays - How many days the plan should cover.
   * @param {number} options.hoursPerDay - Average hours per day to study.
   * @param {Array<string>} [options.subtopics] - Specific subtopics to include.
   * @param {string} [options.goal] - The overall goal (e.g., 'pass the exam', 'understand the basics').
   * @param {number} [options.maxRetries] - Maximum number of retry attempts (default: 3).
   * @returns {Promise<string>} - The generated study plan text.
   */
  static async generateStudyPlan({ topic, durationDays, hoursPerDay, subtopics = [], goal = 'learn the material', maxRetries = 3 }) {
    let prompt = `Create a detailed study plan for the topic "${topic}". \
The plan should cover ${durationDays} days, with an estimated ${hoursPerDay} hours of study per day. \
The main goal is to ${goal}.`;
    
    if (subtopics.length > 0) {
      prompt += ` Focus on these subtopics: ${subtopics.join(', ')}.`;
    }
    
    prompt += `\
Provide a day-by-day breakdown with specific tasks, estimated times, and suggested resources if possible. Make the plan realistic and actionable.`;
    
    return this.generateContent(prompt, maxRetries);
  }
  
  /**
   * Explains a concept in simple terms.
   * @param {string} concept - The concept to explain.
   * @param {string} [context] - Optional context (e.g., the course or subject).
   * @param {number} [maxRetries] - Maximum number of retry attempts (default: 3).
   * @returns {Promise<string>} - The explanation text.
   */
  static async explainConcept(concept, context = '', maxRetries = 3) {
    let prompt = `Explain the concept "${concept}" in simple and easy-to-understand terms.`;
    if (context) {
      prompt += ` Assume the context is related to ${context}.`;
    }
    prompt += ` Use analogies if helpful.`;
    return this.generateContent(prompt, maxRetries);
  }
  
   /**
   * Generates practice questions for a topic.
   * @param {string} topic - The topic for the questions.
   * @param {number} [count=5] - Number of questions to generate.
   * @param {string} [difficulty='medium'] - Difficulty level (e.g., 'easy', 'medium', 'hard').
   * @param {number} [maxRetries=3] - Maximum number of retry attempts.
   * @returns {Promise<string>} - The generated questions text.
   */
  static async generatePracticeQuestions(topic, count = 5, difficulty = 'medium', maxRetries = 3) {
    const prompt = `Generate ${count} practice questions about "${topic}" at a ${difficulty} difficulty level. Include a mix of question types if possible (e.g., multiple choice, short answer).`;
    return this.generateContent(prompt, maxRetries);
  }

  /**
   * Process a PDF file with Gemini 1.5 Flash
   * @param {string} pdfPath - Path to the PDF file
   * @param {string} prompt - The prompt to send along with the PDF
   * @returns {Promise<object>} - Object with { text: string, usageMetadata: object | null }
   */
  static async processPDF(pdfPath, prompt) {
    const fs = require('fs').promises;
    try {
      // Read the PDF file
      const pdfData = await fs.readFile(pdfPath);
      // Get the model
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      // Create the content parts
      const contentParts = [
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: pdfData.toString('base64')
          }
        },
        { text: prompt }
      ];
      // Generate content
      const result = await model.generateContent(contentParts);
      const response = await result.response;
      const text = response.text();
      const usageMetadata = response.usageMetadata || null;
      
      // Log usage in development only
      if (process.env.NODE_ENV === 'development') {
        console.log(`Gemini PDF Processing Usage:`, usageMetadata);
      }
      
      return { text, usageMetadata };
    } catch (error) {
      console.error('Error processing PDF with Gemini:', error);
      throw new Error(`Failed to process PDF: ${error.message}`);
    }
  }

  /**
   * Process a PDF file and generate a study plan based on its content
   * @param {string} pdfPath - Path to the PDF file
   * @param {object} options - Options for generating the plan
   * @param {number} options.durationDays - How many days the plan should cover
   * @param {number} options.hoursPerDay - Average hours per day to study
   * @returns {Promise<object>} - Object with { text: string, usageMetadata: object | null }
   */
  static async generateStudyPlanFromPDF(pdfPath, { durationDays, hoursPerDay }) {
    const prompt = `Based on the content of this PDF, create a detailed study plan that covers ${durationDays} days, with ${hoursPerDay} hours of study per day. \nFirst, analyze the main topics and concepts in the PDF.\nThen, create a day-by-day breakdown with specific tasks, estimated times, and suggested resources.\nMake the plan realistic and actionable.`;
    return this.processPDF(pdfPath, prompt);
  }

  /**
   * Process a PDF file and generate practice questions based on its content
   * @param {string} pdfPath - Path to the PDF file
   * @param {number} count - Number of questions to generate
   * @param {string} difficulty - Difficulty level (easy, medium, hard)
   * @returns {Promise<object>} - Object with { text: string, usageMetadata: object | null }
   */
  static async generateQuestionsFromPDF(pdfPath, count = 5, difficulty = 'medium') {
    const prompt = `Based on the content of this PDF, generate ${count} practice questions at a ${difficulty} difficulty level. \nInclude a mix of question types (multiple choice, short answer, etc.).\nMake sure the questions are relevant to the material in the PDF.`;
    return this.processPDF(pdfPath, prompt);
  }

  /**
   * Process a PDF file and get a summary of its content
   * @param {string} pdfPath - Path to the PDF file
   * @returns {Promise<object>} - Object with { text: string, usageMetadata: object | null }
   */
  static async summarizePDF(pdfPath) {
    const prompt = `Please provide a comprehensive summary of this PDF. Include:\n1. Main topics and concepts\n2. Key points and important details\n3. Any notable examples or case studies\n4. Important formulas or equations (if any)\nFormat the summary in a clear, organized way.`;
    return this.processPDF(pdfPath, prompt);
  }

  /**
   * Generate a practice exam based on an uploaded PDF and/or form data
   * @param {object} options - { subject, numQuestions, difficulty, instructions, pdfPath }
   * @returns {Promise<object>} - { text, usageMetadata }
   */
  static async generatePracticeExam({ subject, numQuestions = 10, difficulty = 'medium', instructions = '', pdfPath = null }) {
    try {
      let prompt = '';
      
      if (pdfPath && pdfPath.trim()) {
        // If PDF is provided, extract content and generate questions based on the material
        console.log('=== GENERATING QUESTIONS FROM PDF CONTENT ===');
        console.log('PDF path:', pdfPath, 'Size:', require('fs').statSync(pdfPath).size);
        
        prompt = `TASK: Generate practice questions based on the content of this uploaded PDF document.

${instructions ? `🚨 ABSOLUTE PRIORITY INSTRUCTIONS - MUST FOLLOW FIRST 🚨
${instructions}

CRITICAL REQUIREMENT: If the instructions above contain any specific questions, you MUST include those EXACT questions word-for-word in your response. These custom questions take ABSOLUTE PRIORITY over everything else.

STEP 1: First, include any specific questions from the instructions above
STEP 2: Then, generate additional questions based on the PDF content to reach the total of ${numQuestions} questions

` : ''}CRITICAL REQUIREMENTS:
1. READ AND ANALYZE the uploaded PDF content carefully
2. Generate EXACTLY ${numQuestions} questions total (count them carefully!)
3. If custom instructions contain specific questions, include those FIRST, then fill remaining slots
4. Questions should cover the key concepts, topics, and material from the PDF
5. Use the same difficulty level and style as the examples in the PDF (if any)
6. Number each question clearly: 1., 2., 3., etc.
7. Each question should be substantial and test understanding

DIAGRAM GENERATION CAPABILITIES:
When questions require visual elements like DAGs, graphs, trees, or network diagrams:
- Create ASCII art diagrams using characters like |, -, +, /, \\, etc.
- For complex diagrams, use Mermaid syntax in code blocks
- Example ASCII DAG:
  \`\`\`
  Task A
     |
  Task B -----> Task D
     |            |
  Task C --------->+
  \`\`\`
- Example Mermaid DAG:
  \`\`\`mermaid
  graph TD
      A[Task A] --> B[Task B]
      A --> C[Task C] 
      B --> D[Task D]
      C --> D
  \`\`\`

QUESTION FORMAT:
1. [First question - from custom instructions if provided, otherwise from PDF content]
   [Include ASCII diagram or Mermaid block if needed]

2. [Second question - continue pattern]
   [Include diagrams as needed]

3. [Third question - continue pattern]

Continue for ALL ${numQuestions} questions - DO NOT STOP EARLY!

IMPORTANT:
- ABSOLUTE PRIORITY: Include any specific questions from custom instructions
- Base remaining questions on the ACTUAL CONTENT of the uploaded PDF
- Cover different topics/sections from the PDF material
- Make questions appropriate for ${difficulty} difficulty level
- Subject context: ${subject}
- CRITICAL: Generate exactly ${numQuestions} questions - count them!
- Use ASCII art or Mermaid diagrams when questions involve visual concepts

Analyze the PDF content and generate ${numQuestions} questions (prioritizing custom instructions):`;

        // Use processPDF to read and analyze the PDF content
        return this.processPDF(pdfPath, prompt);
      } else {
        // Generate without PDF - create general questions about the subject
        console.log('=== GENERATING GENERAL QUESTIONS (NO PDF) ===');
        prompt = `IMPORTANT: You must generate EXACTLY ${numQuestions} individual questions. Do NOT create sections, parts, or categories.

FORBIDDEN FORMATS:
- DO NOT write "Section 1", "Section 2", etc.
- DO NOT write "Part A", "Part B", etc. 
- DO NOT create multiple choice sections
- DO NOT create short answer sections
- DO NOT group questions by type

${instructions ? `CRITICAL CUSTOM INSTRUCTIONS - MUST FOLLOW:
${instructions}

IMPORTANT: If the instructions contain specific questions, you MUST include those exact questions in your response. If the instructions ask for specific topics or question types, prioritize those requirements.

` : ''}DIAGRAM GENERATION CAPABILITIES:
When questions require visual elements like DAGs, graphs, trees, or network diagrams:
- Create ASCII art diagrams using characters like |, -, +, /, \\, etc.
- For complex diagrams, use Mermaid syntax in code blocks
- Example ASCII DAG:
  \`\`\`
  Task A
     |
  Task B -----> Task D
     |            |
  Task C --------->+
  \`\`\`
- Example Mermaid DAG:
  \`\`\`mermaid
  graph TD
      A[Task A] --> B[Task B]
      A --> C[Task C] 
      B --> D[Task D]
      C --> D
  \`\`\`

REQUIRED FORMAT - Follow this EXACTLY:
1. [Write a complete question here about ${subject}]
   [Include ASCII diagram or Mermaid block if needed]

2. [Write another complete question here about ${subject}]
   [Include diagrams as needed]

3. [Write another complete question here about ${subject}]

Continue numbering up to ${numQuestions} - GENERATE ALL ${numQuestions} QUESTIONS!

SPECIFICATIONS:
- Subject: ${subject}
- Difficulty: ${difficulty}
- Total questions needed: ${numQuestions}
- Each question must be complete and standalone
- Each question must be substantial (at least 2-3 sentences)
- CRITICAL: Generate exactly ${numQuestions} questions - count them!
- Use ASCII art or Mermaid diagrams when questions involve visual concepts
${instructions ? `- PRIORITY: Follow the custom instructions above` : ''}

START GENERATING ${numQuestions} QUESTIONS NOW:

1.`;

        return this._generateWithUsage(prompt, 'gemini-1.5-flash');
      }
    } catch (error) {
      console.error('Error generating practice exam:', error);
      throw error;
    }
  }

  /**
   * Generate formatted exam content that matches an uploaded PDF template
   * @param {object} options - { subject, numQuestions, difficulty, instructions, pdfPath, interactiveQuestions, questionPoints }
   * @returns {Promise<object>} - { text, usageMetadata }
   */
  static async generateFormattedExamFromTemplate({ subject, numQuestions = 10, difficulty = 'medium', instructions = '', pdfPath, interactiveQuestions, questionPoints = [] }) {
    try {
      console.log('=== GEMINI TEMPLATE FORMATTING START ===');
      console.log('PDF path:', pdfPath);
      console.log('Subject:', subject);
      console.log('Num questions:', numQuestions);
      console.log('Question points:', questionPoints);
      console.log('Interactive questions length:', interactiveQuestions?.length);
      console.log('Interactive questions preview:', interactiveQuestions?.substring(0, 200));
      
      let pointsInstructions = '';
      if (questionPoints && questionPoints.length > 0) {
        pointsInstructions = `\n\nCRITICAL POINT VALUES - MUST INCLUDE:
Each question must include its point value in the same format as the template:
${questionPoints.map((points, index) => `Question ${index + 1}: ${points} points`).join('\n')}

Look at how the template shows point values and use the EXACT same format (e.g., "[25 points]", "(35 pts)", "40 points", etc.).`;
      }
      
      const prompt = `TASK: Create a practice exam that EXACTLY matches the format, style, and structure of the uploaded PDF template.

STEP 1: ANALYZE THE TEMPLATE
Carefully examine the uploaded PDF template and note:
- The exact header format (course code, title, date, etc.)
- How the title and subtitle are formatted
- How "Total: X points" is displayed
- Any "Important Notes" sections and their formatting
- How questions are numbered and formatted
- How point values are shown for each question
- Any special formatting, boxes, or layout elements
- Font styles, spacing, and alignment

STEP 2: USE THESE CLEAN QUESTIONS AS CONTENT
${interactiveQuestions}

STEP 3: REFORMAT TO MATCH TEMPLATE EXACTLY
Create a new exam that:
1. Uses the EXACT same header structure as the template
2. Copies the course information format (adjust for "${subject}")
3. Includes the same "Important Notes" section if present
4. Uses the same question numbering style
5. Integrates the point values in the same format as template
6. Maintains the same professional layout and spacing
7. Includes any honor code boxes or special sections from template

STEP 4: ENSURE CONSISTENCY
- Keep all ${numQuestions} questions
- Use the provided question content but format it to match template style
- Make it look like it came from the same professor/institution as the template
- Include ALL formatting elements from the original${pointsInstructions}

REQUIREMENTS:
- Subject: ${subject}
- Difficulty: ${difficulty}
- Total Questions: ${numQuestions}
- Must look identical in style to the uploaded template
${instructions ? `- Additional instructions: ${instructions}` : ''}

Generate the complete formatted exam now, matching the template exactly:`;

      console.log('=== SENDING PROMPT TO GEMINI ===');
      console.log('Prompt length:', prompt.length);
      console.log('About to call processPDF...');
      
      const result = await this.processPDF(pdfPath, prompt);
      
      console.log('=== GEMINI TEMPLATE FORMATTING RESULT ===');
      console.log('Result type:', typeof result);
      console.log('Result keys:', Object.keys(result || {}));
      console.log('Has text:', !!result?.text);
      console.log('Text length:', result?.text?.length || 0);
      console.log('Result text preview:', result?.text?.substring(0, 500) || 'NO TEXT');
      
      return result;
    } catch (error) {
      console.error('=== ERROR IN GEMINI TEMPLATE FORMATTING ===');
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }
}

module.exports = GeminiService; 