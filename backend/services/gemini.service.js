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
      
      console.log(`Gemini Response (${modelName}) Usage:`, usageMetadata); // Log it on the backend
      
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
    console.log('Testing Gemini 1.5 Flash with prompt:', prompt);
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
}

module.exports = GeminiService; 