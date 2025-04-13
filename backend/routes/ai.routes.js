const express = require('express');
const AIController = require('../controllers/ai.controller');

const router = express.Router();

// Generate study plan
router.post('/study-plan', AIController.generateStudyPlan);

// Explain a concept
router.post('/explain', AIController.explainConcept);

// Generate practice questions
router.post('/practice-questions', AIController.generatePracticeQuestions);

// Handle chat message (maintains history via request body)
router.post('/chat', AIController.handleChatMessage);

// Test Gemini 1.5 Flash API endpoint
router.post('/test-gemini', AIController.testGemini);

// NOTE: Routes related to the previous custom chat/quiz implementation 
// (e.g., /chat/:sessionId, /quiz/generate, /quiz/:quizId/submit) 
// have been removed as they are superseded or need redesign with Gemini.

module.exports = router; 