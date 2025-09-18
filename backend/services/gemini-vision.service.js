// TODO: DEPRECATED - Legacy Gemini Vision service
// This should not be used in RAG pipeline (use Unstructured instead)
const flags = require('../config/flags');

if (!flags.RAG_ENABLED) {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
}
const fs = require('fs');
const path = require('path');

class GeminiVisionService {
  constructor() {
    if (flags.RAG_ENABLED) {
      console.warn('[GEMINI-VISION] Gemini Vision service is deprecated when RAG is enabled. Use Unstructured instead.');
      return;
    }
    
    // Load environment variables if not already loaded
    if (!process.env.GEMINI_API_KEY) {
      require('dotenv').config();
    }
    
    this.apiKey = process.env.GEMINI_API_KEY;
    if (!this.apiKey) {
      console.warn('[GEMINI VISION] API key missing. Document analysis will be disabled.');
      this.genAI = null;
    } else {
      console.log('[GEMINI VISION] ✅ API key loaded, initializing service...');
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    }
  }

  /**
   * Page-by-page transcription for PDFs using image rendering
   * Extracts near-exact text from each page to avoid summarization loss
   */
  async extractAllTextFromPDF(filePath, options = {}) {
    if (!this.genAI) throw new Error('Gemini Vision API not configured');
    const maxPages = options.maxPages || 25;
    const density = options.density || 300;
    if (flags.RAG_ENABLED) {
      throw new Error('PDF conversion not available when RAG is enabled. Use Unstructured instead.');
    }
    
    const pdf2pic = require('pdf2pic');
    const tmpDir = '/tmp/';
    const convert = pdf2pic.fromPath(filePath, {
      density,
      saveFilename: `gmp-${Date.now()}`,
      savePath: tmpDir,
      format: 'png',
      width: 2200,
      height: 2200
    });

    let combined = [];
    for (let page = 1; page <= maxPages; page++) {
      try {
        const result = await convert(page);
        if (!result || !result.path) break; // no more pages
        const imgBuffer = fs.readFileSync(result.path);
        // Prompt for verbatim transcription
        const transcribePrompt = `Transcribe ALL visible text from this page EXACTLY as written. Preserve question numbers, options, math, and line breaks. Do not summarize.`;
        const resp = await this.model.generateContent([
          transcribePrompt,
          {
            inlineData: {
              data: imgBuffer.toString('base64'),
              mimeType: 'image/png'
            }
          }
        ]);
        const pageText = (await resp.response).text();
        if (pageText && pageText.trim()) {
          combined.push(`--- PAGE ${page} ---\n${pageText.trim()}`);
        }
        // cleanup
        fs.unlink(result.path, () => {});
      } catch (e) {
        // stop on conversion or API error (likely end of doc)
        break;
      }
    }

    const text = combined.join('\n\n');
    console.log(`[GEMINI VISION] PDF page transcription length: ${text.length}`);
    return { text, source: 'gemini-vision-pages' };
  }

  isEnabled() {
    return !!this.genAI;
  }

  /**
   * Analyze ANY file type (PDF, images, documents) and extract comprehensive content
   * This is the ONLY method you need - it handles everything!
   */
  async analyzeFile(filePath, options = {}) {
    if (!this.genAI) {
      throw new Error('Gemini Vision API not configured');
    }

    try {
      console.log('[GEMINI VISION] Analyzing file:', filePath);
      
      // Read file as binary data
      const fileBuffer = fs.readFileSync(filePath);
      const mimeType = this.getMimeType(filePath);
      
      console.log(`[GEMINI VISION] File size: ${fileBuffer.length} bytes, MIME: ${mimeType}`);

      // Create the prompt for comprehensive analysis
      const analysisPrompt = `
You are analyzing a document for an AI tutoring system. Extract EVERY SINGLE DETAIL from this document with MAXIMUM THOROUGHNESS.

🔍 **EXTRACTION REQUIREMENTS - MISS NOTHING:**

📝 **ALL TEXT CONTENT** (Read every word):
- Every question number and full question text (Q1, Q2, Q3, Q4, Q5, Q6, etc.)
- All instructions, directions, and problem statements
- Every answer choice (A, B, C, D) with complete text
- All handwritten notes, comments, and annotations
- Captions, labels, and footnotes
- Headers, footers, and page information

📊 **ALL VISUAL ELEMENTS** (Describe everything):
- Every diagram, chart, graph, and table with complete details
- All mathematical equations, formulas, and expressions
- Code snippets, algorithms, and programming content
- Images, figures, and their relationships to questions
- Flowcharts, trees, and data structures

🔢 **COMPLETE STRUCTURE** (Document everything):
- Every section, subsection, and question number
- All point values and grading information
- Page layout, margins, and formatting
- Question types (multiple choice, short answer, essay, etc.)

📋 **EXHAUSTIVE DETAILS** (Leave nothing out):
- For exams: Extract EVERY question (1, 2, 3, 4, 5, 6, 7, 8, 9, 10...) with FULL text
- For homework: Every problem and sub-problem
- For grades: All scores, feedback, and rubric details
- For diagrams: Complete descriptions of what they show
- For tables: All data, rows, and columns

⚠️ **CRITICAL**: This document may contain 10+ questions. Extract ALL of them completely. Do not stop at question 1 or 2. Continue through the ENTIRE document. The user specifically needs to see question 6 and beyond.

**OUTPUT FORMAT**: Use clear headers like "Question 1:", "Question 2:", etc. and include the complete text for each question.
`;

      // Send to Gemini Vision
      const result = await this.model.generateContent([
        analysisPrompt,
        {
          inlineData: {
            data: fileBuffer.toString('base64'),
            mimeType: mimeType
          }
        }
      ]);

      const response = await result.response;
      let analysisText = response.text();

      // If deep mode requested, try a second pass that asks explicitly for later questions
      if (options.deep === true && analysisText && !/Question\s*6/i.test(analysisText)) {
        console.log('[GEMINI VISION] Deep mode: re-querying for later questions (6+)...');
        const deepPrompt = `Focus specifically on later questions (6 and beyond). If the document contains pages with non-searchable content, ensure those are fully described. Extract the full text for Question 6, Question 7, etc. Include diagrams and equations if present.`;
        const deepResult = await this.model.generateContent([
          deepPrompt,
          {
            inlineData: {
              data: fileBuffer.toString('base64'),
              mimeType
            }
          }
        ]);
        const deepText = (await deepResult.response).text();
        if (deepText && deepText.length > analysisText.length) {
          analysisText += `\n\n--- DEEP ANALYSIS ---\n\n${deepText}`;
        }
      }
      
      console.log(`[GEMINI VISION] Analysis complete: ${analysisText.length} characters`);
      console.log(`[GEMINI VISION] Preview: ${analysisText.substring(0, 200)}...`);

      return {
        text: analysisText,
        source: 'gemini-vision',
        mimeType: mimeType,
        fileSize: fileBuffer.length,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('[GEMINI VISION] Analysis failed:', error.message);
      throw new Error(`Gemini Vision analysis failed: ${error.message}`);
    }
  }

  /**
   * Get MIME type based on file extension
   */
  getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp',
      '.tiff': 'image/tiff',
      '.tif': 'image/tiff'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Quick test method to verify the service works
   */
  async testService() {
    if (!this.isEnabled()) {
      return { success: false, error: 'Gemini Vision not configured' };
    }

    try {
      // Test with a simple text prompt
      const result = await this.model.generateContent("Say 'Gemini Vision is working!' if you can see this.");
      const response = await result.response;
      return { success: true, message: response.text() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = new GeminiVisionService();
