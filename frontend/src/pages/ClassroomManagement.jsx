import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  PlusIcon, 
  AcademicCapIcon, 
  UsersIcon, 
  ChartBarIcon,
  Cog6ToothIcon,
  ClipboardDocumentListIcon,
  SparklesIcon,
  LinkIcon
} from '@heroicons/react/24/outline';

const ClassroomManagement = () => {
  const { user } = useAuth();
  const [classrooms, setClassrooms] = useState({ teaching: [], enrolled: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('teaching');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const fetchClassrooms = async () => {
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/classrooms', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setClassrooms(data.data.classrooms);
      }
    } catch (error) {
      console.error('Error fetching classrooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const CreateClassroomModal = () => {
    const [formData, setFormData] = useState({
      name: '',
      subject: '',
      semester: '',
      description: '',
      invitePassword: '',
      aiSettings: {
        tutorEnabled: true,
        studyPlanEnabled: true,
        practiceQuestionsEnabled: true,
        conceptExplanationEnabled: true,
        interactiveActivitiesEnabled: true,
        gamificationEnabled: true,
        allowedIntegrations: ['gradescope', 'canvas', 'brightspace']
      }
    });

    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        const token = await user.getIdToken();
        const response = await fetch('/api/classrooms', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });

        if (response.ok) {
          setShowCreateModal(false);
          fetchClassrooms();
          setFormData({
            name: '',
            subject: '',
            semester: '',
            description: '',
            invitePassword: '',
            aiSettings: {
              tutorEnabled: true,
              studyPlanEnabled: true,
              practiceQuestionsEnabled: true,
              conceptExplanationEnabled: true,
              interactiveActivitiesEnabled: true,
              gamificationEnabled: true,
              allowedIntegrations: ['gradescope', 'canvas', 'brightspace']
            }
          });
        }
      } catch (error) {
        console.error('Error creating classroom:', error);
      }
    };

    return showCreateModal ? (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <h2 className="text-2xl font-bold mb-6">Create New Classroom</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Classroom Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Advanced Calculus Fall 2024"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Mathematics"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Semester
                </label>
                <input
                  type="text"
                  value={formData.semester}
                  onChange={(e) => setFormData({...formData, semester: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Fall 2024"
                />
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
                placeholder="Brief description of the course..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invite Password (Optional)
              </label>
              <input
                type="password"
                value={formData.invitePassword}
                onChange={(e) => setFormData({...formData, invitePassword: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Leave empty for no password protection"
              />
            </div>

            <div>
              <h3 className="text-lg font-medium mb-3">AI Features</h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries({
                  tutorEnabled: 'AI Tutor Chat',
                  studyPlanEnabled: 'Study Plan Generation',
                  practiceQuestionsEnabled: 'Practice Questions',
                  conceptExplanationEnabled: 'Concept Explanations',
                  interactiveActivitiesEnabled: 'Interactive Activities',
                  gamificationEnabled: 'Gamification'
                }).map(([key, label]) => (
                  <label key={key} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.aiSettings[key]}
                      onChange={(e) => setFormData({
                        ...formData,
                        aiSettings: {
                          ...formData.aiSettings,
                          [key]: e.target.checked
                        }
                      })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-3">Allowed Integrations</h3>
              <div className="space-y-2">
                {[
                  { key: 'gradescope', label: '🎓 Gradescope', desc: 'Import assignments and grades' },
                  { key: 'canvas', label: '🎨 Canvas', desc: 'Import courses and materials' },
                  { key: 'brightspace', label: '💡 Brightspace', desc: 'Import content from D2L' }
                ].map(({ key, label, desc }) => (
                  <label key={key} className="flex items-start space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.aiSettings.allowedIntegrations.includes(key)}
                      onChange={(e) => {
                        const integrations = formData.aiSettings.allowedIntegrations;
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            aiSettings: {
                              ...formData.aiSettings,
                              allowedIntegrations: [...integrations, key]
                            }
                          });
                        } else {
                          setFormData({
                            ...formData,
                            aiSettings: {
                              ...formData.aiSettings,
                              allowedIntegrations: integrations.filter(i => i !== key)
                            }
                          });
                        }
                      }}
                      className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{label}</div>
                      <div className="text-xs text-gray-500">{desc}</div>
                    </div>
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
                Create Classroom
              </button>
            </div>
          </form>
        </div>
      </div>
    ) : null;
  };

  const JoinClassroomModal = () => {
    const [joinData, setJoinData] = useState({ inviteCode: '', password: '' });

    const handleJoin = async (e) => {
      e.preventDefault();
      try {
        const token = await user.getIdToken();
        const response = await fetch('/api/classrooms/join', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(joinData)
        });

        if (response.ok) {
          setShowJoinModal(false);
          fetchClassrooms();
          setJoinData({ inviteCode: '', password: '' });
        }
      } catch (error) {
        console.error('Error joining classroom:', error);
      }
    };

    return showJoinModal ? (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h2 className="text-2xl font-bold mb-6">Join Classroom</h2>
          
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invite Code *
              </label>
              <input
                type="text"
                required
                value={joinData.inviteCode}
                onChange={(e) => setJoinData({...joinData, inviteCode: e.target.value.toUpperCase()})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-center text-lg"
                placeholder="ABC123"
                maxLength="6"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password (if required)
              </label>
              <input
                type="password"
                value={joinData.password}
                onChange={(e) => setJoinData({...joinData, password: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter password if classroom is protected"
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
                Join Classroom
              </button>
            </div>
          </form>
        </div>
      </div>
    ) : null;
  };

  const ClassroomCard = ({ classroom, isTeacher }) => (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">{classroom.name}</h3>
          <p className="text-gray-600">{classroom.subject} • {classroom.semester}</p>
        </div>
        {isTeacher && (
          <div className="flex items-center space-x-2">
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              {classroom.inviteCode}
            </span>
          </div>
        )}
      </div>

      {classroom.description && (
        <p className="text-gray-700 mb-4">{classroom.description}</p>
      )}

      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <UsersIcon className="h-4 w-4 mr-1" />
            <span>{classroom.analytics?.totalStudents || 0} students</span>
          </div>
          <div className="flex items-center">
            <SparklesIcon className="h-4 w-4 mr-1" />
            <span>{classroom.analytics?.totalAIInteractions || 0} AI interactions</span>
          </div>
        </div>
        {isTeacher && (
          <div className="flex items-center">
            <ChartBarIcon className="h-4 w-4 mr-1" />
            <span>Analytics</span>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center">
        <div className="flex space-x-2">
          <button className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
            <AcademicCapIcon className="h-4 w-4 mr-1" />
            AI Tutor
          </button>
          <button className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm">
            <ClipboardDocumentListIcon className="h-4 w-4 mr-1" />
            Activities
          </button>
        </div>
        {isTeacher && (
          <button className="flex items-center px-3 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 text-sm">
            <Cog6ToothIcon className="h-4 w-4 mr-1" />
            Settings
          </button>
        )}
      </div>

      {/* Integration Status */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Connected Integrations:</span>
          <div className="flex space-x-1">
            {classroom.aiSettings?.allowedIntegrations?.map(integration => (
              <span key={integration} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                {integration}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading classrooms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Classroom Management</h1>
          <p className="mt-2 text-gray-600">
            Manage your teaching and enrolled classrooms with AI-powered features
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mb-8 flex space-x-4">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Classroom
          </button>
          <button
            onClick={() => setShowJoinModal(true)}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <LinkIcon className="h-5 w-5 mr-2" />
            Join Classroom
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('teaching')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'teaching'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Teaching ({classrooms.teaching?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('enrolled')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'enrolled'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Enrolled ({classrooms.enrolled?.length || 0})
              </button>
            </nav>
          </div>
        </div>

        {/* Classroom Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeTab === 'teaching' && classrooms.teaching?.map(classroom => (
            <ClassroomCard key={classroom.id} classroom={classroom} isTeacher={true} />
          ))}
          {activeTab === 'enrolled' && classrooms.enrolled?.map(classroom => (
            <ClassroomCard key={classroom.id} classroom={classroom} isTeacher={false} />
          ))}
        </div>

        {/* Empty State */}
        {((activeTab === 'teaching' && !classrooms.teaching?.length) ||
          (activeTab === 'enrolled' && !classrooms.enrolled?.length)) && (
          <div className="text-center py-12">
            <AcademicCapIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {activeTab === 'teaching' ? 'No classrooms created' : 'No classrooms joined'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {activeTab === 'teaching' 
                ? 'Get started by creating your first classroom.'
                : 'Join a classroom using an invite code from your teacher.'
              }
            </p>
            <div className="mt-6">
              <button
                onClick={() => activeTab === 'teaching' ? setShowCreateModal(true) : setShowJoinModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                {activeTab === 'teaching' ? 'Create Classroom' : 'Join Classroom'}
              </button>
            </div>
          </div>
        )}
      </div>

      <CreateClassroomModal />
      <JoinClassroomModal />
    </div>
  );
};

export default ClassroomManagement; 