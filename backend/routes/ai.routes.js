const express = require('express');
const { body } = require('express-validator');
const AIController = require('../controllers/ai.controller');
const { validateRequest } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/**
 * @route   POST /api/ai/chat
 * @desc    Start a new chat session
 * @access  Private
 */
router.post(
  '/chat',
  authenticate,
  [
    body('courseId').isString().notEmpty(),
    body('topic').isString().notEmpty(),
    body('context').optional().isString()
  ],
  validateRequest,
  AIController.startChat
);

/**
 * @route   POST /api/ai/chat/:sessionId/message
 * @desc    Send a message in a chat session
 * @access  Private
 */
router.post(
  '/chat/:sessionId/message',
  authenticate,
  [
    body('content').isString().notEmpty(),
    body('type').isIn(['question', 'explanation', 'practice']).optional()
  ],
  validateRequest,
  AIController.sendMessage
);

/**
 * @route   GET /api/ai/chat/:sessionId
 * @desc    Get chat history
 * @access  Private
 */
router.get('/chat/:sessionId', authenticate, AIController.getChatHistory);

/**
 * @route   GET /api/ai/chat
 * @desc    Get all chat sessions for current user
 * @access  Private
 */
router.get('/chat', authenticate, AIController.getChatSessions);

/**
 * @route   DELETE /api/ai/chat/:sessionId
 * @desc    Delete a chat session
 * @access  Private
 */
router.delete('/chat/:sessionId', authenticate, AIController.deleteChatSession);

/**
 * @route   POST /api/ai/quiz/generate
 * @desc    Generate a quiz
 * @access  Private
 */
router.post(
  '/quiz/generate',
  authenticate,
  [
    body('courseId').isString().notEmpty(),
    body('topic').isString().notEmpty(),
    body('difficulty').isIn(['easy', 'medium', 'hard']).optional(),
    body('numQuestions').isInt({ min: 1, max: 20 }).optional()
  ],
  validateRequest,
  AIController.generateQuiz
);

/**
 * @route   POST /api/ai/quiz/:quizId/submit
 * @desc    Submit quiz answers
 * @access  Private
 */
router.post(
  '/quiz/:quizId/submit',
  authenticate,
  [
    body('answers').isArray(),
    body('answers.*.questionId').isString(),
    body('answers.*.answer').isString()
  ],
  validateRequest,
  AIController.submitQuiz
);

/**
 * @route   GET /api/ai/quiz/:quizId
 * @desc    Get quiz results
 * @access  Private
 */
router.get('/quiz/:quizId', authenticate, AIController.getQuizResults);

/**
 * @route   GET /api/ai/quiz
 * @desc    Get all quizzes for current user
 * @access  Private
 */
router.get('/quiz', authenticate, AIController.getQuizzes);

/**
 * @route   POST /api/ai/summary
 * @desc    Generate study summary
 * @access  Private
 */
router.post(
  '/summary',
  authenticate,
  [
    body('courseId').isString().notEmpty(),
    body('startDate').isISO8601(),
    body('endDate').isISO8601()
  ],
  validateRequest,
  AIController.generateSummary
);

module.exports = router; 