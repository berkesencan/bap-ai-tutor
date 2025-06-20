const { handleError } = require('../middleware/error.middleware');
const GeminiService = require('../services/gemini.service');
const aiService = require('../services/ai.service');

class AIController {
  /**
   * Generate a personalized study plan using Gemini
   * @route POST /api/ai/study-plan
   */
  static async generateStudyPlan(req, res) {
    try {
      const { topic, durationDays, hoursPerDay, subtopics, goal } = req.body;
      
      if (!topic || !durationDays || !hoursPerDay) {
        return res.status(400).json({ success: false, message: 'Missing required fields: topic, durationDays, hoursPerDay' });
      }

      const studyPlanText = await GeminiService.generateStudyPlan({
        topic,
        durationDays,
        hoursPerDay,
        subtopics: subtopics || [],
        goal: goal || 'learn the material effectively'
      });
      
      res.json({ success: true, data: { studyPlan: studyPlanText } });
    } catch (error) {
      handleError(error, res);
    }
  }

  /**
   * Explain a concept using Gemini
   * @route POST /api/ai/explain
   */
  static async explainConcept(req, res) {
    try {
      const { concept, context } = req.body;
      if (!concept) {
        return res.status(400).json({ success: false, message: 'Missing required field: concept' });
      }

      const explanationText = await GeminiService.explainConcept(concept, context);
      
      res.json({ success: true, data: { explanation: explanationText } });
    } catch (error) {
      handleError(error, res);
    }
  }

  /**
   * Generate practice questions using Gemini
   * @route POST /api/ai/practice-questions
   */
  static async generatePracticeQuestions(req, res) {
    try {
      const { topic, count, difficulty } = req.body;
      if (!topic) {
        return res.status(400).json({ success: false, message: 'Missing required field: topic' });
      }

      const questionsText = await GeminiService.generatePracticeQuestions(
        topic, 
        count ? parseInt(count) : 5,
        difficulty || 'medium'
      );
      
      res.json({ success: true, data: { questions: questionsText } });
    } catch (error) {
      handleError(error, res);
    }
  }

  /**
   * Handle a chat message using Gemini with classroom context
   * @route POST /api/ai/chat
   */
  static async handleChatMessage(req, res) {
    try {
      const { history, message, classroomId, courseId } = req.body;
      const userId = req.user.uid;
      
      if (!message) {
        return res.status(400).json({ success: false, message: 'Missing required field: message' });
      }
      if (history && !Array.isArray(history)) {
         return res.status(400).json({ success: false, message: 'Invalid history format: must be an array' });
      }

      // Use enhanced AI service with classroom context
      const response = await aiService.answerQuestion({
        userId,
        question: message,
        courseId: courseId || classroomId,
        classroomId: classroomId,
        context: history ? history.map(msg => {
        const prefix = (msg.role === 'user' || msg.sender === 'user') ? 'User:' : 'AI:';
        return `${prefix} ${msg.content || msg.text || msg.parts || ''}`;
        }).join('\n') : ''
      });
      
      res.json({ 
        success: true, 
        data: { 
          response: response.answer,
          materials: response.materials,
          usageMetadata: response.usageMetadata
        } 
      });
    } catch (error) {
      handleError(error, res);
    }
  }

  /**
   * Get available classrooms for AI context
   * @route GET /api/ai/classrooms
   */
  static async getAvailableClassrooms(req, res) {
    try {
      const userId = req.user.uid;
      const classrooms = await aiService.getAvailableClassrooms(userId);
      
      res.json({ 
        success: true, 
        data: classrooms
      });
    } catch (error) {
      handleError(error, res);
    }
  }

  /**
   * Get integrated materials for a classroom or course
   * @route GET /api/ai/materials/:contextId
   */
  static async getIntegratedMaterials(req, res) {
    try {
      const userId = req.user.uid;
      const { contextId } = req.params;
      const { type = 'classroom' } = req.query; // 'classroom' or 'course'
      
      const materials = await aiService.getIntegratedMaterials(userId, contextId, type);
      
      res.json({ 
        success: true, 
        data: materials
      });
    } catch (error) {
      handleError(error, res);
    }
  }

  /**
   * Test Gemini 1.5 Flash API - Now returns usage metadata
   * @route POST /api/ai/test-gemini
   */
  static async testGemini(req, res) {
    try {
      const { prompt } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ 
          success: false, 
          message: 'Missing required field: prompt' 
        });
      }

      console.log("Test Gemini API called with prompt:", prompt);
      // Service function now returns { text, usageMetadata }
      const { text, usageMetadata } = await GeminiService.testGeminiFlash(prompt); 
      console.log("Response received from Gemini:", text.substring(0, 100) + "...");
      
      res.json({ 
        success: true, 
        data: { 
          response: text,
          model: 'gemini-1.5-flash',
          usageMetadata: usageMetadata // Include usage metadata
        } 
      });
    } catch (error) {
      console.error('Test Gemini Error:', error);
      handleError(error, res);
    }
  }
}

module.exports = AIController; 