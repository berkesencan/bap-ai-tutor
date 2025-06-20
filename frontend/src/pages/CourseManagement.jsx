import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  BookOpenIcon,
  PlusIcon,
  UserGroupIcon,
  AcademicCapIcon,
  CogIcon,
  LinkIcon,
  TrashIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  ShareIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const CourseManagement = () => {
  const { currentUser } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('my-courses');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showIntegrationModal, setShowIntegrationModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  
  // Form states
  const [createForm, setCreateForm] = useState({
    name: '',
    code: '',
    semester: '',
    year: new Date().getFullYear(),
    description: '',
    institution: '',
    instructor: '',
    joinPassword: '',
    settings: {
      allowMemberInvites: true,
      autoDeduplication: true,
      aiEnabled: true,
      publiclyJoinable: false
    }
  });
  
  const [joinForm, setJoinForm] = useState({
    joinCode: '',
    password: ''
  });
  
  const [integrationForm, setIntegrationForm] = useState({
    platform: 'gradescope',
    credentials: {
      email: '',
      password: '',
      apiKey: '',
      baseUrl: ''
    }
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [publicCourses, setPublicCourses] = useState([]);

  useEffect(() => {
    if (currentUser) {
      fetchUserCourses();
    }
  }, [currentUser]);

  useEffect(() => {
    if (activeTab === 'discover') {
      searchPublicCourses();
    }
  }, [activeTab, searchQuery]);

  const fetchUserCourses = async () => {
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/courses', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCourses(data.data || []);
      } else {
        throw new Error('Failed to fetch courses');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching courses:', err);
    } finally {
      setLoading(false);
    }
  };

  const searchPublicCourses = async () => {
    try {
      const token = await currentUser.getIdToken();
      const queryParam = searchQuery ? `?query=${encodeURIComponent(searchQuery)}` : '';
      const response = await fetch(`/api/courses/search${queryParam}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPublicCourses(data.data || []);
      }
    } catch (err) {
      console.error('Error searching public courses:', err);
    }
  };

  const createCourse = async (e) => {
    e.preventDefault();
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/courses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(createForm)
      });

      if (response.ok) {
        setShowCreateModal(false);
        setCreateForm({
          name: '',
          code: '',
          semester: '',
          year: new Date().getFullYear(),
          description: '',
          institution: '',
          instructor: '',
          joinPassword: '',
          settings: {
            allowMemberInvites: true,
            autoDeduplication: true,
            aiEnabled: true,
            publiclyJoinable: false
          }
        });
        fetchUserCourses();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to create course');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const joinCourse = async (e) => {
    e.preventDefault();
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/courses/join', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(joinForm)
      });

      if (response.ok) {
        setShowJoinModal(false);
        setJoinForm({ joinCode: '', password: '' });
        fetchUserCourses();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to join course');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const addIntegration = async (e) => {
    e.preventDefault();
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/courses/${selectedCourse.id}/integrations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          platform: integrationForm.platform,
          credentials: integrationForm.credentials
        })
      });

      if (response.ok) {
        setShowIntegrationModal(false);
        setIntegrationForm({
          platform: 'gradescope',
          credentials: {
            email: '',
            password: '',
            apiKey: '',
            baseUrl: ''
          }
        });
        fetchUserCourses();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to add integration');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const removeIntegration = async (courseId, platform) => {
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/courses/${courseId}/integrations/${platform}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        fetchUserCourses();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to remove integration');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const syncIntegration = async (courseId, platform) => {
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/courses/${courseId}/integrations/${platform}/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        fetchUserCourses();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to sync integration');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const copyJoinCode = (joinCode) => {
    navigator.clipboard.writeText(joinCode);
    // You could add a toast notification here
  };

  const getPlatformIcon = (platform) => {
    switch (platform.toLowerCase()) {
      case 'gradescope':
        return '📝';
      case 'canvas':
        return '🎨';
      case 'brightspace':
        return '💡';
      default:
        return '🔗';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <BookOpenIcon className="h-8 w-8 mr-3 text-blue-600" />
                Course Management
              </h1>
              <p className="mt-2 text-gray-600">
                Create courses, join with invite codes, and link your LMS integrations
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowJoinModal(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <UserGroupIcon className="h-4 w-4 mr-2" />
                Join Course
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Course
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-600"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('my-courses')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'my-courses'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              My Courses ({courses.length})
            </button>
            <button
              onClick={() => setActiveTab('discover')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'discover'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Discover Public Courses
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'my-courses' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div key={course.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{course.name}</h3>
                    {course.code && (
                      <p className="text-sm text-gray-600">{course.code}</p>
                    )}
                    {course.instructor && (
                      <p className="text-sm text-gray-500">Prof. {course.instructor}</p>
                    )}
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    course.userRole === 'creator' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {course.userRole === 'creator' ? 'Creator' : 'Member'}
                  </span>
                </div>

                {/* Course Stats */}
                <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-blue-600">
                      {course.analytics?.totalMembers || 0}
                    </p>
                    <p className="text-xs text-gray-500">Members</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      {course.analytics?.totalIntegrations || 0}
                    </p>
                    <p className="text-xs text-gray-500">Integrations</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-600">
                      {course.analytics?.totalAssignments || 0}
                    </p>
                    <p className="text-xs text-gray-500">Assignments</p>
                  </div>
                </div>

                {/* Join Code */}
                {course.userRole === 'creator' && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500">Join Code</p>
                        <p className="font-mono text-sm font-bold">{course.joinCode}</p>
                      </div>
                      <button
                        onClick={() => copyJoinCode(course.joinCode)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <ShareIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Integrations */}
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Your Integrations</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(course.integrations?.[currentUser.uid] || {}).map(([platform, integration]) => (
                      <div key={platform} className="flex items-center space-x-1 bg-blue-50 px-2 py-1 rounded-md">
                        <span className="text-sm">{getPlatformIcon(platform)}</span>
                        <span className="text-xs font-medium text-blue-800 capitalize">{platform}</span>
                        <button
                          onClick={() => syncIntegration(course.id, platform)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <ArrowPathIcon className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => removeIntegration(course.id, platform)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <XMarkIcon className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        setSelectedCourse(course);
                        setShowIntegrationModal(true);
                      }}
                      className="flex items-center space-x-1 bg-gray-100 px-2 py-1 rounded-md hover:bg-gray-200"
                    >
                      <PlusIcon className="h-3 w-3" />
                      <span className="text-xs">Add</span>
                    </button>
                  </div>
                </div>

                {/* Course Actions */}
                <div className="flex justify-between items-center">
                  <div className="text-xs text-gray-500">
                    {course.semester} {course.year}
                  </div>
                  <div className="flex space-x-2">
                    <button className="text-gray-600 hover:text-gray-800">
                      <CogIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {courses.length === 0 && (
              <div className="col-span-full text-center py-12">
                <AcademicCapIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No courses yet</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating your first course.</p>
                <div className="mt-6">
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Create Course
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'discover' && (
          <div>
            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search public courses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Public Courses Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {publicCourses.map((course) => (
                <div key={course.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{course.name}</h3>
                    {course.code && (
                      <p className="text-sm text-gray-600">{course.code}</p>
                    )}
                    {course.instructor && (
                      <p className="text-sm text-gray-500">Prof. {course.instructor}</p>
                    )}
                    {course.institution && (
                      <p className="text-sm text-gray-500">{course.institution}</p>
                    )}
                  </div>

                  {course.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">{course.description}</p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      {course.analytics?.totalMembers || 0} members
                    </div>
                    <button
                      onClick={() => {
                        setJoinForm({ joinCode: course.joinCode, password: '' });
                        setShowJoinModal(true);
                      }}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200"
                    >
                      Join Course
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Course Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Create New Course</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <form onSubmit={createCourse} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Course Name *</label>
                  <input
                    type="text"
                    required
                    value={createForm.name}
                    onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Introduction to Computer Science"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Course Code</label>
                    <input
                      type="text"
                      value={createForm.code}
                      onChange={(e) => setCreateForm({...createForm, code: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="CS101"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Year</label>
                    <input
                      type="number"
                      value={createForm.year}
                      onChange={(e) => setCreateForm({...createForm, year: parseInt(e.target.value)})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Semester</label>
                  <select
                    value={createForm.semester}
                    onChange={(e) => setCreateForm({...createForm, semester: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Semester</option>
                    <option value="Fall">Fall</option>
                    <option value="Spring">Spring</option>
                    <option value="Summer">Summer</option>
                    <option value="Winter">Winter</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Instructor</label>
                  <input
                    type="text"
                    value={createForm.instructor}
                    onChange={(e) => setCreateForm({...createForm, instructor: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Professor Name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Institution</label>
                  <input
                    type="text"
                    value={createForm.institution}
                    onChange={(e) => setCreateForm({...createForm, institution: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="University Name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Join Password (Optional)</label>
                  <input
                    type="password"
                    value={createForm.joinPassword}
                    onChange={(e) => setCreateForm({...createForm, joinPassword: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Leave empty for no password"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={createForm.settings.publiclyJoinable}
                      onChange={(e) => setCreateForm({
                        ...createForm,
                        settings: {...createForm.settings, publiclyJoinable: e.target.checked}
                      })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Make course publicly discoverable</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={createForm.settings.autoDeduplication}
                      onChange={(e) => setCreateForm({
                        ...createForm,
                        settings: {...createForm.settings, autoDeduplication: e.target.checked}
                      })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Auto-deduplicate assignments</span>
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Create Course
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Join Course Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Join Course</h3>
                <button
                  onClick={() => setShowJoinModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <form onSubmit={joinCourse} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Join Code *</label>
                  <input
                    type="text"
                    required
                    value={joinForm.joinCode}
                    onChange={(e) => setJoinForm({...joinForm, joinCode: e.target.value.toUpperCase()})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    placeholder="ABC123"
                    maxLength={6}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Password (if required)</label>
                  <input
                    type="password"
                    value={joinForm.password}
                    onChange={(e) => setJoinForm({...joinForm, password: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter password if required"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowJoinModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Join Course
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Integration Modal */}
      {showIntegrationModal && selectedCourse && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Add Integration</h3>
                <button
                  onClick={() => setShowIntegrationModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <form onSubmit={addIntegration} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Platform</label>
                  <select
                    value={integrationForm.platform}
                    onChange={(e) => setIntegrationForm({...integrationForm, platform: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="gradescope">Gradescope</option>
                    <option value="canvas">Canvas (Coming Soon)</option>
                    <option value="brightspace">Brightspace (Coming Soon)</option>
                  </select>
                </div>

                {integrationForm.platform === 'gradescope' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Gradescope Email *</label>
                      <input
                        type="email"
                        required
                        value={integrationForm.credentials.email}
                        onChange={(e) => setIntegrationForm({
                          ...integrationForm,
                          credentials: {...integrationForm.credentials, email: e.target.value}
                        })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Gradescope Password *</label>
                      <input
                        type="password"
                        required
                        value={integrationForm.credentials.password}
                        onChange={(e) => setIntegrationForm({
                          ...integrationForm,
                          credentials: {...integrationForm.credentials, password: e.target.value}
                        })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </>
                )}

                {(integrationForm.platform === 'canvas' || integrationForm.platform === 'brightspace') && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">API Key *</label>
                      <input
                        type="password"
                        required
                        value={integrationForm.credentials.apiKey}
                        onChange={(e) => setIntegrationForm({
                          ...integrationForm,
                          credentials: {...integrationForm.credentials, apiKey: e.target.value}
                        })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Base URL *</label>
                      <input
                        type="url"
                        required
                        value={integrationForm.credentials.baseUrl}
                        onChange={(e) => setIntegrationForm({
                          ...integrationForm,
                          credentials: {...integrationForm.credentials, baseUrl: e.target.value}
                        })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://your-institution.instructure.com"
                      />
                    </div>
                  </>
                )}

                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Privacy Note:</strong> Your credentials are securely stored and only used to sync your course data. We never share your login information.
                  </p>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowIntegrationModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Add Integration
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseManagement; 