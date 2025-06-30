import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
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
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import './InteractiveActivities.css';

const InteractiveActivities = () => {
  const { currentUser } = useAuth();
  const [activities, setActivities] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('live');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  // Modal scroll management
  useEffect(() => {
    const isAnyModalOpen = showCreateModal || showJoinModal;
    
    if (isAnyModalOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    
    // Cleanup on unmount
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [showCreateModal, showJoinModal]);

  const fetchData = async () => {
    try {
      if (!currentUser) return;
      const token = await currentUser.getIdToken();
      
      // Fetch courses and activities
      const [coursesResponse, activitiesResponse] = await Promise.all([
        fetch('/api/courses', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/activities', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (coursesResponse.ok) {
        const coursesData = await coursesResponse.json();
        setCourses(coursesData.data.courses || []);
      }

      if (activitiesResponse.ok) {
        const activitiesData = await activitiesResponse.json();
        setActivities(activitiesData.data.activities || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Enhanced activity types with AI-powered features
  const activityTypes = [
    {
      id: 'ai-quiz-battle',
      name: 'AI Quiz Battle',
      icon: '🧠',
      color: 'purple',
      description: 'Real-time quiz with AI-generated questions from course materials',
      features: ['PDF Analysis', 'Adaptive Difficulty', 'Live Leaderboard', 'AI Explanations']
    },
    {
      id: 'concept-race',
      name: 'Concept Race',
      icon: '⚡',
      color: 'blue',
      description: 'Fast-paced concept identification using course content',
      features: ['Speed Rounds', 'Visual Recognition', 'Team Mode', 'Progress Tracking']
    },
    {
      id: 'collaborative-solver',
      name: 'Collaborative Problem Solver',
      icon: '🤝',
      color: 'green',
      description: 'Students work together on complex problems with AI guidance',
      features: ['Real-time Collaboration', 'AI Hints', 'Step-by-step Guide', 'Peer Review']
    },
    {
      id: 'mystery-case',
      name: 'Mystery Case Study',
      icon: '🕵️',
      color: 'orange',
      description: 'Interactive case studies with branching scenarios',
      features: ['Branching Paths', 'Evidence Collection', 'AI Feedback', 'Multiple Endings']
    },
    {
      id: 'debate-arena',
      name: 'Debate Arena',
      icon: '⚖️',
      color: 'red',
      description: 'Structured debates with AI moderation and fact-checking',
      features: ['AI Moderation', 'Fact Checking', 'Argument Analysis', 'Voting System']
    },
    {
      id: 'simulation-lab',
      name: 'Simulation Lab',
      icon: '🧪',
      color: 'teal',
      description: 'Interactive simulations based on course materials',
      features: ['Virtual Experiments', 'Parameter Testing', 'Data Analysis', 'Report Generation']
    }
  ];

  const CreateActivityModal = () => {
    const [formData, setFormData] = useState({
      title: '',
      type: 'ai-quiz-battle',
      description: '',
      courseId: '',
      materials: [],
      settings: {
        maxParticipants: 30,
        timeLimit: 20,
        difficulty: 'adaptive',
        allowHints: true,
        showLeaderboard: true,
        teamMode: false,
        aiModeration: true
      }
    });

    const [selectedMaterials, setSelectedMaterials] = useState([]);
    const [courseMaterials, setCourseMaterials] = useState([]);

    const handleCourseChange = async (courseId) => {
      setFormData({...formData, courseId});
      if (courseId) {
        try {
          const token = await currentUser.getIdToken();
          const response = await fetch(`/api/courses/${courseId}/materials`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            const data = await response.json();
            setCourseMaterials(data.data.materials || []);
          }
        } catch (error) {
          console.error('Error fetching materials:', error);
        }
      }
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        const token = await currentUser.getIdToken();
        const response = await fetch('/api/activities', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...formData,
            materials: selectedMaterials
          })
        });

        if (response.ok) {
          setShowCreateModal(false);
          fetchData();
        }
      } catch (error) {
        console.error('Error creating activity:', error);
      }
    };

    const selectedType = activityTypes.find(t => t.id === formData.type);

    return showCreateModal ? (
      <div className="modal-overlay">
        <div className="modal-content activity-modal">
          <div className="modal-header">
            <h2 className="modal-title">Create Interactive Learning Activity</h2>
            <button onClick={() => setShowCreateModal(false)} className="modal-close">
              <XMarkIcon className="close-icon" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="activity-form">
            <div className="form-section">
              <h3 className="section-title">Activity Details</h3>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Activity Title</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="form-input"
                    placeholder="e.g., Calculus Concepts Battle"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Course</label>
                  <select
                    required
                    value={formData.courseId}
                    onChange={(e) => handleCourseChange(e.target.value)}
                    className="form-select"
                  >
                    <option value="">Select a course</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>
                        {course.code} - {course.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3 className="section-title">Activity Type</h3>
              <div className="activity-type-grid">
                {activityTypes.map(type => (
                  <div
                    key={type.id}
                    onClick={() => setFormData({...formData, type: type.id})}
                    className={`activity-type-card ${formData.type === type.id ? 'selected' : ''} ${type.color}`}
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
                  </div>
                ))}
              </div>
            </div>

            {formData.courseId && (
              <div className="form-section">
                <h3 className="section-title">Course Materials</h3>
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
                      className={`material-card ${selectedMaterials.includes(material.id) ? 'selected' : ''}`}
                    >
                      <DocumentTextIcon className="material-icon" />
                      <div className="material-info">
                        <h4 className="material-name">{material.name}</h4>
                        <p className="material-type">{material.type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="form-section">
              <h3 className="section-title">Activity Settings</h3>
              <div className="settings-grid">
                <div className="setting-group">
                  <label className="setting-label">Max Participants</label>
                  <input
                    type="number"
                    value={formData.settings.maxParticipants}
                    onChange={(e) => setFormData({
                      ...formData,
                      settings: {...formData.settings, maxParticipants: parseInt(e.target.value)}
                    })}
                    className="setting-input"
                    min="5"
                    max="100"
                  />
                </div>
                <div className="setting-group">
                  <label className="setting-label">Time Limit (minutes)</label>
                  <input
                    type="number"
                    value={formData.settings.timeLimit}
                    onChange={(e) => setFormData({
                      ...formData,
                      settings: {...formData.settings, timeLimit: parseInt(e.target.value)}
                    })}
                    className="setting-input"
                    min="5"
                    max="120"
                  />
                </div>
                <div className="setting-group">
                  <label className="setting-label">Difficulty</label>
                  <select
                    value={formData.settings.difficulty}
                    onChange={(e) => setFormData({
                      ...formData,
                      settings: {...formData.settings, difficulty: e.target.value}
                    })}
                    className="setting-select"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                    <option value="adaptive">Adaptive (AI-Powered)</option>
                  </select>
                </div>
              </div>

              <div className="setting-toggles">
                {[
                  { key: 'allowHints', label: 'Allow AI Hints', desc: 'Students can get AI-powered hints' },
                  { key: 'showLeaderboard', label: 'Live Leaderboard', desc: 'Show real-time rankings' },
                  { key: 'teamMode', label: 'Team Mode', desc: 'Students work in teams' },
                  { key: 'aiModeration', label: 'AI Moderation', desc: 'AI monitors and guides activity' }
                ].map(setting => (
                  <div key={setting.key} className="setting-toggle">
                    <div className="toggle-info">
                      <label className="toggle-label">{setting.label}</label>
                      <p className="toggle-desc">{setting.desc}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.settings[setting.key]}
                      onChange={(e) => setFormData({
                        ...formData,
                        settings: {...formData.settings, [setting.key]: e.target.checked}
                      })}
                      className="toggle-input"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                <SparklesIcon className="w-4 h-4" />
                Create Activity
              </button>
            </div>
          </form>
        </div>
      </div>
    ) : null;
  };

  const JoinActivityModal = () => {
    const handleJoin = async (e) => {
      e.preventDefault();
      try {
        const token = await currentUser.getIdToken();
        const response = await fetch('/api/activities/join', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ joinCode })
        });

        if (response.ok) {
          const data = await response.json();
          // Redirect to activity session
          window.location.href = `/activities/${data.data.activityId}/session`;
        }
      } catch (error) {
        console.error('Error joining activity:', error);
      }
    };

    return showJoinModal ? (
      <div className="modal-overlay">
        <div className="modal-content join-modal">
          <div className="modal-header">
            <h2 className="modal-title">Join Learning Activity</h2>
            <button onClick={() => setShowJoinModal(false)} className="modal-close">
              <XMarkIcon className="close-icon" />
            </button>
          </div>
          
          <form onSubmit={handleJoin} className="join-form">
            <div className="join-illustration">
              <UsersIcon className="join-icon" />
              <h3>Ready to Learn?</h3>
              <p>Enter the activity code provided by your instructor</p>
            </div>
            
            <div className="form-group">
              <label className="form-label">Activity Code</label>
              <input
                type="text"
                required
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="join-input"
                placeholder="Enter 6-digit code"
                maxLength="6"
                pattern="[A-Z0-9]{6}"
              />
            </div>
            
            <div className="modal-actions">
              <button
                type="button"
                onClick={() => setShowJoinModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                <PlayIcon className="w-4 h-4" />
                Join Activity
              </button>
            </div>
          </form>
        </div>
      </div>
    ) : null;
  };

  const ActivityCard = ({ activity }) => {
    const getStatusColor = (status) => {
      switch (status) {
        case 'live': return 'status-live';
        case 'scheduled': return 'status-scheduled';
        case 'completed': return 'status-completed';
        default: return 'status-draft';
      }
    };

    const getTypeInfo = (type) => {
      return activityTypes.find(t => t.id === type) || activityTypes[0];
    };

    const typeInfo = getTypeInfo(activity.type);

    return (
      <div className={`activity-card ${activity.status}`}>
        <div className="card-header">
          <div className="activity-type-badge">
            <span className="type-emoji">{typeInfo.icon}</span>
            <span className="type-text">{typeInfo.name}</span>
          </div>
          <span className={`status-indicator ${getStatusColor(activity.status)}`}>
            {activity.status === 'live' && <span className="pulse-dot"></span>}
            {activity.status.toUpperCase()}
          </span>
        </div>

        <div className="card-content">
          <h3 className="activity-title">{activity.title}</h3>
          <p className="activity-course">{activity.course?.code} - {activity.course?.name}</p>
          
          <div className="activity-stats">
            <div className="stat">
              <UsersIcon className="stat-icon" />
              <span>{activity.participants || 0}/{activity.maxParticipants}</span>
            </div>
            <div className="stat">
              <ClockIcon className="stat-icon" />
              <span>{activity.timeLimit}min</span>
            </div>
            <div className="stat">
              <DocumentTextIcon className="stat-icon" />
              <span>{activity.materials?.length || 0} materials</span>
            </div>
          </div>

          {activity.features && (
            <div className="activity-features">
              {activity.features.slice(0, 3).map(feature => (
                <span key={feature} className="feature-pill">{feature}</span>
              ))}
            </div>
          )}
        </div>

        <div className="card-actions">
          {activity.status === 'live' ? (
            <button className="action-btn live">
              <PlayIcon className="w-4 h-4" />
              Join Live
            </button>
          ) : activity.status === 'scheduled' ? (
            <button className="action-btn scheduled">
              <ClockIcon className="w-4 h-4" />
              Scheduled
            </button>
          ) : (
            <button className="action-btn start">
              <PlayIcon className="w-4 h-4" />
              Start Activity
            </button>
          )}
          
          <button className="action-btn secondary">
            <EyeIcon className="w-4 h-4" />
            View
          </button>
        </div>
      </div>
    );
  };

  const filteredActivities = activities.filter(activity => {
    switch (activeTab) {
      case 'live': return activity.status === 'live';
      case 'scheduled': return activity.status === 'scheduled';
      case 'my-activities': return activity.createdBy === currentUser?.uid;
      default: return true;
    }
  });

  if (loading) {
    return (
      <div className="interactive-activities">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading activities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="interactive-activities">
      <div className="activities-header">
        <div className="header-content">
          <h1 className="page-title">Interactive Learning Hub</h1>
          <p className="page-subtitle">
            AI-powered interactive activities that transform course materials into engaging learning experiences
          </p>
        </div>
        
        <div className="header-actions">
          <button
            onClick={() => setShowJoinModal(true)}
            className="action-btn secondary"
          >
            <UsersIcon className="w-4 h-4" />
            Join Activity
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="action-btn primary"
          >
            <PlusIcon className="w-4 h-4" />
            Create Activity
          </button>
        </div>
      </div>

      <div className="activities-nav">
        <div className="nav-tabs">
          {[
            { id: 'live', label: 'Live Now', icon: FireIcon, count: activities.filter(a => a.status === 'live').length },
            { id: 'scheduled', label: 'Scheduled', icon: ClockIcon, count: activities.filter(a => a.status === 'scheduled').length },
            { id: 'my-activities', label: 'My Activities', icon: AcademicCapIcon, count: activities.filter(a => a.createdBy === currentUser?.uid).length },
            { id: 'all', label: 'All Activities', icon: SparklesIcon, count: activities.length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
            >
              <tab.icon className="tab-icon" />
              <span className="tab-label">{tab.label}</span>
              <span className="tab-count">{tab.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="activities-content">
        {filteredActivities.length > 0 ? (
          <div className="activities-grid">
            {filteredActivities.map(activity => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <SparklesIcon className="empty-icon" />
            <h3 className="empty-title">No Activities Found</h3>
            <p className="empty-description">
              {activeTab === 'live' 
                ? "No live activities right now. Create one to get started!"
                : "Start creating interactive learning experiences for your students."
              }
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="empty-action"
            >
              <PlusIcon className="w-4 h-4" />
              Create Your First Activity
            </button>
          </div>
        )}
      </div>

      <CreateActivityModal />
      <JoinActivityModal />
    </div>
  );
};

export default InteractiveActivities;
 