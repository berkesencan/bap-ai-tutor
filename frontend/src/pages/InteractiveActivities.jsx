import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { api, neuralConquestAPI } from '../services/api';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import './InteractiveActivities.css';

// Game Mode Definitions
const GAME_MODES = [
  {
    id: 'neural-conquest',
    title: 'Neural Conquest',
    icon: '🧠',
    tagline: 'Strategic Knowledge Empire',
    description: 'Build your academic empire by conquering knowledge territories through strategic battles.',
    color: '#4ecdc4',
    skills: ['Strategic Thinking', 'Domain Mastery', 'Competitive Analysis'],
    industryRelevance: ['Consulting', 'Management', 'Strategy'],
    partnerCompanies: ['McKinsey', 'BCG', 'Goldman Sachs']
  },
  {
    id: 'mystery-syndicate',
    title: 'Knowledge Syndicate',
    icon: '🕵️',
    tagline: 'Collaborative Investigation',
    description: 'Join secret academic societies to solve complex mysteries spanning multiple disciplines.',
    color: '#ff6b6b',
    skills: ['Research Excellence', 'Collaboration', 'Critical Analysis'],
    industryRelevance: ['Research', 'Academia', 'Innovation'],
    partnerCompanies: ['MIT Labs', 'Stanford Research', 'NASA']
  },
  {
    id: 'synthesis-arena',
    title: 'Synthesis Arena',
    icon: '⚡',
    tagline: 'Rapid Concept Fusion',
    description: 'High-speed battles where ideas collide and evolve into breakthrough insights.',
    color: '#ffeaa7',
    skills: ['Rapid Learning', 'Pattern Recognition', 'Innovation'],
    industryRelevance: ['Technology', 'Startups', 'Product Development'],
    partnerCompanies: ['Y Combinator', 'Tesla', 'OpenAI']
  }
];

const InteractiveActivities = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('my-activities');
  const [selectedCourse, setSelectedCourse] = useState('general');
  const [courses, setCourses] = useState([]);
  const [activitiesByCourse, setActivitiesByCourse] = useState({});
  const [playerStats, setPlayerStats] = useState({
    totalXP: 0,
    currentLevel: 'Novice Scholar',
    badges: [],
    completedActivities: 0,
    weeklyProgress: 0
  });
  const [loading, setLoading] = useState(true);

  // My Activities State
  const [selectedGameMode, setSelectedGameMode] = useState(null);
  const [gameStats, setGameStats] = useState({
    'neural-conquest': { played: 0, avgScore: 0, bestStreak: 0, territoriesOwned: 0 },
    'mystery-syndicate': { played: 0, avgScore: 0, mysteriesSolved: 0, collaborationRating: 0 },
    'synthesis-arena': { played: 0, avgScore: 0, synthesisStreak: 0, innovationScore: 0 }
  });

  // Public Library State
  const [publicActivities, setPublicActivities] = useState([]);
  const [activeGames, setActiveGames] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterDifficulty, setFilterDifficulty] = useState('all');

  // AI Generate State
  const [aiDescription, setAiDescription] = useState('');
  const [aiCourse, setAiCourse] = useState('');
  const [aiGameMode, setAiGameMode] = useState('synthesis-arena');
  const [aiDifficulty, setAiDifficulty] = useState('intermediate');
  const [aiDuration, setAiDuration] = useState('30');
  const [isGenerating, setIsGenerating] = useState(false);

  // Neural Conquest topic selection states
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [topicDescription, setTopicDescription] = useState('');
  const [generatingTopics, setGeneratingTopics] = useState(false);
  const [generatedTopics, setGeneratedTopics] = useState(null);
  const [selectedTopics, setSelectedTopics] = useState(new Set()); // Track selected topics
  const [gameModeType, setGameModeType] = useState('single'); // 'single' | 'multiplayer'
  const [inviteQuery, setInviteQuery] = useState('');
  const [inviteResults, setInviteResults] = useState([]);
  const [selectedInvites, setSelectedInvites] = useState([]);
  
  // NEW: 3D model generation states
  const [generating3DModels, setGenerating3DModels] = useState(false);
  const [modelGenerationProgress, setModelGenerationProgress] = useState({
    current: 0,
    total: 0,
    currentModel: '',
    stage: 'preparing', // 'preparing', 'generating', 'completing'
    detailedProgress: [] // Track individual model progress
  });
  const [socket, setSocket] = useState(null);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (showTopicModal) {
      document.body.style.overflow = 'hidden';
      
      // Add escape key listener
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          closeTopicModal();
        }
      };
      
      document.addEventListener('keydown', handleEscape);
      
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup when component unmounts
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showTopicModal]);

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  // Initialize Socket.IO connection for real-time progress
  useEffect(() => {
    if (generating3DModels && !socket) {
      console.log('🔌 Connecting to Socket.IO for real-time progress...');
      const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      console.log('🔗 Socket URL:', socketUrl);
      const newSocket = io(socketUrl);
      
      newSocket.on('connect', () => {
        console.log('✅ Connected to Socket.IO:', newSocket.id);
      });

      // Listen for overall generation progress
      newSocket.on('generation-progress', (data) => {
        try {
          console.log('📡 Generation progress:', data);
          if (data && typeof data === 'object') {
            setModelGenerationProgress(prev => ({
              ...prev,
              current: data.current || 0,
              total: data.total || 0,
              currentModel: data.currentModel || '',
              stage: data.stage === 'starting' ? 'generating' : data.stage === 'completed' ? 'completing' : prev.stage
            }));
          }
        } catch (error) {
          console.warn('⚠️ Error handling generation progress:', error);
        }
      });

      // Listen for individual model progress
      newSocket.on('model-progress', (data) => {
        try {
          console.log('🎨 Model progress:', data);
          if (data && typeof data === 'object' && data.objectName) {
            setModelGenerationProgress(prev => ({
              ...prev,
              detailedProgress: [
                ...(prev.detailedProgress || []).filter(p => p.objectName !== data.objectName),
                {
                  objectName: data.objectName,
                  stage: data.stage || 'unknown',
                  description: data.description || '',
                  timestamp: data.timestamp || new Date().toISOString()
                }
              ]
            }));
          }
        } catch (error) {
          console.warn('⚠️ Error handling model progress:', error);
        }
      });

      newSocket.on('disconnect', () => {
        console.log('❌ Disconnected from Socket.IO');
      });

      newSocket.on('connect_error', (error) => {
        console.error('🔌 Socket.IO connection error:', error);
      });

      setSocket(newSocket);
    }

    // Cleanup socket when not generating
    return () => {
      if (socket && !generating3DModels) {
        console.log('🔌 Disconnecting Socket.IO...');
        socket.disconnect();
        setSocket(null);
      }
    };
  }, [generating3DModels, socket]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      if (!currentUser) {
        setLoading(false);
        return;
      }

      // Get Firebase auth token
      const token = await currentUser.getIdToken();
      
      // Fetch user's courses and activities
      const coursesResponse = await fetch('/api/courses', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (coursesResponse.ok) {
        const coursesData = await coursesResponse.json();
        setCourses(coursesData.data?.courses || []);
      }

      // Fetch player stats and game data (also fetch active games)
      const statsResponse = await fetch('/api/activities/my-activities', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        if (statsData.success && statsData.data) {
          setPlayerStats(statsData.data.playerStats || playerStats);
          setGameStats(statsData.data.gameStats || gameStats);
          if (statsData.data.activeGames) setActiveGames(statsData.data.activeGames);
          // Update courses with activity data if available
          if (statsData.data.courses) {
            setCourses(statsData.data.courses);
          }
        }
      }

      // Fetch public activities
      const publicResponse = await fetch('/api/activities/public');
      if (publicResponse.ok) {
        const publicData = await publicResponse.json();
        if (publicData.success && publicData.data) {
          setPublicActivities(publicData.data.activities || []);
        }
      }

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const startActivity = async (gameMode, courseId = null) => {
    try {
      if (!currentUser) {
        alert('Please log in to start activities');
        return;
      }

      console.log(`🎮 Starting activity: ${gameMode}, courseId: ${courseId}`);

      // For Neural Conquest, show topic selection modal first
      if (gameMode === 'neural-conquest') {
        setSelectedGameMode(gameMode);
        setShowTopicModal(true);
        return;
      }

      // For other game modes, proceed with normal flow
      const token = await currentUser.getIdToken();
      
      const requestBody = {
        gameMode,
        courseId: courseId || 'general',
        settings: {
          anonymousMode: true,
          adaptiveDifficulty: true,
          detailedAnalytics: true
        }
      };

      console.log('📤 Sending request:', requestBody);
      
      const response = await fetch('/api/activities/start-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📥 Response status:', response.status);
      
      if (!response.ok) {
        console.error('❌ HTTP error:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error response body:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}\nResponse: ${errorText}`);
      }

      const data = await response.json();
      console.log('📥 Response data:', data);
      
      if (data.success && data.sessionId) {
        // For other game modes, show success message for now
        alert(`🎮 ${gameMode.replace('-', ' ').toUpperCase()} Session Started!\n\nSession ID: ${data.sessionId}\nCourse: ${data.data?.courseName || 'Unknown'}\n\nThis game mode is coming soon!`);
      } else {
        console.error('❌ API returned error:', data);
        const errorMessage = data.message || data.error || 'Unknown error';
        const debugInfo = data.debug ? `\n\nDebug Info:\n${JSON.stringify(data.debug, null, 2)}` : '';
        alert(`Failed to start activity: ${errorMessage}${debugInfo}`);
      }
    } catch (error) {
      console.error('❌ Error starting activity:', error);
      console.error('Error stack:', error.stack);
      
      let errorMessage = 'Failed to start activity. Please try again.';
      
      if (error.message.includes('NetworkError') || error.message.includes('fetch')) {
        errorMessage = 'Network connection error. Please check your internet connection and try again.';
      } else if (error.message.includes('HTTP 401')) {
        errorMessage = 'Authentication error. Please log out and log back in.';
      } else if (error.message.includes('HTTP 500')) {
        errorMessage = 'Server error. The development team has been notified. Please try again in a few minutes.';
      } else if (error.message.includes('HTTP 400')) {
        errorMessage = 'Invalid request. Please refresh the page and try again.';
      }
      
      alert(`❌ ${errorMessage}\n\nTechnical details: ${error.message}`);
    }
  };

  const generateAIActivity = async () => {
    if (!aiDescription.trim()) {
      alert('Please provide a description for your AI activity');
      return;
    }

    if (!currentUser) {
      alert('Please log in to generate activities');
      return;
    }

    try {
      setIsGenerating(true);
      const token = await currentUser.getIdToken();
      
      const response = await fetch('/api/activities/generate-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          description: aiDescription,
          courseId: aiCourse || 'general',
          gameMode: aiGameMode,
          difficulty: aiDifficulty,
          duration: parseInt(aiDuration),
          learningObjectives: [],
          materials: []
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`🎉 AI Activity Generated Successfully!\n\nTitle: ${data.data.title}\n\nYou can now find this activity in your course activities.`);
        setAiDescription('');
        setAiCourse('');
        setAiGameMode('synthesis-arena');
        setAiDifficulty('intermediate');
        setAiDuration('30');
      } else {
        alert(`Failed to generate activity: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error generating AI activity:', error);
      alert('Failed to generate activity. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateTopicsFromDescription = async () => {
    if (!topicDescription.trim()) {
      alert('Please describe what kind of trivia you want to play');
      return;
    }

    try {
      setGeneratingTopics(true);
      const token = await currentUser.getIdToken();

      console.log('🎨 Generating topics from description:', topicDescription);

      const response = await fetch('/api/ai/neural-conquest-topics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          topicDescription: topicDescription,
          difficulty: 'medium',
          subjectArea: inferSubjectArea(topicDescription)
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📋 Generated topics response:', data);

      if (data.success && data.data) {
        setGeneratedTopics(data.data);
        console.log(`✅ Generated ${data.data.topics.length} topics for selection`);
      } else {
        throw new Error(data.message || 'Failed to generate topics');
      }
    } catch (error) {
      console.error('❌ Error generating topics:', error);
      alert(`Failed to generate topics: ${error.message}`);
    } finally {
      setGeneratingTopics(false);
    }
  };

  const inferSubjectArea = (description) => {
    const lowerDesc = description.toLowerCase();
    if (lowerDesc.includes('geography') || lowerDesc.includes('countries') || lowerDesc.includes('continents')) return 'geography';
    if (lowerDesc.includes('history') || lowerDesc.includes('ancient') || lowerDesc.includes('war')) return 'history';
    if (lowerDesc.includes('science') || lowerDesc.includes('physics') || lowerDesc.includes('chemistry')) return 'science';
    if (lowerDesc.includes('math') || lowerDesc.includes('algebra') || lowerDesc.includes('calculus')) return 'mathematics';
    if (lowerDesc.includes('tech') || lowerDesc.includes('computer') || lowerDesc.includes('ai')) return 'technology';
    if (lowerDesc.includes('art') || lowerDesc.includes('music') || lowerDesc.includes('culture')) return 'art';
    if (lowerDesc.includes('bio') || lowerDesc.includes('anatomy') || lowerDesc.includes('organism')) return 'biology';
    return 'general';
  };

  const startNeuralConquestWithTopics = async () => {
    if (!generatedTopics || !generatedTopics.topics || selectedTopics.size === 0) {
      alert('Please select at least one topic to start the game');
      return;
    }

    try {
      const token = await currentUser.getIdToken();

      console.log('🚀 Starting Neural Conquest with selected topics');
      
      // Filter to only include user-selected topics
      const selectedTopicObjects = generatedTopics.topics.filter(topic => 
        selectedTopics.has(topic.name)
      );

      console.log('Selected topics for 3D generation:', selectedTopicObjects.map(t => t.name));

      // Initialize 3D model generation progress
      setGenerating3DModels(true);
      setModelGenerationProgress({
        current: 0,
        total: selectedTopicObjects.length,
        currentModel: selectedTopicObjects[0]?.name || 'Preparing...',
        stage: 'preparing'
      });

      // STEP 1: Generate 3D models for selected topics
      console.log('🎨 Generating 3D models for selected topics...');
      setModelGenerationProgress(prev => ({
        ...prev,
        stage: 'generating',
        currentModel: `Generating 3D models for ${selectedTopicObjects.length} topics...`
      }));

      const modelResponse = await fetch('/api/ai/generate-3d-models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          selectedTopics: selectedTopicObjects,
          sessionData: {
            topicDescription: topicDescription,
            difficulty: generatedTopics.difficulty,
            subjectArea: generatedTopics.subjectArea
          }
        })
      });

      if (!modelResponse.ok) {
        throw new Error(`Failed to generate 3D models: ${modelResponse.status} ${modelResponse.statusText}`);
      }

      const modelData = await modelResponse.json();
      console.log('🎯 3D models generated:', modelData);

      if (!modelData.success) {
        throw new Error(modelData.message || 'Failed to generate 3D models');
      }

      // Update progress
      setModelGenerationProgress(prev => ({
        ...prev,
        current: selectedTopicObjects.length,
        stage: 'completing',
        currentModel: `3D models ready! Creating game world...`
      }));

      // STEP 2: Start game session with 3D model data
      console.log('🎮 Starting game session with 3D models...');
      let sessionResponse;
      if (gameModeType === 'single') {
        sessionResponse = await fetch('/api/activities/start-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            gameMode: 'neural-conquest',
            courseId: selectedCourse || 'general',
            settings: {
              anonymousMode: true,
              adaptiveDifficulty: true,
              detailedAnalytics: true,
              customTopics: modelData.data.topics, // Topics with 3D models
              questions: generatedTopics.questions, // Include questions from initial generation
              topicDescription: topicDescription,
              has3DModels: true // Flag to indicate 3D models are ready
            }
          })
        });
      } else {
        // Multiplayer create
        const payload = {
          gameConfig: {
            topic: topicDescription || 'Custom Topics',
            difficulty: generatedTopics.difficulty || 'medium',
            timeLimit: 300,
            allowSpectators: false,
          },
          inviteEmails: selectedInvites.map(u => u.email),
          maxPlayers: Math.max(2, Math.min(6, (selectedInvites.length + 1))),
          gameMode: 'multiplayer'
        };
        sessionResponse = await fetch('/api/activities/neural-conquest/multiplayer', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      }

      if (!sessionResponse.ok) {
        const errorText = await sessionResponse.text();
        throw new Error(`HTTP ${sessionResponse.status}: ${sessionResponse.statusText}\nResponse: ${errorText}`);
      }

      const sessionData = await sessionResponse.json();
      console.log('🎮 Neural Conquest session created:', sessionData);

      if (gameModeType === 'single' && sessionData.success && sessionData.session && sessionData.session.id) {
        // Close modal and navigate to game
        setShowTopicModal(false);
        setTopicDescription('');
        setGeneratedTopics(null);
        setSelectedGameMode('');
        setSelectedTopics(new Set());
        setGenerating3DModels(false);
        setModelGenerationProgress({
          current: 0,
          total: 0,
          currentModel: '',
          stage: 'preparing',
          detailedProgress: []
        });

        // Cleanup socket connection
        if (socket) {
          socket.disconnect();
          setSocket(null);
        }
        
        console.log('🧠 Navigating to Neural Conquest with sessionId:', sessionData.session.id);
        window.location.href = `/neural-conquest/${sessionData.session.id}`;
      } else if (gameModeType === 'multiplayer' && sessionData.success && sessionData.data?.gameId) {
        // Navigate to multiplayer game id
        setShowTopicModal(false);
        setTopicDescription('');
        setGeneratedTopics(null);
        setSelectedGameMode('');
        setSelectedTopics(new Set());
        setGenerating3DModels(false);
        setModelGenerationProgress({ current: 0, total: 0, currentModel: '', stage: 'preparing', detailedProgress: [] });
        if (socket) { socket.disconnect(); setSocket(null); }
        window.location.href = `/neural-conquest/${sessionData.data.gameId}`;
      } else {
        throw new Error(sessionData.message || sessionData.error || 'Failed to start Neural Conquest');
      }
    } catch (error) {
      console.error('❌ Error starting Neural Conquest:', error);
      alert(`Failed to start Neural Conquest: ${error.message}`);
      setGenerating3DModels(false);
      setModelGenerationProgress({
        current: 0,
        total: 0,
        currentModel: '',
        stage: 'preparing',
        detailedProgress: []
      });

      // Cleanup socket connection on error
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
    }
  };

  const closeTopicModal = () => {
    setShowTopicModal(false);
    setTopicDescription('');
    setGeneratedTopics(null);
    setSelectedTopics(new Set());
    setGeneratingTopics(false);
    
    // Reset 3D generation state
    setGenerating3DModels(false);
    setModelGenerationProgress({
      current: 0,
      total: 0,
      currentModel: '',
      stage: 'preparing',
      detailedProgress: []
    });
    
    // Cleanup socket if exists
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
  };

  const selectExampleTopic = (topic) => {
    setTopicDescription(topic);
  };

  const toggleTopicSelection = (topicName) => {
    const newSelected = new Set(selectedTopics);
    if (newSelected.has(topicName)) {
      newSelected.delete(topicName);
    } else {
      newSelected.add(topicName);
    }
    setSelectedTopics(newSelected);
  };

  const canStartGame = () => {
    return generatedTopics && generatedTopics.topics && selectedTopics.size > 0;
  };

  const renderPlayerDashboard = () => (
    <div className="player-dashboard-header">
      <div className="dashboard-stats">
        <div className="stat-item">
          <span className="stat-icon">⭐</span>
          <div className="stat-content">
            <div className="stat-value">{playerStats.totalXP}</div>
            <div className="stat-label">Total XP</div>
          </div>
        </div>
        <div className="stat-item">
          <span className="stat-icon">🎓</span>
          <div className="stat-content">
            <div className="stat-value">{playerStats.currentLevel}</div>
            <div className="stat-label">Current Level</div>
          </div>
        </div>
        <div className="stat-item">
          <span className="stat-icon">🏆</span>
          <div className="stat-content">
            <div className="stat-value">{playerStats.completedActivities}</div>
            <div className="stat-label">Activities Completed</div>
          </div>
        </div>
        <div className="stat-item">
          <span className="stat-icon">📈</span>
          <div className="stat-content">
            <div className="stat-value">{playerStats.weeklyProgress}%</div>
            <div className="stat-label">Weekly Progress</div>
          </div>
        </div>
      </div>
      <div className="dashboard-actions">
        <button className="portfolio-btn">View Portfolio</button>
        <button className="analytics-btn">Career Analytics</button>
      </div>
    </div>
  );

  const renderMyActivities = () => (
    <div className="my-activities-section">
      {renderPlayerDashboard()}
      
      <div className="course-selector">
        <label htmlFor="course-select">Select Course:</label>
        <select 
          id="course-select"
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
          className="form-select"
        >
          <option value="general">General Knowledge</option>
          {courses.map(course => (
            <option key={course.id} value={course.id}>{course.name}</option>
          ))}
        </select>
      </div>

      <div className="activities-grid">
        {/* Show active Neural Conquest games if any */}
        {activeGames && activeGames.length > 0 && (
          <div className="activity-card general-activity">
            <div className="activity-header">
              <div className="activity-icon">🧠</div>
              <div className="activity-info">
                <h3>Resume Neural Conquest</h3>
                <p className="activity-description">Continue your active or invited games.</p>
              </div>
            </div>
            <div className="activity-actions" style={{ flexWrap: 'wrap' }}>
              {activeGames
                .filter(g => g.status !== 'invited')
                .map(game => (
                  <div key={game.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button className="play-btn primary" onClick={() => (window.location.href = `/neural-conquest/${game.id}`)}>
                      <span className="play-icon">▶️</span>
                      {game.mode === 'multiplayer' ? 'MP' : 'SP'} • {game.topic} • {game.status || 'active'}
                    </button>
                    <button className="preview-btn" title="Delete" onClick={async () => {
                      try {
                        console.log('🗑️ Deleting game:', game.id, game.mode);
                        let result;
                        if (game.mode === 'multiplayer') {
                          result = await neuralConquestAPI.deleteOrLeaveMultiplayer(game.id);
                        } else {
                          result = await neuralConquestAPI.deleteSingleSession(game.id);
                        }
                        console.log('✅ Delete result:', result);
                        
                        if (result?.success !== false) {
                          // refresh list
                          fetchData();
                          toast.success('Game deleted successfully!');
                        } else {
                          console.error('❌ Delete failed:', result);
                          toast.error(result?.message || 'Failed to delete game');
                        }
                      } catch (e) {
                        console.error('❌ Delete error:', e);
                        toast.error(e?.response?.data?.message || e?.message || 'Failed to delete game');
                      }
                    }}>🗑️</button>
                  </div>
                ))}
            </div>
          </div>
        )}

        {activeGames && activeGames.some(g => g.status === 'invited') && (
          <div className="activity-card">
            <div className="activity-header">
              <div className="activity-icon">✉️</div>
              <div className="activity-info">
                <h3>Invitations</h3>
                <p className="activity-description">Games you’ve been invited to join.</p>
              </div>
            </div>
            <div className="activity-actions" style={{ flexWrap: 'wrap' }}>
              {activeGames.filter(g => g.status === 'invited').map(game => (
                <div key={game.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button className="play-btn primary" onClick={() => (window.location.href = `/neural-conquest/${game.id}`)}>
                    <span className="play-icon">▶️</span>
                    Invite • {game.topic}
                  </button>
                  <button className="preview-btn" title="Decline" onClick={async () => {
                    try {
                      console.log('🗑️ Declining invitation:', game.id);
                      const result = await neuralConquestAPI.deleteOrLeaveMultiplayer(game.id);
                      console.log('✅ Decline result:', result);
                      
                      if (result?.success !== false) {
                        fetchData();
                        toast.success('Invitation declined!');
                      } else {
                        console.error('❌ Decline failed:', result);
                        toast.error(result?.message || 'Failed to decline invitation');
                      }
                    } catch (e) {
                      console.error('❌ Decline error:', e);
                      toast.error(e?.response?.data?.message || e?.message || 'Failed to decline invitation');
                    }
                  }}>🗑️</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {GAME_MODES.map(mode => (
          <div key={mode.id} className="activity-card">
            <div className="activity-header">
              <div className="activity-icon">{mode.icon}</div>
              <div className="activity-info">
                <h3>{mode.title}</h3>
                <p className="activity-tagline">{mode.tagline}</p>
                <p className="activity-description">{mode.description}</p>
              </div>
            </div>

            <div className="activity-meta">
              <div className="meta-item">
                <span className="meta-label">Skills:</span>
                <span className="meta-value">{mode.skills.join(', ')}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Industry:</span>
                <span className="meta-value">{mode.industryRelevance.join(', ')}</span>
              </div>
            </div>

            <div className="activity-stats">
              <div className="stat">
                <span className="stat-icon">🎯</span>
                <span>Level {gameStats[mode.id]?.played > 0 ? 'Advanced' : 'Beginner'}</span>
              </div>
              <div className="stat">
                <span className="stat-icon">🏆</span>
                <span>{gameStats[mode.id]?.avgScore || 0}% avg</span>
              </div>
              <div className="stat">
                <span className="stat-icon">🔥</span>
                <span>{gameStats[mode.id]?.bestStreak || 0} streak</span>
              </div>
            </div>

            <div className="activity-partners">
              <span className="partners-label">🏢 Industry Partners:</span>
              <div className="partners-list">
                {mode.partnerCompanies.map(partner => (
                  <span key={partner} className="partner-badge">{partner}</span>
                ))}
              </div>
            </div>

            <div className="activity-actions">
              <button 
                className="play-btn primary"
                onClick={() => startActivity(mode.id, selectedCourse === 'general' ? null : selectedCourse)}
              >
                <span className="play-icon">▶️</span>
                Play Now
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPublicLibrary = () => (
    <div className="public-library-section">
      <div className="library-header">
        <h2>🌍 Public Activity Library</h2>
        <p>Discover and play activities created by the community</p>
      </div>

      <div className="search-filters">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search activities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button className="search-button">🔍</button>
        </div>
        
        <div className="filters">
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Types</option>
            <option value="neural-conquest">Neural Conquest</option>
            <option value="mystery-syndicate">Knowledge Syndicate</option>
            <option value="synthesis-arena">Synthesis Arena</option>
          </select>
          
          <select 
            value={filterDifficulty} 
            onChange={(e) => setFilterDifficulty(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Difficulties</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
            <option value="expert">Expert</option>
          </select>
        </div>
      </div>

      <div className="activities-grid">
        {publicActivities
          .filter(activity => {
            const matchesSearch = activity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                activity.description.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesType = filterType === 'all' || activity.gameMode === filterType;
            const matchesDifficulty = filterDifficulty === 'all' || activity.difficulty === filterDifficulty;
            return matchesSearch && matchesType && matchesDifficulty;
          })
          .map(activity => (
            <div key={activity.id} className="public-activity-card">
              <div className="activity-header">
                <div className="activity-icon">
                  {GAME_MODES.find(mode => mode.id === activity.gameMode)?.icon || '🎮'}
                </div>
                <div className="activity-info">
                  <h3>{activity.title}</h3>
                  <p className="activity-description">{activity.description}</p>
                  <div className="activity-meta">
                    <span className="meta-badge difficulty">{activity.difficulty}</span>
                    <span className="meta-badge time">{activity.estimatedTime} min</span>
                    <span className="meta-badge participants">{activity.participants} players</span>
                  </div>
                </div>
              </div>
              <div className="activity-actions">
                <button 
                  className="play-btn primary"
                  onClick={() => startActivity(activity.gameMode, activity.courseId)}
                >
                  <span className="play-icon">▶️</span>
                  Play Now
                </button>
                <button className="preview-btn">
                  <span className="preview-icon">👁️</span>
                  Preview
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );

  const renderAIGenerate = () => (
    <div className="ai-generate-section">
      <div className="ai-header">
        <h2>🤖 AI Activity Generator</h2>
        <p>Create custom learning activities powered by AI</p>
      </div>

      <div className="ai-form">
        <div className="form-group">
          <label htmlFor="ai-description">Activity Description:</label>
          <textarea
            id="ai-description"
            className="ai-description-input"
            placeholder="Describe the activity you want to create... (e.g., 'A quiz about quantum physics with real-world applications')"
            value={aiDescription}
            onChange={(e) => setAiDescription(e.target.value)}
            rows={4}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="ai-course">Course (Optional):</label>
            <select
              id="ai-course"
              className="form-select"
              value={aiCourse}
              onChange={(e) => setAiCourse(e.target.value)}
            >
              <option value="">General Knowledge</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>{course.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="ai-game-mode">Game Mode:</label>
            <select
              id="ai-game-mode"
              className="form-select"
              value={aiGameMode}
              onChange={(e) => setAiGameMode(e.target.value)}
            >
              {GAME_MODES.map(mode => (
                <option key={mode.id} value={mode.id}>{mode.title}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="ai-difficulty">Difficulty:</label>
            <select
              id="ai-difficulty"
              className="form-select"
              value={aiDifficulty}
              onChange={(e) => setAiDifficulty(e.target.value)}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="ai-duration">Duration (minutes):</label>
            <select
              id="ai-duration"
              className="form-select"
              value={aiDuration}
              onChange={(e) => setAiDuration(e.target.value)}
            >
              <option value="15">15 min</option>
              <option value="30">30 min</option>
              <option value="45">45 min</option>
              <option value="60">60 min</option>
            </select>
          </div>
        </div>

        <div className="ai-examples">
          <h4>💡 Example Prompts:</h4>
          <div className="example-prompts">
            <div 
              className="example-prompt"
              onClick={() => setAiDescription("Create a neural conquest game about calculus derivatives with real-world applications in physics and engineering")}
            >
              "Create a neural conquest game about calculus derivatives with real-world applications"
            </div>
            <div 
              className="example-prompt"
              onClick={() => setAiDescription("Design a mystery syndicate investigation about the history of cryptography and its impact on modern cybersecurity")}
            >
              "Design a mystery syndicate investigation about cryptography history"
            </div>
            <div 
              className="example-prompt"
              onClick={() => setAiDescription("Build a synthesis arena challenge combining concepts from psychology, economics, and behavioral science")}
            >
              "Build a synthesis arena combining psychology and economics"
            </div>
          </div>
        </div>

        <button 
          className="generate-button"
          onClick={generateAIActivity}
          disabled={isGenerating || !aiDescription.trim()}
        >
          {isGenerating ? (
            <>
              <span className="loading-spinner">⚡</span>
              Generating Activity...
            </>
          ) : (
            <>
              <span className="generate-icon">🤖</span>
              Generate Activity
            </>
          )}
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="interactive-activities">
        <div className="loading-container">
          <div className="loading-spinner-large">⚡</div>
          <h3>Loading Interactive Activities...</h3>
          <p>Preparing your learning adventure</p>
        </div>
      </div>
    );
  }

  return (
    <div className="interactive-activities">
      <div className="activities-header">
        <h1>🎓 Interactive Learning Activities</h1>
        <p>Sophisticated gamified learning experiences designed for higher education</p>
      </div>

      <div className="activities-navigation">
        <button 
          className={`nav-tab ${activeTab === 'my-activities' ? 'active' : ''}`}
          onClick={() => setActiveTab('my-activities')}
        >
          <span className="tab-icon">📚</span>
          My Course Activities
        </button>
        <button 
          className={`nav-tab ${activeTab === 'public-library' ? 'active' : ''}`}
          onClick={() => setActiveTab('public-library')}
        >
          <span className="tab-icon">🌍</span>
          Public Library
        </button>
        <button 
          className={`nav-tab ${activeTab === 'ai-generate' ? 'active' : ''}`}
          onClick={() => setActiveTab('ai-generate')}
        >
          <span className="tab-icon">🤖</span>
          AI Generate
        </button>
      </div>

      <div className="activities-content">
        {activeTab === 'my-activities' && renderMyActivities()}
        {activeTab === 'public-library' && renderPublicLibrary()}
        {activeTab === 'ai-generate' && renderAIGenerate()}
      </div>

      {/* Neural Conquest Topic Selection Modal */}
      {showTopicModal && (
        <div 
          className="modal-overlay"
          onClick={(e) => {
            // Close modal when clicking outside (on the overlay)
            if (e.target === e.currentTarget) {
              closeTopicModal();
            }
          }}
        >
          <div className="topic-modal">
            <div className="modal-header">
              <h2>🧠 Neural Conquest - Topic Selection</h2>
              <button className="close-btn" onClick={closeTopicModal}>✕</button>
            </div>
            
            <div className="modal-content">
              {!generatedTopics ? (
                <div className="topic-input-section">
                  <h3>Describe Your Trivia Adventure</h3>
                  <p>Tell us what kind of trivia you want to explore, and we'll generate a custom Neural Conquest world for you!</p>
                  
                  <div className="input-group" style={{ marginBottom: 12 }}>
                    <label>Mode</label>
                    <div className="mode-toggle">
                      <button className={`mode-btn ${gameModeType === 'single' ? 'active' : ''}`} onClick={() => setGameModeType('single')} disabled={generatingTopics}>Single Player</button>
                      <button className={`mode-btn ${gameModeType === 'multiplayer' ? 'active' : ''}`} onClick={() => setGameModeType('multiplayer')} disabled={generatingTopics}>Multiplayer</button>
                    </div>
                  </div>

                  <div className="input-group">
                    <label htmlFor="topic-description">What would you like to learn about?</label>
                    <textarea
                      id="topic-description"
                      value={topicDescription}
                      onChange={(e) => setTopicDescription(e.target.value)}
                      placeholder="e.g., 'Geography about the 7 continents', 'Ancient civilizations and their achievements', 'Space exploration and planets', 'World capitals and famous landmarks'..."
                      rows={4}
                      disabled={generatingTopics}
                    />
                  </div>

                  <div className="example-topics">
                    <h4>💡 Example Topics:</h4>
                    <div className="topic-examples">
                      <button 
                        className="example-btn"
                        onClick={() => selectExampleTopic('Geography trivia about the 7 continents and their unique features')}
                        disabled={generatingTopics}
                      >
                        🌍 World Geography
                      </button>
                      <button 
                        className="example-btn"
                        onClick={() => selectExampleTopic('Ancient civilizations including Egypt, Rome, Greece, and their contributions to history')}
                        disabled={generatingTopics}
                      >
                        🏛️ Ancient History
                      </button>
                      <button 
                        className="example-btn"
                        onClick={() => selectExampleTopic('Space exploration covering planets, moons, astronauts, and space missions')}
                        disabled={generatingTopics}
                      >
                        🚀 Space & Astronomy
                      </button>
                      <button 
                        className="example-btn"
                        onClick={() => selectExampleTopic('Science fundamentals including physics, chemistry, and biology concepts')}
                        disabled={generatingTopics}
                      >
                        🔬 Science Basics
                      </button>
                    </div>
                  </div>

                  <div className="modal-actions">
                    <button 
                      className="generate-btn"
                      onClick={generateTopicsFromDescription}
                      disabled={generatingTopics || !topicDescription.trim()}
                    >
                      {generatingTopics ? '🎨 Generating Topics...' : '🎨 Generate Game World'}
                    </button>
                  </div>
                </div>
              ) : generating3DModels ? (
                // NEW: 3D Model Generation Loading Screen
                <div className="model-generation-section">
                  <h3>🎨 Generating 3D Models</h3>
                  <p>Creating immersive 3D objects for your Neural Conquest world...</p>
                  
                  <div className="generation-progress">
                    <div className="progress-info">
                      <div className="progress-stage">
                        {modelGenerationProgress.stage === 'preparing' && '🔄 Preparing generation...'}
                        {modelGenerationProgress.stage === 'generating' && '🎯 Generating 3D models...'}
                        {modelGenerationProgress.stage === 'completing' && '✅ Finalizing game world...'}
                      </div>
                      <div className="progress-current">
                        {modelGenerationProgress.currentModel}
                      </div>
                    </div>
                    
                    <div className="progress-bar-container">
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{
                            width: `${modelGenerationProgress.total > 0 ? 
                              (modelGenerationProgress.current / modelGenerationProgress.total) * 100 : 0}%`
                          }}
                        ></div>
                      </div>
                      <div className="progress-text">
                        {modelGenerationProgress.current} / {modelGenerationProgress.total} models
                      </div>
                    </div>

                    {/* Real-time detailed progress */}
                    {modelGenerationProgress.detailedProgress && modelGenerationProgress.detailedProgress.length > 0 && (
                      <div className="detailed-progress">
                        <h4>🔍 Current Model Progress:</h4>
                        <div className="progress-steps">
                          {modelGenerationProgress.detailedProgress
                            .slice(-1) // Show only the most recent progress
                            .map((progress, index) => (
                            <div key={`${progress.objectName}-${progress.stage}`} className="progress-step">
                              <div className="step-name">{progress.objectName}</div>
                              <div className="step-stage">
                                {progress.stage === 'loading_model' && '📥 Loading AI Model...'}
                                {progress.stage === 'loading_tokenizer' && '🔤 Loading Tokenizer...'}
                                {progress.stage === 'loading_model_weights' && '⚖️ Loading Model Weights...'}
                                {progress.stage === 'model_ready' && '✅ Model Ready!'}
                                {progress.stage === 'creating_prompt' && '📝 Creating Prompt...'}
                                {progress.stage === 'tokenizing' && '🔢 Tokenizing...'}
                                {progress.stage === 'generating' && '🎨 Generating Mesh...'}
                                {progress.stage === 'decoding' && '🔍 Decoding...'}
                                {progress.stage === 'processing' && '⚙️ Processing...'}
                                {progress.stage === 'saving' && '💾 Saving...'}
                                {progress.stage === 'complete' && '🎉 Complete!'}
                              </div>
                              <div className="step-description">{progress.description}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="generation-info">
                    <h4>🏗️ What's happening:</h4>
                    <ul>
                      <li>• Using OpenAI Shap-E to generate high-quality 3D models</li>
                      <li>• Creating unique .obj meshes with custom materials</li>
                      <li>• Optimizing models for real-time 3D gameplay</li>
                      <li>• Ensuring educational accuracy and visual appeal</li>
                    </ul>
                    
                    <div className="time-estimate">
                      <p><strong>⏱️ Estimated time:</strong> {modelGenerationProgress.total * 1}-{modelGenerationProgress.total * 3} minutes</p>
                      <p><em>Please keep this tab open while generation completes.</em></p>
                    </div>
                  </div>
                  
                  <div className="generation-spinner">
                    <div className="spinner-3d">🎨</div>
                    <div className="spinner-text">Crafting your 3D world...</div>
                  </div>
                </div>
              ) : (
                <div className="topics-preview-section">
                  <h3>🎯 Generated Game World Preview</h3>
                  <p><strong>Based on:</strong> "{topicDescription}"</p>
                  
                  {gameModeType === 'multiplayer' && (
                    <div className="input-group" style={{ marginBottom: 16 }}>
                      <label>Invite players (search by name or email)</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          type="text"
                          placeholder="Search users..."
                          value={inviteQuery}
                          onChange={async (e) => {
                            setInviteQuery(e.target.value);
                            if (e.target.value.trim().length >= 2) {
                              try {
                                const res = await api.neuralConquestAPI.searchUsers(e.target.value.trim());
                                if (res?.success) setInviteResults(res.data || []);
                              } catch {}
                            } else {
                              setInviteResults([]);
                            }
                          }}
                          style={{ flex: 1 }}
                        />
                      </div>
                      {inviteQuery.trim().length >= 2 && (
                        <div style={{ marginTop: 8, maxHeight: 150, overflowY: 'auto' }}>
                          {(inviteResults || []).map(u => (
                            <div key={u.id} className="invite-result">
                              <div>
                                <div style={{ color: '#fff', fontSize: 14 }}>{u.displayName || u.name || u.email}</div>
                                <div style={{ color: '#aaa', fontSize: 12 }}>{u.email}</div>
                              </div>
                              <button className="start-game-btn" onClick={() => {
                                if (!selectedInvites.find(si => si.id === u.id)) setSelectedInvites([...selectedInvites, u]);
                              }}>Add</button>
                            </div>
                          ))}
                          {inviteResults.length === 0 && (
                            <div style={{ color: '#aaa', fontSize: 12 }}>No users found</div>
                          )}
                        </div>
                      )}
                      {selectedInvites.length > 0 && (
                        <div style={{ marginTop: 8 }}>
                          <div style={{ color: '#ccc', marginBottom: 6 }}>Invited:</div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {selectedInvites.map(u => (
                              <span key={u.id} className="invited-chip">
                                {u.displayName || u.name || u.email}
                                <button className="back-btn" onClick={() => setSelectedInvites(selectedInvites.filter(si => si.id !== u.id))}>x</button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="topics-grid">
                    {generatedTopics.topics.map((topic, index) => (
                      <div 
                        key={index} 
                        className={`topic-card ${selectedTopics.has(topic.name) ? 'selected' : ''}`}
                        onClick={() => toggleTopicSelection(topic.name)}
                      >
                        <div className="topic-icon">{topic.icon || '🏆'}</div>
                        <h4>{topic.name}</h4>
                        <p>{topic.description}</p>
                        <div className="topic-meta">
                          <span className="topic-cost">💰 {topic.cost} Synapse</span>
                          <span className="topic-difficulty">⭐ Level {topic.difficulty}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="preview-info">
                    <p>🎮 <strong>Your Neural Conquest Experience:</strong></p>
                    <ul>
                      <li>• {generatedTopics.topics.length} unique 3D territories to conquer</li>
                      <li>• {selectedTopics.size > 0 ? `${selectedTopics.size} territories selected` : 'Click territories above to select them (optional)'}</li>
                      <li>• Progressive difficulty scaling with topic complexity</li>
                      <li>• AI-generated questions specific to each topic</li>
                      <li>• Dynamic pricing based on educational value</li>
                      <li>• Immersive 3D conquest gameplay</li>
                    </ul>
                  </div>

                  <div className="modal-actions">
                    <button 
                      className="back-btn" 
                      onClick={() => setGeneratedTopics(null)}
                      disabled={generating3DModels}
                    >
                      ← Modify Description
                    </button>
                    <button 
                      className="start-game-btn"
                      onClick={startNeuralConquestWithTopics}
                      disabled={generating3DModels || selectedTopics.size === 0}
                    >
                      {generating3DModels ? '🎮 Starting Game...' : (gameModeType === 'single' ? '🚀 Start Single Player' : '🚀 Start Multiplayer')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InteractiveActivities;
 
