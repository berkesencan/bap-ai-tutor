const { db } = require('../../config/firebase');
const { FieldValue } = require('firebase-admin/firestore');
const ThreeDModelGeneratorService = require('../../services/3d-model-generator.service');
const geminiService = require('../../services/gemini.service');

// World Territories Configuration
const WORLD_TERRITORIES = [
  // North America
  { id: 'usa', name: 'United States', continent: 'North America', x: 25, y: 35, cost: 500, concept: 'Democracy & Governance' },
  { id: 'canada', name: 'Canada', continent: 'North America', x: 25, y: 25, cost: 400, concept: 'Natural Resources' },
  { id: 'mexico', name: 'Mexico', continent: 'North America', x: 20, y: 45, cost: 350, concept: 'Cultural Heritage' },
  
  // South America
  { id: 'brazil', name: 'Brazil', continent: 'South America', x: 35, y: 65, cost: 600, concept: 'Biodiversity & Ecosystems' },
  { id: 'argentina', name: 'Argentina', continent: 'South America', x: 30, y: 80, cost: 450, concept: 'Agricultural Innovation' },
  { id: 'colombia', name: 'Colombia', continent: 'South America', x: 28, y: 55, cost: 400, concept: 'Economic Development' },
  
  // Europe
  { id: 'uk', name: 'United Kingdom', continent: 'Europe', x: 50, y: 30, cost: 700, concept: 'Industrial Revolution' },
  { id: 'france', name: 'France', continent: 'Europe', x: 52, y: 35, cost: 650, concept: 'Art & Philosophy' },
  { id: 'germany', name: 'Germany', continent: 'Europe', x: 55, y: 32, cost: 700, concept: 'Engineering & Science' },
  { id: 'russia', name: 'Russia', continent: 'Europe/Asia', x: 70, y: 25, cost: 800, concept: 'Space & Technology' },
  
  // Africa
  { id: 'egypt', name: 'Egypt', continent: 'Africa', x: 58, y: 45, cost: 500, concept: 'Ancient Civilizations' },
  { id: 'south_africa', name: 'South Africa', continent: 'Africa', x: 58, y: 75, cost: 450, concept: 'Social Justice' },
  { id: 'nigeria', name: 'Nigeria', continent: 'Africa', x: 52, y: 55, cost: 400, concept: 'Cultural Diversity' },
  
  // Asia
  { id: 'china', name: 'China', continent: 'Asia', x: 75, y: 40, cost: 900, concept: 'Innovation & Manufacturing' },
  { id: 'japan', name: 'Japan', continent: 'Asia', x: 85, y: 42, cost: 800, concept: 'Technology & Precision' },
  { id: 'india', name: 'India', continent: 'Asia', x: 70, y: 50, cost: 750, concept: 'Mathematics & Philosophy' },
  
  // Oceania
  { id: 'australia', name: 'Australia', continent: 'Oceania', x: 82, y: 70, cost: 600, concept: 'Environmental Science' },
  { id: 'new_zealand', name: 'New Zealand', continent: 'Oceania', x: 88, y: 75, cost: 500, concept: 'Sustainable Development' }
];

// Question Bank for Knowledge Challenges
const QUESTION_BANK = {
  'Democracy & Governance': [
    {
      question: "What principle allows citizens to elect their representatives?",
      options: ["Autocracy", "Democracy", "Oligarchy", "Monarchy"],
      correct: 1,
      difficulty: 1
    },
    {
      question: "Which document established the foundation of American democracy?",
      options: ["Bill of Rights", "Articles of Confederation", "Constitution", "Declaration of Independence"],
      correct: 2,
      difficulty: 2
    },
    {
      question: "What is the term for the separation of government into three branches?",
      options: ["Federalism", "Separation of Powers", "Checks and Balances", "Bicameralism"],
      correct: 1,
      difficulty: 3
    }
  ],
  'Natural Resources': [
    {
      question: "Which resource is considered non-renewable?",
      options: ["Solar Energy", "Wind Power", "Coal", "Hydroelectric"],
      correct: 2,
      difficulty: 1
    },
    {
      question: "What percentage of Earth's water is freshwater?",
      options: ["2.5%", "10%", "25%", "50%"],
      correct: 0,
      difficulty: 2
    }
  ],
  'Cultural Heritage': [
    {
      question: "Which ancient civilization built Machu Picchu?",
      options: ["Aztec", "Maya", "Inca", "Olmec"],
      correct: 2,
      difficulty: 1
    },
    {
      question: "What is the primary purpose of UNESCO World Heritage Sites?",
      options: ["Tourism", "Economic Development", "Cultural Preservation", "Scientific Research"],
      correct: 2,
      difficulty: 2
    }
  ],
  'Technology & Innovation': [
    {
      question: "Who is credited with inventing the World Wide Web?",
      options: ["Bill Gates", "Steve Jobs", "Tim Berners-Lee", "Mark Zuckerberg"],
      correct: 2,
      difficulty: 1
    },
    {
      question: "What does AI stand for in computer science?",
      options: ["Automated Intelligence", "Artificial Intelligence", "Advanced Integration", "Algorithmic Interface"],
      correct: 1,
      difficulty: 1
    }
  ],
  'Mathematics & Philosophy': [
    {
      question: "What is the value of π (pi) rounded to two decimal places?",
      options: ["3.14", "3.16", "3.12", "3.18"],
      correct: 0,
      difficulty: 1
    },
    {
      question: "Who wrote 'The Republic'?",
      options: ["Aristotle", "Socrates", "Plato", "Descartes"],
      correct: 2,
      difficulty: 2
    }
  ]
};

class NeuralConquestController {
  constructor() {
    this.modelGenerator = new ThreeDModelGeneratorService();
    this.activeSessions = new Map(); // Cache for active sessions
    this.generatedTopicData = new Map(); // Cache for generated topic content
  }

  // Get Neural Conquest Session
  async getNeuralConquestSession(req, res) {
    try {
      const { sessionId } = req.params;
      console.log(`🎮 Loading Neural Conquest session: ${sessionId}`);
      
      if (!sessionId) {
        console.error('❌ No session ID provided');
        return res.status(400).json({
          success: false,
          message: 'Session ID is required'
        });
      }

      const sessionDoc = await db.collection('neural_conquest_sessions').doc(sessionId).get();
      
      if (!sessionDoc.exists) {
        console.error(`❌ Session not found: ${sessionId}`);
        return res.status(404).json({
          success: false,
          message: 'Game session not found'
        });
      }

      const sessionData = sessionDoc.data();
      console.log('📦 Session data structure:', {
        hasGameState: !!sessionData.gameState,
        hasPlayers: !!sessionData.players,
        hasGameStatePlayers: !!(sessionData.gameState && sessionData.gameState.players),
        userId: req.user?.uid,
        sessionUserId: sessionData.userId
      });
      
      // Verify session belongs to user (if user is authenticated)
      if (req.user && sessionData.userId !== req.user.uid) {
        console.error(`❌ User ${req.user.uid} trying to access session owned by ${sessionData.userId}`);
        return res.status(403).json({
          success: false,
          message: 'Access denied to this game session'
        });
      }
      
      // Verify the session data exists and is valid
      // Check for players at root level (new structure) or in gameState (legacy)
      const players = sessionData.players || (sessionData.gameState && sessionData.gameState.players);
      if (!sessionData.gameState || !players) {
        console.error('❌ Invalid session data structure:', {
          hasGameState: !!sessionData.gameState,
          hasPlayersAtRoot: !!sessionData.players,
          hasPlayersInGameState: !!(sessionData.gameState && sessionData.gameState.players)
        });
        return res.status(400).json({
          success: false,
          message: 'Invalid game session data'
        });
      }

      console.log(`✅ Session loaded successfully for ${sessionData.players?.length || 0} players`);

      res.json({
        success: true,
        gameState: sessionData.gameState,
        sessionInfo: {
          sessionId: sessionData.id || sessionId,
          createdAt: sessionData.createdAt,
          lastUpdated: sessionData.updatedAt || sessionData.lastUpdated,
          players: sessionData.players || []
        },
        // Include full session data for compatibility
        sessionData: sessionData
      });

    } catch (error) {
      console.error('❌ Error loading Neural Conquest session:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({
        success: false,
        message: 'Failed to load game session',
        debug: process.env.NODE_ENV === 'development' ? {
          error: error.message,
          sessionId: req.params.sessionId
        } : undefined
      });
    }
  }

  // 🚀 Enhanced: Start new game with topic-specific 3D content
  async startNewGame(req, res) {
    try {
      console.log('🎮 Neural Conquest startNewGame called');
      console.log('Request body:', req.body);
      console.log('User info:', req.user ? { uid: req.user.uid } : 'No user info');

      const { userId, topic = 'General Knowledge', difficulty = 'medium', gameMode = 'single', customTopicData } = req.body;

      if (!userId) {
        console.error('❌ Missing userId in request');
        return res.status(400).json({ 
          success: false, 
          error: 'User ID is required',
          debug: { requestBody: req.body }
        });
      }

      console.log(`🎮 Starting Neural Conquest for user ${userId} with topic: ${topic}, difficulty: ${difficulty}, gameMode: ${gameMode}`);

      let topicData;
      
      // Check if custom topic data was provided
      if (customTopicData && customTopicData.isCustom) {
        console.log('🎨 Using provided custom topic data');
        topicData = customTopicData;
        
        // Generate questions for custom topics using Gemini
        console.log('📝 Generating questions for custom topics...');
        try {
          const questionsData = await this.generateQuestionsForCustomTopics(customTopicData);
          topicData.questions = questionsData;
          console.log(`✅ Generated ${questionsData.length} questions for custom topics`);
        } catch (questionError) {
        console.error('❌ Failed to generate custom questions:', questionError.message);
        throw new Error(`Failed to generate questions for custom topics: ${questionError.message}`);
        }
      } else {
        // Generate or get cached topic-specific content
        console.log('📝 Generating topic data...');
        topicData = await this.getOrGenerateTopicData(topic);
      }
      
      console.log(`✅ Topic data ready: ${topicData.questions?.length || 0} questions, ${topicData.objects?.length || 0} objects`);
      
      // Create enhanced game session with 3D models
      console.log('🏗️ Creating enhanced game session...');
      const gameSession = await this.createEnhancedGameSession(userId, topicData, difficulty, gameMode);
      console.log(`✅ Game session created with ID: ${gameSession.id}`);
      
      // Cache the session for quick access
      this.activeSessions.set(gameSession.id, gameSession);
      console.log('💾 Session cached successfully');

      res.json({
        success: true,
        session: gameSession,
        message: `Neural Conquest initialized with ${topicData.objects?.length || 0} 3D territories!`
      });

    } catch (error) {
      console.error('❌ Error starting Neural Conquest:', error);
      console.error('Error stack:', error.stack);
      console.error('Request body:', req.body);
      console.error('User:', req.user ? { uid: req.user.uid } : 'No user');
      
      // Determine error type and provide specific message
      let errorMessage = 'Failed to start Neural Conquest game';
      let statusCode = 500;
      
      if (error.message.includes('GEMINI_API_KEY')) {
        errorMessage = 'AI service configuration error';
        console.error('🔑 Gemini API key issue detected');
      } else if (error.message.includes('Python')) {
        errorMessage = '3D model service configuration error';
        console.error('🎨 Shap-E Python service issue detected');
      } else if (error.message.includes('User ID')) {
        errorMessage = 'Invalid user information';
        statusCode = 400;
      } else if (error.message.includes('Firebase')) {
        errorMessage = 'Database connection error';
        console.error('🔥 Firebase error detected');
      }
      
      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        details: error.message,
        timestamp: new Date().toISOString(),
        debug: process.env.NODE_ENV === 'development' ? {
          stack: error.stack,
          fullError: error.toString(),
          requestBody: req.body,
          userId: req.body?.userId
        } : undefined
      });
    }
  }

  // 🎯 Enhanced: Get or generate topic-specific data with 3D models
  async getOrGenerateTopicData(topicName) {
    try {
      // Check cache first
      if (this.generatedTopicData.has(topicName)) {
        console.log(`📦 Using cached data for topic: ${topicName}`);
        return this.generatedTopicData.get(topicName);
      }

      // Check if it's general knowledge (needs topic selection)
      if (topicName === 'General Knowledge') {
        console.log('🔄 General Knowledge selected, providing topic options');
        const availableTopics = this.modelGenerator.getAvailableTopics();
        return {
          topic: 'General Knowledge',
          needsTopicSelection: true,
          availableTopics: availableTopics,
          questions: [],
          objects: [],
          message: 'Please select a specific topic to generate 3D world'
        };
      }

      // Generate new topic data with 3D models
      console.log(`🎨 Generating new content for topic: ${topicName}`);
      const topicData = await this.modelGenerator.generateTopicData(topicName, 15);
      
      // Validate the generated data
      const validation = this.modelGenerator.validateTopicData(topicData);
      if (!validation.isValid) {
        console.warn('⚠️  Generated topic data validation failed:', validation.errors);
      }

      // Cache the data for future use
      this.generatedTopicData.set(topicName, topicData);
      
      console.log(`✅ Generated ${topicData.questions.length} questions and ${topicData.objects.length} 3D models`);
      return topicData;

    } catch (error) {
      console.error(`❌ Error generating topic data for ${topicName}:`, error);
      
      // NO FALLBACKS - throw error if generation fails
      throw error;
    }
  }

  // 🏗️ Enhanced: Create game session with 3D territories
  async createEnhancedGameSession(userId, topicData, difficulty, gameMode) {
    const sessionId = `nc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Convert topic objects to 3D territories
    const territories = this.createTerritoriesFromObjects(topicData.objects);
    
    // Initialize player with enhanced stats
    const player = {
      id: userId,
      name: 'Neural Explorer',
      synapse: 1000, // Starting currency
      position: { x: 0, y: 0, z: 0 }, // 3D position
      avatar: {
        type: '3d_player',
        model: '/models/player/neural_explorer.glb',
        color: '#00ff88',
        scale: 1.0
      },
      stats: {
        questionsAnswered: 0,
        correctAnswers: 0,
        currentStreak: 0,
        maxStreak: 0,
        territoriesOwned: 0,
        totalSynapseEarned: 0
      },
      inventory: [],
      unlockedTerritories: ['start_territory'], // Allow movement to starting areas
      currentTerritory: 'start_territory'
    };

    // Enhanced AI opponent
    const aiOpponent = {
      id: 'the_scholar',
      name: 'The Scholar',
      type: 'ai',
      synapse: 1500,
      position: { x: 5, y: 0, z: 5 },
      avatar: {
        type: '3d_ai',
        model: '/models/ai/scholar.glb',
        color: '#ff4444',
        scale: 1.2
      },
      stats: {
        questionsAnswered: 0,
        correctAnswers: 0,
        currentStreak: 0,
        territoriesOwned: 0,
        difficultyLevel: this.getDifficultyLevel(difficulty)
      },
      strategy: 'adaptive', // AI adapts to player performance
      lastMove: null
    };

    const gameSession = {
      id: sessionId,
      type: 'neural_conquest',
      topic: topicData.topic,
      topicData: topicData,
      gameMode: gameMode,
      difficulty: difficulty,
      players: [player],
      aiOpponent: aiOpponent,
      territories: territories,
      gameState: {
        phase: 'preparation', // preparation, playing, question, conquering, game_over
        currentPlayer: userId,
        turn: 1,
        maxTurns: 50,
        victoryCondition: {
          type: 'territory_control',
          target: 60 // 60% territory control
        },
        timer: {
          totalTime: gameMode === 'single' ? 300 : 600, // 5 minutes single, 10 minutes multiplayer
          timeRemaining: gameMode === 'single' ? 300 : 600,
          isActive: false,
          startedAt: null,
          pausedAt: null,
          warnings: {
            oneMinuteWarning: false,
            thirtySecondWarning: false,
            tenSecondWarning: false
          }
        },
        lastAction: null
      },
      questionPool: topicData.questions || [],
      currentQuestion: null,
      settings: {
        autoSave: true,
        saveInterval: 30000, // 30 seconds
        maxQuestionTime: 60000, // 1 minute per question
        enableHints: difficulty === 'easy',
        enable3DEffects: true,
        soundEnabled: true
      },
      analytics: {
        sessionStartTime: new Date().toISOString(),
        questionTimes: [],
        moveHistory: [],
        synapseTransactions: []
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: userId,
      isActive: true
    };

    // Initialize per-territory question queues based on pool
    this.assignQuestionsToTerritories(gameSession);

    // Save to Firestore (ignoreUndefinedProperties is enabled in Firebase config)
    await db.collection('neural_conquest_sessions').doc(sessionId).set(gameSession);
    
    console.log(`🎯 Created enhanced Neural Conquest session: ${sessionId}`);
    return gameSession;
  }

  // 🗺️ Enhanced: Create 3D territories from topic objects
  createTerritoriesFromObjects(objects) {
    const territories = {};

    // Convert each enhanced topic object to a 3D territory
    objects.forEach((obj, index) => {
      const position = obj.position || this.calculateTerritoryPosition(index, objects.length);
      
      territories[obj.id] = {
        id: obj.id,
        name: obj.name,
        type: 'conquerable',
        owner: null,
        model: {
          // Use enhanced 3D model data
          url: obj.modelUrl || '/models/fallback/crystal.glb',
          position: position,
          scale: { 
            x: 0.8 + ((obj.difficulty || 1) * 0.1), 
            y: 0.8 + ((obj.difficulty || 1) * 0.1), 
            z: 0.8 + ((obj.difficulty || 1) * 0.1) 
          },
          rotation: { x: 0, y: index * 30, z: 0 },
          // Enhanced texture support
          texture: {
            diffuse: obj.textureUrl || '/textures/fallback/holographic.jpg',
            normal: obj.normalUrl || '/textures/fallback/smooth_normal.jpg',
            roughness: obj.roughnessUrl || '/textures/fallback/medium_rough.jpg',
            emissive: obj.emissiveUrl || '/textures/fallback/subtle_glow.jpg'
          },
          // Material properties for enhanced rendering
          materials: obj.materials || ['standard'],
          quality: obj.quality || 'standard',
          polyCount: obj.polyCount || 1000,
          fileSize: obj.fileSize || '500KB',
          thumbnailUrl: obj.thumbnailUrl || obj.modelUrl?.replace('.glb', '_thumb.jpg')
        },
        color: obj.color || this.getConceptColor(obj.concept),
        cost: obj.cost || 500,
        difficulty: obj.difficulty || 1,
        description: obj.description || 'A territory to conquer in Neural Conquest',
        educationalValue: obj.educationalValue || obj.description || 'Learn through conquest',
        relatedConcepts: [obj.concept || obj.name],
        requiresQuestionCorrect: true, // Must answer question to conquer
        synapseReward: Math.floor((obj.cost || 500) * 0.3), // 30% of cost as reward
        connectionStrength: obj.difficulty || 1, // Harder territories have fewer connections
        
        // Enhanced animations from 3D model generator
        animations: {
          idle: obj.animations?.includes('gentle_float') ? 'gentle_float' : 'float',
          hover: obj.animations?.includes('ambient_glow') ? 'ambient_glow' : 'glow',
          conquered: obj.animations?.includes('energy_pulse') ? 'energy_pulse' : 'pulse',
          locked: 'dim',
          concept_specific: obj.animations || ['float', 'glow'] // Use generated animations
        },
        
        // Interaction type based on difficulty and concept
        interactionType: obj.interactionType || 'click_to_explore',
        
        metadata: {
          topicPrompt: obj.modelPrompt || `A 3D model representing ${obj.name}`,
          isCustomGenerated: obj.isCustomGenerated || false,
          isFallback: obj.isFallback || false,
          generatedAt: obj.generatedAt || new Date().toISOString(),
          concept: obj.concept,
          shapEGenerated: true,
          modelProvider: obj.modelProvider || 'fallback',
          isEnhanced: true
        }
      };
    });

    // Calculate connections between territories
    this.calculateTerritoryConnections(territories);
    
    console.log(`🗺️  Created ${Object.keys(territories).length} enhanced 3D territories`);
    console.log('Territory types:', Object.values(territories).map(t => ({
      id: t.id,
      hasCustomModel: !!t.metadata?.isCustomGenerated,
      concept: t.metadata?.concept,
      quality: t.model?.quality
    })));
    
    return territories;
  }

  // 📍 Calculate 3D positions for territories in a sphere layout
  calculateTerritoryPosition(index, total) {
    // Distribute territories in a 3D sphere around the central hub
    const radius = 8; // Distance from center
    const phi = Math.acos(-1 + (2 * index) / total); // Polar angle
    const theta = Math.sqrt(total * Math.PI) * phi; // Azimuthal angle
    
    return {
      x: radius * Math.cos(theta) * Math.sin(phi),
      y: radius * Math.cos(phi),
      z: radius * Math.sin(theta) * Math.sin(phi)
    };
  }

  // 🔗 Calculate which territories are connected to each other
  calculateTerritoryConnections(territories) {
    const territoryIds = Object.keys(territories);
    const maxDistance = 12; // Maximum connection distance
    
    territoryIds.forEach(id1 => {
      const territory1 = territories[id1];
      territory1.connections = [];
      
      territoryIds.forEach(id2 => {
        if (id1 !== id2) {
          const territory2 = territories[id2];
          const distance = this.calculate3DDistance(
            territory1.model.position,
            territory2.model.position
          );
          
          if (distance <= maxDistance) {
            territory1.connections.push({
              territoryId: id2,
              distance: distance,
              difficulty: Math.max(territory1.difficulty, territory2.difficulty)
            });
          }
        }
      });
      
      // Sort connections by distance
      territory1.connections.sort((a, b) => a.distance - b.distance);
    });
  }

  // 📏 Calculate 3D distance between two points
  calculate3DDistance(pos1, pos2) {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  // 🎲 Enhanced: Handle question answering with topic-specific rewards
  async answerQuestion(req, res) {
    try {
      const { sessionId, questionId, selectedAnswer, timeSpent } = req.body;
      
      const session = await this.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ success: false, error: 'Session not found' });
      }

      const question = session.questionPool.find(q => q.id === questionId);
      if (!question) {
        return res.status(400).json({ success: false, error: 'Question not found' });
      }

      const isCorrect = selectedAnswer === question.correct;
      const player = session.players[0];
      
      // Update player stats
      player.stats.questionsAnswered++;
      if (isCorrect) {
        player.stats.correctAnswers++;
        player.stats.currentStreak++;
        player.stats.maxStreak = Math.max(player.stats.maxStreak, player.stats.currentStreak);
      } else {
        player.stats.currentStreak = 0;
      }

      // Calculate enhanced synapse reward
      let synapseReward = 0;
      let canMoveToTerritory = null;
      
      if (isCorrect) {
        synapseReward = this.modelGenerator.calculateSynapseReward(
          session.topic,
          question.difficulty,
          player.stats.currentStreak
        );
        
        player.synapse += synapseReward;
        player.stats.totalSynapseEarned += synapseReward;
        
        // Allow movement to territories related to this question's concept
        canMoveToTerritory = this.findRelatedTerritory(session.territories, question.concept);
        
        if (canMoveToTerritory && !player.unlockedTerritories.includes(canMoveToTerritory.id)) {
          player.unlockedTerritories.push(canMoveToTerritory.id);
        }
      }

      // Record analytics
      session.analytics.questionTimes.push({
        questionId,
        timeSpent,
        isCorrect,
        difficulty: question.difficulty,
        synapseReward,
        timestamp: new Date().toISOString()
      });

      // Update game state
      session.currentQuestion = null;
      session.gameState.phase = 'playing';
      session.gameState.lastAction = {
        type: 'question_answered',
        result: isCorrect ? 'correct' : 'incorrect',
        synapseReward,
        canMoveToTerritory: canMoveToTerritory?.id,
        timestamp: new Date().toISOString()
      };

      // Auto-save session
      await this.saveSession(session);

      res.json({
        success: true,
        result: {
          isCorrect,
          correctAnswer: question.correct,
          explanation: question.explanation || `The correct answer relates to ${question.concept}`,
          synapseReward,
          newSynapseTotal: player.synapse,
          streakCount: player.stats.currentStreak,
          canMoveToTerritory,
          unlockedTerritories: player.unlockedTerritories
        }
      });

    } catch (error) {
      console.error('❌ Error answering question:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process answer',
        details: error.message
      });
    }
  }

  // 🏃‍♂️ Enhanced: Move player to 3D territory
  async moveToTerritory(req, res) {
    try {
      const { sessionId, territoryId } = req.body;
      
      const session = await this.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ success: false, error: 'Session not found' });
      }

      const player = session.players[0];
      const territory = session.territories[territoryId];
      
      if (!territory) {
        return res.status(400).json({ success: false, error: 'Territory not found' });
      }

      // Check if player can move to this territory
      if (!player.unlockedTerritories.includes(territoryId) && territoryId !== 'start_territory') {
        return res.status(403).json({ 
          success: false, 
          error: 'Territory not unlocked. Answer related questions first!' 
        });
      }

      // Update player position to territory position
      player.position = { ...territory.model.position };
      player.currentTerritory = territoryId;

      // Record movement in analytics
      session.analytics.moveHistory.push({
        from: player.currentTerritory,
        to: territoryId,
        timestamp: new Date().toISOString(),
        synapseCost: 0 // Movement is free for now
      });

      // Check if player can purchase/conquer this territory
      let canConquer = false;
      let conquestInfo = null;
      
      if (territory.type === 'conquerable' && !territory.owner) {
        canConquer = player.synapse >= territory.cost;
        conquestInfo = {
          cost: territory.cost,
          difficulty: territory.difficulty,
          description: territory.description,
          educationalValue: territory.educationalValue,
          requiredSynapse: territory.cost,
          playerSynapse: player.synapse
        };
      }

      // Update game state
      session.gameState.lastAction = {
        type: 'player_moved',
        territory: territoryId,
        position: player.position,
        canConquer,
        timestamp: new Date().toISOString()
      };

      await this.saveSession(session);

      res.json({
        success: true,
        result: {
          newPosition: player.position,
          currentTerritory: territoryId,
          territoryInfo: territory,
          canConquer,
          conquestInfo,
          nearbyTerritories: this.getNearbyTerritories(session.territories, territoryId)
        }
      });

    } catch (error) {
      console.error('❌ Error moving to territory:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to move to territory',
        details: error.message
      });
    }
  }

  // 🏰 Enhanced: Conquer territory with 3D effects
  async conquerTerritory(req, res) {
    try {
      const { sessionId, territoryId } = req.body;
      
      const session = await this.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ success: false, error: 'Session not found' });
      }

      const player = session.players[0];
      const territory = session.territories[territoryId];
      
      if (!territory || territory.owner) {
        return res.status(400).json({ 
          success: false, 
          error: 'Territory not available for conquest' 
        });
      }

      if (player.synapse < territory.cost) {
        return res.status(400).json({ 
          success: false, 
          error: 'Insufficient Synapse for conquest',
          required: territory.cost,
          available: player.synapse
        });
      }

      // Deduct synapse and conquer territory
      player.synapse -= territory.cost;
      territory.owner = player.id;
      player.stats.territoriesOwned++;
      
      // Add to inventory
      player.inventory.push({
        territoryId: territoryId,
        name: territory.name,
        acquiredAt: new Date().toISOString(),
        value: territory.cost
      });

      // Record transaction
      session.analytics.synapseTransactions.push({
        type: 'territory_conquest',
        amount: -territory.cost,
        territoryId: territoryId,
        newBalance: player.synapse,
        timestamp: new Date().toISOString()
      });

      // Check victory condition
      const ownedTerritories = Object.values(session.territories).filter(t => t.owner === player.id);
      const totalConquerableTerritories = Object.values(session.territories).filter(t => t.type === 'conquerable');
      const controlPercentage = (ownedTerritories.length / totalConquerableTerritories.length) * 100;
      
      let gameResult = null;
      if (controlPercentage >= session.gameState.victoryCondition.target) {
        session.gameState.phase = 'game_over';
        gameResult = {
          victory: true,
          controlPercentage,
          message: `Victory! You control ${controlPercentage.toFixed(1)}% of the neural territories!`
        };
      }

      // Update game state
      session.gameState.lastAction = {
        type: 'territory_conquered',
        territory: territoryId,
        cost: territory.cost,
        controlPercentage,
        timestamp: new Date().toISOString()
      };

      await this.saveSession(session);

      res.json({
        success: true,
        result: {
          territoryConquered: territory,
          newSynapseBalance: player.synapse,
          controlPercentage,
          territoriesOwned: player.stats.territoriesOwned,
          gameResult
        }
      });

    } catch (error) {
      console.error('❌ Error conquering territory:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to conquer territory',
        details: error.message
      });
    }
  }

  // 🎯 Get related territory based on question concept
  findRelatedTerritory(territories, concept) {
    const territoryList = Object.values(territories).filter(t => t.type === 'conquerable');
    
    // Find territory with matching concept or similar name
    return territoryList.find(territory => 
      territory.relatedConcepts?.some(c => 
        c.toLowerCase().includes(concept.toLowerCase()) ||
        concept.toLowerCase().includes(c.toLowerCase())
      ) ||
      territory.name.toLowerCase().includes(concept.toLowerCase()) ||
      concept.toLowerCase().includes(territory.name.toLowerCase())
    ) || territoryList[Math.floor(Math.random() * territoryList.length)]; // Fallback to random
  }

  // 🗺️ Get nearby territories for movement suggestions
  getNearbyTerritories(territories, currentTerritoryId) {
    const currentTerritory = territories[currentTerritoryId];
    if (!currentTerritory || !currentTerritory.connections) return [];
    
    return currentTerritory.connections.slice(0, 5).map(conn => ({
      id: conn.territoryId,
      ...territories[conn.territoryId],
      distance: conn.distance,
      movementDifficulty: conn.difficulty
    }));
  }

  // 🎮 Get difficulty level for AI opponent
  getDifficultyLevel(difficulty) {
    const levels = {
      'easy': 1,
      'medium': 3,
      'hard': 5
    };
    return levels[difficulty] || 3;
  }

  // 💾 Enhanced session management
  async getSession(sessionId) {
    try {
      // Check cache first
      if (this.activeSessions.has(sessionId)) {
        const cachedSession = this.activeSessions.get(sessionId);
        console.log(`⚡ Session found in cache: ${sessionId}`);
        return cachedSession;
      }

      // Load from Firestore
      const doc = await db.collection('neural_conquest_sessions').doc(sessionId).get();
      if (doc.exists) {
        const sessionData = doc.data();
        console.log(`💾 Session loaded from Firestore: ${sessionId}`);
        
        // Ensure critical data structures exist and are properly initialized
        this.validateAndRepairSession(sessionData);
        
        // Update cache
        this.activeSessions.set(sessionId, sessionData);
        return sessionData;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting session:', error);
      return null;
    }
  }

  // Validate and repair session data structure
  validateAndRepairSession(session) {
    console.log('🔧 Validating and repairing session data...');
    
    // Ensure question pool exists
    if (!Array.isArray(session.questionPool)) {
      console.log('⚠️ Question pool missing or invalid, initializing...');
      session.questionPool = [];
    }
    
    // Ensure territory question queues exist
    if (!session.territoryQuestionQueues || typeof session.territoryQuestionQueues !== 'object') {
      console.log('⚠️ Territory question queues missing, rebuilding...');
      session.territoryQuestionQueues = {};
      if (session.questionPool.length > 0) {
        this.assignQuestionsToTerritories(session);
      }
    }
    
    // Ensure territories exist
    if (!session.territories || typeof session.territories !== 'object') {
      console.log('⚠️ Territories missing, attempting to rebuild...');
      session.territories = {};
      
      // Try to rebuild from topicData if available
      if (session.topicData && session.topicData.objects) {
        console.log('🏗️ Rebuilding territories from topicData...');
        session.territories = this.createTerritoriesFromObjects(session.topicData.objects);
      }
    }
    
    // Ensure gameState exists for multiplayer
    if (session.gameState && !session.gameState.questionPool) {
      session.gameState.questionPool = session.questionPool || [];
    }
    
    // If question pool is empty but we have topicData, try to regenerate
    if (session.questionPool.length === 0 && session.topicData) {
      console.log('🧠 Question pool empty, attempting to regenerate from topicData...');
      if (session.topicData.questions && Array.isArray(session.topicData.questions)) {
        session.questionPool = [...session.topicData.questions];
        console.log(`✅ Restored ${session.questionPool.length} questions from topicData`);
        
        // Rebuild territory queues
        this.assignQuestionsToTerritories(session);
      }
    }
    
    console.log(`✅ Session validation complete - QuestionPool: ${session.questionPool.length}, Territories: ${Object.keys(session.territories || {}).length}, QueuesInit: ${!!session.territoryQuestionQueues}`);
  }

  async saveSession(session) {
    try {
      session.updatedAt = new Date().toISOString();
      
      // Ensure critical structures exist before saving
      if (!session.questionPool) session.questionPool = [];
      if (!session.territoryQuestionQueues) session.territoryQuestionQueues = {};
      if (!session.territories) session.territories = {};
      
      // Update cache
      this.activeSessions.set(session.id, session);
      
      // Save to Firestore with merge to preserve existing data
      await db.collection('neural_conquest_sessions').doc(session.id).set(session, { merge: true });
      
      console.log(`💾 Session saved: ${session.id} (QuestionPool: ${session.questionPool.length}, Territories: ${Object.keys(session.territories).length})`);
    } catch (error) {
      console.error('❌ Error saving session:', error);
      throw error;
    }
  }

  // 🔄 Get available topics for selection
  async getAvailableTopics(req, res) {
    try {
      const topics = this.modelGenerator.getAvailableTopics();
      
      res.json({
        success: true,
        topics: topics,
        message: `${topics.length} topics available for Neural Conquest`
      });
    } catch (error) {
      console.error('Error getting available topics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get available topics'
      });
    }
  }

  // 📚 Get Neural Conquest content (questions, etc.)
  async getContent(req, res) {
    try {
      console.log('🎮 Getting Neural Conquest content...');
      // If a topic is provided, generate correlated sample questions from QUESTION_BANK
      const { topic } = req.query;
      let questions = [];
      if (topic && typeof topic === 'string') {
        // Map topic to concept key if possible
        const conceptKeys = Object.keys(QUESTION_BANK);
        const matched = conceptKeys.find(k => k.toLowerCase().includes(topic.toLowerCase()) || topic.toLowerCase().includes(k.toLowerCase()));
        if (matched) {
          questions = QUESTION_BANK[matched].map((q, idx) => ({ id: `bank_${idx}`, ...q, concept: matched }));
        }
      }
      // Fallback: empty to force clients to use topic-specific creation flow
      res.json({ success: true, questions, message: `${questions.length} topic-correlated questions` });
    } catch (error) {
      console.error('❌ Error getting Neural Conquest content:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get content'
      });
    }
  }



  // 🧹 Cleanup old sessions and cache
  async cleanup() {
    try {
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      
      // Clean up inactive sessions from cache
      for (const [sessionId, session] of this.activeSessions.entries()) {
        const lastUpdate = new Date(session.updatedAt).getTime();
        if (lastUpdate < oneHourAgo) {
          this.activeSessions.delete(sessionId);
        }
      }
      
      // Clean up old topic data cache (keep only recent topics)
      if (this.generatedTopicData.size > 10) {
        const entries = Array.from(this.generatedTopicData.entries());
        // Keep only the 5 most recently used topics
        this.generatedTopicData.clear();
        entries.slice(-5).forEach(([key, value]) => {
          this.generatedTopicData.set(key, value);
        });
      }
      
      console.log('🧹 Cache cleanup completed');
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }

  // 🔧 Debug endpoint for testing Neural Conquest setup
  async debugStatus(req, res) {
    try {
      console.log('🔧 Neural Conquest debug status check');
      
      const status = {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        services: {
          gemini: {
            configured: !!process.env.GEMINI_API_KEY,
            keyLength: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0,
            status: 'unknown'
          },
                  shap_e: {
          status: 'unknown',
          description: 'OpenAI Shap-E 3D Model Generator'
          },
          firebase: {
            configured: true,
            status: 'connected'
          }
        },
        cache: {
          activeSessions: this.activeSessions.size,
          generatedTopics: this.generatedTopicData.size
        },
        topics: this.modelGenerator ? this.modelGenerator.getAvailableTopics() : []
      };

      // Test Gemini connection
      try {
        if (process.env.GEMINI_API_KEY) {
          const testResult = await this.modelGenerator.model.generateContent('Test connection');
          status.services.gemini.status = 'connected';
        } else {
          status.services.gemini.status = 'no_api_key';
        }
      } catch (error) {
        status.services.gemini.status = 'error';
        status.services.gemini.error = error.message;
      }

      // Test Shap-E 3D generation (via Python service)
      try {
        const { spawn } = require('child_process');
        const pythonCheck = spawn('python3', ['--version'], { stdio: 'pipe' });
        let pythonAvailable = false;
        
        await new Promise((resolve) => {
          pythonCheck.on('close', (code) => {
            pythonAvailable = code === 0;
            resolve();
          });
        });
        
        status.services.shap_e = {
          status: pythonAvailable ? 'configured' : 'python_missing',
          description: 'OpenAI Shap-E 3D Model Generator'
        };
      } catch (error) {
        status.services.shap_e = {
          status: 'error',
          error: error.message
        };
      }

      console.log('🔧 Debug status:', status);

      res.json({
        success: true,
        status,
        message: 'Neural Conquest debug status'
      });

    } catch (error) {
      console.error('❌ Error in debug status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get debug status',
        details: error.message
      });
    }
  }

  // 🔧 Generate questions for custom topics using Gemini with fallback
  async generateQuestionsForCustomTopics(customTopicData) {
    try {
      const topics = customTopicData.objects.map(obj => obj.name).join(', ');
      const topicDescription = customTopicData.topic;
      
      const prompt = `Generate exactly 15 educational questions for Neural Conquest game about: "${topicDescription}"

CRITICAL REQUIREMENTS:
1. Each question MUST directly relate to one of these specific topics: ${topics}
2. Questions should test understanding, not just memorization
3. Provide diverse question types and difficulty levels
4. NO GENERIC OR UNRELATED QUESTIONS - each must connect to the topic list

TOPICS TO COVER: ${topics}

MAIN SUBJECT: ${topicDescription}

FORMAT AS VALID JSON:
{
  "questions": [
    {
      "question": "What is the primary characteristic of [specific topic]?",
      "options": ["Correct answer about the topic", "Incorrect option 1", "Incorrect option 2", "Incorrect option 3"],
      "correct": 0,
      "difficulty": 2,
      "concept": "[Exact topic name from the list]",
      "explanation": "Brief explanation of why this answer is correct"
    }
  ]
}

QUALITY STANDARDS:
- Each question must reference a specific topic from the list above
- Options should be plausible but clearly differentiated
- Mix difficulty levels: 5 easy (1-2), 5 medium (3), 5 hard (4-5)
- Ensure variety in question types (definition, application, comparison, analysis)
- Make questions engaging and thought-provoking`;

      // Try Gemini with retry logic (maxRetries = 5 for critical Neural Conquest functionality)
      console.log('🤖 Attempting to generate questions with Gemini AI...');
      const response = await geminiService.generateContent(prompt, 5);
      
      try {
        // More robust JSON extraction
        let jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          // Try to find questions section if JSON wrapper is missing
          const questionsMatch = response.match(/questions"?\s*:\s*\[([\s\S]*)\]/);
          if (questionsMatch) {
            jsonMatch = [`{"questions": [${questionsMatch[1]}]}`];
          }
        }
        
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.questions && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
            console.log('✅ Successfully generated questions with Gemini AI');
            
            // Validate and enhance questions
            const topicsList = customTopicData.objects.map(obj => obj.name);
            const validatedQuestions = parsed.questions
              .filter(q => q.question && q.options && Array.isArray(q.options) && q.options.length >= 4)
              .slice(0, 15) // Ensure exactly 15 questions
              .map((q, index) => {
                // Ensure correct answer index is valid
                const correctIndex = Math.max(0, Math.min(3, parseInt(q.correct) || 0));
                
                return {
              id: `custom_q_${index + 1}`,
                  question: q.question.trim(),
                  options: q.options.slice(0, 4), // Ensure exactly 4 options
                  correct: correctIndex,
                  difficulty: Math.max(1, Math.min(5, q.difficulty || (Math.floor(index / 5) + 1))),
                  concept: q.concept || topicsList[index % topicsList.length],
                  topic: topicDescription,
                  explanation: q.explanation || 'Generated question explanation',
                  isGenerated: true
                };
              });
            
            // If we have valid questions, return them
            if (validatedQuestions.length >= 10) {
              console.log(`✅ Validated ${validatedQuestions.length} questions from Gemini`);
              return validatedQuestions;
            } else {
              console.warn(`⚠️ Only ${validatedQuestions.length} valid questions generated, falling back`);
              throw new Error('Insufficient valid questions generated');
            }
          }
        }
        throw new Error('Invalid JSON format or no questions found');
      } catch (parseError) {
        console.error('❌ Failed to parse generated questions JSON:', parseError.message);
        console.log('🔄 Falling back to template-based questions...');
        return this.generateFallbackQuestions(customTopicData);
      }
    } catch (error) {
      console.error('❌ Error generating questions for custom topics:', error);
      console.log('🔄 Gemini unavailable, using fallback question generator...');
      
      // Use fallback question generator when Gemini is completely unavailable
      return this.generateFallbackQuestions(customTopicData);
    }
  }

  // 🛡️ Fallback question generator for when Gemini is unavailable
  generateFallbackQuestions(customTopicData) {
    console.log('🛡️ Generating fallback questions for Neural Conquest...');
    
    const topics = customTopicData.objects.map(obj => obj.name);
    const topicDescription = customTopicData.topic;
    const questions = [];
    
    // Generate template-based questions for each topic
    topics.forEach((topic, topicIndex) => {
      const topicQuestions = this.generateQuestionsForTopic(topic, topicDescription, topicIndex);
      questions.push(...topicQuestions);
    });
    
    // If we don't have enough questions, add general knowledge ones
    while (questions.length < 15) {
      const generalQ = this.generateGeneralQuestion(questions.length, topicDescription);
      questions.push(generalQ);
    }
    
    // Limit to exactly 15 questions and shuffle
    const finalQuestions = questions.slice(0, 15);
    this.shuffleArray(finalQuestions);
    
    console.log(`✅ Generated ${finalQuestions.length} fallback questions`);
    return finalQuestions;
  }

  // 🎯 Generate questions for a specific topic using templates
  generateQuestionsForTopic(topic, description, topicIndex) {
    const questions = [];
    const baseDifficulty = Math.floor(topicIndex / 2) + 1; // Gradually increase difficulty
    
    // Template questions that can be adapted to any topic
    const templates = [
      {
        template: "What is the primary characteristic of {topic}?",
          options: [
          `It is the main feature of {topic}`,
          `It is not related to {topic}`,
          `It is opposite to {topic}`,
          `It is unknown about {topic}`
        ],
        correct: 0
      },
      {
        template: "Which of the following best describes {topic}?",
        options: [
          `{topic} is an important concept`,
          `{topic} is completely unrelated`,
          `{topic} is always incorrect`,
          `{topic} never exists`
          ],
        correct: 0
      },
      {
        template: "In the context of {description}, {topic} is most closely associated with:",
        options: [
          `The core principles of {topic}`,
          `Something unrelated to {topic}`,
          `The opposite of {topic}`,
          `Random information`
        ],
        correct: 0
      }
    ];
    
    // Generate 2-3 questions per topic
    const numQuestions = Math.min(3, Math.max(1, Math.floor(15 / topics.length)));
    
    for (let i = 0; i < numQuestions; i++) {
      const template = templates[i % templates.length];
      const question = {
        id: `fallback_q_${topicIndex}_${i + 1}`,
        question: template.template.replace(/{topic}/g, topic).replace(/{description}/g, description),
        options: template.options.map(opt => 
          opt.replace(/{topic}/g, topic).replace(/{description}/g, description)
        ),
        correct: template.correct,
        difficulty: Math.min(5, baseDifficulty + i),
        concept: topic,
        topic: description,
        isFallback: true
      };
      questions.push(question);
    }
    
    return questions;
  }

  // 🌐 Generate general knowledge question when needed
  generateGeneralQuestion(index, description) {
    const generalTemplates = [
      {
        question: "What is a key learning objective in studying this topic?",
        options: [
          "Understanding the fundamental concepts",
          "Memorizing unrelated facts",
          "Avoiding the subject entirely",
          "Ignoring educational value"
        ],
        correct: 0
      },
      {
        question: "Which approach is most effective for learning this material?",
        options: [
          "Active engagement and practice",
          "Passive reading only",
          "Avoiding questions",
          "Random guessing"
        ],
        correct: 0
      },
      {
        question: "What makes this topic educationally valuable?",
        options: [
          "It develops critical thinking skills",
          "It has no educational value",
          "It should be avoided",
          "It is too difficult to understand"
        ],
        correct: 0
      }
    ];
    
    const template = generalTemplates[index % generalTemplates.length];
    
    return {
      id: `fallback_general_${index + 1}`,
      question: template.question,
      options: template.options,
      correct: template.correct,
      difficulty: Math.floor(index / 5) + 2, // Difficulty 2-4
      concept: "General Knowledge",
      topic: description,
      isFallback: true
    };
    }
    
  // 🔀 Utility function to shuffle array
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }



  // Get concept-based colors for territories
  getConceptColor(concept) {
    const conceptColors = {
      'geography': '#4CAF50', // Green for earth/nature
      'history': '#795548', // Brown for ancient/historical
      'science': '#2196F3', // Blue for scientific/laboratory
      'technology': '#9C27B0', // Purple for futuristic/tech
      'art': '#FF9800', // Orange for creative/artistic
      'mathematics': '#607D8B', // Blue-grey for logical/precise
      'biology': '#8BC34A', // Light green for organic/living
      'chemistry': '#FF5722', // Red-orange for reactions/energy
      'physics': '#3F51B5', // Indigo for fundamental/universal
      'general': '#00BCD4' // Cyan for general knowledge
    };

    return conceptColors[concept?.toLowerCase()] || conceptColors['general'];
  }

  // 🎮 MULTIPLAYER NEURAL CONQUEST METHODS

  // Create multiplayer game
  async createMultiplayerGame(req, res) {
    try {
      const { 
        gameConfig,
        inviteEmails = [],
        maxPlayers = 4,
        gameMode = 'multiplayer'
      } = req.body;
      
      const hostUserId = req.user?.uid;
      const hostName = req.user?.displayName || gameConfig.playerName || 'Host';
      
      console.log('🎮 Creating multiplayer Neural Conquest game:', {
        hostUserId,
        hostName,
        inviteEmails,
        maxPlayers,
        gameMode,
        topic: gameConfig.topic
      });
      
      // Generate unique game ID
      const gameId = `neural_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Generate 3D content for the game
      console.log('🧠 Generating neural conquest content for multiplayer...');
      const topicData = await this.getOrGenerateTopicData(gameConfig.topic);
      
      if (!topicData) {
        throw new Error('Failed to generate game content');
      }
      
      // Create initial players array with host
      const players = [
        {
          id: hostUserId,
          name: hostName,
          email: req.user?.email,
          isHost: true,
          isAI: false,
          status: 'connected',
          synapse: 1000,
          territories: [],
          correctAnswers: 0,
          incorrectAnswers: 0,
          color: '#22c55e',
          joinedAt: new Date().toISOString()
        }
      ];
      
      // Add AI players if needed
      if (gameMode === 'ai' || inviteEmails.length === 0) {
        players.push({
          id: 'neural_ai',
          name: 'Neural AI',
          isHost: false,
          isAI: true,
          status: 'connected',
          synapse: 1000,
          territories: [],
          correctAnswers: 0,
          incorrectAnswers: 0,
          color: '#ef4444',
          joinedAt: new Date().toISOString()
        });
      }
      
      // Process territories from generated content
      const territories = this.processTerritoriesForMultiplayer(topicData.objects || []);
      
      // Create game state
      const gameState = {
        gameId,
        status: 'waiting', // waiting, active, completed
        gameMode,
        maxPlayers,
        currentPlayerIndex: 0,
        phase: 'SETUP', // SETUP, PLAYER_TURN, AI_TURN, CONQUEST, GAME_OVER
        turn: 1,
        players,
        territories,
        questionPool: topicData.questions || [],
        topicData,
        inviteEmails,
        inviteTokens: this.generateInviteTokens(inviteEmails, gameId),
        settings: {
          timeLimit: gameConfig.timeLimit || 300, // 5 minutes per turn
          difficultyLevel: gameConfig.difficulty || 'medium',
          allowSpectators: gameConfig.allowSpectators || false
        },
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        createdBy: hostUserId
      };
      
      // Store game state
      await this.saveMultiplayerGameState(gameId, gameState);
      
      // Send invitations
      if (inviteEmails.length > 0) {
        await this.sendGameInvitations(gameId, inviteEmails, hostName, gameConfig.topic);
      }
      
      console.log('✅ Multiplayer game created successfully:', gameId);
      
      res.json({
        success: true,
        data: {
          gameId,
          gameState,
          joinUrl: `${process.env.FRONTEND_URL}/activities/neural-conquest/${gameId}`,
          inviteTokens: gameState.inviteTokens
        }
      });
      
    } catch (error) {
      console.error('❌ Error creating multiplayer game:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create multiplayer game',
        error: error.message
      });
    }
  }

  // Join multiplayer game
  async joinMultiplayerGame(req, res) {
    try {
      const { gameId } = req.params;
      const { 
        playerName, 
        inviteToken,
        playerEmail 
      } = req.body;
      
      const playerId = req.user?.uid || `guest_${Date.now()}`;
      
      console.log('🎮 Player joining multiplayer game:', {
        gameId,
        playerId,
        playerName,
        playerEmail
      });
      
      // Load existing game state
      const gameState = await this.loadMultiplayerGameState(gameId);
      
      if (!gameState) {
        return res.status(404).json({
          success: false,
          message: 'Game not found'
        });
      }
      
      // Check if game is joinable
      if (gameState.status === 'completed') {
        return res.status(400).json({
          success: false,
          message: 'Game has already ended'
        });
      }
      
      if (gameState.players.length >= gameState.maxPlayers) {
        return res.status(400).json({
          success: false,
          message: 'Game is full'
        });
      }
      
      // Check if player is already in game
      const existingPlayer = gameState.players.find(p => p.id === playerId);
      if (existingPlayer) {
        existingPlayer.status = 'connected';
        existingPlayer.lastActivity = new Date().toISOString();
      } else {
        // Add new player
        const playerColors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
        const playerColor = playerColors[gameState.players.length % playerColors.length];
        
        gameState.players.push({
          id: playerId,
          name: playerName,
          email: playerEmail,
          isHost: false,
          isAI: false,
          status: 'connected',
          synapse: 1000,
          territories: [],
          correctAnswers: 0,
          incorrectAnswers: 0,
          color: playerColor,
          joinedAt: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        });
      }

      // Start game if enough players
      if (gameState.status === 'waiting' && gameState.players.length >= 2) {
        gameState.status = 'active';
        gameState.phase = 'PLAYER_TURN';
        console.log('🚀 Starting multiplayer game with', gameState.players.length, 'players');
      }
      
      gameState.lastUpdated = new Date().toISOString();
      
      // Save updated game state
      await this.saveMultiplayerGameState(gameId, gameState);
      
      // Broadcast player joined event
      this.broadcastGameUpdate(gameId, {
        type: 'player_joined',
        player: gameState.players.find(p => p.id === playerId),
        gameState
      });
      
      res.json({
        success: true,
        data: {
          gameState,
          playerId
        }
      });

    } catch (error) {
      console.error('❌ Error joining multiplayer game:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to join game',
        error: error.message
      });
    }
  }

  // Get multiplayer game state
  async getMultiplayerGameState(req, res) {
    try {
      const { gameId } = req.params;
      const { playerId } = req.query;
      
      const gameState = await this.loadMultiplayerGameState(gameId);
      
      if (!gameState) {
        return res.status(404).json({
          success: false,
          message: 'Game not found'
        });
      }
      
      // Update player's last activity if provided
      if (playerId) {
        const player = gameState.players.find(p => p.id === playerId);
        if (player) {
          player.lastActivity = new Date().toISOString();
          await this.saveMultiplayerGameState(gameId, gameState);
        }
      }
      
      res.json({
        success: true,
        data: gameState
      });
      
    } catch (error) {
      console.error('❌ Error getting multiplayer game state:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get game state',
        error: error.message
      });
    }
  }

  // 🔧 MULTIPLAYER HELPER METHODS

  processTerritoriesForMultiplayer(objects) {
    return objects.map((obj, index) => {
      const angle = (index / objects.length) * Math.PI * 2;
      const radius = 15 + (index % 3) * 8;
      const height = Math.sin(angle * 2) * 5;
      
      return {
        id: obj.id || `territory_${index}`,
        name: obj.name || `Neural Node ${index + 1}`,
        position: [
          Math.cos(angle) * radius,
          height,
          Math.sin(angle) * radius
        ],
        cost: obj.cost || (300 + index * 50),
        concept: obj.concept || 'Neural Processing',
        modelUrl: obj.modelUrl,
        color: obj.color || `hsl(${(index * 137.5) % 360}, 70%, 60%)`,
        owner: null,
        difficulty: obj.difficulty || 2,
        description: obj.description || `A neural territory representing ${obj.name}`,
        masteryLevel: 0,
        correctAnswers: 0,
        incorrectAnswers: 0
      };
    });
  }

  generateInviteTokens(emails, gameId) {
    return emails.map(email => ({
      email,
      token: `${gameId}_${Buffer.from(email).toString('base64')}_${Date.now()}`,
      used: false,
      createdAt: new Date().toISOString()
    }));
  }

  // In-memory game state storage (should be replaced with Redis in production)
  static multiplayerGames = new Map();

  async saveMultiplayerGameState(gameId, gameState) {
    try {
      NeuralConquestController.multiplayerGames.set(gameId, gameState);
      if (db) {
        await db.collection('neural_conquest_multiplayer').doc(gameId).set({
          ...gameState,
          gameId,
          lastPersisted: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('❌ Error saving multiplayer game to Firestore:', error);
      // Keep in-memory state even if Firestore fails
    }
  }

  async loadMultiplayerGameState(gameId) {
    try {
      if (NeuralConquestController.multiplayerGames.has(gameId)) {
        return NeuralConquestController.multiplayerGames.get(gameId);
      }
      if (db) {
        const doc = await db.collection('neural_conquest_multiplayer').doc(gameId).get();
        if (doc.exists) {
          const state = doc.data();
          NeuralConquestController.multiplayerGames.set(gameId, state);
          return state;
        }
      }
      return null;
    } catch (error) {
      console.error('❌ Error loading multiplayer game from Firestore:', error);
      return null;
    }
  }

  // WebSocket broadcasting placeholder
  broadcastGameUpdate(gameId, update) {
    console.log('📡 Broadcasting update for game:', gameId, update.type);
    // TODO: Implement WebSocket broadcasting with Socket.IO
  }

  // Search users for multiplayer invites (by email or displayName/username)
  async searchUsersForInvite(req, res) {
    try {
      const { q } = req.query;
      if (!q || q.trim().length < 2) {
        return res.status(400).json({ success: false, message: 'Query must be at least 2 characters' });
      }
      const query = q.trim().toLowerCase();
      const results = [];

      // Try direct matches first
      const emailSnap = await db.collection('users').where('email', '==', q).limit(5).get();
      emailSnap.forEach(doc => results.push({ id: doc.id, ...doc.data() }));

      // Try username/displayName exact match
      const unameSnap = await db.collection('users').where('username', '==', q).limit(5).get();
      unameSnap.forEach(doc => results.push({ id: doc.id, ...doc.data() }));

      // Fallback: fetch a small batch and filter locally (case-insensitive contains)
      if (results.length === 0) {
        const batch = await db.collection('users').limit(25).get();
        batch.forEach(doc => {
          const data = doc.data();
          const display = (data.displayName || data.name || '').toLowerCase();
          const email = (data.email || '').toLowerCase();
          const username = (data.username || '').toLowerCase();
          if (display.includes(query) || email.includes(query) || username.includes(query)) {
            results.push({ id: doc.id, ...data });
          }
        });
      }

      // Deduplicate by id
      const unique = [];
      const seen = new Set();
      for (const r of results) {
        if (!seen.has(r.id)) { seen.add(r.id); unique.push(r); }
      }

      res.json({ success: true, data: unique.slice(0, 10) });
    } catch (error) {
      console.error('❌ Error searching users for invite:', error);
      res.status(500).json({ success: false, message: 'Failed to search users', error: error.message });
    }
  }

  // Invite players to an existing multiplayer game
  async invitePlayers(req, res) {
    try {
      const { gameId } = req.params;
      const { emails = [], userIds = [] } = req.body;
      const gameState = await this.loadMultiplayerGameState(gameId);
      if (!gameState) {
        return res.status(404).json({ success: false, message: 'Game not found' });
      }

      const toInviteEmails = Array.isArray(emails) ? emails.filter(Boolean) : [];
      const toInviteUserIds = Array.isArray(userIds) ? userIds.filter(Boolean) : [];

      // Merge invites
      const existingEmails = new Set(gameState.inviteEmails || []);
      toInviteEmails.forEach(e => existingEmails.add(e));
      gameState.inviteEmails = Array.from(existingEmails);

      const existingUserIds = new Set(gameState.inviteUserIds || []);
      toInviteUserIds.forEach(u => existingUserIds.add(u));
      gameState.inviteUserIds = Array.from(existingUserIds);

      // Regenerate tokens
      gameState.inviteTokens = this.generateInviteTokens(gameState.inviteEmails || [], gameId);
      gameState.lastUpdated = new Date().toISOString();

      await this.saveMultiplayerGameState(gameId, gameState);

      // Optionally send emails (stub)
      if (toInviteEmails.length > 0) {
        await this.sendGameInvitations(gameId, toInviteEmails, 'Host', gameState.topicData?.topic || 'Neural Conquest');
      }

      res.json({ success: true, data: { gameState } });
    } catch (error) {
      console.error('❌ Error inviting players:', error);
      res.status(500).json({ success: false, message: 'Failed to invite players', error: error.message });
    }
  }

  // Submit turn in multiplayer game
  async submitMultiplayerTurn(req, res) {
    try {
      const { gameId } = req.params;
      const {
        playerId,
        action, // 'conquest', 'pass', 'answer'
        territoryId,
        answer,
        questionId
      } = req.body;
      
      console.log('🎯 Processing multiplayer turn:', {
        gameId,
        playerId,
        action,
        territoryId,
        answer: answer !== undefined ? '[hidden]' : undefined
      });
      
      // Load game state
      const gameState = await this.loadMultiplayerGameState(gameId);
      if (!gameState) {
        return res.status(404).json({
          success: false,
          message: 'Game not found'
        });
      }
      
      // Verify it's the player's turn
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      if (currentPlayer.id !== playerId) {
        return res.status(400).json({
          success: false,
          message: 'Not your turn'
        });
      }
      
      let result = null;
      
      if (action === 'conquest') {
        // Process territory conquest attempt
        result = await this.processConquestAttempt(gameState, playerId, territoryId);
      } else if (action === 'answer') {
        // Process question answer
        result = await this.processQuestionAnswer(gameState, playerId, questionId, answer);
      } else if (action === 'pass') {
        // Player passes their turn
        result = { success: true, message: 'Turn passed', advances: true };
      }
      
      if (result.success && result.advances) {
        // Advance to next turn
        this.advanceMultiplayerTurn(gameState);
      }

      gameState.lastUpdated = new Date().toISOString();
      
      // Save updated game state
      await this.saveMultiplayerGameState(gameId, gameState);
      
      // Broadcast turn update
      this.broadcastGameUpdate(gameId, {
        type: 'turn_completed',
        playerId,
        action,
        result,
        gameState
      });
      
      res.json({
        success: true,
        data: result
      });
      
    } catch (error) {
      console.error('❌ Error processing multiplayer turn:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process turn',
        error: error.message
      });
    }
  }

  // Process conquest attempt
  async processConquestAttempt(gameState, playerId, territoryId) {
    const territory = gameState.territories.find(t => t.id === territoryId);
    const player = gameState.players.find(p => p.id === playerId);
    
    if (!territory || !player) {
      return { success: false, message: 'Territory or player not found' };
    }
    
    if (territory.owner) {
      return { success: false, message: 'Territory already owned' };
    }
    
    if (player.synapse < territory.cost) {
      return { success: false, message: 'Insufficient synapse' };
    }
    
    // Generate question for conquest
    let question = await this.generateQuestionForTerritory(gameState, territory);
    if (!question) {
      // Batch-generate 5 more with Gemini fallback based on territory
      try {
        const gen = await this.generateBatchQuestionsForTerritory(gameState, territory, 5);
        // Append to pool and per-territory queue
        gameState.questionPool = [...(gameState.questionPool || []), ...gen];
        const qKey = `territory_${territoryId}`;
        if (!gameState.territoryQuestionQueues) gameState.territoryQuestionQueues = {};
        gameState.territoryQuestionQueues[qKey] = [...(gameState.territoryQuestionQueues[qKey] || []), ...gen];
        // Save
        await this.saveMultiplayerGameState?.(gameState.gameId, gameState);
        await this.saveSession?.(gameState);
        // Try again
        question = await this.generateQuestionForTerritory(gameState, territory);
      } catch (e) {
        console.warn('Batch question generation failed:', e.message);
      }
    }
    
    return {
      success: true,
      message: 'Conquest initiated',
      question,
      advances: false // Don't advance turn until question is answered
    };
  }

  // Generate N questions for a specific territory using Gemini with fallback
  async generateBatchQuestionsForTerritory(gameState, territory, n = 5) {
    try {
      const geminiPrompt = `Generate ${n} multiple-choice questions about "${territory.name}" (${territory.concept}).
Each question must have exactly 4 options with a correct index and short explanation.
Return valid JSON: {"questions": [{"question":"...","options":["A","B","C","D"],"correct":0,"difficulty":2,"concept":"${territory.concept}"}]}`;
      const gs = require('../../services/gemini.service');
      const resp = await gs.generateContent(geminiPrompt, 3);
      let jsonMatch = resp && resp.match(/\{[\s\S]*\}/);
      let parsed = { questions: [] };
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      const out = (parsed.questions || []).slice(0, n).map((q, i) => ({
        id: `gen_${territory.id}_${Date.now()}_${i}`,
        question: q.question,
        options: q.options?.slice(0, 4) || [],
        correct: Math.max(0, Math.min(3, q.correct ?? 0)),
        difficulty: Math.max(1, Math.min(5, q.difficulty ?? (territory.difficulty || 2))),
        concept: q.concept || territory.concept,
        topic: territory.name
      })).filter(q => q.options.length === 4);
      if (out.length > 0) return out;
      throw new Error('Empty Gemini questions');
    } catch (error) {
      // Fallback: synthesize basic questions
      const basic = Array.from({ length: n }).map((_, i) => ({
        id: `fallback_${territory.id}_${Date.now()}_${i}`,
        question: `Which statement best relates to ${territory.name}?`,
        options: [
          `${territory.name} is associated with ${territory.concept}.`,
          `This is unrelated to ${territory.name}.`,
          `The opposite of ${territory.name}.`,
          `Random fact not about ${territory.name}.`
        ],
        correct: 0,
        difficulty: territory.difficulty || 2,
        concept: territory.concept,
        topic: territory.name
      }));
      return basic;
    }
  }

  // Generate a topic-correlated question for a specific territory
  async generateQuestionForTerritory(gameState, territory) {
    try {
      const pool = Array.isArray(gameState.questionPool) ? gameState.questionPool : [];

      // Use per-territory queue first if available
      const qKey = `territory_${territory.id}`;
      const queues = gameState.territoryQuestionQueues || {};
      if (queues[qKey] && queues[qKey].length > 0) {
        const q = { ...queues[qKey].shift() };
        q.territoryId = territory.id;
        return q;
      }
      const conceptCandidates = new Set();
      if (territory.concept) conceptCandidates.add(String(territory.concept).toLowerCase());
      if (Array.isArray(territory.relatedConcepts)) {
        territory.relatedConcepts.forEach(c => c && conceptCandidates.add(String(c).toLowerCase()));
      }
      conceptCandidates.add(String(territory.name || '').toLowerCase());

      // Prefer exact concept match
      let candidates = pool.filter(q => {
        const qc = String(q.concept || q.topic || '').toLowerCase();
        return Array.from(conceptCandidates).some(c => c && (qc.includes(c) || c.includes(qc)));
      });

      // Fallback: any question in pool
      if (candidates.length === 0 && pool.length > 0) {
        candidates = pool.slice();
      }

      if (candidates.length === 0) {
        // Last resort: synthesize a simple question from territory metadata
        const synth = {
          id: `synth_${territory.id}_${Date.now()}`,
          question: `Which statement best relates to ${territory.name}?`,
          options: [
            `${territory.name} is related to ${territory.concept || 'this topic'}.`,
            `This has nothing to do with ${territory.name}.`,
            `The opposite concept of ${territory.name}.`,
            `Random fact unrelated to ${territory.name}.`
          ],
          correct: 0,
          difficulty: territory.difficulty || 2,
          concept: territory.concept || 'general'
        };
        synth.territoryId = territory.id;
        return synth;
      }

      // Pick one and attach territoryId
      const q = { ...candidates[Math.floor(Math.random() * candidates.length)] };
      q.territoryId = territory.id;
      if (!q.id) q.id = `pool_${territory.id}_${Date.now()}`;
      return q;
    } catch (error) {
      console.error('❌ generateQuestionForTerritory error:', error);
      return null;
    }
  }

  // Build per-territory question queues
  assignQuestionsToTerritories(session) {
    const map = {};
    const territories = session.territories || {};
    const pool = Array.isArray(session.questionPool) ? session.questionPool : [];
    const lower = (s) => (s || '').toString().toLowerCase();
    Object.values(territories).forEach(t => {
      const key = `territory_${t.id}`;
      const name = lower(t.name);
      const concept = lower(Array.isArray(t.relatedConcepts) ? t.relatedConcepts[0] : t.concept);
      const matches = pool.filter(q => {
        const qc = lower(q.concept || q.topic || '');
        const qq = lower(q.question);
        return (qc && (qc.includes(concept) || qc.includes(name) || concept.includes(qc) || name.includes(qc))) ||
               (qq && (qq.includes(name) || qq.includes(concept)));
      });
      map[key] = matches.slice(0, 50); // cap queue length
    });
    session.territoryQuestionQueues = map;
  }

  // Process question answer
  async processQuestionAnswer(gameState, playerId, questionId, answer) {
    const player = gameState.players.find(p => p.id === playerId);
    const question = gameState.questionPool.find(q => q.id === questionId);
    
    if (!player || !question) {
      return { success: false, message: 'Player or question not found' };
    }
    
    const isCorrect = answer === (question.correct || question.correctAnswer);
    
    if (isCorrect) {
      // Correct answer - grant territory ownership and rewards
      const territory = gameState.territories.find(t => t.id === question.territoryId);
      if (territory) {
        territory.owner = playerId;
        territory.masteryLevel = 1.0;
        player.synapse += Math.floor(territory.cost * 0.5); // Reward
        player.territories.push(territory.id);
        player.correctAnswers = (player.correctAnswers || 0) + 1;
      }
      
      return {
        success: true,
        message: 'Territory conquered!',
        isCorrect: true,
        advances: true
      };
    } else {
      // Wrong answer - penalty
      player.synapse = Math.max(0, player.synapse - Math.floor(question.territory?.cost * 0.3 || 100));
      player.incorrectAnswers = (player.incorrectAnswers || 0) + 1;
      
      return {
        success: true,
        message: 'Conquest failed',
        isCorrect: false,
        advances: true
      };
    }
  }

  // Advance multiplayer turn
  advanceMultiplayerTurn(gameState) {
    // Find next active player
    let nextPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
    let attempts = 0;
    
    while (attempts < gameState.players.length) {
      const nextPlayer = gameState.players[nextPlayerIndex];
      if (nextPlayer.status === 'connected' || nextPlayer.isAI) {
        break;
      }
      nextPlayerIndex = (nextPlayerIndex + 1) % gameState.players.length;
      attempts++;
    }
    
    gameState.currentPlayerIndex = nextPlayerIndex;
    
    // Increment turn count when we complete a full round
    if (nextPlayerIndex === 0) {
      gameState.turn++;
    }
    
    // Update game phase
    const nextPlayer = gameState.players[nextPlayerIndex];
    gameState.phase = nextPlayer.isAI ? 'AI_TURN' : 'PLAYER_TURN';
    
    console.log(`🔄 Turn advanced to ${nextPlayer.name} (${nextPlayer.id})`);
    
    // If it's an AI turn, schedule AI decision making
    if (nextPlayer.isAI) {
      setTimeout(() => this.executeAITurnMultiplayer(gameState.gameId), 2000);
    }
  }

  // 🤖 AI OPPONENT BEHAVIOR AND DECISION MAKING
  async executeAITurnMultiplayer(gameId) {
    try {
      const gameState = await this.loadMultiplayerGameState(gameId);
      if (!gameState) return;
      
      const aiPlayer = gameState.players[gameState.currentPlayerIndex];
      if (!aiPlayer.isAI) return;
      
      console.log(`🤖 AI ${aiPlayer.name} is making their turn...`);
      
      // AI decision making logic
      const aiDecision = this.makeAIDecision(gameState, aiPlayer);
      
      if (aiDecision.action === 'conquest') {
        // AI attempts to conquer a territory
        const result = await this.processAIConquest(gameState, aiPlayer, aiDecision.territory);
        
        if (result.success) {
          this.advanceMultiplayerTurn(gameState);
          await this.saveMultiplayerGameState(gameId, gameState);
          
          this.broadcastGameUpdate(gameId, {
            type: 'ai_turn_completed',
            aiPlayer,
            action: 'conquest',
            result,
            gameState
          });
        }
      } else {
        // AI passes turn
        this.advanceMultiplayerTurn(gameState);
        await this.saveMultiplayerGameState(gameId, gameState);
        
        this.broadcastGameUpdate(gameId, {
          type: 'ai_turn_completed',
          aiPlayer,
          action: 'pass',
          gameState
        });
      }

    } catch (error) {
      console.error('❌ Error executing AI turn:', error);
    }
  }

  // AI decision making algorithm
  makeAIDecision(gameState, aiPlayer) {
    const availableTerritories = gameState.territories.filter(t => !t.owner);
    
    if (availableTerritories.length === 0) {
      return { action: 'pass' };
    }
    
    // AI strategy: prioritize territories by value/cost ratio and difficulty
    const territoryScores = availableTerritories.map(territory => {
      const valueScore = territory.cost || 500;
      const difficultyPenalty = (territory.difficulty || 1) * 100;
      const affordabilityBonus = aiPlayer.synapse >= territory.cost ? 200 : -500;
      
      return {
        territory,
        score: valueScore - difficultyPenalty + affordabilityBonus
      };
    });
    
    // Sort by score and pick the best option
    territoryScores.sort((a, b) => b.score - a.score);
    
    const bestTerritory = territoryScores[0];
    
    if (bestTerritory.score > 0 && aiPlayer.synapse >= bestTerritory.territory.cost) {
      return {
        action: 'conquest',
        territory: bestTerritory.territory
      };
    }
    
    return { action: 'pass' };
  }

  // Process AI conquest attempt
  async processAIConquest(gameState, aiPlayer, territory) {
    if (aiPlayer.synapse < territory.cost) {
      return { success: false, message: 'AI insufficient synapse' };
    }
    
    // AI has strategic success rate based on difficulty
    const difficulty = territory.difficulty || 2;
    const baseSuccessRate = 0.7; // 70% base success rate
    const difficultyPenalty = (difficulty - 1) * 0.1; // -10% per difficulty level above 1
    const finalSuccessRate = Math.max(0.3, baseSuccessRate - difficultyPenalty);
    
    const success = Math.random() < finalSuccessRate;
    
    if (success) {
      // AI conquers territory
      territory.owner = aiPlayer.id;
      territory.masteryLevel = 1.0;
      aiPlayer.synapse += Math.floor(territory.cost * 0.3); // AI gets smaller reward
      aiPlayer.territories.push(territory.id);
      aiPlayer.correctAnswers = (aiPlayer.correctAnswers || 0) + 1;
      
      console.log(`🤖 AI ${aiPlayer.name} successfully conquered ${territory.name}`);
      
      return {
        success: true,
        message: `AI conquered ${territory.name}`,
        territory
      };
    } else {
      // AI fails conquest
      aiPlayer.synapse = Math.max(0, aiPlayer.synapse - Math.floor(territory.cost * 0.2));
      aiPlayer.incorrectAnswers = (aiPlayer.incorrectAnswers || 0) + 1;
      
      console.log(`🤖 AI ${aiPlayer.name} failed to conquer ${territory.name}`);
      
      return {
        success: true,
        message: `AI failed to conquer ${territory.name}`,
        failed: true
      };
    }
  }

  // Email invitations placeholder
  async sendGameInvitations(gameId, emails, hostName, topic) {
    console.log('📧 Sending invitations for game:', gameId, 'to:', emails);
    // TODO: Implement email sending
  }

  // 🕐 TIMER MANAGEMENT METHODS

  // Start game timer
  async startTimer(req, res) {
    try {
      const { sessionId } = req.body;
      
      const session = await this.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ success: false, error: 'Session not found' });
      }

      // Start the timer
      session.gameState.timer.isActive = true;
      session.gameState.timer.startedAt = new Date().toISOString();
      session.gameState.timer.pausedAt = null;
      session.gameState.phase = 'playing';

      await this.saveSession(session);

      res.json({
        success: true,
        timer: session.gameState.timer,
        message: 'Timer started'
      });

    } catch (error) {
      console.error('❌ Error starting timer:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start timer',
        details: error.message
      });
    }
  }

  // Pause game timer
  async pauseTimer(req, res) {
    try {
      const { sessionId } = req.body;
      
      const session = await this.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ success: false, error: 'Session not found' });
      }

      // Pause the timer
      if (session.gameState.timer.isActive) {
        session.gameState.timer.isActive = false;
        session.gameState.timer.pausedAt = new Date().toISOString();
        
        // Calculate time remaining
        const startTime = new Date(session.gameState.timer.startedAt).getTime();
        const pauseTime = new Date(session.gameState.timer.pausedAt).getTime();
        const elapsedSeconds = Math.floor((pauseTime - startTime) / 1000);
        session.gameState.timer.timeRemaining = Math.max(0, session.gameState.timer.totalTime - elapsedSeconds);
      }

      await this.saveSession(session);

      res.json({
        success: true,
        timer: session.gameState.timer,
        message: 'Timer paused'
      });

    } catch (error) {
      console.error('❌ Error pausing timer:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to pause timer',
        details: error.message
      });
    }
  }

  // Get current timer state
  async getTimerState(req, res) {
    try {
      const { sessionId } = req.params;
      
      const session = await this.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ success: false, error: 'Session not found' });
      }

      let currentTimeRemaining = session.gameState.timer.timeRemaining;

      // Calculate real-time remaining if timer is active
      if (session.gameState.timer.isActive && session.gameState.timer.startedAt) {
        const startTime = new Date(session.gameState.timer.startedAt).getTime();
        const currentTime = Date.now();
        const elapsedSeconds = Math.floor((currentTime - startTime) / 1000);
        currentTimeRemaining = Math.max(0, session.gameState.timer.totalTime - elapsedSeconds);
        
        // Update the session with current time remaining
        session.gameState.timer.timeRemaining = currentTimeRemaining;
        
        // Check if time is up
        if (currentTimeRemaining <= 0) {
          session.gameState.timer.isActive = false;
          session.gameState.phase = 'game_over';
          session.gameState.endReason = 'timer_expired';
          await this.saveSession(session);
        }
      }

      res.json({
        success: true,
        timer: {
          ...session.gameState.timer,
          timeRemaining: currentTimeRemaining
        }
      });

    } catch (error) {
      console.error('❌ Error getting timer state:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get timer state',
        details: error.message
      });
    }
  }


}

module.exports = NeuralConquestController;
