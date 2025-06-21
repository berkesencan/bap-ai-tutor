import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  UserGroupIcon,
  CogIcon,
  ChartBarIcon,
  DocumentTextIcon,
  LinkIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  ClipboardDocumentIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  AcademicCapIcon,
  ShieldCheckIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import './CourseManagement.css';

function CourseManagement() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [editForm, setEditForm] = useState({
    name: '',
    code: '',
    description: '',
    instructor: '',
    semester: '',
    year: '',
    settings: {}
  });

  useEffect(() => {
    fetchCourse();
  }, [courseId]);

  const fetchCourse = async () => {
    try {
      setLoading(true);
      if (!currentUser) return;
      
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/courses/${courseId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCourse(data.data);
        setEditForm({
          name: data.data.name || '',
          code: data.data.code || '',
          description: data.data.description || '',
          instructor: data.data.instructor || '',
          semester: data.data.semester || '',
          year: data.data.year || new Date().getFullYear(),
          settings: data.data.settings || {}
        });
      } else {
        setError('Failed to load course');
      }
    } catch (err) {
      setError('Error loading course');
    } finally {
      setLoading(false);
    }
  };

  const updateCourse = async (e) => {
    e.preventDefault();
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm)
      });

      if (response.ok) {
        setShowEditModal(false);
        fetchCourse();
      } else {
        setError('Failed to update course');
      }
    } catch (err) {
      setError('Error updating course');
    }
  };

  const updateMemberRole = async (memberId, newRole) => {
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/courses/${courseId}/members/${memberId}/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      });

      if (response.ok) {
        fetchCourse();
      } else {
        setError('Failed to update member role');
      }
    } catch (err) {
      setError('Error updating member role');
    }
  };

  const removeMember = async (memberId) => {
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/courses/${courseId}/members/${memberId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        fetchCourse();
      } else {
        setError('Failed to remove member');
      }
    } catch (err) {
      setError('Error removing member');
    }
  };

  const deleteCourse = async () => {
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        navigate('/courses');
      } else {
        setError('Failed to delete course');
      }
    } catch (err) {
      setError('Error deleting course');
    }
  };

  const copyJoinCode = (joinCode) => {
    navigator.clipboard.writeText(joinCode);
  };

  const getRoleIcon = (role) => {
    const icons = {
      creator: <AcademicCapIcon className="w-4 h-4" />,
      admin: <ShieldCheckIcon className="w-4 h-4" />,
      instructor: <AcademicCapIcon className="w-4 h-4" />,
      ta: <UserGroupIcon className="w-4 h-4" />,
      student: <UserIcon className="w-4 h-4" />,
      member: <UserIcon className="w-4 h-4" />
    };
    return icons[role] || <UserIcon className="w-4 h-4" />;
  };

  const getRoleColor = (role) => {
    const colors = {
      creator: 'role-creator',
      admin: 'role-admin',
      instructor: 'role-instructor',
      ta: 'role-ta',
      student: 'role-student',
      member: 'role-member'
    };
    return colors[role] || 'role-member';
  };

  const isCreator = course?.createdBy === currentUser?.uid;
  const userRole = course?.memberRoles?.[currentUser?.uid] || 'member';
  const canManage = isCreator || userRole === 'admin';

  if (loading) {
    return (
      <div className="course-management">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading course...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="course-management">
        <div className="error-container">
          <ExclamationTriangleIcon className="error-icon" />
          <h3>Error</h3>
          <p>{error}</p>
          <Link to="/courses" className="btn-primary">
            Back to Courses
          </Link>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="course-management">
        <div className="error-container">
          <ExclamationTriangleIcon className="error-icon" />
          <h3>Course Not Found</h3>
          <p>The course you're looking for doesn't exist or you don't have access to it.</p>
          <Link to="/courses" className="btn-primary">
            Back to Courses
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="course-management">
      {/* Header */}
      <div className="course-header">
        <div className="course-header-content">
          <div className="course-title-section">
            <div className="course-breadcrumb">
              <Link to="/courses" className="breadcrumb-link">Courses</Link>
              <span className="breadcrumb-separator">›</span>
              <span className="breadcrumb-current">{course.code}</span>
            </div>
            <h1 className="course-title">{course.name}</h1>
            <p className="course-subtitle">{course.code} • {course.semester} {course.year}</p>
            <div className="course-badges">
              <span className={`role-badge ${getRoleColor(userRole)}`}>
                {getRoleIcon(userRole)}
                {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
              </span>
              <span className="members-count">
                <UserGroupIcon className="w-4 h-4" />
                {course.members?.length || 0} members
              </span>
            </div>
          </div>
          
          <div className="course-actions">
            {canManage && (
              <button
                onClick={() => setShowEditModal(true)}
                className="action-btn secondary"
              >
                <PencilIcon className="w-4 h-4" />
                Edit Course
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="course-nav">
        <div className="nav-tabs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`nav-tab ${activeTab === 'overview' ? 'active' : ''}`}
          >
            <DocumentTextIcon className="w-4 h-4" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`nav-tab ${activeTab === 'members' ? 'active' : ''}`}
          >
            <UserGroupIcon className="w-4 h-4" />
            Members ({course.members?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('integrations')}
            className={`nav-tab ${activeTab === 'integrations' ? 'active' : ''}`}
          >
            <LinkIcon className="w-4 h-4" />
            Integrations
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`nav-tab ${activeTab === 'analytics' ? 'active' : ''}`}
          >
            <ChartBarIcon className="w-4 h-4" />
            Analytics
          </button>
          {canManage && (
            <button
              onClick={() => setActiveTab('settings')}
              className={`nav-tab ${activeTab === 'settings' ? 'active' : ''}`}
            >
              <CogIcon className="w-4 h-4" />
              Settings
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="course-content">
        {activeTab === 'overview' && (
          <div className="tab-content">
            <div className="overview-grid">
              <div className="info-card">
                <h3>Course Information</h3>
                <div className="info-item">
                  <label>Course Name:</label>
                  <span>{course.name}</span>
                </div>
                <div className="info-item">
                  <label>Course Code:</label>
                  <span>{course.code}</span>
                </div>
                <div className="info-item">
                  <label>Instructor:</label>
                  <span>{course.instructor || 'Not specified'}</span>
                </div>
                <div className="info-item">
                  <label>Semester:</label>
                  <span>{course.semester} {course.year}</span>
                </div>
                <div className="info-item">
                  <label>Description:</label>
                  <span>{course.description || 'No description provided'}</span>
                </div>
              </div>

              <div className="stats-card">
                <h3>Course Statistics</h3>
                <div className="stats-grid">
                  <div className="stat-item">
                    <div className="stat-value">{course.members?.length || 0}</div>
                    <div className="stat-label">Total Members</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{course.assignments?.length || 0}</div>
                    <div className="stat-label">Assignments</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{Object.keys(course.integrations || {}).length}</div>
                    <div className="stat-label">Integrations</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{course.analytics?.totalIntegrations || 0}</div>
                    <div className="stat-label">Active Integrations</div>
                  </div>
                </div>
              </div>

              <div className="join-card">
                <h3>Join Information</h3>
                <div className="join-code-section">
                  <label>Join Code:</label>
                  <div className="join-code-display">
                    <code>{course.joinCode}</code>
                    <button
                      onClick={() => copyJoinCode(course.joinCode)}
                      className="copy-btn"
                      title="Copy join code"
                    >
                      <ClipboardDocumentIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {course.joinPassword && (
                  <div className="join-password-section">
                    <label>Join Password:</label>
                    <span>Password protected</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'members' && (
          <div className="tab-content">
            <div className="members-section">
              <div className="section-header">
                <h3>Course Members</h3>
              </div>

              <div className="members-list">
                {course.members?.map(memberId => {
                  const memberRole = course.memberRoles?.[memberId] || 'member';
                  const isCurrentUser = memberId === currentUser.uid;
                  
                  return (
                    <div key={memberId} className="member-item">
                      <div className="member-info">
                        <div className="member-avatar">
                          {getRoleIcon(memberRole)}
                        </div>
                        <div className="member-details">
                          <div className="member-name">
                            {isCurrentUser ? 'You' : `User ${memberId.slice(-6)}`}
                            {course.createdBy === memberId && <span className="creator-badge">Creator</span>}
                          </div>
                          <div className="member-email">{memberId}</div>
                        </div>
                      </div>
                      
                      <div className="member-actions">
                        <span className={`role-badge ${getRoleColor(memberRole)}`}>
                          {memberRole.charAt(0).toUpperCase() + memberRole.slice(1)}
                        </span>
                        
                        {canManage && !isCurrentUser && course.createdBy !== memberId && (
                          <>
                            <select
                              value={memberRole}
                              onChange={(e) => updateMemberRole(memberId, e.target.value)}
                              className="role-select"
                            >
                              <option value="student">Student</option>
                              <option value="ta">Teaching Assistant</option>
                              <option value="instructor">Instructor</option>
                              {isCreator && <option value="admin">Admin</option>}
                            </select>
                            <button
                              onClick={() => removeMember(memberId)}
                              className="remove-btn"
                              title="Remove member"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'integrations' && (
          <div className="tab-content">
            <div className="integrations-section">
              <div className="section-header">
                <h3>Course Integrations</h3>
                <Link
                  to="/connect"
                  className="action-btn primary"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Integration
                </Link>
              </div>
              
              <div className="integrations-grid">
                <div className="integration-placeholder">
                  <LinkIcon className="placeholder-icon" />
                  <h4>No Integrations Yet</h4>
                  <p>Connect external platforms like Gradescope, Canvas, or Blackboard to sync course content.</p>
                  <Link to="/connect" className="btn-primary">
                    Connect Platform
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="tab-content">
            <div className="analytics-section">
              <div className="analytics-placeholder">
                <ChartBarIcon className="placeholder-icon" />
                <h4>Analytics Coming Soon</h4>
                <p>Detailed course analytics and insights will be available here.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && canManage && (
          <div className="tab-content">
            <div className="settings-section">
              <div className="settings-card">
                <h3>Course Settings</h3>
                <div className="settings-grid">
                  <div className="setting-item">
                    <label>Allow Member Invites</label>
                    <input
                      type="checkbox"
                      checked={course.settings?.allowMemberInvites ?? true}
                      readOnly
                    />
                  </div>
                  <div className="setting-item">
                    <label>AI Tutoring Enabled</label>
                    <input
                      type="checkbox"
                      checked={course.settings?.aiEnabled ?? true}
                      readOnly
                    />
                  </div>
                  <div className="setting-item">
                    <label>Publicly Joinable</label>
                    <input
                      type="checkbox"
                      checked={course.settings?.publiclyJoinable ?? false}
                      readOnly
                    />
                  </div>
                </div>
              </div>

              {isCreator && (
                <div className="danger-zone">
                  <h3>Danger Zone</h3>
                  <div className="danger-actions">
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="danger-btn"
                    >
                      <TrashIcon className="w-4 h-4" />
                      Delete Course
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Edit Course Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Edit Course</h2>
              <button onClick={() => setShowEditModal(false)} className="modal-close">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={updateCourse} className="modal-form">
              <div className="form-group">
                <label>Course Name *</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Course Code *</label>
                <input
                  type="text"
                  value={editForm.code}
                  onChange={(e) => setEditForm({...editForm, code: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Semester</label>
                  <select
                    value={editForm.semester}
                    onChange={(e) => setEditForm({...editForm, semester: e.target.value})}
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
                    value={editForm.year}
                    onChange={(e) => setEditForm({...editForm, year: parseInt(e.target.value)})}
                    min="2020"
                    max="2030"
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Instructor</label>
                <input
                  type="text"
                  value={editForm.instructor}
                  onChange={(e) => setEditForm({...editForm, instructor: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                  rows="3"
                />
              </div>
              
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Delete Course</h2>
              <button onClick={() => setShowDeleteConfirm(false)} className="modal-close">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="warning-content">
                <ExclamationTriangleIcon className="warning-icon" />
                <h3>Are you sure you want to delete this course?</h3>
                <p>This action cannot be undone. All course data, members, and integrations will be permanently removed.</p>
                <p><strong>Course:</strong> {course.name} ({course.code})</p>
              </div>
              
              <div className="modal-actions">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteCourse}
                  className="danger-btn"
                >
                  <TrashIcon className="w-4 h-4" />
                  Delete Course
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CourseManagement; 