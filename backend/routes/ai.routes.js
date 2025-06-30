const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const AIController = require('../controllers/ai.controller');
const GeminiService = require('../services/gemini.service');
const { verifyToken: auth } = require('../middleware/auth.middleware');

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
    const message = req.body.message || '';
    const prompt = message.trim() || `Please analyze this PDF and provide a comprehensive summary of its contents, including main topics, key points, and important details.`;

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

// Process PDF with chat message and progress tracking
router.post('/process-pdf-with-message', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    const pdfPath = req.file.path;
    const message = req.body.message || '';
    const prompt = message.trim() || `Please analyze this PDF and provide a comprehensive summary of its contents, including main topics, key points, and important details.`;

    // Set up Server-Sent Events for progress tracking
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial progress
    res.write(`data: ${JSON.stringify({ type: 'progress', progress: 0, message: 'Starting PDF processing...' })}\n\n`);

    // Simulate reading file progress
    res.write(`data: ${JSON.stringify({ type: 'progress', progress: 20, message: 'Reading PDF file...' })}\n\n`);

    // Add a small delay to show progress
    await new Promise(resolve => setTimeout(resolve, 500));

    res.write(`data: ${JSON.stringify({ type: 'progress', progress: 40, message: 'Uploading to AI service...' })}\n\n`);

    await new Promise(resolve => setTimeout(resolve, 300));

    res.write(`data: ${JSON.stringify({ type: 'progress', progress: 60, message: 'Analyzing PDF content...' })}\n\n`);

    // Process the PDF using Gemini
    const result = await GeminiService.processPDF(pdfPath, prompt);

    res.write(`data: ${JSON.stringify({ type: 'progress', progress: 90, message: 'Generating response...' })}\n\n`);

    await new Promise(resolve => setTimeout(resolve, 200));

    // Send completion
    res.write(`data: ${JSON.stringify({ 
      type: 'complete', 
      progress: 100, 
      data: result,
      userMessage: message,
      fileName: req.file.originalname
    })}\n\n`);

    res.write(`data: ${JSON.stringify({ type: 'end' })}\n\n`);
    res.end();

    // Clean up the uploaded file
    await fs.unlink(pdfPath);

  } catch (error) {
    console.error('Error processing PDF with message:', error);
    res.write(`data: ${JSON.stringify({ 
      type: 'error', 
      error: error.message || 'Failed to process PDF with message' 
    })}\n\n`);
    res.end();
  }
});

// Test Gemini 1.5 Flash API endpoint
router.post('/test-gemini', AIController.testGemini);

// Test form parsing (for debugging)
router.post('/test-form', upload.single('pdf'), AIController.testFormParsing);

// Generate practice exam
router.post('/practice-exam', upload.single('pdf'), AIController.generatePracticeExam);

// Download PDF
router.get('/download-pdf/:filename', AIController.downloadPDF);

// AI Tutor routes (using existing methods)
router.post('/generate-questions', auth, AIController.generatePracticeQuestions);

// Generate study plan
router.post('/study-plan', AIController.generateStudyPlan);

// Explain a concept
router.post('/explain', AIController.explainConcept);

// Generate practice questions
router.post('/practice-questions', AIController.generatePracticeQuestions);

// Handle chat message (maintains history via request body)
router.post('/chat', auth, AIController.handleChatMessage);

// Get available classrooms for AI context
router.get('/classrooms', AIController.getAvailableClassrooms);

// Get integrated materials for a classroom or course
router.get('/materials/:contextId', AIController.getIntegratedMaterials);

// Interactive Activities routes
router.post('/activities', auth, AIController.createActivity);
router.get('/activities', auth, AIController.getActivities);
router.get('/activities/:activityId', auth, AIController.getActivity);
router.put('/activities/:activityId', auth, AIController.updateActivity);
router.post('/activities/:activityId/start', auth, AIController.startActivity);
router.post('/activities/join', auth, AIController.joinActivity);
router.post('/activities/:activityId/generate-content', auth, AIController.generateActivityContent);

// NOTE: Routes related to the previous custom chat/quiz implementation 
// (e.g., /chat/:sessionId, /quiz/generate, /quiz/:quizId/submit) 
// have been removed as they are superseded or need redesign with Gemini.

module.exports = router; 