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
  BoltIcon
} from '@heroicons/react/24/outline';

const InteractiveActivities = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = await user.getIdToken();
      
      // Fetch classrooms and activities in parallel
      const [classroomsResponse, activitiesResponse] = await Promise.all([
        fetch('/api/classrooms', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/activities', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (classroomsResponse.ok) {
        const classroomsData = await classroomsResponse.json();
        setClassrooms([
          ...classroomsData.data.classrooms.teaching || [],
          ...classroomsData.data.classrooms.enrolled || []
        ]);
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

  const CreateActivityModal = () => {
    const [formData, setFormData] = useState({
      title: '',
      type: 'ai-quiz',
      description: '',
      classroomId: '',
      content: {
        topic: '',
        difficulty: 'medium'
      },
      settings: {
        maxParticipants: 50,
        timeLimit: 300,
        allowHints: true,
        showLeaderboard: true,
        gamificationEnabled: true
      }
    });

    const activityTypes = [
      {
        id: 'ai-quiz',
        name: 'AI Quiz Battle',
        icon: '🧠',
        description: 'AI-generated questions with real-time scoring'
      },
      {
        id: 'collaborative-solving',
        name: 'Collaborative Problem Solving',
        icon: '🤝',
        description: 'Students work together on complex problems'
      },
      {
        id: 'concept-race',
        name: 'Concept Race',
        icon: '⚡',
        description: 'Fast-paced concept identification game'
      },
      {
        id: 'step-by-step',
        name: 'Step-by-Step Challenge',
        icon: '📝',
        description: 'AI guides students through problem-solving steps'
      }
    ];

    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        const token = await user.getIdToken();
        const response = await fetch('/api/activities', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });

        if (response.ok) {
          setShowCreateModal(false);
          fetchData();
        }
      } catch (error) {
        console.error('Error creating activity:', error);
      }
    };

    return showCreateModal ? (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <h2 className="text-2xl font-bold mb-6">Create Interactive Activity</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Activity Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Calculus Quiz Battle"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Activity Type *
              </label>
              <div className="grid grid-cols-2 gap-3">
                {activityTypes.map(type => (
                  <div
                    key={type.id}
                    onClick={() => setFormData({...formData, type: type.id})}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.type === type.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-2">{type.icon}</div>
                    <div className="font-medium text-sm mb-1">{type.name}</div>
                    <div className="text-xs text-gray-500">{type.description}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Classroom *
              </label>
              <select
                required
                value={formData.classroomId}
                onChange={(e) => setFormData({...formData, classroomId: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a classroom</option>
                {classrooms.map(classroom => (
                  <option key={classroom.id} value={classroom.id}>
                    {classroom.name} ({classroom.subject})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Topic
                </label>
                <input
                  type="text"
                  value={formData.content.topic}
                  onChange={(e) => setFormData({
                    ...formData,
                    content: {...formData.content, topic: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Derivatives"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Difficulty
                </label>
                <select
                  value={formData.content.difficulty}
                  onChange={(e) => setFormData({
                    ...formData,
                    content: {...formData.content, difficulty: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                  <option value="adaptive">Adaptive</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
                placeholder="Brief description of the activity..."
              />
            </div>

            <div>
              <h3 className="text-lg font-medium mb-3">Settings</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Participants
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.settings.maxParticipants}
                    onChange={(e) => setFormData({
                      ...formData,
                      settings: {...formData.settings, maxParticipants: parseInt(e.target.value)}
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time Limit (minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={formData.settings.timeLimit / 60}
                    onChange={(e) => setFormData({
                      ...formData,
                      settings: {...formData.settings, timeLimit: parseInt(e.target.value) * 60}
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {[
                  { key: 'allowHints', label: 'Allow Hints' },
                  { key: 'showLeaderboard', label: 'Show Leaderboard' },
                  { key: 'gamificationEnabled', label: 'Enable Gamification' }
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.settings[key]}
                      onChange={(e) => setFormData({
                        ...formData,
                        settings: {...formData.settings, [key]: e.target.checked}
                      })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Create Activity
              </button>
            </div>
          </form>
        </div>
      </div>
    ) : null;
  };

  const JoinActivityModal = () => {
    const [joinCode, setJoinCode] = useState('');

    const handleJoin = async (e) => {
      e.preventDefault();
      try {
        const token = await user.getIdToken();
        const response = await fetch('/api/activities/join', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ joinCode })
        });

        if (response.ok) {
          setShowJoinModal(false);
          setJoinCode('');
          // Redirect to activity page
        }
      } catch (error) {
        console.error('Error joining activity:', error);
      }
    };

    return showJoinModal ? (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h2 className="text-2xl font-bold mb-6">Join Activity</h2>
          
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Activity Join Code *
              </label>
              <input
                type="text"
                required
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-center text-2xl"
                placeholder="ABCD"
                maxLength="4"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowJoinModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Join Activity
              </button>
            </div>
          </form>
        </div>
      </div>
    ) : null;
  };

  const ActivityCard = ({ activity }) => {
    const getActivityIcon = (type) => {
      const icons = {
        'ai-quiz': '🧠',
        'collaborative-solving': '🤝',
        'concept-race': '⚡',
        'step-by-step': '📝'
      };
      return icons[type] || '🎯';
    };

    const getStatusColor = (status) => {
      const colors = {
        draft: 'bg-gray-100 text-gray-800',
        active: 'bg-green-100 text-green-800',
        paused: 'bg-yellow-100 text-yellow-800',
        completed: 'bg-blue-100 text-blue-800'
      };
      return colors[status] || 'bg-gray-100 text-gray-800';
    };

    return (
      <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-3">
            <div className="text-3xl">{getActivityIcon(activity.type)}</div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">{activity.title}</h3>
              <p className="text-gray-600">{activity.content?.topic}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(activity.status)}`}>
              {activity.status}
            </span>
            {activity.status === 'active' && (
              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full font-mono">
                {activity.joinCode}
              </span>
            )}
          </div>
        </div>

        {activity.description && (
          <p className="text-gray-700 mb-4">{activity.description}</p>
        )}

        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <UsersIcon className="h-4 w-4 mr-1" />
              <span>{activity.stats?.totalParticipants || 0}/{activity.settings?.maxParticipants}</span>
            </div>
            <div className="flex items-center">
              <ClockIcon className="h-4 w-4 mr-1" />
              <span>{Math.floor(activity.settings?.timeLimit / 60)}min</span>
            </div>
            <div className="flex items-center">
              <TrophyIcon className="h-4 w-4 mr-1" />
              <span>{activity.stats?.averageScore || 0} avg</span>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex space-x-2">
            {activity.status === 'draft' && (
              <button className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm">
                <PlayIcon className="h-4 w-4 mr-1" />
                Start
              </button>
            )}
            {activity.status === 'active' && (
              <button className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
                <SparklesIcon className="h-4 w-4 mr-1" />
                Monitor
              </button>
            )}
            {activity.status === 'completed' && (
              <button className="flex items-center px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm">
                <ChartBarIcon className="h-4 w-4 mr-1" />
                Results
              </button>
            )}
          </div>
          
          <div className="flex items-center space-x-1">
            {activity.settings?.allowHints && (
              <BoltIcon className="h-4 w-4 text-yellow-500" title="Hints enabled" />
            )}
            {activity.settings?.showLeaderboard && (
              <TrophyIcon className="h-4 w-4 text-blue-500" title="Leaderboard enabled" />
            )}
            {activity.settings?.gamificationEnabled && (
              <SparklesIcon className="h-4 w-4 text-purple-500" title="Gamification enabled" />
            )}
          </div>
        </div>
      </div>
    );
  };

  const filteredActivities = activities.filter(activity => {
    if (activeTab === 'all') return true;
    return activity.status === activeTab;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading activities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Interactive Activities</h1>
          <p className="mt-2 text-gray-600">
            Create and manage AI-powered interactive activities for your classrooms
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mb-8 flex space-x-4">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Activity
          </button>
          <button
            onClick={() => setShowJoinModal(true)}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <PlayIcon className="h-5 w-5 mr-2" />
            Join Activity
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { key: 'all', label: 'All Activities' },
                { key: 'draft', label: 'Draft' },
                { key: 'active', label: 'Active' },
                { key: 'completed', label: 'Completed' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Activities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredActivities.map(activity => (
            <ActivityCard key={activity.id} activity={activity} />
          ))}
        </div>

        {/* Empty State */}
        {!filteredActivities.length && (
          <div className="text-center py-12">
            <PuzzlePieceIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No activities found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating your first interactive activity.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Create Activity
              </button>
            </div>
          </div>
        )}
      </div>

      <CreateActivityModal />
      <JoinActivityModal />
    </div>
  );
};

export default InteractiveActivities; 