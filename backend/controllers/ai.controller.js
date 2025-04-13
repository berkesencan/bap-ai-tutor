const { handleError } = require('../middleware/error.middleware');
const GeminiService = require('../services/gemini.service');

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
   * Handle a chat message using Gemini (maintains history)
   * @route POST /api/ai/chat
   */
  static async handleChatMessage(req, res) {
    try {
      const { history, message } = req.body;
      if (!message) {
        return res.status(400).json({ success: false, message: 'Missing required field: message' });
      }
      if (history && !Array.isArray(history)) {
         return res.status(400).json({ success: false, message: 'Invalid history format: must be an array' });
      }

      const responseText = await GeminiService.generateChatResponse(
        history || [],
        message
      );
      
      res.json({ success: true, data: { response: responseText } });
    } catch (error) {
      handleError(error, res);
    }
  }
}

module.exports = AIController; 