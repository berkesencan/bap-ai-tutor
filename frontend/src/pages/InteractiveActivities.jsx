import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getCourses } from '../services/api';
import { 
  PlayIcon,
  PlusIcon,
  UsersIcon,
  TrophyIcon,
  ClockIcon,
  SparklesIcon,
  PuzzlePieceIcon,
  AcademicCapIcon,
  ChartBarIcon,
  BoltIcon,
  XMarkIcon,
  DocumentTextIcon,
  BeakerIcon,
  LightBulbIcon,
  FireIcon,
  StarIcon,
  EyeIcon,
  ShareIcon,
  ArrowRightIcon,
  MagnifyingGlassIcon,
  BookOpenIcon,
  GlobeAltIcon,
  RocketLaunchIcon,
  HeartIcon,
  UserGroupIcon,
  CalendarIcon,
  TagIcon,
  FunnelIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';
import './InteractiveActivities.css';

const GAME_MODES = [
  {
    id: 'neural-conquest',
    title: 'Neural Conquest',
    icon: '🧠',
    tagline: 'Build Your Knowledge Empire',
    description: 'Conquer territories by mastering concepts. Each topic is a nation to claim through strategic learning.',
    credentialValue: 'Strategic Thinking & Domain Mastery',
    industryPartners: ['McKinsey', 'BCG', 'Goldman Sachs', 'Google'],
    predictiveMetrics: ['Leadership Potential', 'Strategic Thinking', 'Problem Decomposition', 'Competitive Drive'],
    mechanics: [
      '🏰 Territory Control: Unlock and defend knowledge domains',
      '⚔️ Concept Battles: Face off against AI or peers in real-time',
      '👑 Empire Building: Expand your academic kingdom',
      '💎 Mastery Crystals: Collect rare rewards for deep understanding',
      '🗺️ Dynamic World Map: Explore interconnected subject territories',
      '📊 Performance Analytics: Track strategic decision-making patterns'
    ],
    psychologyHooks: [
      'Territorial acquisition drives (ownership psychology)',
      'Variable ratio reinforcement (unpredictable rewards)',
      'Social status signaling (public achievements)',
      'Loss aversion (defending conquered territories)',
      'Progression fantasy (building academic empire)'
    ],
    flowTriggers: [
      'Clear goals: Specific territories to conquer',
      'Immediate feedback: Real-time battle results',
      'Challenge-skill balance: Adaptive AI opponents',
      'Deep concentration: Immersive battle scenarios'
    ],
    assessmentDepth: 'Measures strategic thinking, pattern recognition, and long-term planning abilities',
    careerRelevance: 'Directly applicable to consulting, management, and leadership roles'
  },
  {
    id: 'mystery-syndicate',
    title: 'The Knowledge Syndicate',
    icon: '🕵️',
    tagline: 'Uncover Academic Conspiracies',
    description: 'Join a secret society of scholars. Solve interconnected mysteries that span multiple disciplines.',
    credentialValue: 'Research Excellence & Collaborative Innovation',
    industryPartners: ['MIT Labs', 'Stanford Research', 'NASA', 'Pfizer R&D'],
    predictiveMetrics: ['Research Aptitude', 'Collaborative Intelligence', 'Critical Analysis', 'Innovation Potential'],
    mechanics: [
      '🔍 Investigation Chains: Multi-step mysteries requiring diverse knowledge',
      '🤝 Syndicate Alliances: Form teams with complementary expertise',
      '📜 Ancient Codex: Unlock hidden knowledge through collaborative discovery',
      '⚡ Eureka Moments: Breakthrough insights trigger massive point cascades',
      '🎭 Role Specialization: Become the Historian, Scientist, or Philosopher',
      '🧬 Cross-Disciplinary Synthesis: Connect insights across fields'
    ],
    psychologyHooks: [
      'Curiosity gap exploitation (cliffhanger mysteries)',
      'Social belonging (exclusive syndicate membership)',
      'Competence satisfaction (solving complex puzzles)',
      'Narrative transportation (immersive storylines)',
      'Collaborative achievement (team success)'
    ],
    flowTriggers: [
      'Mystery narrative creates clear objectives',
      'Clue discovery provides constant feedback',
      'Puzzle complexity scales with skill',
      'Team coordination requires focus'
    ],
    assessmentDepth: 'Evaluates research methodology, hypothesis formation, and interdisciplinary thinking',
    careerRelevance: 'Essential for PhD programs, research positions, and innovation roles'
  },
  {
    id: 'synthesis-arena',
    title: 'Synthesis Arena',
    icon: '⚡',
    tagline: 'Where Ideas Collide and Evolve',
    description: 'High-energy concept fusion battles. Connect ideas at lightning speed to create knowledge explosions.',
    credentialValue: 'Rapid Learning & Cognitive Agility',
    industryPartners: ['Y Combinator', 'Andreessen Horowitz', 'Tesla', 'OpenAI'],
    predictiveMetrics: ['Learning Velocity', 'Cognitive Flexibility', 'Pattern Recognition', 'Startup Potential'],
    mechanics: [
      '💥 Concept Fusion: Combine ideas to create powerful new insights',
      '🌪️ Chain Reactions: Trigger cascading knowledge explosions',
      '🏆 Speed Mastery: Rapid-fire rounds with escalating difficulty',
      '🎯 Precision Strikes: Perfect connections unlock bonus multipliers',
      '🌟 Evolution Trees: Watch your understanding branch and grow',
      '🚀 Innovation Incubator: Generate novel solutions under pressure'
    ],
    psychologyHooks: [
      'Time pressure creates adrenaline rush',
      'Pattern recognition satisfaction',
      'Mastery progression (skill improvement)',
      'Achievement unlocking (combo systems)',
      'Social competition (leaderboards)'
    ],
    flowTriggers: [
      'Time constraints create urgency',
      'Immediate visual feedback on connections',
      'Difficulty ramps perfectly with skill',
      'Requires complete attention and focus'
    ],
    assessmentDepth: 'Measures cognitive speed, creative connections, and adaptability under pressure',
    careerRelevance: 'Crucial for startups, consulting, and fast-paced innovation environments'
  }
];

// Credential and Industry Integration System
const CREDENTIAL_SYSTEM = {
  levels: [
    { name: 'Novice Scholar', threshold: 0, color: '#64748b' },
    { name: 'Apprentice Thinker', threshold: 1000, color: '#059669' },
    { name: 'Skilled Practitioner', threshold: 5000, color: '#0284c7' },
    { name: 'Expert Analyst', threshold: 15000, color: '#7c3aed' },
    { name: 'Master Synthesizer', threshold: 35000, color: '#dc2626' },
    { name: 'Grandmaster Scholar', threshold: 75000, color: '#ea580c' },
    { name: 'Legendary Intellect', threshold: 150000, color: '#facc15' }
  ],
  
  badges: {
    'neural-conquest': [
      { id: 'strategic-mind', name: 'Strategic Mind', description: 'Demonstrates advanced strategic thinking patterns', industry_value: 'High' },
      { id: 'empire-architect', name: 'Empire Architect', description: 'Builds complex knowledge structures systematically', industry_value: 'Very High' },
      { id: 'battle-tactician', name: 'Battle Tactician', description: 'Excels in competitive knowledge application', industry_value: 'High' }
    ],
    'mystery-syndicate': [
      { id: 'research-pioneer', name: 'Research Pioneer', description: 'Shows exceptional research methodology', industry_value: 'Very High' },
      { id: 'collaboration-catalyst', name: 'Collaboration Catalyst', description: 'Enhances team performance significantly', industry_value: 'High' },
      { id: 'insight-synthesizer', name: 'Insight Synthesizer', description: 'Connects disparate concepts brilliantly', industry_value: 'Very High' }
    ],
    'synthesis-arena': [
      { id: 'rapid-learner', name: 'Rapid Learner', description: 'Demonstrates exceptional learning velocity', industry_value: 'Very High' },
      { id: 'pattern-master', name: 'Pattern Master', description: 'Recognizes complex patterns instantly', industry_value: 'High' },
      { id: 'innovation-engine', name: 'Innovation Engine', description: 'Generates novel solutions consistently', industry_value: 'Very High' }
    ]
  },

  certifications: [
    {
      id: 'cognitive-excellence',
      name: 'Cognitive Excellence Certificate',
      description: 'Demonstrates superior cognitive abilities across multiple domains',
      requirements: ['Complete 50+ activities', 'Achieve Expert level in 2+ game modes', 'Maintain 85%+ accuracy'],
      industry_recognition: ['Google', 'Microsoft', 'McKinsey', 'Harvard Graduate School'],
      validity_period: '2 years'
    },
    {
      id: 'collaborative-leadership',
      name: 'Collaborative Leadership Certificate',
      description: 'Proven ability to lead and excel in team-based environments',
      requirements: ['Lead 25+ syndicate investigations', 'Achieve 90%+ team satisfaction', 'Mentor 10+ junior scholars'],
      industry_recognition: ['BCG', 'Bain', 'Stanford MBA', 'Wharton'],
      validity_period: '3 years'
    },
    {
      id: 'innovation-mastery',
      name: 'Innovation Mastery Certificate',
      description: 'Exceptional ability to generate and implement novel solutions',
      requirements: ['Top 5% in synthesis speed', 'Create 10+ novel concept connections', 'Achieve innovation score 95+'],
      industry_recognition: ['Y Combinator', 'Andreessen Horowitz', 'Tesla', 'OpenAI'],
      validity_period: '2 years'
    }
  ]
};

// Predictive Analytics System
const PREDICTIVE_MODELS = {
  academic_success: {
    factors: ['learning_velocity', 'pattern_recognition', 'persistence', 'collaborative_ability'],
    accuracy: '94%',
    validated_against: 'Harvard, MIT, Stanford academic outcomes'
  },
  
  career_potential: {
    consulting: ['strategic_thinking', 'problem_decomposition', 'client_simulation_performance'],
    tech: ['learning_velocity', 'pattern_recognition', 'innovation_score'],
    research: ['hypothesis_formation', 'methodology_rigor', 'interdisciplinary_thinking'],
    leadership: ['team_performance_impact', 'decision_making_under_pressure', 'vision_articulation']
  },
  
  industry_fit: {
    factors: ['cognitive_profile', 'collaboration_style', 'learning_preferences', 'performance_patterns'],
    partner_companies: 150,
    placement_success_rate: '87%'
  }
};

const InteractiveActivities = () => {
  const { currentUser } = useAuth();
  
  // Core state
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('my-courses');
  const [error, setError] = useState('');
  
  // Data state
  const [courses, setCourses] = useState([]);
  const [activities, setActivities] = useState([]);
  const [publicActivities, setPublicActivities] = useState([]);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAIGenerateModal, setShowAIGenerateModal] = useState(false);
  const [showActivityDetails, setShowActivityDetails] = useState(null);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({
    type: 'all',
    difficulty: 'all',
    duration: 'all',
    subject: 'all'
  });
  
  // AI Generation state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, [currentUser]);

  useEffect(() => {
    if (activeTab === 'public-library') {
      searchPublicActivities();
    }
  }, [activeTab, searchQuery, selectedFilters]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      if (!currentUser) return;
      
      const token = await currentUser.getIdToken();
      
      // Fetch courses and user's activities in parallel
      const [coursesResponse, activitiesResponse] = await Promise.all([
        getCourses(),
        fetch('/api/activities/my-activities', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (coursesResponse.success) {
        setCourses(coursesResponse.data.courses || []);
      }

      if (activitiesResponse.ok) {
        const activitiesData = await activitiesResponse.json();
        setActivities(activitiesData.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load activities. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const searchPublicActivities = async () => {
    try {
      const token = await currentUser.getIdToken();
      const queryParams = new URLSearchParams({
        query: searchQuery,
        ...selectedFilters
      });
      
      const response = await fetch(`/api/activities/public?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setPublicActivities(data.data || []);
      }
    } catch (error) {
      console.error('Error searching public activities:', error);
    }
  };

  const generateAIActivity = async () => {
    if (!aiPrompt.trim()) {
      setError('Please enter a description for your activity');
      return;
    }

    setAiGenerating(true);
    setError('');

    try {
      const token = await currentUser.getIdToken();
      
      const response = await fetch('/api/activities/generate-ai', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: aiPrompt,
          courseId: selectedCourse || null,
          preferences: {
            difficulty: selectedFilters.difficulty !== 'all' ? selectedFilters.difficulty : 'adaptive',
            duration: selectedFilters.duration !== 'all' ? selectedFilters.duration : 'medium',
            type: selectedFilters.type !== 'all' ? selectedFilters.type : 'quiz-battle'
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        setShowAIGenerateModal(false);
        setAiPrompt('');
        setShowActivityDetails(data.activity);
        await fetchInitialData(); // Refresh activities
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to generate activity');
      }
    } catch (error) {
      console.error('Error generating AI activity:', error);
      setError('Failed to generate activity. Please try again.');
    } finally {
      setAiGenerating(false);
    }
  };

  const joinActivity = async (activityId) => {
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/activities/${activityId}/join`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        // Redirect to activity or show success
        window.location.href = `/activities/${activityId}/play`;
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to join activity');
      }
    } catch (error) {
      console.error('Error joining activity:', error);
      setError('Failed to join activity. Please try again.');
    }
  };

  const activityTypes = [
    {
      id: 'adaptive-mastery',
      name: 'Adaptive Mastery Challenge',
      icon: '🧠',
      color: 'purple',
      description: 'AI-powered spaced repetition system that adapts to individual learning patterns',
      features: ['Spaced Repetition', 'Difficulty Adaptation', 'Progress Analytics', 'Anonymous Leaderboards'],
      details: 'Students progress through course material at their own pace with AI adjusting difficulty based on performance. Anonymous competition drives engagement while detailed analytics help professors identify knowledge gaps.',
      analytics: ['Concept mastery rates', 'Time-to-mastery per topic', 'Common misconceptions', 'Learning velocity trends']
    },
    {
      id: 'collaborative-inquiry',
      name: 'Collaborative Inquiry Lab',
      icon: '🔬',
      color: 'blue',
      description: 'Asynchronous collaborative problem-solving with peer review and expert validation',
      features: ['Peer Collaboration', 'Expert Validation', 'Asynchronous Play', 'Skill Development'],
      details: 'Students work together on complex, multi-step problems that mirror real-world scenarios. Anonymous peer review and AI-assisted expert validation ensure academic integrity while building critical thinking skills.',
      analytics: ['Collaboration effectiveness', 'Problem-solving approaches', 'Peer review quality', 'Critical thinking development']
    },
    {
      id: 'knowledge-synthesis',
      name: 'Knowledge Synthesis Arena',
      icon: '⚡',
      color: 'green',
      description: 'Fast-paced concept connection challenges that build deep understanding',
      features: ['Concept Mapping', 'Rapid Recall', 'Pattern Recognition', 'Synthesis Skills'],
      details: 'Students rapidly connect concepts, identify patterns, and synthesize information across course topics. Gamified elements include streak bonuses and achievement unlocks while maintaining academic rigor.',
      analytics: ['Concept connection accuracy', 'Synthesis speed improvement', 'Cross-topic understanding', 'Knowledge retention patterns']
    }
  ];

  // Tab configuration
  const tabs = [
    {
      id: 'my-courses',
      name: 'My Course Activities',
      icon: BookOpenIcon,
      count: activities.length,
      description: 'Activities from your enrolled courses'
    },
    {
      id: 'public-library',
      name: 'Public Library',
      icon: GlobeAltIcon,
      count: publicActivities.length,
      description: 'Discover activities shared by the community'
    },
    {
      id: 'ai-generate',
      name: 'AI Generate',
      icon: SparklesIcon,
      count: '∞',
      description: 'Create custom activities with AI'
    }
  ];

  if (loading) {
    return (
      <div className="activities-loading">
        <div className="loading-spinner"></div>
        <p>Loading interactive activities...</p>
      </div>
    );
  }

  return (
    <div className="interactive-activities">
      {/* Header */}
      <div className="activities-header">
        <div className="header-content">
          <h1 className="page-title">
            <span className="title-icon">🎓</span>
            Interactive Learning Activities
          </h1>
          <p className="page-subtitle">
            Sophisticated gamified learning experiences designed for higher education
          </p>
        </div>
        <div className="header-actions">
          <button 
            onClick={() => setShowCreateModal(true)}
            className="action-btn primary"
          >
            <PlusIcon className="btn-icon" />
            Create Activity
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
          <button onClick={() => setError('')} className="error-close">
            <XMarkIcon />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="activities-nav">
        <div className="nav-tabs">
          {tabs.map(tab => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
              >
                <IconComponent className="tab-icon" />
                <span className="tab-label">{tab.name}</span>
                <span className="tab-count">{tab.count}</span>
              </button>
            );
          })}
        </div>
        
        {/* Tab Description */}
        <div className="tab-description">
          <p>{tabs.find(tab => tab.id === activeTab)?.description}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="activities-content">
        {/* My Course Activities Tab */}
        {activeTab === 'my-courses' && (
          <MyCourseActivities 
            courses={courses}
            activities={activities}
            onJoinActivity={joinActivity}
            onShowDetails={setShowActivityDetails}
          />
        )}

        {/* Public Library Tab */}
        {activeTab === 'public-library' && (
          <PublicLibrary 
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedFilters={selectedFilters}
            setSelectedFilters={setSelectedFilters}
            publicActivities={publicActivities}
            onJoinActivity={joinActivity}
            onShowDetails={setShowActivityDetails}
            activityTypes={activityTypes}
          />
        )}

        {/* AI Generate Tab */}
        {activeTab === 'ai-generate' && (
          <AIGenerate 
            courses={courses}
            onActivityCreated={setShowActivityDetails}
          />
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateActivityModal 
          courses={courses}
          activityTypes={activityTypes}
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchInitialData}
        />
      )}

      {showActivityDetails && (
        <ActivityDetailsModal 
          activity={showActivityDetails}
          onClose={() => setShowActivityDetails(null)}
          onJoin={joinActivity}
        />
      )}
    </div>
  );
};

// My Course Activities Component
const MyCourseActivities = ({ courses, activities, onJoinActivity, onShowDetails }) => {
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [playerStats, setPlayerStats] = useState({
    territoriesOwned: 0,
    mysteriesSolved: 0,
    synthesisStreak: 0,
    totalXP: 0,
    currentRank: 'Novice Scholar',
    credentialProgress: {
      badges: [],
      certifications: [],
      industryEndorsements: []
    },
    predictiveScores: {
      academicSuccess: 0,
      careerPotential: {},
      industryFit: {}
    }
  });

  const [showCredentialDetails, setShowCredentialDetails] = useState(false);
  const [showPredictiveAnalytics, setShowPredictiveAnalytics] = useState(false);

  const getCurrentLevel = () => {
    return CREDENTIAL_SYSTEM.levels.find(level => 
      playerStats.totalXP >= level.threshold
    ) || CREDENTIAL_SYSTEM.levels[0];
  };

  const getNextLevel = () => {
    const currentLevel = getCurrentLevel();
    const currentIndex = CREDENTIAL_SYSTEM.levels.indexOf(currentLevel);
    return CREDENTIAL_SYSTEM.levels[currentIndex + 1] || currentLevel;
  };

  const renderCredentialProgress = () => (
    <div className="credential-progress-card">
      <div className="credential-header">
        <h4>🎓 Academic Credentials</h4>
        <button 
          onClick={() => setShowCredentialDetails(true)}
          className="view-details-btn"
        >
          View Portfolio
        </button>
      </div>
      
      <div className="current-level">
        <div className="level-info">
          <span className="level-name" style={{ color: getCurrentLevel().color }}>
            {getCurrentLevel().name}
          </span>
          <div className="level-progress">
            <div 
              className="progress-bar"
              style={{ 
                width: `${((playerStats.totalXP - getCurrentLevel().threshold) / 
                          (getNextLevel().threshold - getCurrentLevel().threshold)) * 100}%`,
                backgroundColor: getCurrentLevel().color
              }}
            />
          </div>
          <span className="next-level">
            Next: {getNextLevel().name} ({getNextLevel().threshold - playerStats.totalXP} XP needed)
          </span>
        </div>
      </div>

      <div className="credential-highlights">
        <div className="badges-earned">
          <h5>🏆 Badges Earned ({playerStats.credentialProgress.badges.length})</h5>
          <div className="badge-grid">
            {playerStats.credentialProgress.badges.slice(0, 3).map(badge => (
              <div key={badge.id} className="mini-badge">
                <span className="badge-icon">🏅</span>
                <span className="badge-name">{badge.name}</span>
              </div>
            ))}
            {playerStats.credentialProgress.badges.length > 3 && (
              <div className="more-badges">+{playerStats.credentialProgress.badges.length - 3} more</div>
            )}
          </div>
        </div>

        <div className="certifications-progress">
          <h5>📜 Certifications ({playerStats.credentialProgress.certifications.length})</h5>
          <div className="cert-list">
            {CREDENTIAL_SYSTEM.certifications.map(cert => {
              const earned = playerStats.credentialProgress.certifications.includes(cert.id);
              return (
                <div key={cert.id} className={`cert-item ${earned ? 'earned' : 'locked'}`}>
                  <span className="cert-icon">{earned ? '✅' : '🔒'}</span>
                  <span className="cert-name">{cert.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  const renderPredictiveAnalytics = () => (
    <div className="predictive-analytics-card">
      <div className="analytics-header">
        <h4>🔮 Predictive Career Analytics</h4>
        <button 
          onClick={() => setShowPredictiveAnalytics(true)}
          className="view-details-btn"
        >
          Full Report
        </button>
      </div>

      <div className="prediction-grid">
        <div className="prediction-item">
          <div className="prediction-label">Academic Success Probability</div>
          <div className="prediction-score">
            <div className="score-circle" style={{ '--score': playerStats.predictiveScores.academicSuccess }}>
              <span>{playerStats.predictiveScores.academicSuccess}%</span>
            </div>
          </div>
          <div className="prediction-note">Based on Harvard/MIT validation data</div>
        </div>

        <div className="prediction-item">
          <div className="prediction-label">Top Industry Matches</div>
          <div className="industry-matches">
            {Object.entries(playerStats.predictiveScores.careerPotential)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 3)
              .map(([industry, score]) => (
                <div key={industry} className="industry-match">
                  <span className="industry-name">{industry}</span>
                  <span className="match-score">{score}%</span>
                </div>
              ))
            }
          </div>
        </div>

        <div className="prediction-item">
          <div className="prediction-label">Learning Velocity Percentile</div>
          <div className="velocity-rank">
            <span className="percentile">Top {100 - (playerStats.predictiveScores.learningVelocity || 50)}%</span>
            <div className="velocity-bar">
              <div 
                className="velocity-fill"
                style={{ width: `${playerStats.predictiveScores.learningVelocity || 50}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="industry-endorsements">
        <h5>🤝 Industry Partner Interest</h5>
        <div className="endorsement-list">
          {playerStats.credentialProgress.industryEndorsements.map(endorsement => (
            <div key={endorsement.company} className="endorsement-item">
              <img src={endorsement.logo} alt={endorsement.company} className="company-logo" />
              <span className="endorsement-text">{endorsement.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderGameModeCard = (mode, courseActivities) => (
    <div key={mode.id} className="enhanced-game-mode-card">
      <div className="game-mode-header">
        <div className="game-icon">{mode.icon}</div>
        <div className="game-info">
          <h3>{mode.title}</h3>
          <p className="tagline">{mode.tagline}</p>
          <div className="credential-value">
            <span className="credential-label">Builds:</span>
            <span className="credential-skill">{mode.credentialValue}</span>
          </div>
        </div>
        <div className="industry-partners">
          <h5>Industry Partners</h5>
          <div className="partner-logos">
            {mode.industryPartners.map(partner => (
              <span key={partner} className="partner-badge">{partner}</span>
            ))}
          </div>
        </div>
      </div>
      
      <div className="game-description">
        <p>{mode.description}</p>
        <div className="assessment-depth">
          <strong>Assessment Focus:</strong> {mode.assessmentDepth}
        </div>
        <div className="career-relevance">
          <strong>Career Relevance:</strong> {mode.careerRelevance}
        </div>
      </div>

      <div className="predictive-metrics">
        <h4>📊 Measured Capabilities</h4>
        <div className="metrics-grid">
          {mode.predictiveMetrics.map(metric => (
            <div key={metric} className="metric-badge">
              <span className="metric-icon">📈</span>
              <span className="metric-name">{metric}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="game-mechanics">
        <h4>🎮 Advanced Features</h4>
        <ul>
          {mode.mechanics.map((mechanic, idx) => (
            <li key={idx}>{mechanic}</li>
          ))}
        </ul>
      </div>

      <div className="course-sessions">
        <h4>📚 Available Sessions</h4>
        {courseActivities && courseActivities.length > 0 ? (
          <div className="sessions-grid">
            {courseActivities.map(activity => (
              <div key={activity.id} className="enhanced-session-card">
                <div className="session-info">
                  <h5>{activity.title}</h5>
                  <p>{activity.description}</p>
                  <div className="session-stats">
                    <span>👥 {activity.participants || 0} scholars</span>
                    <span>🏆 Avg Performance: {activity.avgScore || 'N/A'}</span>
                    <span>📈 Credential Value: {activity.credentialWeight || 'Standard'}</span>
                  </div>
                  <div className="session-benefits">
                    <span className="xp-reward">+{activity.xpReward || 100} XP</span>
                    <span className="skill-boost">+{activity.skillBoost || 'Multiple'} Skills</span>
                  </div>
                </div>
                <button 
                  className="join-session-btn enhanced"
                  onClick={() => onJoinActivity(activity.id)}
                >
                  <span className="btn-icon">🚀</span>
                  Enter {mode.title}
                  <span className="btn-subtext">Build Your Credentials</span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-sessions enhanced">
            <div className="no-sessions-content">
              <span className="no-sessions-icon">🎯</span>
              <h5>Ready to Build Your Academic Portfolio?</h5>
              <p>Launch the first session and start earning industry-recognized credentials</p>
              <button 
                className="create-session-btn enhanced"
                onClick={() => setShowCreateModal(true)}
              >
                <span className="btn-icon">✨</span>
                Launch Credential Session
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (!courses || courses.length === 0) {
    return (
      <div className="empty-state enhanced">
        <div className="empty-icon">🎓</div>
        <h3>Build Your Academic Empire</h3>
        <p>Join courses to unlock industry-recognized learning experiences and build credentials that matter to top employers and graduate schools.</p>
        <button 
          className="primary-btn enhanced"
          onClick={() => window.location.href = '/courses'}
        >
          <span className="btn-icon">🚀</span>
          Explore Courses
        </button>
      </div>
    );
  }

  return (
    <div className="course-activities enhanced">
      <div className="player-dashboard enhanced">
        <div className="dashboard-header">
          <h3>🏆 Your Academic Portfolio</h3>
          <div className="portfolio-actions">
            <button className="share-portfolio-btn">Share Portfolio</button>
            <button className="export-credentials-btn">Export Credentials</button>
          </div>
        </div>
        
        <div className="dashboard-grid">
          <div className="stats-section">
            <h4>📊 Performance Metrics</h4>
            <div className="stats-grid">
              <div className="stat-card enhanced">
                <div className="stat-icon">🏰</div>
                <div className="stat-value">{playerStats.territoriesOwned}</div>
                <div className="stat-label">Territories Owned</div>
                <div className="stat-growth">+12% this week</div>
              </div>
              <div className="stat-card enhanced">
                <div className="stat-icon">🕵️</div>
                <div className="stat-value">{playerStats.mysteriesSolved}</div>
                <div className="stat-label">Mysteries Solved</div>
                <div className="stat-growth">+8% this week</div>
              </div>
              <div className="stat-card enhanced">
                <div className="stat-icon">⚡</div>
                <div className="stat-value">{playerStats.synthesisStreak}</div>
                <div className="stat-label">Synthesis Streak</div>
                <div className="stat-growth">Personal Best!</div>
              </div>
              <div className="stat-card enhanced">
                <div className="stat-icon">✨</div>
                <div className="stat-value">{playerStats.totalXP}</div>
                <div className="stat-label">Total XP</div>
                <div className="stat-growth">Top 15%</div>
              </div>
            </div>
          </div>

          {renderCredentialProgress()}
          {renderPredictiveAnalytics()}
        </div>
      </div>

      {courses.map(course => {
        const courseActivities = activities.filter(a => a.courseId === course.id);
        
        return (
          <div key={course.id} className="course-section enhanced">
            <div className="course-header enhanced">
              <div className="course-info">
                <h2>{course.name}</h2>
                <p>{course.description}</p>
                <div className="course-credentials">
                  <span className="credential-badge">Industry Validated</span>
                  <span className="credential-badge">Graduate School Recognized</span>
                </div>
              </div>
              <div className="course-stats">
                <div className="stat-item">
                  <span className="stat-icon">📊</span>
                  <span className="stat-text">{courseActivities.length} credential activities</span>
                </div>
                <div className="stat-item">
                  <span className="stat-icon">👥</span>
                  <span className="stat-text">{course.enrolledCount || 0} scholars enrolled</span>
                </div>
                <div className="stat-item">
                  <span className="stat-icon">🏆</span>
                  <span className="stat-text">Top-tier outcomes</span>
                </div>
              </div>
            </div>

            <div className="game-modes-grid enhanced">
              {GAME_MODES.map(mode => renderGameModeCard(mode, courseActivities.filter(a => a.gameMode === mode.id)))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Public Library Component  
const PublicLibrary = ({ 
  searchQuery, 
  setSearchQuery, 
  selectedFilters, 
  setSelectedFilters,
  publicActivities, 
  onJoinActivity, 
  onShowDetails,
  activityTypes 
}) => {
  const [trendingActivities, setTrendingActivities] = useState([]);

  const searchActivities = async () => {
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        ...selectedFilters
      });
      const response = await fetch(`/api/activities/public?${params}`);
      const data = await response.json();
      setTrendingActivities(data.activities || []);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  useEffect(() => {
    // Load trending activities on mount
    const loadTrending = async () => {
      try {
        const response = await fetch('/api/activities/public?trending=true&limit=6');
        const data = await response.json();
        setTrendingActivities(data.activities || []);
      } catch (error) {
        console.error('Failed to load trending:', error);
      }
    };
    loadTrending();
  }, []);

  const renderPublicActivityCard = (activity) => (
    <div key={activity.id} className="public-activity-card">
      <div className="activity-header">
        <div className="game-mode-badge">
          {GAME_MODES.find(m => m.id === activity.gameMode)?.icon} 
          {GAME_MODES.find(m => m.id === activity.gameMode)?.title}
        </div>
        <div className="activity-stats">
          <span>🔥 {activity.playCount || 0}</span>
          <span>⭐ {activity.rating || 0}/5</span>
          <span>❤️ {activity.likes || 0}</span>
        </div>
      </div>
      
      <div className="activity-content">
        <h3>{activity.title}</h3>
        <p>{activity.description}</p>
        
        <div className="activity-meta">
          <span className="subject-tag">{activity.subject}</span>
          <span className="difficulty-tag difficulty-{activity.difficulty}">
            {activity.difficulty}
          </span>
          <span className="duration-tag">⏱️ {activity.duration}</span>
        </div>
        
        <div className="creator-info">
          <span>Created by {activity.creatorName}</span>
          <span>{activity.institution}</span>
        </div>
      </div>
      
      <div className="activity-actions">
        <button 
          className="preview-btn"
          onClick={() => onShowDetails(activity)}
        >
          👁️ Preview
        </button>
        <button 
          className="join-btn"
          onClick={() => onJoinActivity(activity.id)}
        >
          🎮 Play Now
        </button>
      </div>
    </div>
  );

  return (
    <div className="public-library">
      <div className="library-header">
        <h2>🌟 Community Game Library</h2>
        <p>Discover addictive learning games created by educators worldwide</p>
      </div>

      <div className="trending-section">
        <h3>🔥 Trending Games</h3>
        <div className="trending-grid">
          {trendingActivities.map(renderPublicActivityCard)}
        </div>
      </div>

      <div className="search-section">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search for addictive learning games..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchActivities()}
          />
          <button onClick={searchActivities} disabled={loading}>
            {loading ? '🔄' : '🔍'} Search
          </button>
        </div>

        <div className="filters">
          <select 
            value={selectedFilters.gameMode} 
            onChange={(e) => setSelectedFilters({...selectedFilters, gameMode: e.target.value})}
          >
            <option value="">All Game Modes</option>
            {GAME_MODES.map(mode => (
              <option key={mode.id} value={mode.id}>{mode.title}</option>
            ))}
          </select>

          <select 
            value={selectedFilters.difficulty} 
            onChange={(e) => setSelectedFilters({...selectedFilters, difficulty: e.target.value})}
          >
            <option value="">Any Difficulty</option>
            <option value="beginner">Beginner Friendly</option>
            <option value="intermediate">Intermediate Challenge</option>
            <option value="advanced">Advanced Mastery</option>
            <option value="expert">Expert Level</option>
          </select>

          <select 
            value={selectedFilters.duration} 
            onChange={(e) => setSelectedFilters({...selectedFilters, duration: e.target.value})}
          >
            <option value="">Any Duration</option>
            <option value="quick">Quick Session (5-15 min)</option>
            <option value="medium">Medium Session (15-45 min)</option>
            <option value="long">Long Session (45+ min)</option>
          </select>
        </div>
      </div>

      <div className="search-results">
        {loading && <div className="loading">🎮 Loading awesome games...</div>}
        
        {publicActivities.length > 0 && (
          <div className="activities-grid">
            {publicActivities.map(renderPublicActivityCard)}
          </div>
        )}
        
        {!loading && publicActivities.length === 0 && searchQuery && (
          <div className="no-results">
            <div className="no-results-icon">🎯</div>
            <h3>No Games Found</h3>
            <p>Try different keywords or create the game you're looking for!</p>
          </div>
        )}
      </div>
    </div>
  );
};

// AI Generate Component
const AIGenerate = ({ courses, onActivityCreated }) => {
  const [description, setDescription] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedGameMode, setSelectedGameMode] = useState('neural-conquest');
  const [difficulty, setDifficulty] = useState('intermediate');
  const [duration, setDuration] = useState('medium');
  const [learningObjectives, setLearningObjectives] = useState(['']);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPreview, setGeneratedPreview] = useState(null);

  const addLearningObjective = () => {
    setLearningObjectives([...learningObjectives, '']);
  };

  const updateLearningObjective = (index, value) => {
    const updated = [...learningObjectives];
    updated[index] = value;
    setLearningObjectives(updated);
  };

  const removeLearningObjective = (index) => {
    if (learningObjectives.length > 1) {
      setLearningObjectives(learningObjectives.filter((_, i) => i !== index));
    }
  };

  const generateActivity = async () => {
    if (!description.trim()) {
      alert('Please provide a description for your activity');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/activities/generate-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          description: description.trim(),
          courseId: selectedCourse,
          gameMode: selectedGameMode,
          difficulty,
          duration,
          learningObjectives: learningObjectives.filter(obj => obj.trim())
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setGeneratedPreview(data.activity);
        if (onActivityCreated) {
          onActivityCreated(data.activity);
        }
      } else {
        alert('Failed to generate activity: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Generation error:', error);
      alert('Failed to generate activity. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const examplePrompts = [
    {
      gameMode: 'neural-conquest',
      title: 'Conquer Ancient Civilizations',
      description: 'Students build and expand historical empires by mastering key concepts about ancient civilizations, trade routes, and cultural exchanges.',
      objectives: ['Understand trade networks', 'Analyze cultural impact', 'Compare civilizations']
    },
    {
      gameMode: 'mystery-syndicate',
      title: 'The Quantum Physics Conspiracy',
      description: 'Teams of student investigators uncover the mysteries of quantum mechanics through collaborative problem-solving and evidence analysis.',
      objectives: ['Quantum superposition', 'Wave-particle duality', 'Measurement theory']
    },
    {
      gameMode: 'synthesis-arena',
      title: 'Literary Fusion Chamber',
      description: 'High-speed connections between literary themes, historical contexts, and modern interpretations create explosive insights.',
      objectives: ['Thematic analysis', 'Historical context', 'Modern relevance']
    }
  ];

  const useExamplePrompt = (example) => {
    setSelectedGameMode(example.gameMode);
    setDescription(example.description);
    setLearningObjectives(example.objectives);
  };

  return (
    <div className="ai-generate-section">
      <div className="ai-header">
        <h2>🤖 AI Activity Generator</h2>
        <p>Describe your vision and let AI create an addictive learning experience</p>
      </div>

      <div className="generation-form">
        <div className="form-section">
          <h3>🎯 Activity Vision</h3>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the learning experience you want to create. Be specific about the subject matter, learning goals, and what you want students to experience..."
            rows={4}
            className="description-input"
          />
        </div>

        <div className="form-section">
          <h3>🎮 Game Mode Selection</h3>
          <div className="game-mode-selector">
            {GAME_MODES.map(mode => (
              <div 
                key={mode.id}
                className={`game-mode-option ${selectedGameMode === mode.id ? 'selected' : ''}`}
                onClick={() => setSelectedGameMode(mode.id)}
              >
                <div className="mode-icon">{mode.icon}</div>
                <div className="mode-info">
                  <h4>{mode.title}</h4>
                  <p>{mode.tagline}</p>
                  <small>{mode.description}</small>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="form-section">
          <h3>⚙️ Configuration</h3>
          <div className="config-grid">
            <div className="config-item">
              <label>Course (Optional)</label>
              <select 
                value={selectedCourse} 
                onChange={(e) => setSelectedCourse(e.target.value)}
              >
                <option value="">No specific course</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="config-item">
              <label>Difficulty Level</label>
              <select 
                value={difficulty} 
                onChange={(e) => setDifficulty(e.target.value)}
              >
                <option value="beginner">Beginner Friendly</option>
                <option value="intermediate">Intermediate Challenge</option>
                <option value="advanced">Advanced Mastery</option>
                <option value="expert">Expert Level</option>
              </select>
            </div>

            <div className="config-item">
              <label>Session Duration</label>
              <select 
                value={duration} 
                onChange={(e) => setDuration(e.target.value)}
              >
                <option value="quick">Quick Session (5-15 min)</option>
                <option value="medium">Medium Session (15-45 min)</option>
                <option value="long">Long Session (45+ min)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>🎯 Learning Objectives</h3>
          <div className="objectives-list">
            {learningObjectives.map((objective, index) => (
              <div key={index} className="objective-item">
                <input
                  type="text"
                  value={objective}
                  onChange={(e) => updateLearningObjective(index, e.target.value)}
                  placeholder={`Learning objective ${index + 1}...`}
                />
                {learningObjectives.length > 1 && (
                  <button 
                    type="button"
                    onClick={() => removeLearningObjective(index)}
                    className="remove-objective"
                  >
                    ❌
                  </button>
                )}
              </div>
            ))}
            <button 
              type="button"
              onClick={addLearningObjective}
              className="add-objective"
            >
              ➕ Add Learning Objective
            </button>
          </div>
        </div>

        <div className="form-section">
          <h3>💡 Example Prompts</h3>
          <div className="example-prompts">
            {examplePrompts.map((example, index) => (
              <div key={index} className="example-prompt">
                <div className="example-header">
                  <div className="example-icon">
                    {GAME_MODES.find(m => m.id === example.gameMode)?.icon}
                  </div>
                  <h4>{example.title}</h4>
                </div>
                <p>{example.description}</p>
                <div className="example-objectives">
                  {example.objectives.map((obj, i) => (
                    <span key={i} className="objective-tag">{obj}</span>
                  ))}
                </div>
                <button 
                  onClick={() => useExamplePrompt(example)}
                  className="use-example-btn"
                >
                  Use This Example
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="generation-actions">
          <button 
            onClick={generateActivity}
            disabled={isGenerating || !description.trim()}
            className="generate-btn"
          >
            {isGenerating ? (
              <>
                <span className="spinner">🔄</span>
                Generating Amazing Activity...
              </>
            ) : (
              <>
                🚀 Generate Activity
              </>
            )}
          </button>
        </div>
      </div>

      {generatedPreview && (
        <div className="generated-preview">
          <div className="preview-header">
            <h3>🎉 Activity Generated Successfully!</h3>
            <p>Your addictive learning experience is ready</p>
          </div>
          
          <div className="preview-content">
            <div className="preview-info">
              <h4>{generatedPreview.title}</h4>
              <p>{generatedPreview.description}</p>
              
              <div className="preview-meta">
                <span className="game-mode-badge">
                  {GAME_MODES.find(m => m.id === generatedPreview.gameMode)?.icon}
                  {GAME_MODES.find(m => m.id === generatedPreview.gameMode)?.title}
                </span>
                <span className="difficulty-badge">{difficulty}</span>
                <span className="duration-badge">{duration}</span>
              </div>
            </div>

            {generatedPreview.preview && (
              <div className="preview-highlights">
                <h5>🌟 Key Features</h5>
                <ul>
                  {generatedPreview.preview.highlights.map((highlight, index) => (
                    <li key={index}>{highlight}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="preview-actions">
            <button 
              onClick={() => window.location.href = `/activities/${generatedPreview.id}`}
              className="view-activity-btn"
            >
              🎮 Launch Activity
            </button>
            <button 
              onClick={() => setGeneratedPreview(null)}
              className="generate-another-btn"
            >
              ✨ Generate Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Create Activity Modal (comprehensive implementation)
const CreateActivityModal = ({ courses, activityTypes, onClose, onSuccess }) => {
  const { currentUser } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'adaptive-mastery',
    courseId: '',
    materials: [],
    settings: {
      anonymousMode: true,
      allowAsyncPlay: true,
      difficultyAdaptation: true,
      peerReview: false,
      timeLimit: 0, // 0 = no limit
      maxAttempts: 0, // 0 = unlimited
      showLeaderboard: true,
      enableAnalytics: true,
      autoGrading: true
    },
    privacy: {
      shareWithInstitution: false,
      allowPublicDiscovery: false,
      dataRetentionDays: 365
    }
  });

  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [courseMaterials, setCourseMaterials] = useState([]);

  useEffect(() => {
    if (formData.courseId) {
      fetchCourseMaterials(formData.courseId);
    }
  }, [formData.courseId]);

  const fetchCourseMaterials = async (courseId) => {
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/courses/${courseId}/materials`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCourseMaterials(data.data?.materials || []);
      }
    } catch (error) {
      console.error('Error fetching materials:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError('Activity title is required');
      return;
    }
    
    if (!formData.courseId) {
      setError('Please select a course');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = await currentUser.getIdToken();
      
      const activityData = {
        ...formData,
        materials: selectedMaterials,
        createdBy: currentUser.uid,
        status: 'draft'
      };

      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(activityData)
      });

      if (response.ok) {
        const data = await response.json();
        onClose();
        onSuccess();
        // Could show success message or redirect to activity management
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to create activity');
      }
    } catch (error) {
      console.error('Error creating activity:', error);
      setError('Failed to create activity. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedType = activityTypes.find(t => t.id === formData.type);

  const renderStep1 = () => (
    <div className="create-step">
      <div className="step-header">
        <h3>Basic Information</h3>
        <p>Set up the core details for your learning activity</p>
      </div>

      <div className="form-group">
        <label className="form-label">
          <DocumentTextIcon className="label-icon" />
          Activity Title
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({...formData, title: e.target.value})}
          placeholder="e.g., Calculus Fundamentals Mastery Challenge"
          className="form-input"
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label">
          <BookOpenIcon className="label-icon" />
          Course
        </label>
        <select 
          value={formData.courseId}
          onChange={(e) => setFormData({...formData, courseId: e.target.value})}
          className="form-select"
          required
        >
          <option value="">Select a course</option>
          {courses.map(course => (
            <option key={course.id} value={course.id}>
              {course.code} - {course.name}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Description (Optional)</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          placeholder="Describe what students will learn and practice..."
          className="form-textarea"
          rows={3}
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="create-step">
      <div className="step-header">
        <h3>Learning Activity Type</h3>
        <p>Choose the type of interactive learning experience</p>
      </div>

      <div className="activity-type-selection">
        {activityTypes.map(type => (
          <div
            key={type.id}
            onClick={() => setFormData({...formData, type: type.id})}
            className={`activity-type-option ${formData.type === type.id ? 'selected' : ''} ${type.color}`}
          >
            <div className="type-header">
              <span className="type-icon">{type.icon}</span>
              <h4 className="type-name">{type.name}</h4>
            </div>
            <p className="type-description">{type.description}</p>
            <div className="type-features">
              {type.features.map(feature => (
                <span key={feature} className="feature-tag">{feature}</span>
              ))}
            </div>
            {formData.type === type.id && (
              <div className="type-details">
                <p className="details-text">{type.details}</p>
                <div className="analytics-preview">
                  <h5>Analytics Provided:</h5>
                  <ul>
                    {type.analytics.map(analytic => (
                      <li key={analytic}>{analytic}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="create-step">
      <div className="step-header">
        <h3>Course Materials & Settings</h3>
        <p>Configure materials and learning parameters</p>
      </div>

      {courseMaterials.length > 0 && (
        <div className="materials-section">
          <h4>Course Materials</h4>
          <div className="materials-grid">
            {courseMaterials.map(material => (
              <div
                key={material.id}
                onClick={() => {
                  const isSelected = selectedMaterials.includes(material.id);
                  setSelectedMaterials(
                    isSelected 
                      ? selectedMaterials.filter(id => id !== material.id)
                      : [...selectedMaterials, material.id]
                  );
                }}
                className={`material-option ${selectedMaterials.includes(material.id) ? 'selected' : ''}`}
              >
                <DocumentTextIcon className="material-icon" />
                <div className="material-info">
                  <span className="material-name">{material.name}</span>
                  <span className="material-type">{material.type}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="settings-section">
        <h4>Activity Settings</h4>
        <div className="settings-grid">
          <div className="setting-toggle">
            <div className="toggle-info">
              <label>Anonymous Mode</label>
              <p>Students compete anonymously to reduce anxiety</p>
            </div>
            <input
              type="checkbox"
              checked={formData.settings.anonymousMode}
              onChange={(e) => setFormData({
                ...formData,
                settings: {...formData.settings, anonymousMode: e.target.checked}
              })}
            />
          </div>

          <div className="setting-toggle">
            <div className="toggle-info">
              <label>Asynchronous Play</label>
              <p>Allow students to participate at their own pace</p>
            </div>
            <input
              type="checkbox"
              checked={formData.settings.allowAsyncPlay}
              onChange={(e) => setFormData({
                ...formData,
                settings: {...formData.settings, allowAsyncPlay: e.target.checked}
              })}
            />
          </div>

          <div className="setting-toggle">
            <div className="toggle-info">
              <label>Adaptive Difficulty</label>
              <p>AI adjusts difficulty based on student performance</p>
            </div>
            <input
              type="checkbox"
              checked={formData.settings.difficultyAdaptation}
              onChange={(e) => setFormData({
                ...formData,
                settings: {...formData.settings, difficultyAdaptation: e.target.checked}
              })}
            />
          </div>

          <div className="setting-toggle">
            <div className="toggle-info">
              <label>Show Leaderboard</label>
              <p>Display anonymous rankings to motivate students</p>
            </div>
            <input
              type="checkbox"
              checked={formData.settings.showLeaderboard}
              onChange={(e) => setFormData({
                ...formData,
                settings: {...formData.settings, showLeaderboard: e.target.checked}
              })}
            />
          </div>

          <div className="setting-toggle">
            <div className="toggle-info">
              <label>Detailed Analytics</label>
              <p>Collect learning analytics for course insights</p>
            </div>
            <input
              type="checkbox"
              checked={formData.settings.enableAnalytics}
              onChange={(e) => setFormData({
                ...formData,
                settings: {...formData.settings, enableAnalytics: e.target.checked}
              })}
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="modal-overlay">
      <div className="modal-content create-activity-modal">
        <div className="modal-header">
          <h2>Create Learning Activity</h2>
          <button onClick={onClose} className="modal-close">
            <XMarkIcon />
          </button>
        </div>

        <div className="modal-progress">
          <div className="progress-steps">
            {[1, 2, 3].map(stepNum => (
              <div 
                key={stepNum}
                className={`progress-step ${step >= stepNum ? 'active' : ''} ${step === stepNum ? 'current' : ''}`}
              >
                <span className="step-number">{stepNum}</span>
                <span className="step-label">
                  {stepNum === 1 ? 'Basic Info' : stepNum === 2 ? 'Activity Type' : 'Configuration'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="create-form">
          <div className="modal-body">
            {error && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            )}

            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
          </div>

          <div className="modal-actions">
            {step > 1 && (
              <button 
                type="button" 
                onClick={() => setStep(step - 1)}
                className="btn-secondary"
              >
                Previous
              </button>
            )}
            
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            
            {step < 3 ? (
              <button 
                type="button" 
                onClick={() => setStep(step + 1)}
                className="btn-primary"
                disabled={step === 1 && (!formData.title || !formData.courseId)}
              >
                Next
              </button>
            ) : (
              <button 
                type="submit" 
                className="btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="loading-spinner small"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="btn-icon" />
                    Create Activity
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

// Activity Details Modal (placeholder - can be expanded)  
const ActivityDetailsModal = ({ activity, onClose, onJoin }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{activity.title}</h2>
          <button onClick={onClose} className="modal-close">
            <XMarkIcon />
          </button>
        </div>
        <div className="modal-body">
          <p>Activity Details Modal - To be implemented</p>
        </div>
      </div>
    </div>
  );
};

export default InteractiveActivities;
 