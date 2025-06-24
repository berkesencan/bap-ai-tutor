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
  const [memberDetails, setMemberDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddIntegrationModal, setShowAddIntegrationModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedNewOwner, setSelectedNewOwner] = useState('');
  const [availableIntegrations, setAvailableIntegrations] = useState([]);
  const [selectedIntegrations, setSelectedIntegrations] = useState([]);
  
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

  // Modal scroll management
  useEffect(() => {
    const isAnyModalOpen = showEditModal || showDeleteConfirm || showAddIntegrationModal || showLeaveModal || showTransferModal;
    
    if (isAnyModalOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    
    // Cleanup on unmount
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [showEditModal, showDeleteConfirm, showAddIntegrationModal, showLeaveModal, showTransferModal]);

  const fetchMemberDetails = async (memberIds, token) => {
    console.log('CourseManagement: Fetching member details for:', memberIds);
    try {
      const memberDetailsMap = {};
      
      // Fetch user details for each member
      for (const memberId of memberIds) {
        try {
          console.log(`CourseManagement: Fetching details for member ${memberId}`);
          const response = await fetch(`/api/users/${memberId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          console.log(`CourseManagement: Response status for ${memberId}: ${response.status}`);
          
          if (response.ok) {
            const userData = await response.json();
            console.log(`CourseManagement: Received user data for ${memberId}:`, userData);
            
            // Check if we have the expected data structure
            if (userData.success && userData.data && userData.data.user) {
              memberDetailsMap[memberId] = userData.data.user;
              console.log(`CourseManagement: Successfully stored user data for ${memberId}:`, userData.data.user);
            } else {
              console.warn(`CourseManagement: Unexpected user data structure for ${memberId}:`, userData);
              memberDetailsMap[memberId] = { displayName: `User ${memberId.slice(-6)}` };
            }
          } else {
            const errorText = await response.text();
            console.warn(`CourseManagement: Failed to fetch user details for ${memberId}, status: ${response.status}, error: ${errorText}`);
            memberDetailsMap[memberId] = { displayName: `User ${memberId.slice(-6)}` };
          }
        } catch (err) {
          console.error(`CourseManagement: Error fetching details for member ${memberId}:`, err);
          memberDetailsMap[memberId] = { displayName: `User ${memberId.slice(-6)}` };
        }
      }
      
      console.log('CourseManagement: Final member details map:', memberDetailsMap);
      setMemberDetails(memberDetailsMap);
    } catch (err) {
      console.error('CourseManagement: Error fetching member details:', err);
    }
  };

  // Load available integrations for the modal
  const loadAvailableIntegrations = async () => {
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/courses/integrations/available', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableIntegrations(data.data.availableIntegrations || []);
      }
    } catch (err) {
      console.error('Error loading available integrations:', err);
    }
  };

  // Handle adding integrations
  const handleAddIntegration = async () => {
    await loadAvailableIntegrations();
    setShowAddIntegrationModal(true);
  };

  // Link integrations to course
  const linkIntegrationsToCourse = async () => {
    if (selectedIntegrations.length === 0) return;

    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/courses/${courseId}/link-integrations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          integrationIds: selectedIntegrations
        })
      });

      if (response.ok) {
        setShowAddIntegrationModal(false);
        setSelectedIntegrations([]);
        
        // Refresh course data
        fetchCourse();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to link integrations');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // Unlink integration from course
  const handleUnlinkIntegration = async (integrationId) => {
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/courses/${courseId}/unlink-integration/${integrationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Refresh course data
        fetchCourse();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to unlink integration');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // Helper function to format dates properly
  const formatLinkedDate = (linkedAt) => {
    console.log('CourseManagement formatLinkedDate input:', linkedAt, 'type:', typeof linkedAt);
    
    try {
      let date;
      
      // Handle Firestore Timestamp objects
      if (linkedAt && typeof linkedAt === 'object') {
        // Firestore Timestamp with toDate method
        if (typeof linkedAt.toDate === 'function') {
          console.log('Using toDate() method');
          date = linkedAt.toDate();
        }
        // Firestore Timestamp with seconds property
        else if (linkedAt.seconds !== undefined) {
          console.log('Using seconds property:', linkedAt.seconds);
          date = new Date(linkedAt.seconds * 1000);
        }
        // Firestore Timestamp with _seconds property (alternative format)
        else if (linkedAt._seconds !== undefined) {
          console.log('Using _seconds property:', linkedAt._seconds);
          date = new Date(linkedAt._seconds * 1000);
        }
        // Regular Date object
        else if (linkedAt instanceof Date) {
          console.log('Already a Date object');
          date = linkedAt;
        }
        // Object with nanoseconds (full Firestore timestamp)
        else if (linkedAt.nanoseconds !== undefined && linkedAt.seconds !== undefined) {
          console.log('Using full Firestore timestamp');
          date = new Date(linkedAt.seconds * 1000 + linkedAt.nanoseconds / 1000000);
        }
        // Try to parse as ISO string if it has the right properties
        else if (linkedAt.toString && linkedAt.toString().includes('T')) {
          console.log('Trying to parse as ISO string');
          date = new Date(linkedAt.toString());
        }
        else {
          console.log('Unknown object format, trying direct conversion');
          date = new Date(linkedAt);
        }
      }
      // Handle string dates
      else if (typeof linkedAt === 'string') {
        console.log('Parsing string date:', linkedAt);
        date = new Date(linkedAt);
      }
      // Handle number timestamps
      else if (typeof linkedAt === 'number') {
        console.log('Using number timestamp:', linkedAt);
        date = new Date(linkedAt);
      }
      // Fallback
      else if (linkedAt) {
        console.log('Fallback conversion');
        date = new Date(linkedAt);
      }
      else {
        console.log('No date provided');
        return 'Unknown date';
      }
      
      // Validate the date
      if (isNaN(date.getTime())) {
        console.error('Invalid date created:', date);
        return 'Invalid date';
      }
      
      const formatted = date.toLocaleDateString();
      console.log('Formatted date:', formatted);
      return formatted;
      
    } catch (err) {
      console.error('Error formatting date:', err, 'Input was:', linkedAt);
      return 'Date error';
    }
  };

  const fetchCourse = async () => {
    try {
      setLoading(true);
      if (!currentUser) return;
      
      const token = await currentUser.getIdToken();
      console.log('CourseManagement: Fetching course details for courseId:', courseId);
      
      const response = await fetch(`/api/courses/${courseId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('CourseManagement: Received course data:', data);
        
        // Handle both possible response formats
        const courseData = data.data?.course || data.data;
        setCourse(courseData);
        
        setEditForm({
          name: courseData.name || '',
          code: courseData.code || '',
          description: courseData.description || '',
          instructor: courseData.instructor || '',
          semester: courseData.semester || '',
          year: courseData.year || new Date().getFullYear(),
          settings: courseData.settings || {}
        });

        // Fetch member details if members exist
        if (courseData.members && courseData.members.length > 0) {
          console.log('CourseManagement: Found members, fetching details:', courseData.members);
          await fetchMemberDetails(courseData.members, token);
        } else {
          console.log('CourseManagement: No members found in course');
        }
      } else {
        const errorData = await response.json();
        console.error('CourseManagement: Failed to fetch course:', errorData);
        setError(errorData.message || 'Failed to load course');
      }
    } catch (err) {
      console.error('CourseManagement: Error loading course:', err);
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

  const leaveCourse = async (newOwnerId = null) => {
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/courses/${courseId}/leave`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newOwnerId })
      });

      if (response.ok) {
        navigate('/courses');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to leave course');
      }
    } catch (err) {
      setError('Error leaving course');
    }
  };

  const transferOwnership = async () => {
    if (!selectedNewOwner) {
      setError('Please select a new owner');
      return;
    }

    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/courses/${courseId}/transfer-ownership`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newOwnerId: selectedNewOwner })
      });

      if (response.ok) {
        setShowTransferModal(false);
        setSelectedNewOwner('');
        fetchCourse(); // Refresh course data
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to transfer ownership');
      }
    } catch (err) {
      setError('Error transferring ownership');
    }
  };

  const handleLeaveCourse = () => {
    if (isCreator) {
      // Creator needs to transfer ownership first
      setShowTransferModal(true);
    } else {
      // Regular member can leave directly
      setShowLeaveModal(true);
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
            
            <button
              onClick={handleLeaveCourse}
              className="action-btn danger"
            >
              <TrashIcon className="w-4 h-4" />
              {isCreator ? 'Transfer & Leave' : 'Leave Course'}
            </button>
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
                    <div className="stat-value">
                      {(() => {
                        // Count assignments from user aggregated data
                        let totalAssignments = 0;
                        if (course.userAggregatedData) {
                          Object.values(course.userAggregatedData).forEach(userData => {
                            if (userData.assignments) {
                              totalAssignments += userData.assignments.length;
                            }
                          });
                        }
                        // Also count regular course assignments if they exist
                        if (course.assignments) {
                          totalAssignments += course.assignments.length;
                        }
                        return totalAssignments;
                      })()}
                    </div>
                    <div className="stat-label">Total Assignments</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">
                      {(() => {
                        // Count user-specific linked integrations
                        let totalIntegrations = 0;
                        if (course.userLinkedIntegrations) {
                          Object.values(course.userLinkedIntegrations).forEach(userIntegrations => {
                            totalIntegrations += userIntegrations.length;
                          });
                        }
                        return totalIntegrations;
                      })()}
                    </div>
                    <div className="stat-label">Linked Integrations</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">
                      {(() => {
                        // Count active integrations
                        let activeIntegrations = 0;
                        if (course.userLinkedIntegrations) {
                          Object.values(course.userLinkedIntegrations).forEach(userIntegrations => {
                            userIntegrations.forEach(integration => {
                              if (integration.isActive !== false) {
                                activeIntegrations++;
                              }
                            });
                          });
                        }
                        return activeIntegrations;
                      })()}
                    </div>
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
                            {isCurrentUser ? 'You' : memberDetails[memberId]?.displayName || `User ${memberId.slice(-6)}`}
                            {course.createdBy === memberId && <span className="creator-badge">Creator</span>}
                          </div>
                          <div className="member-email">
                            {memberDetails[memberId]?.email || `ID: ${memberId.slice(-6)}`}
                          </div>
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
                <button
                  onClick={handleAddIntegration}
                  className="action-btn primary"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Integration
                </button>
              </div>
              
              <div className="integrations-grid">
                {course.userLinkedIntegrations && course.userLinkedIntegrations[currentUser?.uid] && course.userLinkedIntegrations[currentUser.uid].length > 0 ? (
                  course.userLinkedIntegrations[currentUser.uid].map(integration => (
                    <div key={integration.integrationId} className="integration-card">
                      <div className="integration-header">
                        <span 
                          className="integration-icon"
                          style={{ backgroundColor: integration.platform === 'gradescope' ? '#4f46e5' : '#6b7280' }}
                        >
                          {integration.platform === 'gradescope' ? '🎓' : '🔗'}
                        </span>
                        <div className="integration-info">
                          <h3 className="integration-platform">{integration.platformName}</h3>
                          <p className="integration-course">{integration.courseName}</p>
                          {integration.courseCode && (
                            <p className="integration-code">{integration.courseCode}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleUnlinkIntegration(integration.integrationId)}
                          className="unlink-button"
                          title="Remove integration"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="integration-meta">
                        <span className="linked-date">
                          Linked {formatLinkedDate(integration.linkedAt)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="integration-placeholder">
                    <LinkIcon className="placeholder-icon" />
                    <h4>No Integrations Yet</h4>
                    <p>Connect external platforms like Gradescope, Canvas, or Blackboard to sync course content.</p>
                    <button onClick={handleAddIntegration} className="btn-primary">
                      Add Integration
                    </button>
                  </div>
                )}
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

      {/* Add Integration Modal */}
      {showAddIntegrationModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Add Integration</h2>
              <button onClick={() => setShowAddIntegrationModal(false)} className="modal-close">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="modal-body">
              {availableIntegrations.length > 0 ? (
                <>
                  <p>Select integrations to link to this course:</p>
                  <div className="integration-list">
                    {availableIntegrations.map(integration => (
                      <div key={integration.id} className="integration-item">
                        <input
                          type="checkbox"
                          id={`integration-${integration.id}`}
                          checked={selectedIntegrations.includes(integration.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIntegrations([...selectedIntegrations, integration.id]);
                            } else {
                              setSelectedIntegrations(selectedIntegrations.filter(id => id !== integration.id));
                            }
                          }}
                        />
                        <label htmlFor={`integration-${integration.id}`} className="integration-label">
                          <div className="integration-details">
                            <span className="integration-platform-icon">
                              {integration.source === 'gradescope' ? '🎓' : '🔗'}
                            </span>
                            <div>
                              <strong>{integration.name}</strong>
                              <br />
                              <small>{integration.code} • {integration.source}</small>
                            </div>
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="empty-integrations">
                  <p>No available integrations found. Please import some courses from external platforms first.</p>
                  <Link to="/connect" className="btn-secondary">
                    Import Courses
                  </Link>
                </div>
              )}
              
              <div className="modal-actions">
                <button
                  onClick={() => setShowAddIntegrationModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                {availableIntegrations.length > 0 && (
                  <button
                    onClick={linkIntegrationsToCourse}
                    className="btn-primary"
                    disabled={selectedIntegrations.length === 0}
                  >
                    Link {selectedIntegrations.length} Integration{selectedIntegrations.length !== 1 ? 's' : ''}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Leave Course Modal */}
      {showLeaveModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Leave Course</h2>
              <button onClick={() => setShowLeaveModal(false)} className="modal-close">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="warning-content">
                <ExclamationTriangleIcon className="warning-icon" />
                <h3>Are you sure you want to leave this course?</h3>
                <p>You will lose access to all course content, assignments, and materials.</p>
                <p><strong>Course:</strong> {course.name} ({course.code})</p>
              </div>
              
              <div className="modal-actions">
                <button
                  onClick={() => setShowLeaveModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={() => leaveCourse()}
                  className="danger-btn"
                >
                  <TrashIcon className="w-4 h-4" />
                  Leave Course
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Ownership Modal */}
      {showTransferModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Transfer Ownership & Leave</h2>
              <button onClick={() => setShowTransferModal(false)} className="modal-close">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="warning-content">
                <ExclamationTriangleIcon className="warning-icon" />
                <h3>Transfer ownership before leaving</h3>
                <p>As the course creator, you must transfer ownership to another member before leaving.</p>
                <p>You will become an admin after transferring ownership.</p>
              </div>
              
              <div className="form-group">
                <label>Select New Owner *</label>
                <select
                  value={selectedNewOwner}
                  onChange={(e) => setSelectedNewOwner(e.target.value)}
                  required
                >
                  <option value="">Choose a member...</option>
                  {course?.members?.filter(memberId => memberId !== currentUser?.uid).map(memberId => (
                    <option key={memberId} value={memberId}>
                      {memberDetails[memberId]?.displayName || `User ${memberId.slice(-6)}`}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="modal-actions">
                <button
                  onClick={() => setShowTransferModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    transferOwnership();
                    leaveCourse(selectedNewOwner);
                  }}
                  className="danger-btn"
                  disabled={!selectedNewOwner}
                >
                  <TrashIcon className="w-4 h-4" />
                  Transfer & Leave
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
