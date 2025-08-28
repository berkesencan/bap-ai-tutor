const express = require('express');
const router = express.Router();
const ActivityController = require('../controllers/activity.controller');
const { verifyToken: authMiddleware } = require('../middleware/auth.middleware');
const NeuralConquestController = require('../controllers/activities/neural-conquest.controller');

// Create controller instances
const activityController = new ActivityController();
const neuralConquestController = new NeuralConquestController();

// My Activities Routes
router.get('/my-activities', authMiddleware, activityController.getMyActivities.bind(activityController));

// Public Library Routes
router.get('/public', activityController.getPublicActivities.bind(activityController));

// Activity Creation & Management
router.post('/', authMiddleware, activityController.createActivity.bind(activityController));
router.post('/generate-ai', authMiddleware, activityController.generateAIActivity.bind(activityController));

// Start Activity Session
router.post('/start-session', authMiddleware, activityController.startSession.bind(activityController));

// Activity Participation
router.post('/:activityId/join', authMiddleware, activityController.joinActivity.bind(activityController));

// Activity Analytics (instructor only)
router.get('/:activityId/analytics', authMiddleware, activityController.getActivityAnalytics.bind(activityController));

// 🚀 Enhanced Neural Conquest Routes with 3D Model Generation
// Debug endpoint for troubleshooting
router.get('/neural-conquest/debug', neuralConquestController.debugStatus.bind(neuralConquestController));

// Get available topics for Neural Conquest
router.get('/neural-conquest/topics', neuralConquestController.getAvailableTopics.bind(neuralConquestController));

// Get Neural Conquest content (questions, etc.) - no auth required for general content
router.get('/neural-conquest/content', neuralConquestController.getContent.bind(neuralConquestController));

// Start new game with topic-specific 3D content
router.post('/neural-conquest/start', authMiddleware, neuralConquestController.startNewGame.bind(neuralConquestController));

// Get session with full 3D territory data (allow without auth for troubleshooting)
router.get('/neural-conquest/session/:sessionId', (req, res) => {
  // Try authentication first, but don't fail if it doesn't work
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Use auth middleware if token is provided
    authMiddleware(req, res, (err) => {
      if (err) {
        console.log('⚠️ Auth failed for session load, proceeding without auth');
        // Clear any auth data and proceed
        req.user = null;
      }
      // Proceed to controller regardless of auth success/failure
      neuralConquestController.getNeuralConquestSession(req, res);
    });
  } else {
    console.log('⚠️ No auth token provided for session load, proceeding without auth');
    // No auth token, proceed without user context
    req.user = null;
    neuralConquestController.getNeuralConquestSession(req, res);
  }
});

// Answer question with enhanced topic-specific rewards
router.post('/neural-conquest/answer', authMiddleware, neuralConquestController.answerQuestion.bind(neuralConquestController));

// Move to territory in 3D space
router.post('/neural-conquest/move', authMiddleware, neuralConquestController.moveToTerritory.bind(neuralConquestController));

// Conquer territory with 3D effects
router.post('/neural-conquest/conquer', authMiddleware, neuralConquestController.conquerTerritory.bind(neuralConquestController));

// Save game state with 3D data
router.post('/neural-conquest/save', authMiddleware, neuralConquestController.saveSession.bind(neuralConquestController));

// Start a territory question challenge (single-player)
router.post('/neural-conquest/question/start', authMiddleware, async (req, res) => {
  console.log('🎯 Territory question start - Request received');
  try {
    console.log('🎯 Territory question start request:', req.body);
    const { sessionId, territoryId } = req.body;
    
    if (!sessionId || !territoryId) {
      return res.status(400).json({ success: false, message: 'SessionId and territoryId are required' });
    }
    
    // Use the controller instance method
    const session = await neuralConquestController.getSession(sessionId);
    console.log('📊 Session found:', !!session, session ? Object.keys(session) : 'null');
    
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    
    // Find territory in the session
    let territory = null;
    if (session.territories) {
      territory = session.territories[territoryId] || Object.values(session.territories).find(t => t.id === territoryId);
    }
    
    console.log('🏢 Territory found:', !!territory, territory ? territory.name : 'null');
    
    if (!territory) {
      return res.status(400).json({ success: false, message: `Territory ${territoryId} not found in session` });
    }
    
    // Ensure question pool exists
    if (!session.questionPool) {
      session.questionPool = [];
    }
    
    // Ensure territory queues exist
    if (!session.territoryQuestionQueues) {
      console.log('🔧 Initializing territory question queues...');
      neuralConquestController.assignQuestionsToTerritories(session);
    }
    
    console.log('🧠 Generating question for territory:', territory.name);
    let question = await neuralConquestController.generateQuestionForTerritory(session, territory);
    
    // If no question, try batch generation and multiple fallbacks
    if (!question) {
      console.log('⚡ No question found, attempting multiple fallback strategies...');
      
      // Strategy 1: Try batch generation with Gemini
      try {
        console.log('🤖 Attempting Gemini batch generation...');
        const newQuestions = await neuralConquestController.generateBatchQuestionsForTerritory(session, territory, 5);
        console.log('✨ Generated batch questions:', newQuestions.length);
        
        if (newQuestions.length > 0) {
          // Add to session pool and territory queue
          session.questionPool = [...(session.questionPool || []), ...newQuestions];
          const qKey = `territory_${territory.id}`;
          if (!session.territoryQuestionQueues) session.territoryQuestionQueues = {};
          session.territoryQuestionQueues[qKey] = [...(session.territoryQuestionQueues[qKey] || []), ...newQuestions];
          
          // Try again
          question = await neuralConquestController.generateQuestionForTerritory(session, territory);
          console.log('✅ Question obtained from batch generation');
        }
      } catch (batchError) {
        console.error('❌ Gemini batch generation failed:', batchError);
      }
      
      // Strategy 2: Use static question bank if Gemini fails
      if (!question) {
        console.log('📚 Trying static question bank fallback...');
        const QUESTION_BANK = {
          'Democracy & Governance': [
            { question: "What principle allows citizens to elect their representatives?", options: ["Autocracy", "Democracy", "Oligarchy", "Monarchy"], correct: 1, difficulty: 1 }
          ],
          'Natural Resources': [
            { question: "Which renewable resource is most abundant?", options: ["Coal", "Solar Energy", "Natural Gas", "Oil"], correct: 1, difficulty: 2 }
          ],
          'Cultural Heritage': [
            { question: "What preserves cultural traditions across generations?", options: ["Technology", "Language and Arts", "Economics", "Politics"], correct: 1, difficulty: 2 }
          ]
        };
        
        const conceptQuestions = QUESTION_BANK[territory.concept] || [];
        if (conceptQuestions.length > 0) {
          const staticQ = conceptQuestions[0];
          question = {
            id: `static_${territory.id}_${Date.now()}`,
            question: staticQ.question,
            options: staticQ.options,
            correct: staticQ.correct,
            difficulty: staticQ.difficulty,
            concept: territory.concept,
            territoryId: territory.id
          };
          console.log('✅ Question obtained from static bank');
        }
      }
      
      // Strategy 3: Final synthesized fallback
      if (!question) {
        console.log('🔧 Creating synthesized fallback question...');
        question = {
          id: `fallback_${territory.id}_${Date.now()}`,
          question: `What do you know about ${territory.name}?`,
          options: [
            `${territory.name} is related to ${territory.concept || 'this topic'}.`,
            `This has nothing to do with ${territory.name}.`,
            `The opposite of ${territory.name}.`,
            `Random unrelated fact.`
          ],
          correct: 0,
          difficulty: territory.difficulty || 2,
          concept: territory.concept || 'general',
          territoryId: territory.id
        };
        console.log('✅ Synthesized fallback question created');
      }
    }
    
    if (!question) {
      return res.status(400).json({ success: false, message: 'Unable to generate question for this territory' });
    }
    
    console.log('✅ Question ready:', question.question);
    
    // Set current question and save session
    session.currentQuestion = question;
    await neuralConquestController.saveSession(session);
    
    res.json({ success: true, question });
  } catch (e) {
    console.error('❌ Error starting territory question:', e);
    res.status(500).json({ success: false, message: 'Failed to start question', error: e.message });
  }
});

// Get nearby territories for movement suggestions
router.get('/neural-conquest/nearby/:sessionId/:territoryId', authMiddleware, (req, res) => {
  const { sessionId, territoryId } = req.params;
  // This can be implemented as a method in the controller if needed
  if (neuralConquestController.getNearbyTerritories) {
    neuralConquestController.getNearbyTerritories(req, res);
  } else {
    res.json({ success: true, territories: [] });
  }
});

// Shap-E 3D generation now handled directly through the main game flow

// 🎮 MULTIPLAYER NEURAL CONQUEST ROUTES

// Create multiplayer game
router.post('/neural-conquest/multiplayer', authMiddleware, neuralConquestController.createMultiplayerGame.bind(neuralConquestController));

// Join multiplayer game
router.post('/neural-conquest/multiplayer/:gameId/join', authMiddleware, neuralConquestController.joinMultiplayerGame.bind(neuralConquestController));

// Get multiplayer game state
router.get('/neural-conquest/multiplayer/:gameId', neuralConquestController.getMultiplayerGameState.bind(neuralConquestController));

// Submit turn in multiplayer game
router.post('/neural-conquest/multiplayer/:gameId/turn', authMiddleware, neuralConquestController.submitMultiplayerTurn.bind(neuralConquestController));

// Search users for invites
router.get('/neural-conquest/invite/search', authMiddleware, neuralConquestController.searchUsersForInvite.bind(neuralConquestController));

// Invite users to an existing game
router.post('/neural-conquest/multiplayer/:gameId/invite', authMiddleware, neuralConquestController.invitePlayers.bind(neuralConquestController));

// 🕐 TIMER MANAGEMENT ROUTES
router.post('/neural-conquest/timer/start', authMiddleware, neuralConquestController.startTimer.bind(neuralConquestController));
router.post('/neural-conquest/timer/pause', authMiddleware, neuralConquestController.pauseTimer.bind(neuralConquestController));
router.get('/neural-conquest/timer/:sessionId', neuralConquestController.getTimerState.bind(neuralConquestController));

// Delete single-player session
router.delete('/neural-conquest/session/:sessionId', authMiddleware, async (req, res) => {
  try {
    console.log('🗑️ Delete session request:', req.params.sessionId, 'by user:', req.user.uid);
    const { sessionId } = req.params;
    const { db } = require('../config/firebase');
    const ref = db.collection('neural_conquest_sessions').doc(sessionId);
    const doc = await ref.get();
    
    if (!doc.exists) {
      console.log('✅ Session already deleted or not found');
      return res.json({ success: true, message: 'Session not found or already deleted' });
    }
    
    const data = doc.data();
    console.log('📊 Session data:', { userId: data.userId, requestingUser: req.user.uid });
    
    if (data.userId !== req.user.uid) {
      console.log('❌ User not authorized to delete this session');
      return res.status(403).json({ success: false, message: 'You can only delete your own sessions' });
    }
    
    await ref.delete();
    console.log('✅ Session deleted successfully');
    res.json({ success: true, message: 'Session deleted successfully' });
  } catch (e) {
    console.error('❌ Delete session error:', e);
    res.status(500).json({ success: false, message: 'Failed to delete session', error: e.message });
  }
});

// Delete/leave multiplayer game
router.delete('/neural-conquest/multiplayer/:gameId', authMiddleware, async (req, res) => {
  try {
    console.log('🗑️ Delete/leave multiplayer request:', req.params.gameId, 'by user:', req.user.uid);
    const { gameId } = req.params;
    const { db } = require('../config/firebase');
    const ref = db.collection('neural_conquest_multiplayer').doc(gameId);
    const doc = await ref.get();
    
    if (!doc.exists) {
      console.log('✅ Multiplayer game already deleted or not found');
      return res.json({ success: true, message: 'Game not found or already deleted' });
    }
    
    const game = doc.data();
    console.log('📊 Game data:', { createdBy: game.createdBy, players: game.players?.length || 0, requestingUser: req.user.uid });
    
    const isHost = game.createdBy === req.user.uid || (game.players || []).some(p => p.id === req.user.uid && p.isHost);
    
    if (isHost) {
      console.log('🔨 User is host, deleting entire game');
      await ref.delete();
      return res.json({ success: true, message: 'Game deleted successfully' });
    }
    
    // Non-host: remove from players/invites
    console.log('👋 User is not host, removing from game');
    const originalPlayerCount = (game.players || []).length;
    const originalInviteCount = (game.inviteUserIds || []).length;
    
    game.players = (game.players || []).filter(p => p.id !== req.user.uid);
    game.inviteUserIds = (game.inviteUserIds || []).filter(id => id !== req.user.uid);
    
    console.log('📊 Removed user - Players:', originalPlayerCount, '->', game.players.length, 'Invites:', originalInviteCount, '->', game.inviteUserIds.length);
    
    await ref.set(game);
    res.json({ success: true, message: 'Left game successfully' });
  } catch (e) {
    console.error('❌ Leave/delete multiplayer error:', e);
    res.status(500).json({ success: false, message: 'Failed to update game', error: e.message });
  }
});

module.exports = router; 