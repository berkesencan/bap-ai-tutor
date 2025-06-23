import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  BookOpenIcon,
  UserGroupIcon,
  AcademicCapIcon,
  CalendarIcon,
  BuildingLibraryIcon,
  UserIcon,
  DocumentTextIcon,
  LinkIcon,
  ArrowLeftIcon,
  ClipboardDocumentListIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import './CourseDetails.css';

const CourseDetails = () => {
  const { courseId } = useParams();
  const { currentUser } = useAuth();
  const [course, setCourse] = useState(null);
  const [memberDetails, setMemberDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddIntegrationModal, setShowAddIntegrationModal] = useState(false);
  const [availableIntegrations, setAvailableIntegrations] = useState([]);
  const [selectedIntegrations, setSelectedIntegrations] = useState([]);

  useEffect(() => {
    const fetchCourseDetails = async () => {
      try {
        setLoading(true);
        const token = await currentUser.getIdToken();
        const response = await fetch(`/api/courses/${courseId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setCourse(data.data.course);
          
          // Fetch member details
          if (data.data.course.members && data.data.course.members.length > 0) {
            await fetchMemberDetails(data.data.course.members, token);
          }
        } else {
          const errorData = await response.json();
          setError(errorData.message || 'Failed to load course details');
        }
      } catch (err) {
        setError('Failed to load course details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (currentUser && courseId) {
      fetchCourseDetails();
    }
  }, [currentUser, courseId]);

  const fetchMemberDetails = async (memberIds, token) => {
    try {
      const memberDetailsMap = {};
      
      // Fetch user details for each member
      for (const memberId of memberIds) {
        try {
          const response = await fetch(`/api/users/${memberId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const userData = await response.json();
            memberDetailsMap[memberId] = userData.data?.user || { displayName: 'Unknown User' };
          } else {
            // If user details can't be fetched, use a fallback
            memberDetailsMap[memberId] = { displayName: `User ${memberId.slice(-6)}` };
          }
        } catch (err) {
          console.error(`Error fetching details for member ${memberId}:`, err);
          memberDetailsMap[memberId] = { displayName: `User ${memberId.slice(-6)}` };
        }
      }
      
      setMemberDetails(memberDetailsMap);
    } catch (err) {
      console.error('Error fetching member details:', err);
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
        window.location.reload(); // Simple refresh for now
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
        // Refresh course data by removing the integration from state
        setCourse(prevCourse => ({
          ...prevCourse,
          userLinkedIntegrations: {
            ...prevCourse.userLinkedIntegrations,
            [currentUser.uid]: prevCourse.userLinkedIntegrations[currentUser.uid].filter(
              integration => integration.integrationId !== integrationId
            )
          }
        }));
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
    console.log('CourseDetails formatLinkedDate input:', linkedAt, 'type:', typeof linkedAt);
    
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

  const getUserRole = (course) => {
    if (!currentUser || !course.memberRoles) return null;
    return course.memberRoles[currentUser.uid] || null;
  };

  const getPlatformIcon = (platform) => {
    const platformIcons = {
      gradescope: '🎓',
      canvas: '🎨',
      blackboard: '📚',
      brightspace: '💡',
      moodle: '📖'
    };
    return platformIcons[platform] || '🔗';
  };

  const getPlatformColor = (platform) => {
    const platformColors = {
      gradescope: '#4f46e5',
      canvas: '#e11d48',
      blackboard: '#1f2937',
      brightspace: '#f59e0b',
      moodle: '#059669'
    };
    return platformColors[platform] || '#6b7280';
  };

  // Check if current user can manage integrations (creator or admin)
  const canManageIntegrations = () => {
    const userRole = getUserRole(course);
    return userRole === 'creator' || userRole === 'admin';
  };

  if (loading) {
    return (
      <div className="course-details">
        <div className="loading-container">
          <div className="spinner"></div>
          <p className="loading-text">Loading course details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="course-details">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h3 className="error-title">Error Loading Course</h3>
          <p className="error-message">{error}</p>
          <Link to="/courses" className="back-link">
            <ArrowLeftIcon className="back-icon" />
            Back to Courses
          </Link>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="course-details">
        <div className="error-container">
          <div className="error-icon">❓</div>
          <h3 className="error-title">Course Not Found</h3>
          <p className="error-message">The course you're looking for doesn't exist or you don't have access to it.</p>
          <Link to="/courses" className="back-link">
            <ArrowLeftIcon className="back-icon" />
            Back to Courses
          </Link>
        </div>
      </div>
    );
  }

  const userRole = getUserRole(course);

  return (
    <div className="course-details">
      <div className="course-details-header">
        <Link to="/courses" className="back-link">
          <ArrowLeftIcon className="back-icon" />
          Back to Courses
        </Link>
        <div className="course-header-info">
          <div className="course-title-section">
            <h1 className="course-title">{course.name}</h1>
            <span className="course-code">{course.code}</span>
          </div>
          <div className="course-meta">
            {course.term && (
              <span className="meta-item">
                <CalendarIcon className="meta-icon" />
                {course.term}
              </span>
            )}
            {course.institution && (
              <span className="meta-item">
                <BuildingLibraryIcon className="meta-icon" />
                {course.institution}
              </span>
            )}
            <span className="meta-item">
              <UserGroupIcon className="meta-icon" />
              {course.members?.length || 0} members
            </span>
            <span className="role-badge">{userRole}</span>
          </div>
        </div>
      </div>

      <div className="course-details-content">
        {/* Course Information Section */}
        <div className="details-section">
          <div className="section-header">
            <BookOpenIcon className="section-icon" />
            <h2 className="section-title">Course Information</h2>
          </div>
          <div className="section-content">
            <div className="info-grid">
              <div className="info-item">
                <label className="info-label">Course Name</label>
                <p className="info-value">{course.name}</p>
              </div>
              <div className="info-item">
                <label className="info-label">Course Code</label>
                <p className="info-value">{course.code}</p>
              </div>
              <div className="info-item">
                <label className="info-label">Instructor</label>
                <p className="info-value">{course.instructor || 'Not specified'}</p>
              </div>
              <div className="info-item">
                <label className="info-label">Institution</label>
                <p className="info-value">{course.institution || 'Not specified'}</p>
              </div>
              <div className="info-item">
                <label className="info-label">Semester</label>
                <p className="info-value">{course.semester || 'Not specified'}</p>
              </div>
              <div className="info-item">
                <label className="info-label">Year</label>
                <p className="info-value">{course.year || 'Not specified'}</p>
              </div>
              {/* Show Join Code if user is creator or admin */}
              {(course.memberRoles?.[currentUser?.uid] === 'creator' || course.memberRoles?.[currentUser?.uid] === 'admin') && course.joinCode && (
                <div className="info-item">
                  <label className="info-label">Join Code</label>
                  <p className="info-value join-code-display">
                    <span className="join-code">{course.joinCode}</span>
                    <button 
                      className="copy-button"
                      onClick={() => {
                        navigator.clipboard.writeText(course.joinCode);
                        // Could add a toast notification here
                      }}
                      title="Copy join code"
                    >
                      📋
                    </button>
                  </p>
                </div>
              )}
            </div>
            {course.description && (
              <div className="description-section">
                <label className="info-label">Description</label>
                <p className="course-description">{course.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Linked Integrations Section */}
        <div className="details-section">
          <div className="section-header">
            <LinkIcon className="section-icon" />
            <h2 className="section-title">Your Linked Integrations</h2>
            <button
              onClick={handleAddIntegration}
              className="action-button secondary"
            >
              <LinkIcon className="action-icon" />
              Add Integration
            </button>
          </div>
          <div className="section-content">
            {course.userLinkedIntegrations && course.userLinkedIntegrations[currentUser?.uid] && course.userLinkedIntegrations[currentUser.uid].length > 0 ? (
              <div className="integrations-grid">
                {course.userLinkedIntegrations[currentUser.uid].map(integration => (
                  <div key={integration.integrationId} className="integration-card">
                    <div className="integration-header">
                      <span 
                        className="integration-icon"
                        style={{ backgroundColor: getPlatformColor(integration.platform) }}
                      >
                        {getPlatformIcon(integration.platform)}
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
                ))}
              </div>
            ) : (
              <div className="empty-integrations">
                <LinkIcon className="empty-icon" />
                <h3>No Integrations Yet</h3>
                <p>Link external platforms like Gradescope, Canvas, or Blackboard to sync assignments and materials to this course.</p>
                <button onClick={handleAddIntegration} className="action-button primary">
                  <LinkIcon className="action-icon" />
                  Add Your First Integration
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Members Section */}
        <div className="details-section">
          <div className="section-header">
            <UserGroupIcon className="section-icon" />
            <h2 className="section-title">Course Members</h2>
          </div>
          <div className="section-content">
            <div className="members-list">
              {course.members?.map(memberId => {
                const memberRole = course.memberRoles?.[memberId] || 'member';
                const memberData = memberDetails[memberId] || { displayName: `User ${memberId.slice(-6)}` };
                const isCurrentUser = memberId === currentUser?.uid;
                
                return (
                  <div key={memberId} className="member-item">
                    <div className="member-info">
                      <UserIcon className="member-icon" />
                      <div className="member-details">
                        <span className="member-name">
                          {isCurrentUser ? 'You' : memberData.displayName}
                          {course.createdBy === memberId && <span className="creator-badge">Creator</span>}
                        </span>
                        <span className="member-role-badge">{memberRole}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Course Materials Section */}
        {course.materials && course.materials.length > 0 && (
          <div className="details-section">
            <div className="section-header">
              <DocumentTextIcon className="section-icon" />
              <h2 className="section-title">Course Materials</h2>
            </div>
            <div className="section-content">
              <div className="materials-grid">
                {course.materials.map((material, index) => (
                  <div key={material.id || index} className="material-card">
                    <DocumentTextIcon className="material-icon" />
                    <div className="material-info">
                      <h3 className="material-name">{material.name || material.title}</h3>
                      <p className="material-type">{material.type || 'Document'}</p>
                      {material.sourcePlatformName && (
                        <span className="material-source">
                          From {material.sourcePlatformName}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Assignments Section */}
        {course.assignments && course.assignments.length > 0 && (
          <div className="details-section">
            <div className="section-header">
              <ClipboardDocumentListIcon className="section-icon" />
              <h2 className="section-title">Assignments</h2>
            </div>
            <div className="section-content">
              <div className="assignments-grid">
                {course.assignments.map((assignment, index) => (
                  <div key={assignment.id || index} className="assignment-card">
                    <div className="assignment-header">
                      <h3 className="assignment-name">{assignment.name || assignment.title}</h3>
                      {assignment.dueDate && (
                        <span className="assignment-due">
                          Due: {new Date(assignment.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {assignment.description && (
                      <p className="assignment-description">{assignment.description}</p>
                    )}
                    {assignment.sourcePlatformName && (
                      <span className="assignment-source">
                        From {assignment.sourcePlatformName}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="details-section">
          <div className="section-header">
            <AcademicCapIcon className="section-icon" />
            <h2 className="section-title">Quick Actions</h2>
          </div>
          <div className="section-content">
            <div className="quick-actions">
              <Link
                to={`/assignments?courseId=${course.id}`}
                className="action-button primary"
              >
                <ClipboardDocumentListIcon className="action-icon" />
                View All Assignments
              </Link>
              <Link
                to={`/ai-tutor?courseId=${course.id}`}
                className="action-button secondary"
              >
                <AcademicCapIcon className="action-icon" />
                AI Tutor for this Course
              </Link>
              <Link
                to={`/interactive-activities?courseId=${course.id}`}
                className="action-button tertiary"
              >
                <UserGroupIcon className="action-icon" />
                Interactive Activities
              </Link>
            </div>
          </div>
        </div>
      </div>

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
                  <Link to="/connect" className="action-button secondary">
                    Import Courses
                  </Link>
                </div>
              )}
              
              <div className="modal-actions">
                <button
                  onClick={() => setShowAddIntegrationModal(false)}
                  className="action-button secondary"
                >
                  Cancel
                </button>
                {availableIntegrations.length > 0 && (
                  <button
                    onClick={linkIntegrationsToCourse}
                    className="action-button primary"
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
    </div>
  );
};

export default CourseDetails; 