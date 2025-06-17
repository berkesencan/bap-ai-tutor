const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const AIController = require('../controllers/ai.controller');
const GeminiService = require('../services/gemini.service');

const router = express.Router();

// Configure multer for PDF upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed'));
    }
    cb(null, true);
  }
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
fs.mkdir(uploadsDir, { recursive: true }).catch(console.error);

// Process PDF endpoint
router.post('/process-pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    const pdfPath = req.file.path;
    const prompt = req.body.prompt || 'Please analyze this PDF and provide a summary of its contents.';

    // Process the PDF using Gemini
    const result = await GeminiService.processPDF(pdfPath, prompt);

    // Clean up the uploaded file
    await fs.unlink(pdfPath);

    res.json(result);
  } catch (error) {
    console.error('Error processing PDF:', error);
    res.status(500).json({ error: error.message || 'Failed to process PDF' });
  }
});

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