const { handleError } = require('../middleware/error.middleware');
const aiService = require('../services/ai.service');
const PDFService = require('../services/pdf.service');
const GeminiService = require('../services/gemini.service');
const PracticeExamPipelineService = require('../services/practice-exam-pipeline.service');
const path = require('path');
const admin = require('firebase-admin');
const db = admin.firestore();
const fs = require('fs');
const fsPromises = require('fs').promises;
const multer = require('multer');
const GradescopeService = require('../services/gradescope.service');
const EmailService = require('../services/email.service');

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

  // Interactive Activities Management
  static async createActivity(req, res) {
    try {
      const { title, type, courseId, materials, settings } = req.body;
      const userId = req.user.uid;

      // Verify user has permission to create activities in this course
      const courseRef = db.collection('courses').doc(courseId);
      const courseDoc = await courseRef.get();
      
      if (!courseDoc.exists) {
        return res.status(404).json({ error: 'Course not found' });
      }

      const courseData = courseDoc.data();
      const userRole = courseData.members?.[userId]?.role;
      
      if (!['creator', 'admin', 'instructor'].includes(userRole)) {
        return res.status(403).json({ error: 'Insufficient permissions to create activities' });
      }

      // Generate unique join code
      const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      const activityData = {
        title,
        type,
        courseId,
        materials: materials || [],
        settings: {
          maxParticipants: settings?.maxParticipants || 30,
          timeLimit: settings?.timeLimit || 20,
          difficulty: settings?.difficulty || 'medium',
          allowHints: settings?.allowHints !== false,
          showLeaderboard: settings?.showLeaderboard !== false,
          teamMode: settings?.teamMode || false,
          aiModeration: settings?.aiModeration !== false,
          ...settings
        },
        status: 'draft',
        joinCode,
        createdBy: userId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        participants: [],
        stats: {
          totalParticipants: 0,
          averageScore: 0,
          completionRate: 0
        }
      };

      const activityRef = await db.collection('activities').add(activityData);
      
      res.status(201).json({
        success: true,
        data: {
          id: activityRef.id,
          ...activityData,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Error creating activity:', error);
      res.status(500).json({ error: 'Failed to create activity' });
    }
  }

  static async getActivities(req, res) {
    try {
      const userId = req.user.uid;
      const { courseId, status, type } = req.query;

      let query = db.collection('activities');

      // Filter by course if specified
      if (courseId) {
        query = query.where('courseId', '==', courseId);
      }

      // Filter by status if specified
      if (status) {
        query = query.where('status', '==', status);
      }

      // Filter by type if specified
      if (type) {
        query = query.where('type', '==', type);
      }

      const snapshot = await query.orderBy('createdAt', 'desc').get();
      const activities = [];

      for (const doc of snapshot.docs) {
        const activityData = doc.data();
        
        // Check if user has access to this activity
        const courseRef = db.collection('courses').doc(activityData.courseId);
        const courseDoc = await courseRef.get();
        
        if (courseDoc.exists) {
          const courseData = courseDoc.data();
          const userRole = courseData.members?.[userId]?.role;
          
          if (userRole || activityData.createdBy === userId) {
            activities.push({
              id: doc.id,
              ...activityData,
              course: {
                id: courseDoc.id,
                code: courseData.code,
                name: courseData.name
              }
            });
          }
        }
      }

      res.json({
        success: true,
        data: { activities }
      });
    } catch (error) {
      console.error('Error fetching activities:', error);
      res.status(500).json({ error: 'Failed to fetch activities' });
    }
  }

  static async getActivity(req, res) {
    try {
      const { activityId } = req.params;
      const userId = req.user.uid;

      const activityDoc = await db.collection('activities').doc(activityId).get();
      
      if (!activityDoc.exists) {
        return res.status(404).json({ error: 'Activity not found' });
      }

      const activityData = activityDoc.data();
      
      // Check if user has access to this activity
      const courseRef = db.collection('courses').doc(activityData.courseId);
      const courseDoc = await courseRef.get();
      
      if (!courseDoc.exists) {
        return res.status(404).json({ error: 'Course not found' });
      }

      const courseData = courseDoc.data();
      const userRole = courseData.members?.[userId]?.role;
      
      if (!userRole && activityData.createdBy !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.json({
        success: true,
        data: {
          id: activityDoc.id,
          ...activityData,
          course: {
            id: courseDoc.id,
            code: courseData.code,
            name: courseData.name
          }
        }
      });
    } catch (error) {
      console.error('Error fetching activity:', error);
      res.status(500).json({ error: 'Failed to fetch activity' });
    }
  }

  static async updateActivity(req, res) {
    try {
      const { activityId } = req.params;
      const userId = req.user.uid;
      const updates = req.body;

      const activityRef = db.collection('activities').doc(activityId);
      const activityDoc = await activityRef.get();
      
      if (!activityDoc.exists) {
        return res.status(404).json({ error: 'Activity not found' });
      }

      const activityData = activityDoc.data();
      
      // Check permissions
      const courseRef = db.collection('courses').doc(activityData.courseId);
      const courseDoc = await courseRef.get();
      const courseData = courseDoc.data();
      const userRole = courseData.members?.[userId]?.role;
      
      if (!['creator', 'admin', 'instructor'].includes(userRole) && activityData.createdBy !== userId) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const updateData = {
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await activityRef.update(updateData);
      
      res.json({
        success: true,
        data: { id: activityId, ...activityData, ...updateData }
      });
    } catch (error) {
      console.error('Error updating activity:', error);
      res.status(500).json({ error: 'Failed to update activity' });
    }
  }

  static async startActivity(req, res) {
    try {
      const { activityId } = req.params;
      const userId = req.user.uid;

      const activityRef = db.collection('activities').doc(activityId);
      const activityDoc = await activityRef.get();
      
      if (!activityDoc.exists) {
        return res.status(404).json({ error: 'Activity not found' });
      }

      const activityData = activityDoc.data();
      
      // Check permissions
      const courseRef = db.collection('courses').doc(activityData.courseId);
      const courseDoc = await courseRef.get();
      const courseData = courseDoc.data();
      const userRole = courseData.members?.[userId]?.role;
      
      if (!['creator', 'admin', 'instructor'].includes(userRole) && activityData.createdBy !== userId) {
        return res.status(403).json({ error: 'Insufficient permissions to start activity' });
      }

      // Update activity status to live
      await activityRef.update({
        status: 'live',
        startedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      res.json({
        success: true,
        data: {
          id: activityId,
          status: 'live',
          joinCode: activityData.joinCode,
          message: 'Activity started successfully'
        }
      });
    } catch (error) {
      console.error('Error starting activity:', error);
      res.status(500).json({ error: 'Failed to start activity' });
    }
  }

  static async joinActivity(req, res) {
    try {
      const { joinCode } = req.body;
      const userId = req.user.uid;

      // Find activity by join code
      const activitiesSnapshot = await db.collection('activities')
        .where('joinCode', '==', joinCode.toUpperCase())
        .where('status', '==', 'live')
        .get();

      if (activitiesSnapshot.empty) {
        return res.status(404).json({ error: 'Activity not found or not currently live' });
      }

      const activityDoc = activitiesSnapshot.docs[0];
      const activityData = activityDoc.data();

      // Check if user is already a participant
      if (activityData.participants?.includes(userId)) {
        return res.json({
          success: true,
          data: {
            activityId: activityDoc.id,
            message: 'Already joined this activity'
          }
        });
      }

      // Check if activity is full
      const currentParticipants = activityData.participants?.length || 0;
      if (currentParticipants >= activityData.settings.maxParticipants) {
        return res.status(400).json({ error: 'Activity is full' });
      }

      // Add user to participants
      await activityDoc.ref.update({
        participants: admin.firestore.FieldValue.arrayUnion(userId),
        'stats.totalParticipants': admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      res.json({
        success: true,
        data: {
          activityId: activityDoc.id,
          message: 'Successfully joined activity'
        }
      });
    } catch (error) {
      console.error('Error joining activity:', error);
      res.status(500).json({ error: 'Failed to join activity' });
    }
  }

  static async generateActivityContent(req, res) {
    try {
      const { activityId } = req.params;
      const { materialIds, difficulty, questionCount = 10 } = req.body;
      const userId = req.user.uid;

      const activityDoc = await db.collection('activities').doc(activityId).get();
      
      if (!activityDoc.exists) {
        return res.status(404).json({ error: 'Activity not found' });
      }

      const activityData = activityDoc.data();
      
      // Check permissions
      const courseRef = db.collection('courses').doc(activityData.courseId);
      const courseDoc = await courseRef.get();
      const courseData = courseDoc.data();
      const userRole = courseData.members?.[userId]?.role;
      
      if (!['creator', 'admin', 'instructor'].includes(userRole) && activityData.createdBy !== userId) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      // Get course materials
      const materials = [];
      for (const materialId of materialIds || activityData.materials) {
        const materialDoc = await db.collection('courses').doc(activityData.courseId)
          .collection('materials').doc(materialId).get();
        
        if (materialDoc.exists) {
          materials.push(materialDoc.data());
        }
      }

      if (materials.length === 0) {
        return res.status(400).json({ error: 'No materials found for content generation' });
      }

      // Generate AI content based on activity type
      let generatedContent;
      const activityType = activityData.type;

      switch (activityType) {
        case 'ai-quiz-battle':
          generatedContent = await AIController.generateQuizContent(materials, difficulty, questionCount);
          break;
        case 'concept-race':
          generatedContent = await AIController.generateConceptRaceContent(materials, difficulty);
          break;
        case 'collaborative-solver':
          generatedContent = await AIController.generateProblemSolvingContent(materials, difficulty);
          break;
        case 'mystery-case':
          generatedContent = await AIController.generateCaseStudyContent(materials, difficulty);
          break;
        case 'debate-arena':
          generatedContent = await AIController.generateDebateContent(materials, difficulty);
          break;
        case 'simulation-lab':
          generatedContent = await AIController.generateSimulationContent(materials, difficulty);
          break;
        default:
          return res.status(400).json({ error: 'Unsupported activity type' });
      }

      // Update activity with generated content
      await db.collection('activities').doc(activityId).update({
        generatedContent,
        contentGeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      res.json({
        success: true,
        data: {
          activityId,
          content: generatedContent,
          message: 'Activity content generated successfully'
        }
      });
    } catch (error) {
      console.error('Error generating activity content:', error);
      res.status(500).json({ error: 'Failed to generate activity content' });
    }
  }

  // Helper functions for different activity types
  static async generateQuizContent(materials, difficulty, questionCount) {
    const materialTexts = materials.map(m => m.extractedText || m.content || '').join('\n\n');
    
    const prompt = `Based on the following course materials, generate ${questionCount} multiple-choice quiz questions at ${difficulty} difficulty level:

${materialTexts}

For each question, provide:
1. Question text
2. 4 multiple choice options (A, B, C, D)
3. Correct answer
4. Explanation of why the answer is correct
5. Estimated time to answer (in seconds)
6. Related concepts/topics

Format as JSON array with this structure:
{
  "questions": [
    {
      "id": "q1",
      "question": "Question text here",
      "options": ["A. Option 1", "B. Option 2", "C. Option 3", "D. Option 4"],
      "correctAnswer": "A",
      "explanation": "Explanation here",
      "timeLimit": 30,
      "concepts": ["concept1", "concept2"],
      "difficulty": "${difficulty}"
    }
  ]
}`;

    const response = await GeminiService.generateContent(prompt);
    return JSON.parse(response);
  }

  static async generateConceptRaceContent(materials, difficulty) {
    const materialTexts = materials.map(m => m.extractedText || m.content || '').join('\n\n');
    
    const prompt = `Based on the following course materials, create a concept race game at ${difficulty} difficulty:

${materialTexts}

Generate:
1. Key concepts and their definitions
2. Visual clues or descriptions
3. Speed round questions
4. Bonus challenges

Format as JSON with this structure:
{
  "concepts": [
    {
      "id": "c1",
      "name": "Concept Name",
      "definition": "Definition here",
      "visualClue": "Description or clue",
      "difficulty": "${difficulty}"
    }
  ],
  "speedRounds": [
    {
      "question": "Quick question",
      "answer": "Answer",
      "timeLimit": 10
    }
  ],
  "bonusChallenges": [
    {
      "challenge": "Bonus challenge description",
      "points": 50
    }
  ]
}`;

    const response = await GeminiService.generateContent(prompt);
    return JSON.parse(response);
  }

  static async generateProblemSolvingContent(materials, difficulty) {
    const materialTexts = materials.map(m => m.extractedText || m.content || '').join('\n\n');
    
    const prompt = `Based on the following course materials, create collaborative problem-solving scenarios at ${difficulty} difficulty:

${materialTexts}

Generate:
1. Complex problems that require teamwork
2. Step-by-step guidance
3. Hints and tips
4. Peer review criteria

Format as JSON with problem scenarios, hints, and collaboration guidelines.`;

    const response = await GeminiService.generateContent(prompt);
    return JSON.parse(response);
  }

  static async generateCaseStudyContent(materials, difficulty) {
    const materialTexts = materials.map(m => m.extractedText || m.content || '').join('\n\n');
    
    const prompt = `Based on the following course materials, create an interactive mystery case study at ${difficulty} difficulty:

${materialTexts}

Generate:
1. Case study scenario
2. Evidence pieces
3. Decision points with branching paths
4. Multiple endings based on choices

Format as JSON with branching narrative structure.`;

    const response = await GeminiService.generateContent(prompt);
    return JSON.parse(response);
  }

  static async generateDebateContent(materials, difficulty) {
    const materialTexts = materials.map(m => m.extractedText || m.content || '').join('\n\n');
    
    const prompt = `Based on the following course materials, create debate topics and structure at ${difficulty} difficulty:

${materialTexts}

Generate:
1. Debate topics with pro/con positions
2. Key arguments and counterarguments
3. Fact-checking points
4. Scoring criteria

Format as JSON with debate structure and moderation guidelines.`;

    const response = await GeminiService.generateContent(prompt);
    return JSON.parse(response);
  }

  static async generateSimulationContent(materials, difficulty) {
    const materialTexts = materials.map(m => m.extractedText || m.content || '').join('\n\n');
    
    const prompt = `Based on the following course materials, create interactive simulation scenarios at ${difficulty} difficulty:

${materialTexts}

Generate:
1. Simulation parameters and variables
2. Experiment scenarios
3. Data collection points
4. Analysis questions

Format as JSON with simulation setup and analysis framework.`;

    const response = await GeminiService.generateContent(prompt);
    return JSON.parse(response);
  }

  /**
   * Test endpoint to debug form parsing
   * @route POST /api/ai/test-form
   */
  static async testFormParsing(req, res) {
    try {
      console.log('=== TEST FORM PARSING ===');
      console.log('Request body:', req.body);
      console.log('Request file:', req.file);
      
      let { questionPoints } = req.body;
      console.log('Raw questionPoints:', questionPoints, typeof questionPoints);
      
      // Parse questionPoints if it's a JSON string
      if (typeof questionPoints === 'string') {
        try {
          questionPoints = JSON.parse(questionPoints);
          console.log('Parsed questionPoints:', questionPoints);
        } catch (parseError) {
          console.error('Error parsing questionPoints JSON:', parseError);
          questionPoints = null;
        }
      }
      
      res.json({
        success: true,
        data: {
          body: req.body,
          questionPoints: questionPoints,
          parsedCorrectly: Array.isArray(questionPoints)
        }
      });
    } catch (error) {
      console.error('Test form parsing error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Clean up temporary files from PDF extraction
   */
  static async cleanupTempFiles(pdfPath) {
    try {
      console.log('🧹 Cleaning up temporary files...');
      const fs = require('fs').promises;
      const path = require('path');
      
      const baseName = path.basename(pdfPath, '.pdf');
      const uploadsDir = path.dirname(pdfPath);
      
      // Files to clean up
      const tempFiles = [
        path.join(uploadsDir, `${baseName}.html`),
        path.join(uploadsDir, `${baseName}001.png`),
        path.join(uploadsDir, `${baseName}002.png`),
        path.join(uploadsDir, `${baseName}003.png`),
        path.join(uploadsDir, `${baseName}004.png`),
        path.join(uploadsDir, `${baseName}005.png`),
        path.join(uploadsDir, `${baseName}006.png`)
      ];
      
      for (const file of tempFiles) {
        try {
          await fs.unlink(file);
          console.log(`🗑️  Removed: ${file}`);
        } catch (err) {
          // File doesn't exist, ignore
        }
      }
      
      console.log('✅ Temporary file cleanup completed');
    } catch (error) {
      console.warn('⚠️  Cleanup failed:', error.message);
    }
  }

  /**
   * Generate practice exam using EXACT working standalone scripts (with PDF) or GeminiService (without PDF)
   */
  static async generatePracticeExam(req, res) {
    console.log('=== PRACTICE EXAM GENERATION ===');
      console.log('Body:', req.body);
      console.log('File:', req.file);

    try {
      const { subject, numQuestions, difficulty, generatePDF, instructions, questionPoints } = req.body;

      // Parse question points
      let parsedQuestionPoints;
        try {
        parsedQuestionPoints = JSON.parse(questionPoints || '[]');
          console.log('Parsed question points:', parsedQuestionPoints);
        } catch (error) {
        console.log('Error parsing question points, using defaults');
        const count = parseInt(numQuestions) || 10;
        parsedQuestionPoints = Array(count).fill(Math.round(100 / count));
      }

      // CASE 1: PDF uploaded - use standalone scripts
      if (req.file) {
        console.log('=== USING STANDALONE SCRIPTS (WITH PDF) ===');
        return await AIController.generatePracticeExamWithPDF(req, res, parsedQuestionPoints);
      }
      
      // CASE 2: No PDF - use GeminiService for general questions
      else {
        console.log('=== USING GEMINI SERVICE (NO PDF) ===');
        return await AIController.generatePracticeExamWithoutPDF(req, res, parsedQuestionPoints);
      }

    } catch (error) {
      console.error('❌ Practice exam generation failed:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to generate practice exam',
        details: error.message
      });
    }
  }

  /**
   * Generate practice exam WITH PDF using standalone scripts
   */
  static async generatePracticeExamWithPDF(req, res, parsedQuestionPoints) {
    const { subject, numQuestions, difficulty, generatePDF, instructions } = req.body;
    
    console.log(`🎯 Generating ${numQuestions} questions from PDF, difficulty: ${difficulty}, PDF: ${generatePDF}`);
    
    console.log('🚀 CALLING EXACT WORKING STANDALONE SCRIPTS');
    console.log(`📄 req.file.path: ${req.file.path}`);
    console.log(`📄 req.file.filename: ${req.file.filename}`);
    console.log(`📄 req.file.destination: ${req.file.destination}`);

    // EXECUTE THE WORKING SCRIPTS DIRECTLY
    const { execSync } = require('child_process');
    const fs = require('fs');
        const path = require('path');
    
    const projectRoot = path.join(__dirname, '../../');
    const backendDir = path.join(__dirname, '../');
    
    console.log(`📂 Project root: ${projectRoot}`);
    console.log(`📂 Backend dir: ${backendDir}`);
    console.log(`📂 __dirname: ${__dirname}`);
    
    // Build the correct absolute path
    let pdfPath;
    if (path.isAbsolute(req.file.path)) {
      pdfPath = req.file.path;
      } else {
      pdfPath = path.join(backendDir, req.file.path);
    }
    
    console.log(`📄 PDF absolute path: ${pdfPath}`);
    
    // Verify PDF exists
    if (!fs.existsSync(pdfPath)) {
      console.log('❌ PDF not found at calculated path. Trying alternative paths...');
      
      // Try different path combinations
      const alternativePaths = [
        path.join(projectRoot, req.file.path),
        path.join(projectRoot, 'backend', req.file.path),
        path.join(backendDir, 'uploads', req.file.filename),
        path.join(projectRoot, 'backend', 'uploads', req.file.filename)
      ];
      
      console.log('🔍 Checking alternative paths:');
      for (const altPath of alternativePaths) {
        console.log(`   - ${altPath}: ${fs.existsSync(altPath) ? '✅ EXISTS' : '❌ NOT FOUND'}`);
        if (fs.existsSync(altPath)) {
          pdfPath = altPath;
          break;
        }
      }
      
      if (!fs.existsSync(pdfPath)) {
        throw new Error(`PDF file not found at any attempted path. Last tried: ${pdfPath}`);
      }
    }
    
    console.log(`✅ PDF found: ${pdfPath}`);
    console.log(`✅ PDF verified: ${(fs.statSync(pdfPath).size / 1024).toFixed(1)}KB`);
    
    // Step 1: Execute step1-pdf-extraction.js
    console.log('🔧 STEP 1: Running step1-pdf-extraction.js');
    const step1Command = `cd "${projectRoot}" && node step1-pdf-extraction.js "${pdfPath}"`;
    console.log(`Executing: ${step1Command}`);
    
    const step1Output = execSync(step1Command, { 
      encoding: 'utf8',
      timeout: 60000,
      cwd: projectRoot
    });
    
    console.log('✅ STEP 1 COMPLETED');
    console.log('Step 1 output:', step1Output.substring(0, 500));
    
    // Step 2: Execute simple-gemini-conversion.js  
    console.log('🔧 STEP 2: Running simple-gemini-conversion.js');
    const step2Command = `cd "${projectRoot}" && node simple-gemini-conversion.js "${pdfPath}"`;
    console.log(`Executing: ${step2Command}`);
    
    const step2Output = execSync(step2Command, { 
      encoding: 'utf8',
      timeout: 60000,
      cwd: projectRoot
    });
    
    console.log('✅ STEP 2 COMPLETED');
    console.log('Step 2 output:', step2Output.substring(0, 500));
    
    // Step 2.5: Execute step2.5-simple.js with ALL user parameters
    console.log('🔧 STEP 2.5: Running step2.5-simple.js');
    
    // Prepare all parameters for step2.5
    const step25Subject = subject || ''; // Pass user subject or empty string for auto-detection
    const step25Instructions = instructions || ''; // Pass user instructions or empty string
    
    console.log(`📊 Passing parameters to step2.5:`);
    console.log(`   📄 PDF Path: ${pdfPath}`);
    console.log(`   📊 Questions: ${numQuestions}`);
    console.log(`   🎚️  Difficulty: ${difficulty}`);
    console.log(`   🎯 Subject: ${step25Subject || 'auto-detect'}`);
    console.log(`   📝 Instructions: ${step25Instructions || 'none'}`);
    
    const step25Command = `cd "${projectRoot}" && node step2.5-simple.js "${pdfPath}" ${numQuestions} ${difficulty} "${step25Subject}" "${step25Instructions}"`;
    console.log(`Executing: ${step25Command}`);
    
    const step25Output = execSync(step25Command, { 
      encoding: 'utf8',
      timeout: 120000, // 2 minutes for this step
      cwd: projectRoot
    });
    
    console.log('✅ STEP 2.5 COMPLETED - USER PARAMETERS APPLIED');
    console.log('Step 2.5 output:', step25Output.substring(0, 500));
    
    // Find the generated PDF file in the correct location (step2.5-output)
    const step25OutputDir = path.join(projectRoot, 'step2.5-output');
    console.log(`🔍 Looking for PDF in: ${step25OutputDir}`);
    
    if (!fs.existsSync(step25OutputDir)) {
      throw new Error(`Step 2.5 output directory not found: ${step25OutputDir}`);
    }
    
    const step25PdfFiles = fs.readdirSync(step25OutputDir).filter(f => f.endsWith('.pdf') && f.includes('simple-exam'));
    console.log(`📁 Found PDFs in step2.5-output: ${step25PdfFiles}`);
    
    if (step25PdfFiles.length === 0) {
      throw new Error('No PDF generated by step 2.5 script');
    }
    
    // Get the most recent PDF by timestamp (extract timestamp and sort numerically)
    const latestPdf = step25PdfFiles
      .map(filename => {
        const timestampMatch = filename.match(/simple-exam-(\d+)\.pdf/);
        return {
          filename,
          timestamp: timestampMatch ? parseInt(timestampMatch[1]) : 0
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp) // Sort by timestamp descending (newest first)
      .map(item => item.filename)[0]; // Get the filename of the newest
      
    const sourcePdfPath = path.join(step25OutputDir, latestPdf);
    
    console.log(`📄 Generated PDF found: ${sourcePdfPath}`);
    console.log(`📄 PDF size: ${(fs.statSync(sourcePdfPath).size / 1024).toFixed(1)}KB`);
    
    // Copy the PDF to backend/uploads for API access (preserve original name)
    const uploadsDir = path.join(__dirname, '../uploads');
    const destinationPdfPath = path.join(uploadsDir, latestPdf); // Use original name, not new timestamp
    
    // Ensure uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Copy the PDF
    fs.copyFileSync(sourcePdfPath, destinationPdfPath);
    console.log(`📋 PDF copied to: ${destinationPdfPath}`);
    
    const relativePdfPath = `backend/uploads/${latestPdf}`; // Use original name
    console.log(`📄 API PDF path: ${relativePdfPath}`);

    // Extract questions for API response (read from generated LaTeX)
    const latexFile = path.join(step25OutputDir, latestPdf.replace('.pdf', '.tex'));
    let questions = 'Generated questions with visual elements';
    let parsedQuestions = [];
    
    if (fs.existsSync(latexFile)) {
      try {
        const latexContent = fs.readFileSync(latexFile, 'utf8');
        console.log(`📄 Reading LaTeX content: ${latexContent.length} characters`);
        
        // Extract actual questions from LaTeX structure using universal system
        const extractedQuestions = AIController.extractQuestionsFromLatex(latexContent);
        
        if (extractedQuestions.length > 0) {
          questions = extractedQuestions.map(q => q.text).join('\n\n');
          
          // SEPARATE LOGIC FOR PDF vs INTERACTIVE
          console.log('🔧 Creating separate question lists for PDF and interactive display...');
          
          // 1. PDF Questions: Limited to requested number (for PDF generation)
          const pdfQuestions = AIController.distributePointsUniversally(extractedQuestions, parsedQuestionPoints, parseInt(numQuestions));
          
          // 2. Interactive Questions: ALL extracted questions (for interactive tutor)
          const interactiveQuestions = AIController.distributePointsForInteractive(extractedQuestions, parsedQuestionPoints);
          
          console.log(`📝 Extracted ${extractedQuestions.length} total questions`);
          console.log(`📄 PDF questions: ${pdfQuestions.length} (limited to requested ${numQuestions})`);
          console.log(`🎯 Interactive questions: ${interactiveQuestions.length} (all extracted questions)`);
          
          // Use PDF questions for the main parsedQuestions (maintains existing PDF functionality)
          parsedQuestions = pdfQuestions;
          
          // Store both for the response
          const responseData = {
            questions: questions,
            parsedQuestions: parsedQuestions, // For PDF generation (limited)
            interactiveQuestions: interactiveQuestions, // For interactive tutor (all questions)
            questionPoints: parsedQuestionPoints,
            subject: subject,
            difficulty: difficulty,
            pdfPath: relativePdfPath
          };
          
          console.log(`📊 PDF distribution:`, parsedQuestions.map(q => `Q${q.id}: ${q.points}pts`));
          console.log(`📊 Interactive distribution:`, interactiveQuestions.map(q => `Q${q.id}: ${q.points}pts`));
          console.log(`📊 PDF total: ${parsedQuestions.reduce((sum, q) => sum + q.points, 0)} points`);
          console.log(`📊 Interactive total: ${interactiveQuestions.reduce((sum, q) => sum + q.points, 0)} points`);
          
          console.log('=== STANDALONE SCRIPTS COMPLETED ===');
          console.log(`📊 Response data keys:`, Object.keys(responseData));
          console.log(`📄 PDF with visual elements: ${responseData.pdfPath}`);
          
          return res.json({
            success: true,
            data: responseData
          });
        } else {
          // Fallback: create generic response
          questions = `Generated ${numQuestions} practice exam questions with tables, diagrams, and code snippets`;
          parsedQuestions = Array.from({length: parseInt(numQuestions) || 5}, (_, index) => ({
            id: index + 1,
            question: `Practice Question ${index + 1}: Complex problem with multiple parts`,
            points: parsedQuestionPoints[index] || Math.round(100 / parseInt(numQuestions) || 5)
          }));
        }
        
        console.log(`📝 First question preview: ${questions.substring(0, 200)}...`);
      } catch (error) {
        console.error('❌ Error reading LaTeX file:', error);
        questions = `Generated ${numQuestions} questions with TikZ diagrams, tables, and code snippets from working standalone scripts`;
        parsedQuestions = Array.from({length: parseInt(numQuestions) || 5}, (_, index) => ({
          id: index + 1,
          question: `Generated Question ${index + 1}`,
          points: parsedQuestionPoints[index] || Math.round(100 / parseInt(numQuestions) || 5)
        }));
      }
    }

    // Don't re-parse questions since we already did it above
    const responseData = {
      questions: questions,
      parsedQuestions: parsedQuestions,
      questionPoints: parsedQuestionPoints,
      subject: subject,
      difficulty: difficulty,
      pdfPath: relativePdfPath
    };

    console.log('=== STANDALONE SCRIPTS COMPLETED ===');
    console.log(`📊 Response data keys:`, Object.keys(responseData));
    console.log(`📄 PDF with visual elements: ${responseData.pdfPath}`);

    res.json({
      success: true,
      data: responseData
    });
  }

  /**
   * Generate practice exam WITHOUT PDF using GeminiService  
   */
  static async generatePracticeExamWithoutPDF(req, res, parsedQuestionPoints) {
    const { subject, numQuestions, difficulty, generatePDF, instructions } = req.body;
    
    console.log(`🎯 Generating ${numQuestions} questions about ${subject}, difficulty: ${difficulty}`);
    
    // Use GeminiService to generate questions without PDF
    const result = await GeminiService.generatePracticeExam({
      subject: subject,
      numQuestions: parseInt(numQuestions) || 10,
      difficulty: difficulty || 'medium',
      instructions: instructions || '',
      pdfPath: null // Explicitly no PDF
    });

    console.log('✅ GeminiService generation completed');
    console.log(`📝 Generated text length: ${result.text ? result.text.length : 0}`);

    let pdfPath = null;

    // Generate PDF if requested
    if (generatePDF && result.text) {
      console.log('🔧 Generating PDF...');
      try {
        const PDFService = require('../services/pdf.service');
        const pdfBuffer = await PDFService.generateExamPDF(result.text, subject, {
          difficulty: difficulty,
          questionPoints: parsedQuestionPoints
        });

        // Save PDF to uploads directory
        const fs = require('fs');
        const path = require('path');
        const uploadsDir = path.join(__dirname, '../uploads');
        
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const timestamp = Date.now();
        const filename = `general-exam-${subject.replace(/\s+/g, '-')}-${timestamp}.pdf`;
        const fullPath = path.join(uploadsDir, filename);
        
        fs.writeFileSync(fullPath, pdfBuffer);
        pdfPath = `backend/uploads/${filename}`;
        
        console.log(`✅ PDF generated: ${pdfPath}`);
      } catch (pdfError) {
        console.error('❌ PDF generation failed:', pdfError);
        // Continue without PDF - don't fail the entire request
      }
    }

    const responseData = {
      questions: result.text,
      questionPoints: parsedQuestionPoints,
      subject: subject,
      difficulty: difficulty,
      pdfPath: pdfPath
    };

    console.log('=== GEMINI SERVICE COMPLETED ===');
    console.log(`📊 Response data keys:`, Object.keys(responseData));
    if (pdfPath) {
      console.log(`📄 PDF generated: ${responseData.pdfPath}`);
      } else {
      console.log(' No PDF generated (not requested or failed)');
    }

    res.json({
      success: true,
      data: responseData
    });
  }

  /**
   * Download generated PDF
   * @route GET /api/ai/download-pdf/:filename
   */
  static async downloadPDF(req, res) {
    try {
      const { filename } = req.params;
      const path = require('path');
      const fs = require('fs').promises;
      
      // Validate filename to prevent directory traversal
      if (!filename || filename.includes('..') || !filename.endsWith('.pdf')) {
        return res.status(400).json({ error: 'Invalid filename' });
      }
      
      const filePath = path.join(__dirname, '../uploads', filename);
      
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch (error) {
        return res.status(404).json({ error: 'PDF file not found' });
      }
      
      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      // Stream the file
      const fileBuffer = await fs.readFile(filePath);
      res.send(fileBuffer);
      
      // Clean up the file after a delay (optional)
      setTimeout(async () => {
        try {
          await PDFService.cleanupPDF(filePath);
        } catch (cleanupError) {
          // Ignore cleanup errors - file might already be deleted
          console.log('Note: PDF cleanup completed or file already removed');
        }
      }, 600000); // Delete after 10 minutes instead of 1 minute
      
    } catch (error) {
      console.error('PDF download error:', error);
      res.status(500).json({ error: 'Failed to download PDF' });
    }
  }

  /**
   * Extract detailed layout information from HTML
   */
  static extractDetailedLayoutInfo(htmlContent) {
    if (!htmlContent) return 'No layout information available';
    
    console.log('🔍 Analyzing HTML layout for detailed formatting info...');
    
    // Extract font size information
    const fontSizes = [...htmlContent.matchAll(/font-size:(\d+)px/g)].map(m => parseInt(m[1]));
    const uniqueFontSizes = [...new Set(fontSizes)].sort((a, b) => b - a);
    
    // Extract color information
    const colors = [...htmlContent.matchAll(/color:(#[0-9a-fA-F]{6})/g)].map(m => m[1]);
    const uniqueColors = [...new Set(colors)];
    
    // Extract font families
    const fontFamilies = [...htmlContent.matchAll(/font-family:([^;]+)/g)].map(m => m[1]);
    const uniqueFontFamilies = [...new Set(fontFamilies)];
    
    // Find specific formatting patterns
    const boldPatterns = htmlContent.match(/<b[^>]*>.*?<\/b>/g) || [];
    const positionedElements = htmlContent.match(/position:absolute;top:\d+px;left:\d+px/g) || [];
    
    // Extract key layout elements for reference
    const layoutElements = [];
    const lines = htmlContent.split('\n');
    
    for (const line of lines) {
      if (line.includes('CSCI-UA.0480') || 
          line.includes('Midterm Exam') || 
          line.includes('Total:') ||
          line.includes('Important Notes') ||
          line.includes('Problem 1') ||
          line.includes('Problem 2') ||
          line.includes('Problem 3') ||
          line.includes('Problem 4') ||
          line.includes('Honor code') ||
          line.includes('font-size:21px') ||
          line.includes('font-size:18px') ||
          line.includes('color:#ff0000')) {
        layoutElements.push(line.trim());
      }
    }
    
    const detailedInfo = `DETAILED LAYOUT ANALYSIS:

FONT SIZE HIERARCHY:
${uniqueFontSizes.map(size => `- ${size}px: ${size >= 21 ? 'Main headers' : size >= 18 ? 'Problem headers' : size >= 17 ? 'Body text' : 'Small text'}`).join('\n')}

COLOR SCHEME:
- Black body text (standard)
- Red warning text (for important notes)

FONT FAMILIES:
- Standard system fonts for academic documents

LAYOUT ELEMENTS FOUND:
${layoutElements.slice(0, 10).join('\n')}

FORMATTING REQUIREMENTS:
1. Use appropriate font sizes for headers and body text
2. Apply red color to warning text
3. Use bold formatting for headers
4. Maintain proper spacing and alignment
5. Include proper margins and page layout`;

    console.log('✅ Detailed layout analysis completed');
    console.log('📊 Font sizes found:', uniqueFontSizes);
    console.log('🎨 Colors found:', uniqueColors);
    console.log('📝 Layout elements extracted:', layoutElements.length);
    
    return detailedInfo;
  }

  static extractQuestionsFromLatex(latexContent) {
    const questions = [];
    
    try {
      console.log('🔍 Starting universal question extraction...');
      
      // Helper function to clean LaTeX commands and math notation
      const cleanLatexText = (text) => {
        return text
          .replace(/\\item\s*/g, '')
          .replace(/\\item\s*\[[a-z]\]\s*/g, '')
          .replace(/\\item\s*\[.*?\]\s*/g, '')
          .replace(/\$([^$]+)\$/g, (match, mathContent) => {
            return mathContent
              .replace(/\\log_(\d+)/g, 'log₍$1₎')
              .replace(/\\log_\{(\d+)\}/g, 'log₍$1₎')
              .replace(/\^(\d+)/g, '⁽$1⁾')
              .replace(/\^{([^}]+)}/g, '⁽$1⁾')
              .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
              .replace(/\\sum_\{([^}]+)\}\^([^\s]+)/g, 'Σ($1 to $2)')
              .replace(/\\mathbb\{([^}]+)\}/g, '$1')
              .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
              .replace(/\\sqrt/g, '√')
              .replace(/\\infty/g, '∞')
              .replace(/\\Theta/g, 'Θ')
              .replace(/\\Omega/g, 'Ω')
              .replace(/\\omega/g, 'ω')
              .replace(/\\ge/g, '≥')
              .replace(/\\le/g, '≤')
              .replace(/\\neq/g, '≠')
              .replace(/\\to/g, '→')
              .replace(/\\lim/g, 'lim')
              .replace(/\\log/g, 'log');
          })
          // PRESERVE IMPORTANT CONTENT - Don't remove code, tables, diagrams
          .replace(/\\begin\{verbatim\}([\s\S]*?)\\end\{verbatim\}/g, (match, content) => {
            return `\n[CODE SNIPPET]\n${content}\n[/CODE SNIPPET]\n`;
          })
          .replace(/\\begin\{tabular\}([\s\S]*?)\\end\{tabular\}/g, (match, content) => {
            return `\n[TABLE]\n${content}\n[/TABLE]\n`;
          })
          .replace(/\\begin\{tikzpicture\}([\s\S]*?)\\end\{tikzpicture\}/g, (match, content) => {
            return `\n[DIAGRAM]\n${content}\n[/DIAGRAM]\n`;
          })
          .replace(/\\begin\{lstlisting\}([\s\S]*?)\\end\{lstlisting\}/g, (match, content) => {
            return `\n[CODE SNIPPET]\n${content}\n[/CODE SNIPPET]\n`;
          })
          // Remove other LaTeX environments but preserve content
          .replace(/\\begin\{([^}]+)\}([\s\S]*?)\\end\{\1\}/g, '$2')
          .replace(/\\textbf\{([^}]+)\}/g, '$1')
          .replace(/\\emph\{([^}]+)\}/g, '$1')
          .replace(/\\section\*?\{([^}]+)\}/g, '$1')
          .replace(/\\subsection\*?\{([^}]+)\}/g, '$1')
          .replace(/\\[a-zA-Z]+\*?\{[^}]*\}/g, '')
          .replace(/\\[a-zA-Z]+\*/g, '')
          .replace(/\\[a-zA-Z]+/g, '')
          .replace(/\{([^}]*)\}/g, '$1')
          .replace(/\\\\/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      };

      // Universal extraction methods - try in order of sophistication
      
      // Method 1: Exam format with \section*{Problem X} and lettered sub-parts
      const examQuestions = this.extractExamFormat(latexContent, cleanLatexText);
      if (examQuestions.length > 0) {
        console.log(`✅ Extracted ${examQuestions.length} questions using exam format`);
        return examQuestions;
      }
      
      // Method 2: Homework format with nested enumerate - ENHANCED to create separate questions for sub-parts
      const homeworkQuestions = this.extractHomeworkFormat(latexContent, cleanLatexText);
      if (homeworkQuestions.length > 0) {
        console.log(`✅ Extracted ${homeworkQuestions.length} questions using homework format`);
        return homeworkQuestions;
      }
      
      // Method 3: Generic numbered format
      const numberedQuestions = this.extractNumberedFormat(latexContent, cleanLatexText);
      if (numberedQuestions.length > 0) {
        console.log(`✅ Extracted ${numberedQuestions.length} questions using numbered format`);
        return numberedQuestions;
      }
      
      // Method 4: Any \item commands found - ENHANCED to create separate questions for each sub-part
      const itemQuestions = this.extractItemFormat(latexContent, cleanLatexText);
      if (itemQuestions.length > 0) {
        console.log(`✅ Extracted ${itemQuestions.length} questions using item format (grouped sub-parts)`);
        return itemQuestions;
      }
      
      // Method 5: Line-by-line heuristic extraction
      const heuristicQuestions = this.extractHeuristicFormat(latexContent, cleanLatexText);
      if (heuristicQuestions.length > 0) {
        console.log(`✅ Extracted ${heuristicQuestions.length} questions using heuristic format`);
        return heuristicQuestions;
      }
      
      console.log('⚠️ No questions found with any extraction method');
      
    } catch (error) {
      console.error('❌ Error in universal extraction:', error);
    }
    
    return questions;
  }

  // Method 1: Exam format with \section*{Problem X} and lettered sub-parts
  static extractExamFormat(latexContent, cleanLatexText) {
    const questions = [];
    
    if (!latexContent.includes('\\section*{Problem') && !latexContent.includes('\\section{Problem')) {
      return questions; // Not exam format
    }
    
    console.log('📚 Trying exam format extraction...');
    
    const problemSections = latexContent.split(/\\section\*?\{Problem \d+\}/);
    
    for (let i = 1; i < problemSections.length; i++) {
      const problemContent = problemSections[i];
      const lines = problemContent.split('\n');
      let questionNumber = i;
      
      // STEP 1: Extract main question context (text before sub-parts)
      let mainQuestionContext = '';
      let foundFirstSubPart = false;
      
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex].trim();
        
        // Stop if we hit another section
        if (line.match(/^\\section/)) {
          break;
        }
        
        // Check if this is a sub-part
        const subPartMatch1 = line.match(/^([a-z])\.\s*\[(\d+)(?:\s*points?)?\]\s*(.*)/i); // a. [10] or a. [10 points]
        const subPartMatch2 = line.match(/^\(([a-z])\)\s*(.*)/); // (a) format
        const subPartMatch3 = line.match(/^\[([a-z])\.\]\s*(?:\[(\d+)(?:\s*points?)?\]\s*)?(.*)/i); // [a.] [10] optional
        const subPartMatch = subPartMatch1 || subPartMatch2 || subPartMatch3;
        
        if (subPartMatch) {
          foundFirstSubPart = true;
          break; // Stop collecting main context
              } else if (!foundFirstSubPart && line.length > 0) {
        // Collect main question context (include ALL lines, including LaTeX commands)
        if (mainQuestionContext.length > 0) {
          mainQuestionContext += ' ';
        }
        mainQuestionContext += line;
      }
      }
      
      console.log(`\n=== PROCESSING PROBLEM ${questionNumber} ===`);
      console.log(`Main context: ${mainQuestionContext.substring(0, 100)}...`);
      console.log(`Problem content lines: ${lines.length}`);
      
      // STEP 2: Extract sub-parts and combine with main context
      let currentSubPart = '';
      let subPartLetter = '';
      let subPartPoints = null;
      
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex].trim();
        
        // Stop if we hit another section
        if (line.match(/^\\section/)) {
          console.log(`Stopping at section: ${line}`);
          break;
        }
        
        // Look for lettered sub-parts - support both formats:
        // Format 1: "a. [10]" (original midterm format)
        // Format 2: "(a)" (hw2 format)
        const subPartMatch1 = line.match(/^([a-z])\.\s*\[(\d+)(?:\s*points?)?\]\s*(.*)/i); // a. [10] or a. [10 points]
        const subPartMatch2 = line.match(/^\(([a-z])\)\s*(.*)/); // (a) format
        const subPartMatch3 = line.match(/^\[([a-z])\.\]\s*(?:\[(\d+)(?:\s*points?)?\]\s*)?(.*)/i); // [a.] [10] optional
        
        const subPartMatch = subPartMatch1 || subPartMatch2 || subPartMatch3;
        
        if (subPartMatch) {
          // Save the previous sub-part if we have one
          if (currentSubPart.trim() && subPartLetter) {
            const cleanSubPartText = cleanLatexText(currentSubPart);
            if (cleanSubPartText.length > 10) {
              // COMBINE main context with sub-part (Option 1)
              const cleanMainContext = cleanLatexText(mainQuestionContext);
              const fullQuestionText = cleanMainContext + 
                (cleanMainContext.length > 0 ? '\n\n' : '') + 
                `(${subPartLetter}) ${cleanSubPartText}`;
              
              questions.push({
                text: `Q${questionNumber}${subPartLetter}) ${fullQuestionText}`,
                points: subPartPoints
              });
              console.log(`    → Added Q${questionNumber}${subPartLetter} with full context: ${fullQuestionText.substring(0, 80)}...`);
            }
          }
          
          // Start new sub-part
          if (subPartMatch1) {
            // Format 1: a. [10]
            subPartLetter = subPartMatch1[1];
            subPartPoints = parseInt(subPartMatch1[2]);
            currentSubPart = subPartMatch1[3];
          } else if (subPartMatch2) {
            // Format 2: (a)
            subPartLetter = subPartMatch2[1];
            subPartPoints = null; // No explicit points in this format
            currentSubPart = subPartMatch2[2];
          } else if (subPartMatch3) {
            // Format 3: [a.] [10]
            subPartLetter = subPartMatch3[1];
            subPartPoints = subPartMatch3[2] ? parseInt(subPartMatch3[2]) : null;
            currentSubPart = subPartMatch3[3];
          }
          console.log(`  Found sub-part (${subPartLetter}): ${currentSubPart.substring(0, 50)}...`);
              } else if (subPartLetter && line.length > 0) {
        // Include ALL lines, including LaTeX commands
        currentSubPart += ' ' + line;
      } else if (!subPartLetter && line.length > 0) {
        // Include ALL lines, including LaTeX commands
        if (lineIndex === 0 || currentSubPart.length === 0) {
          currentSubPart += line;
        } else {
          currentSubPart += ' ' + line;
        }
      }
      }
      
      // Save the last sub-part
      if (currentSubPart.trim() && subPartLetter) {
        const cleanSubPartText = cleanLatexText(currentSubPart);
        if (cleanSubPartText.length > 10) {
          // COMBINE main context with sub-part (Option 1)
          const cleanMainContext = cleanLatexText(mainQuestionContext);
          const fullQuestionText = cleanMainContext + 
            (cleanMainContext.length > 0 ? '\n\n' : '') + 
            `(${subPartLetter}) ${cleanSubPartText}`;
          
          questions.push({
            text: `Q${questionNumber}${subPartLetter}) ${fullQuestionText}`,
            points: subPartPoints
          });
          console.log(`    → Added Q${questionNumber}${subPartLetter} with full context: ${fullQuestionText.substring(0, 80)}...`);
        }
      } else if (currentSubPart.trim() && !subPartLetter) {
        // Single question without sub-parts
        const cleanText = cleanLatexText(currentSubPart);
        if (cleanText.length > 20) {
          questions.push({
            text: `Q${questionNumber}) ${cleanText}`,
            points: null
          });
          console.log(`    → Added Q${questionNumber}: ${cleanText.substring(0, 50)}...`);
        }
      }
    }
    
    return questions;
  }

  // Method 2: Homework format with nested enumerate - ENHANCED to create separate questions for sub-parts
  static extractHomeworkFormat(latexContent, cleanLatexText) {
    const questions = [];
    
    if (!latexContent.includes('\\begin{enumerate}')) {
      return questions; // No enumerate found
    }
    
    console.log('📝 Trying homework format extraction...');
    
    // Find the main enumerate environment
    const beginIndex = latexContent.indexOf('\\begin{enumerate}');
    if (beginIndex === -1) return questions;
    
    // Find matching end by counting nested levels
    let currentPos = beginIndex + '\\begin{enumerate}'.length;
    let level = 1;
    let endIndex = -1;
    
    while (currentPos < latexContent.length && level > 0) {
      const beginMatch = latexContent.indexOf('\\begin{enumerate}', currentPos);
      const endMatch = latexContent.indexOf('\\end{enumerate}', currentPos);
      
      if (endMatch === -1) break;
      
      if (beginMatch !== -1 && beginMatch < endMatch) {
        level++;
        currentPos = beginMatch + '\\begin{enumerate}'.length;
      } else {
        level--;
        if (level === 0) {
          endIndex = endMatch;
          break;
        }
        currentPos = endMatch + '\\end{enumerate}'.length;
      }
    }
    
    if (endIndex === -1) return questions;
    
    const startContent = beginIndex + '\\begin{enumerate}'.length;
    const mainEnumerateContent = latexContent.substring(startContent, endIndex);
    
    const mainItems = this.extractMainItems(mainEnumerateContent);
    let questionNumber = 1;
    
    mainItems.forEach(mainItem => {
      const nestedEnumerateMatch = mainItem.match(/\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/);
      
      if (nestedEnumerateMatch) {
        // Has sub-parts - CREATE SEPARATE QUESTIONS for each sub-part
        const mainQuestionContext = mainItem.replace(/\\begin\{enumerate\}[\s\S]*?\\end\{enumerate\}/, '').trim();
        const cleanMainContext = cleanLatexText(mainQuestionContext);
        
        console.log(`📖 Found main context for Q${questionNumber}: ${cleanMainContext.substring(0, 80)}...`);
        
        const nestedContent = nestedEnumerateMatch[1];
        const subItems = nestedContent.match(/\\item\s*(.*?)(?=\\item|$)/gs) || [];
        
        subItems.forEach((subItem, subIndex) => {
          const cleanSubItemText = cleanLatexText(subItem);
          if (cleanSubItemText.length > 5) {
            const subPart = String.fromCharCode(97 + subIndex); // a, b, c, etc.
            
            // COMBINE main context with sub-part (Option 1)
            const fullQuestionText = cleanMainContext + 
              (cleanMainContext.length > 0 ? '\n\n' : '') + 
              `(${subPart}) ${cleanSubItemText}`;
            
            questions.push({
              text: `Q${questionNumber}${subPart}) ${fullQuestionText}`,
              points: null
            });
            
            console.log(`📝 Added separate question Q${questionNumber}${subPart} with full context: ${fullQuestionText.substring(0, 80)}...`);
          }
        });
        
        questionNumber++;
      } else {
        // Single question without sub-parts
        const cleanText = cleanLatexText(mainItem);
        if (cleanText.length > 20) {
          questions.push({
            text: `Q${questionNumber}) ${cleanText}`,
            points: null
          });
          console.log(`📝 Added standalone question Q${questionNumber}: ${cleanText.substring(0, 50)}...`);
          questionNumber++;
        }
      }
    });
    
    return questions;
  }

  // Method 3: Generic numbered format (1., 2., 3., etc.)
  static extractNumberedFormat(latexContent, cleanLatexText) {
    const questions = [];
    
    console.log('🔢 Trying numbered format extraction...');
    
    const lines = latexContent.split('\n');
    let currentQuestion = '';
    let questionNumber = 0;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Look for numbered items like "1.", "2.", etc.
      const numberMatch = trimmedLine.match(/^(\d+)\.\s*(.*)/);
      
      if (numberMatch) {
        // Save previous question
        if (currentQuestion.trim() && questionNumber > 0) {
          const cleanText = cleanLatexText(currentQuestion);
          if (cleanText.length > 20) {
            questions.push({
              text: `Q${questionNumber}) ${cleanText}`,
              points: null
            });
          }
        }
        
        // Start new question
        questionNumber = parseInt(numberMatch[1]);
        currentQuestion = numberMatch[2];
      } else if (questionNumber > 0 && trimmedLine.length > 0) {
        currentQuestion += ' ' + trimmedLine;
      }
    }
    
    // Save last question
    if (currentQuestion.trim() && questionNumber > 0) {
      const cleanText = cleanLatexText(currentQuestion);
      if (cleanText.length > 20) {
        questions.push({
          text: `Q${questionNumber}) ${cleanText}`,
          points: null
        });
      }
    }
    
    return questions;
  }

  // Method 4: Any \item commands found - ENHANCED to create separate questions for each sub-part
  static extractItemFormat(latexContent, cleanLatexText) {
    const questions = [];
    
    console.log('📋 Trying item format extraction...');
    
    const itemMatches = latexContent.match(/\\item[^\\]*(?:\\[^i][^t][^e][^m][^\\]*)*(?=\\item|\\end|$)/gs);
    
    if (itemMatches) {
      console.log(`📋 Found ${itemMatches.length} \\item commands`);
      
      let mainQuestionContext = ''; // Store the main question context
      let mainQuestionNumber = 0;
      
      for (let i = 0; i < itemMatches.length; i++) {
        const item = itemMatches[i];
        const cleanText = cleanLatexText(item);
        
        // Skip honor code and other non-questions
        if (cleanText.length <= 10 || cleanText.toLowerCase().includes('honor code')) {
          continue;
        }
        
        // Check if this is a sub-part (starts with [(a)], [(b)], [(c)], etc.)
        const subPartMatch = cleanText.match(/^\[\(([a-z])\)\]\s*(.*)/);
        
        if (subPartMatch) {
          // This is a sub-part - create a SEPARATE question with full context
          const subPartLetter = subPartMatch[1];
          const subPartText = subPartMatch[2];
          
          console.log(`🔍 Found sub-part (${subPartLetter}): ${subPartText.substring(0, 50)}...`);
          
          // If this is the first sub-part (a), look for main context and increment question number
          if (subPartLetter === 'a') {
            // Look for main question context from previous item(s)
            if (i > 0) {
              const previousItem = itemMatches[i - 1];
              const previousCleanText = cleanLatexText(previousItem);
              
              // Check if previous item is NOT a sub-part and looks like main context
              const isPreviousSubPart = previousCleanText.match(/^\[\(([a-z])\)\]/);
              if (!isPreviousSubPart && previousCleanText.length > 20) {
                mainQuestionContext = previousCleanText;
                console.log(`📖 Found main context: ${mainQuestionContext.substring(0, 80)}...`);
              }
            }
            mainQuestionNumber++;
          }
          
          // CREATE SEPARATE QUESTION with full context (Option 1)
          const fullQuestionText = mainQuestionContext + 
            (mainQuestionContext.length > 0 ? '\n\n' : '') + 
            `(${subPartLetter}) ${subPartText}`;
          
          questions.push({
            text: `Q${mainQuestionNumber}${subPartLetter}) ${fullQuestionText}`,
            points: null
          });
          
          console.log(`📝 Added separate question Q${mainQuestionNumber}${subPartLetter} with full context: ${fullQuestionText.substring(0, 80)}...`);
          
        } else {
          // This is a potential standalone question or main context
          
          // Check if this looks like main context for upcoming sub-parts
          const nextItem = i < itemMatches.length - 1 ? itemMatches[i + 1] : null;
          if (nextItem) {
            const nextCleanText = cleanLatexText(nextItem);
            const isNextSubPart = nextCleanText.match(/^\[\(([a-z])\)\]/);
            
            if (isNextSubPart) {
              // This is main context for upcoming sub-parts, don't add as standalone
              // The context will be picked up when we process the first sub-part
              console.log(`📖 Identified as main context for upcoming sub-parts: ${cleanText.substring(0, 80)}...`);
              continue;
            }
          }
          
          // Add as standalone question
          mainQuestionNumber++;
          questions.push({
            text: `Q${mainQuestionNumber}) ${cleanText}`,
            points: null
          });
          console.log(`📝 Added standalone question Q${mainQuestionNumber}: ${cleanText.substring(0, 50)}...`);
        }
      }
      
      console.log(`✅ Item format extraction complete: ${questions.length} separate questions (each sub-part is its own question with full context)`);
      return questions;
    }
    
    return questions;
  }

  // Method 5: Heuristic line-by-line extraction
  static extractHeuristicFormat(latexContent, cleanLatexText) {
    const questions = [];
    
    console.log('🔍 Trying heuristic format extraction...');
    
    const lines = latexContent.split('\n');
    let currentQuestion = '';
    let questionCount = 0;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines and LaTeX commands
      if (!trimmedLine || trimmedLine.startsWith('\\') || trimmedLine.startsWith('%')) {
        continue;
      }
      
      // Look for question-like patterns
      if (trimmedLine.match(/^[a-z]\)|^[a-z]\./i) || 
          trimmedLine.match(/question|problem|what|how|why|explain|describe|calculate|find|solve/i)) {
        
        // Save previous question
        if (currentQuestion.trim()) {
          const cleanText = cleanLatexText(currentQuestion);
          if (cleanText.length > 30) {
            questionCount++;
            questions.push({
              text: `Q${questionCount}) ${cleanText}`,
              points: null
            });
          }
        }
        
        // Start new question
        currentQuestion = trimmedLine;
      } else if (currentQuestion && trimmedLine.length > 0) {
        currentQuestion += ' ' + trimmedLine;
      }
    }
    
    // Save last question
    if (currentQuestion.trim()) {
      const cleanText = cleanLatexText(currentQuestion);
      if (cleanText.length > 30) {
        questionCount++;
        questions.push({
          text: `Q${questionCount}) ${cleanText}`,
          points: null
        });
      }
    }
    
    return questions;
  }

  // Helper method to extract main items from enumerate (avoiding nested items)
  static extractMainItems(enumerateContent) {
    const items = [];
    
    console.log('🔧 Processing enumerate content with', enumerateContent.length, 'characters');
    
    let currentPos = 0;
    let nestedLevel = 0;
    let currentItem = '';
    let itemizeBulletLevel = 0; // Track itemize environments (bullet points)
    
    const lines = enumerateContent.split('\n');
    let isInMainItem = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Track nested enumerate levels
      if (trimmedLine.includes('\\begin{enumerate}')) {
        nestedLevel++;
        console.log(`🔍 Nested enumerate start, level: ${nestedLevel}`);
      }
      if (trimmedLine.includes('\\end{enumerate}')) {
        nestedLevel--;
        console.log(`🔍 Nested enumerate end, level: ${nestedLevel}`);
      }
      
      // Track itemize levels (bullet points) - these should NOT be counted as separate questions
      if (trimmedLine.includes('\\begin{itemize}')) {
        itemizeBulletLevel++;
        console.log(`🔍 Itemize (bullet) start, level: ${itemizeBulletLevel}`);
      }
      if (trimmedLine.includes('\\end{itemize}')) {
        itemizeBulletLevel--;
        console.log(`🔍 Itemize (bullet) end, level: ${itemizeBulletLevel}`);
      }
      
      // Look for main-level \item (when nested level is 0 AND not inside itemize)
      if (nestedLevel === 0 && itemizeBulletLevel === 0 && trimmedLine.match(/^\\item\s/)) {
        console.log(`📌 Found main item at line ${i}: ${trimmedLine.substring(0, 60)}`);
        
        // Save the previous item if we have one
        if (isInMainItem && currentItem.trim()) {
          console.log(`💾 Saving previous item (${currentItem.length} chars)`);
          items.push(currentItem.trim());
        }
        
        // Start collecting new item
        currentItem = line;
        isInMainItem = true;
      } else if (isInMainItem) {
        // Continue collecting current item (including bullet points as part of the question)
        currentItem += '\n' + line;
        
        // Special log for itemize items that are being included in the main question
        if (itemizeBulletLevel > 0 && trimmedLine.match(/^\\item\s/)) {
          console.log(`  🔹 Including bullet point in main question: ${trimmedLine.substring(0, 50)}`);
        }
      }
    }
    
    // Don't forget the last item
    if (isInMainItem && currentItem.trim()) {
      console.log(`💾 Saving final item (${currentItem.length} chars)`);
      items.push(currentItem.trim());
    }
    
    console.log(`✅ Extracted ${items.length} main items total`);
    return items;
  }

  static distributePointsUniversally(extractedQuestions, frontendPointDistribution, requestedNumQuestions) {
    console.log('📊 Starting universal point distribution...');
    console.log(`   Extracted: ${extractedQuestions.length} questions`);
    console.log(`   Requested: ${requestedNumQuestions} questions (for PDF generation)`);
    console.log(`   Frontend points: [${frontendPointDistribution.join(', ')}]`);
    
    const distributedQuestions = [];
    
    // IMPORTANT: Respect the user's requested number of questions
    const questionsToUse = Math.min(extractedQuestions.length, requestedNumQuestions);
    const selectedQuestions = extractedQuestions.slice(0, questionsToUse);
    
    console.log(`📋 Using ${questionsToUse} questions out of ${extractedQuestions.length} extracted (user requested ${requestedNumQuestions})`);
    console.log(`📋 Selected questions array length: ${selectedQuestions.length}`);
    console.log(`📋 First selected question: ${selectedQuestions[0]?.text?.substring(0, 60)}...`);
    
    // Strategy 1: Use explicit LaTeX points if available
    const hasExplicitPoints = selectedQuestions.some(q => q.points !== null && q.points > 0);
    
    if (hasExplicitPoints) {
      console.log('📋 Using explicit points from LaTeX for selected questions');
      
      // Use only the selected questions, not all extracted
      for (let i = 0; i < selectedQuestions.length; i++) {
        const question = selectedQuestions[i];
        distributedQuestions.push({
          id: i + 1,
          question: question.text,
          points: question.points > 0 ? question.points : (frontendPointDistribution[i % frontendPointDistribution.length] || 10)
        });
      }
    }
    
    // Strategy 2: Use frontend distribution if provided
    else if (frontendPointDistribution.length > 0) {
      console.log('📋 Using frontend point distribution for SELECTED questions only');
      console.log(`📋 Will process ${selectedQuestions.length} questions (not all ${extractedQuestions.length})`);
      
      // Use only the selected questions, cycling through frontend point distribution
      for (let i = 0; i < selectedQuestions.length; i++) {
        const question = selectedQuestions[i];
        distributedQuestions.push({
          id: i + 1,
          question: question.text,
          points: frontendPointDistribution[i % frontendPointDistribution.length] || Math.round(100 / requestedNumQuestions)
        });
        console.log(`📋 Added question ${i + 1}: ${question.text.substring(0, 40)}... (${distributedQuestions[i].points} pts)`);
      }
    }
    
    // Strategy 3: Auto-distribute based on question complexity for selected questions
    else {
      console.log('📋 Using intelligent auto-distribution for selected questions');
      
      const questionsByComplexity = selectedQuestions.map((q, idx) => ({
        index: idx,
        text: q.text,
        complexity: this.assessQuestionComplexity(q.text),
        isSubPart: q.text.match(/Q\d+[a-z]\)/) ? true : false
      }));
      
      // Calculate point weights based on complexity
      const totalComplexity = questionsByComplexity.reduce((sum, q) => sum + q.complexity, 0);
      const basePointValue = Math.round(100 / selectedQuestions.length); // Distribute based on selected questions
      
      for (let i = 0; i < selectedQuestions.length; i++) {
        const question = selectedQuestions[i];
        const complexityInfo = questionsByComplexity[i];
        
        let points;
        if (totalComplexity > 0) {
          // Weight by complexity but keep reasonable values
          points = Math.max(basePointValue, Math.round((complexityInfo.complexity / totalComplexity) * 100));
        } else {
          // Equal distribution
          points = basePointValue;
        }
        
        // Minimum point values based on question type
        points = Math.max(points, complexityInfo.isSubPart ? 3 : 5);
        
        distributedQuestions.push({
          id: i + 1,
          question: question.text,
          points: points
        });
      }
    }
    
    const finalTotal = distributedQuestions.reduce((sum, q) => sum + q.points, 0);
    console.log(`✅ Point distribution complete: ${distributedQuestions.length} questions, ${finalTotal} total points`);
    console.log(`🎯 Frontend will show exactly ${distributedQuestions.length} questions as requested`);
    console.log(`🎯 Questions summary: ${distributedQuestions.map(q => `Q${q.id}(${q.points}pts)`).join(', ')}`);
    
    return distributedQuestions;
  }

  // NEW METHOD: Distribute points for interactive tutor (ALL questions, not limited)
  static distributePointsForInteractive(extractedQuestions, frontendPointDistribution) {
    console.log('🎯 Starting interactive point distribution...');
    console.log(`   Extracted: ${extractedQuestions.length} questions`);
    console.log(`   Will show ALL questions in interactive tutor`);
    
    const distributedQuestions = [];
    
    // Use ALL extracted questions for interactive display
    const allQuestions = extractedQuestions;
    
    console.log(`📋 Using ALL ${allQuestions.length} questions for interactive display`);
    
    // Strategy 1: Use explicit LaTeX points if available
    const hasExplicitPoints = allQuestions.some(q => q.points !== null && q.points > 0);
    
    if (hasExplicitPoints) {
      console.log('📋 Using explicit points from LaTeX for ALL questions');
      
      for (let i = 0; i < allQuestions.length; i++) {
        const question = allQuestions[i];
        distributedQuestions.push({
          id: i + 1,
          question: question.text,
          points: question.points > 0 ? question.points : (frontendPointDistribution[i % frontendPointDistribution.length] || 10)
        });
      }
    }
    
    // Strategy 2: Distribute points intelligently across ALL questions
    else {
      console.log('📋 Using intelligent distribution for ALL questions');
      
      // Calculate base points per question
      const basePointValue = Math.max(5, Math.round(100 / allQuestions.length));
      
      for (let i = 0; i < allQuestions.length; i++) {
        const question = allQuestions[i];
        
        // Assign points based on question complexity and type
        let points = basePointValue;
        
        // Adjust points based on question type
        if (question.text.match(/Q\d+[a-z]\)/)) {
          // Sub-part questions get slightly lower points
          points = Math.max(3, Math.round(basePointValue * 0.8));
        } else if (question.text.match(/prove|derive|analyze|explain why|justify/i)) {
          // Complex questions get higher points
          points = Math.max(basePointValue, Math.round(basePointValue * 1.5));
        }
        
        // Use frontend distribution if available
        if (frontendPointDistribution.length > 0) {
          points = frontendPointDistribution[i % frontendPointDistribution.length] || points;
        }
        
        distributedQuestions.push({
          id: i + 1,
          question: question.text,
          points: points
        });
      }
    }
    
    const finalTotal = distributedQuestions.reduce((sum, q) => sum + q.points, 0);
    console.log(`✅ Interactive distribution complete: ${distributedQuestions.length} questions, ${finalTotal} total points`);
    console.log(`🎯 Interactive tutor will show ALL ${distributedQuestions.length} questions`);
    
    return distributedQuestions;
  }

  // Assess question complexity for intelligent point distribution
  static assessQuestionComplexity(questionText) {
    let complexity = 1; // Base complexity
    
    // Length factor
    if (questionText.length > 200) complexity += 2;
    else if (questionText.length > 100) complexity += 1;
    
    // Math/formula complexity
    const mathIndicators = questionText.match(/[Θθ∞≥≤→∑√⁽⁾₍₎]/g);
    if (mathIndicators) complexity += Math.min(mathIndicators.length * 0.5, 3);
    
    // Code/technical complexity
    const codeIndicators = questionText.match(/algorithm|function|code|implement|complexity|runtime|proof|theorem/gi);
    if (codeIndicators) complexity += Math.min(codeIndicators.length * 0.8, 4);
    
    // Multi-part indicators
    const multiPartIndicators = questionText.match(/\b(a\)|b\)|c\)|d\)|part|section|step)\b/gi);
    if (multiPartIndicators) complexity += Math.min(multiPartIndicators.length * 0.3, 2);
    
    // Question type complexity
    if (questionText.match(/prove|derive|analyze|explain why|justify/i)) complexity += 3;
    else if (questionText.match(/calculate|compute|find|solve/i)) complexity += 2;
    else if (questionText.match(/list|identify|name|select/i)) complexity += 1;
    
    return Math.round(complexity);
  }
}

module.exports = AIController;