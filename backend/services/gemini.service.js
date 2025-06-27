const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config/config');

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

/**
 * Service for interacting with the Gemini AI model
 */
class GeminiService {
  /**
   * Generate content using the Gemini model (Base method, potentially returning more info)
   * @param {string} prompt - The prompt to send to the model
   * @param {string} modelName - e.g., 'gemini-pro', 'gemini-1.5-flash'
   * @returns {Promise<object>} - An object containing { text: string, usageMetadata: object | null }
   */
  static async _generateWithUsage(prompt, modelName) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      const usageMetadata = response.usageMetadata || null; // Get usage metadata if available
      
      // Log usage in development only
      if (process.env.NODE_ENV === 'development') {
        console.log(`Gemini Response (${modelName}) Usage:`, usageMetadata);
      }
      
      return { text, usageMetadata }; // Return both
    } catch (error) {
      console.error(`Error generating content with Gemini (${modelName}):`, error);
      throw new Error(`Failed to generate content with Gemini (${modelName})`);
    }
  }
  
  // --- Public Methods Using _generateWithUsage --- //

  /**
   * Generate simple content (backward compatible)
   * @param {string} prompt
   * @returns {Promise<string>} - The generated text only
   */
  static async generateContent(prompt) {
    const { text } = await this._generateWithUsage(prompt, 'gemini-pro');
      return text;
  }
  
  /**
   * Generate chat response (history handled by caller sending full prompt)
   * This now calls the function that returns usage metadata
   * @param {string} fullPrompt - The combined history and new message
   * @returns {Promise<object>} - Object with { text: string, usageMetadata: object | null }
   */
  static async generateChatResponseFromPrompt(fullPrompt) {
     // We are using the testGeminiFlash model as decided earlier
    return this._generateWithUsage(fullPrompt, 'gemini-1.5-flash'); 
  }

  /**
   * Test Gemini 1.5 Flash model with a prompt
   * Returns text and usage metadata
   * @param {string} prompt 
   * @returns {Promise<object>} - Object with { text: string, usageMetadata: object | null }
   */
  static async testGeminiFlash(prompt) {
    // Use the internal method that returns metadata
    return this._generateWithUsage(prompt, 'gemini-1.5-flash'); 
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
   * @returns {Promise<string>} - The generated study plan text.
   */
  static async generateStudyPlan({ topic, durationDays, hoursPerDay, subtopics = [], goal = 'learn the material' }) {
    let prompt = `Create a detailed study plan for the topic "${topic}". \
The plan should cover ${durationDays} days, with an estimated ${hoursPerDay} hours of study per day. \
The main goal is to ${goal}.`;
    
    if (subtopics.length > 0) {
      prompt += ` Focus on these subtopics: ${subtopics.join(', ')}.`;
    }
    
    prompt += `\
Provide a day-by-day breakdown with specific tasks, estimated times, and suggested resources if possible. Make the plan realistic and actionable.`;
    
    return this.generateContent(prompt);
  }
  
  /**
   * Explains a concept in simple terms.
   * @param {string} concept - The concept to explain.
   * @param {string} [context] - Optional context (e.g., the course or subject).
   * @returns {Promise<string>} - The explanation text.
   */
  static async explainConcept(concept, context = '') {
    let prompt = `Explain the concept "${concept}" in simple and easy-to-understand terms.`;
    if (context) {
      prompt += ` Assume the context is related to ${context}.`;
    }
    prompt += ` Use analogies if helpful.`;
    return this.generateContent(prompt);
  }
  
   /**
   * Generates practice questions for a topic.
   * @param {string} topic - The topic for the questions.
   * @param {number} [count=5] - Number of questions to generate.
   * @param {string} [difficulty='medium'] - Difficulty level (e.g., 'easy', 'medium', 'hard').
   * @returns {Promise<string>} - The generated questions text.
   */
  static async generatePracticeQuestions(topic, count = 5, difficulty = 'medium') {
    const prompt = `Generate ${count} practice questions about "${topic}" at a ${difficulty} difficulty level. Include a mix of question types if possible (e.g., multiple choice, short answer).`;
    return this.generateContent(prompt);
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

  static async testGemini(prompt) {
    try {
      const result = await this.generateContent(prompt, 'gemini-1.5-flash');
      return {
        success: true,
        data: {
          response: result.text,
          usage: result.usageMetadata
        }
      };
    } catch (error) {
      console.error('Error in testGemini:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = GeminiService; 