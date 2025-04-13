const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config/config');

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

/**
 * Service for interacting with the Gemini AI model
 */
class GeminiService {
  /**
   * Generate content using the Gemini model
   * @param {string} prompt - The prompt to send to the model
   * @returns {Promise<string>} - The generated text
   */
  static async generateContent(prompt) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' }); // Or specify another model like 'gemini-1.5-flash'
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      return text;
    } catch (error) {
      console.error('Error generating content with Gemini:', error);
      throw new Error('Failed to generate content with Gemini');
    }
  }
  
  /**
   * Generate content as a chat conversation
   * @param {Array<object>} history - The chat history (e.g., [{role: 'user', parts: 'Hello'}, {role: 'model', parts: 'Hi there!'}])
   * @param {string} message - The latest user message
   * @returns {Promise<string>} - The generated response text
   */
  static async generateChatResponse(history, message) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      const chat = model.startChat({
        history: history,
      });
      const result = await chat.sendMessage(message);
      const response = await result.response;
      const text = response.text();
      return text;
    } catch (error) {
      console.error('Error generating chat response with Gemini:', error);
      throw new Error('Failed to generate chat response with Gemini');
    }
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