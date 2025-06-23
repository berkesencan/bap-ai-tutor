const { handleError } = require('../middleware/error.middleware');
const GeminiService = require('../services/gemini.service');
const aiService = require('../services/ai.service');
const admin = require('firebase-admin');
const db = admin.firestore();

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
}

module.exports = AIController; 