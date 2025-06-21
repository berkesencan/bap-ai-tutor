import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCourses } from '../services/api';
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
  ExclamationTriangleIcon,
  ChartBarIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import './Courses.css';

function Courses() {
  const { currentUser } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  
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
  
  const [searchQuery, setSearchQuery] = useState('');
  const [publicCourses, setPublicCourses] = useState([]);
  const [joinModalTab, setJoinModalTab] = useState('link'); // 'link' or 'discover'

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const response = await getCourses();
        
        if (response.success && response.data && response.data.courses) {
          setCourses(response.data.courses);
        } else {
          console.error('Failed to fetch courses:', response);
          setCourses([]);
        }
      } catch (err) {
        console.error('Error fetching courses:', err);
        setError('Failed to load courses. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchCourses();
    }
  }, [currentUser]);

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
        // Refresh courses
        const refreshResponse = await getCourses();
        if (refreshResponse.success && refreshResponse.data && refreshResponse.data.courses) {
          setCourses(refreshResponse.data.courses);
        }
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
        // Refresh courses
        const refreshResponse = await getCourses();
        if (refreshResponse.success && refreshResponse.data && refreshResponse.data.courses) {
          setCourses(refreshResponse.data.courses);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to join course');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const joinPublicCourse = async (courseId) => {
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/courses/join', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ joinCode: courseId })
      });

      if (response.ok) {
        setShowJoinModal(false);
        // Refresh courses
        const refreshResponse = await getCourses();
        if (refreshResponse.success && refreshResponse.data && refreshResponse.data.courses) {
          setCourses(refreshResponse.data.courses);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to join course');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateMemberRole = async (courseId, memberId, role) => {
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/courses/${courseId}/members/${memberId}/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role })
      });

      if (response.ok) {
        // Refresh courses to get updated member roles
        const refreshResponse = await getCourses();
        if (refreshResponse.success && refreshResponse.data && refreshResponse.data.courses) {
          setCourses(refreshResponse.data.courses);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to update member role');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemoveMember = async (courseId, memberId) => {
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/courses/${courseId}/members/${memberId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (response.ok) {
        // Refresh courses to get updated members
        const refreshResponse = await getCourses();
        if (refreshResponse.success && refreshResponse.data && refreshResponse.data.courses) {
          setCourses(refreshResponse.data.courses);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to remove member');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateCourse = async (courseId, updateData) => {
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        // Refresh courses to get updated course data
        const refreshResponse = await getCourses();
        if (refreshResponse.success && refreshResponse.data && refreshResponse.data.courses) {
          setCourses(refreshResponse.data.courses);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to update course');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const copyJoinCode = (joinCode) => {
    navigator.clipboard.writeText(joinCode);
    // Could add a toast notification here
  };



  const canManageCourse = (course) => {
    if (!course.members || !currentUser) return false;
    const userMember = course.members.find(m => m.userId === currentUser.uid);
    return userMember && (userMember.role === 'creator' || userMember.role === 'admin');
  };

  const getUserRole = (course) => {
    if (!course.members || !currentUser) return null;
    if (course.createdBy === currentUser.uid) return 'creator';
    if (course.memberRoles && course.memberRoles[currentUser.uid]) {
      return course.memberRoles[currentUser.uid];
    }
    return course.members.includes(currentUser.uid) ? 'member' : null;
  };

  const isOwnerOrAdmin = (course) => {
    const role = getUserRole(course);
    return role === 'creator' || role === 'admin';
  };

  // Function to organize courses in the requested order
  const organizedCourses = () => {
    // Separate platform courses from native courses
    const nativeCourses = courses.filter(course => !course.source || course.source === 'native');
    const platformCourses = courses.filter(course => course.source && course.source !== 'native');
    
    // Group platform courses by source
    const coursesByPlatform = platformCourses.reduce((acc, course) => {
      const platform = course.source || 'other';
      if (!acc[platform]) acc[platform] = [];
      acc[platform].push(course);
      return acc;
    }, {});
    
    // Sort courses within each platform by semester/year
    Object.keys(coursesByPlatform).forEach(platform => {
      coursesByPlatform[platform].sort((a, b) => {
        // Extract year and semester for sorting
        const getYearSemester = (course) => {
          const term = course.term || course.semester || '';
          const year = course.year || new Date().getFullYear();
          
          // Parse semester from term string (e.g., "Fall 2023", "Spring 2024")
          const termMatch = term.match(/(Fall|Spring|Summer|Winter)\s*(\d{4})/i);
          let semester = '';
          let termYear = year;
          
          if (termMatch) {
            semester = termMatch[1].toLowerCase();
            termYear = parseInt(termMatch[2]);
          }
          
          // Convert semester to numeric for sorting (Spring=1, Summer=2, Fall=3, Winter=4)
          const semesterOrder = { spring: 1, summer: 2, fall: 3, winter: 4 };
          const semesterNum = semesterOrder[semester] || 0;
          
          return { year: termYear, semester: semesterNum };
        };
        
        const aYearSem = getYearSemester(a);
        const bYearSem = getYearSemester(b);
        
        // Sort by year first, then by semester
        if (aYearSem.year !== bYearSem.year) {
          return aYearSem.year - bYearSem.year;
        }
        return aYearSem.semester - bYearSem.semester;
      });
    });
    
    return { nativeCourses, coursesByPlatform };
  };

  if (loading) {
    return (
      <div className="courses">
        <h1>📚 My Courses</h1>
        <div className="loading-container">
          <div className="spinner"></div>
          <p className="loading-text">Loading your courses...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="courses">
        <h1>📚 My Courses</h1>
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h3 className="error-title">Error Loading Courses</h3>
          <p className="error-message">{error}</p>
          <Link 
            to="/connect" 
            className="import-button"
          >
            <span className="action-icon">📥</span>
            Import Courses from Gradescope
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="courses">
      <div className="courses-header">
        <h1 className="courses-title">📚 My Courses</h1>
        <p className="courses-subtitle">
          Manage and explore your academic courses
        </p>
        <div className="courses-actions">
          <button 
            onClick={() => setShowCreateModal(true)}
            className="action-button primary"
          >
            <PlusIcon className="action-icon" />
            Create Course
          </button>
          <button 
            onClick={() => setShowJoinModal(true)}
            className="action-button secondary"
          >
            <UserGroupIcon className="action-icon" />
            Join Course
          </button>
        </div>
      </div>
      
      {courses.length === 0 ? (
        <div className="empty-state-card">
          <div className="empty-state-icon">🎓</div>
          <h3 className="empty-state-title">No Courses Found</h3>
          <p className="empty-state-message">
            You don't have any courses yet. Create a new course, join an existing one, or import courses from Gradescope to get started!
          </p>
          <div className="empty-state-actions">
            <button 
              onClick={() => setShowCreateModal(true)}
              className="action-button primary"
            >
              <PlusIcon className="action-icon" />
              Create Course
            </button>
            <button 
              onClick={() => setShowJoinModal(true)}
              className="action-button secondary"
            >
              <UserGroupIcon className="action-icon" />
              Join Course
            </button>
            <Link 
              to="/connect" 
              className="import-button"
            >
              <span className="action-icon">📥</span>
              Import from Gradescope
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="courses-stats">
            <div className="stats-card">
              <div className="stat-item">
                <div className="stat-icon">📚</div>
                <div className="stat-content">
                  <div className="stat-number">{courses.length}</div>
                  <div className="stat-label">Total Courses</div>
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-icon">🎓</div>
                <div className="stat-content">
                  <div className="stat-number">{courses.filter(c => c.source === 'gradescope').length}</div>
                  <div className="stat-label">From Gradescope</div>
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-icon">👥</div>
                <div className="stat-content">
                  <div className="stat-number">{courses.filter(c => c.source !== 'gradescope').length}</div>
                  <div className="stat-label">Created/Joined</div>
                </div>
              </div>
            </div>
          </div>

                    <div className="courses-content">
            {(() => {
              const { nativeCourses, coursesByPlatform } = organizedCourses();
              
              return (
                <>
                  {/* Native Courses Section */}
                  {nativeCourses.length > 0 && (
                    <div className="courses-section">
                      <div className="section-header">
                        <h2 className="section-title">
                          <span className="section-icon">🏫</span>
                          My Courses
                        </h2>
                        <span className="section-count">{nativeCourses.length}</span>
                      </div>
                      <div className="courses-grid">
                        {nativeCourses.map(course => (
                          <div 
                            key={course.id} 
                            className="course-card"
                          >
                            <div className="course-card-header">
                              <div className="course-info">
                                <h2 className="course-code">{course.code}</h2>
                                <h3 className="course-name">{course.name}</h3>
                              </div>
                              <div className="course-badges">
                                {course.term && (
                                  <span className="term-badge">
                                    <span className="badge-icon">📅</span>
                                    {course.term}
                                  </span>
                                )}
                                {course.members && (
                                  <span className="members-badge">
                                    <span className="badge-icon">👥</span>
                                    {course.members.length} members
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="course-card-body">
                              {course.professor && (
                                <div className="course-professor">
                                  <span className="professor-icon">👨‍🏫</span>
                                  <span>Professor: {course.professor}</span>
                                </div>
                              )}
                              
                              <div className="course-description">
                                <span className="description-icon">📝</span>
                                <span>{course.description || 'No description available'}</span>
                              </div>
                            </div>
                            
                            <div className="course-actions">
                              <Link
                                to={`/assignments?courseId=${course.id}`}
                                className="action-button tertiary"
                              >
                                <span className="action-icon">📋</span>
                                View Assignments
                              </Link>
                              
                              {isOwnerOrAdmin(course) ? (
                                <Link
                                  to={`/courses/${course.id}/manage`}
                                  className="action-button secondary"
                                >
                                  <CogIcon className="action-icon" />
                                  Admin Panel
                                </Link>
                              ) : (
                                <Link 
                                  to={`/courses/${course.id}`} 
                                  className="action-button primary"
                                >
                                  <span className="action-icon">👁️</span>
                                  View Details
                                </Link>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Platform Courses Sections */}
                  {Object.entries(coursesByPlatform).map(([platform, platformCourses]) => {
                    const platformInfo = {
                      gradescope: { name: 'Gradescope', icon: '🎓' },
                      canvas: { name: 'Canvas', icon: '🎨' },
                      blackboard: { name: 'Blackboard', icon: '📚' },
                      brightspace: { name: 'Brightspace', icon: '💡' },
                      moodle: { name: 'Moodle', icon: '📖' }
                    };
                    
                    const info = platformInfo[platform] || { name: platform, icon: '🔗' };
                    
                    return (
                      <div key={platform} className="courses-section">
                        <div className="section-header">
                          <h2 className="section-title">
                            <span className="section-icon">{info.icon}</span>
                            {info.name} Courses
                          </h2>
                          <span className="section-count">{platformCourses.length}</span>
                        </div>
                        <div className="courses-grid">
                          {platformCourses.map(course => (
                            <div 
                              key={course.id} 
                              className="course-card"
                            >
                              <div className="course-card-header">
                                <div className="course-info">
                                  <h2 className="course-code">{course.code}</h2>
                                  <h3 className="course-name">{course.name}</h3>
                                </div>
                                <div className="course-badges">
                                  <span className="source-badge">
                                    <span className="badge-icon">{info.icon}</span>
                                    {info.name}
                                  </span>
                                  {course.term && (
                                    <span className="term-badge">
                                      <span className="badge-icon">📅</span>
                                      {course.term}
                                    </span>
                                  )}
                                  {course.members && (
                                    <span className="members-badge">
                                      <span className="badge-icon">👥</span>
                                      {course.members.length} members
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              <div className="course-card-body">
                                {course.professor && (
                                  <div className="course-professor">
                                    <span className="professor-icon">👨‍🏫</span>
                                    <span>Professor: {course.professor}</span>
                                  </div>
                                )}
                                
                                <div className="course-description">
                                  <span className="description-icon">📝</span>
                                  <span>{course.description || 'No description available'}</span>
                                </div>
                              </div>
                              
                              <div className="course-actions">
                                {course.source === 'gradescope' && course.externalId ? (
                                  <a
                                    href={`https://www.gradescope.com/courses/${course.externalId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="action-button tertiary"
                                  >
                                    <span className="action-icon">🔗</span>
                                    View on {info.name}
                                  </a>
                                ) : (
                                  <Link
                                    to={`/assignments?courseId=${course.id}`}
                                    className="action-button tertiary"
                                  >
                                    <span className="action-icon">📋</span>
                                    View Assignments
                                  </Link>
                                )}
                                
                                {isOwnerOrAdmin(course) ? (
                                  <Link
                                    to={`/courses/${course.id}/manage`}
                                    className="action-button secondary"
                                  >
                                    <CogIcon className="action-icon" />
                                    Admin Panel
                                  </Link>
                                ) : (
                                  <Link 
                                    to={`/courses/${course.id}`} 
                                    className="action-button primary"
                                  >
                                    <span className="action-icon">👁️</span>
                                    View Details
                                  </Link>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </>
              );
            })()}
          </div>
        </>
      )}

      {/* Create Course Modal */}
      {showCreateModal && (
        <CreateCourseModal
          createForm={createForm}
          setCreateForm={setCreateForm}
          onSubmit={createCourse}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* Join Course Modal */}
      {showJoinModal && (
        <JoinCourseModal
          joinForm={joinForm}
          setJoinForm={setJoinForm}
          onSubmit={joinCourse}
          onClose={() => setShowJoinModal(false)}
          activeTab={joinModalTab}
          setActiveTab={setJoinModalTab}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          publicCourses={publicCourses}
          onSearchPublicCourses={searchPublicCourses}
          onJoinPublicCourse={joinPublicCourse}
        />
      )}


    </div>
  );
}

// Create Course Modal Component
const CreateCourseModal = ({ createForm, setCreateForm, onSubmit, onClose }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Create New Course</h2>
          <button onClick={onClose} className="modal-close">
            <XMarkIcon className="close-icon" />
          </button>
        </div>
        
        <form onSubmit={onSubmit} className="modal-form">
          <div className="form-group">
            <label>Course Name *</label>
            <input
              type="text"
              value={createForm.name}
              onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
              placeholder="e.g., Introduction to Computer Science"
              required
            />
          </div>
          
          <div className="form-group">
            <label>Course Code *</label>
            <input
              type="text"
              value={createForm.code}
              onChange={(e) => setCreateForm({...createForm, code: e.target.value})}
              placeholder="e.g., CS101"
              required
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Semester</label>
              <select
                value={createForm.semester}
                onChange={(e) => setCreateForm({...createForm, semester: e.target.value})}
              >
                <option value="">Select Semester</option>
                <option value="Spring">Spring</option>
                <option value="Summer">Summer</option>
                <option value="Fall">Fall</option>
                <option value="Winter">Winter</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Year</label>
              <input
                type="number"
                value={createForm.year}
                onChange={(e) => setCreateForm({...createForm, year: parseInt(e.target.value)})}
                min="2020"
                max="2030"
              />
            </div>
          </div>
          
          <div className="form-group">
            <label>Institution</label>
            <input
              type="text"
              value={createForm.institution}
              onChange={(e) => setCreateForm({...createForm, institution: e.target.value})}
              placeholder="e.g., New York University"
            />
          </div>
          
          <div className="form-group">
            <label>Instructor</label>
            <input
              type="text"
              value={createForm.instructor}
              onChange={(e) => setCreateForm({...createForm, instructor: e.target.value})}
              placeholder="e.g., Dr. Smith"
            />
          </div>
          
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={createForm.description}
              onChange={(e) => setCreateForm({...createForm, description: e.target.value})}
              placeholder="Brief description of the course..."
              rows="3"
            />
          </div>
          
          <div className="form-group">
            <label>Join Password (Optional)</label>
            <input
              type="password"
              value={createForm.joinPassword}
              onChange={(e) => setCreateForm({...createForm, joinPassword: e.target.value})}
              placeholder="Leave blank for no password"
            />
            <small className="form-hint">Students will need this password to join your course</small>
          </div>
          
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={createForm.settings.publiclyJoinable}
                onChange={(e) => setCreateForm({
                  ...createForm,
                  settings: {...createForm.settings, publiclyJoinable: e.target.checked}
                })}
              />
              Make course publicly discoverable
            </label>
            <small className="form-hint">Other users can find and join this course without a direct link</small>
          </div>
          
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Create Course
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Join Course Modal Component
const JoinCourseModal = ({ 
  joinForm, 
  setJoinForm, 
  onSubmit, 
  onClose, 
  activeTab, 
  setActiveTab,
  searchQuery,
  setSearchQuery,
  publicCourses,
  onSearchPublicCourses,
  onJoinPublicCourse
}) => {
  useEffect(() => {
    if (activeTab === 'discover') {
      onSearchPublicCourses();
    }
  }, [activeTab, searchQuery]);

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Join Course</h2>
          <button onClick={onClose} className="modal-close">
            <XMarkIcon className="close-icon" />
          </button>
        </div>
        
        <div className="modal-tabs">
          <button 
            className={`tab-button ${activeTab === 'link' ? 'active' : ''}`}
            onClick={() => setActiveTab('link')}
          >
            <LinkIcon className="tab-icon" />
            Join with Link
          </button>
          <button 
            className={`tab-button ${activeTab === 'discover' ? 'active' : ''}`}
            onClick={() => setActiveTab('discover')}
          >
            <MagnifyingGlassIcon className="tab-icon" />
            Discover Courses
          </button>
        </div>
        
        {activeTab === 'link' ? (
          <form onSubmit={onSubmit} className="modal-form">
            <div className="form-group">
              <label>Course Join Code *</label>
              <input
                type="text"
                value={joinForm.joinCode}
                onChange={(e) => setJoinForm({...joinForm, joinCode: e.target.value})}
                placeholder="Enter course join code or link"
                required
              />
            </div>
            
            <div className="form-group">
              <label>Password (if required)</label>
              <input
                type="password"
                value={joinForm.password}
                onChange={(e) => setJoinForm({...joinForm, password: e.target.value})}
                placeholder="Enter course password"
              />
            </div>
            
            <div className="modal-actions">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Join Course
              </button>
            </div>
          </form>
        ) : (
          <div className="discover-content">
            <div className="search-bar">
              <MagnifyingGlassIcon className="search-icon" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for public courses..."
                className="search-input"
              />
            </div>
            
            <div className="public-courses-list">
              {publicCourses.length === 0 ? (
                <div className="empty-search">
                  <p>No public courses found. Try adjusting your search.</p>
                </div>
              ) : (
                publicCourses.map(course => (
                  <div key={course.id} className="public-course-item">
                    <div className="course-info">
                      <h4>{course.code} - {course.name}</h4>
                      <p>{course.description}</p>
                      <div className="course-meta">
                        <span>👥 {course.memberCount || 0} members</span>
                        {course.institution && <span>🏫 {course.institution}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => onJoinPublicCourse(course.id)}
                      className="btn-primary"
                    >
                      Join
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};



export default Courses; 