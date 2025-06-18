import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { getAssignmentsForCourse, getCourses, getAllAssignments } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './Assignments.css';

function Assignments() {
  const [assignments, setAssignments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const { currentUser } = useAuth();
  const location = useLocation();

  // Parse courseId from URL query parameters if present
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const courseId = params.get('courseId');
    if (courseId) {
      setSelectedCourseId(courseId);
    }
  }, [location.search]);

  // Fetch courses
  useEffect(() => {
    const fetchCourses = async () => {
      try {
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
      }
    };

    if (currentUser) {
      fetchCourses();
    }
  }, [currentUser]);

  // Fetch assignments based on selected course
  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        setLoading(true);
        
        if (selectedCourseId) {
          // Fetch assignments for a specific course
          const response = await getAssignmentsForCourse(selectedCourseId);
          
          if (response.success && response.data) {
            setAssignments(response.data.assignments || []);
          } else {
            console.error('Failed to fetch assignments:', response);
            setAssignments([]);
          }
        } else if (courses.length > 0) {
          // Fetch all assignments for the user
          const response = await getAllAssignments();
          
          if (response.success && response.data) {
            setAssignments(response.data.assignments || []);
          } else {
            console.error('Failed to fetch all assignments:', response);
            setAssignments([]);
          }
        } else {
          setAssignments([]);
        }
      } catch (err) {
        console.error('Error fetching assignments:', err);
        setError('Failed to load assignments. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchAssignments();
    }
  }, [currentUser, selectedCourseId, courses.length]);

  // Format the due date for display
  const formatDueDate = (timestamp) => {
    if (!timestamp) return 'No due date';
    
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Invalid date';
    
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Get course name from course ID
  const getCourseName = (courseId) => {
    const course = courses.find(c => c.id === courseId);
    return course ? `${course.code}: ${course.name}` : 'Unknown Course';
  };

  // Get course external ID from course ID
  const getCourseExternalId = (courseId) => {
    const course = courses.find(c => c.id === courseId);
    return course && course.source === 'gradescope' ? course.externalId : null;
  };

  if (loading && courses.length === 0) {
    return (
      <div className="assignments">
        <h1>📚 Assignments</h1>
        <div className="loading-container">
          <div className="spinner"></div>
          <p className="loading-text">Loading assignments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="assignments">
        <h1>📚 Assignments</h1>
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h3 className="error-title">Error Loading Assignments</h3>
          <p className="error-message">{error}</p>
          <Link 
            to="/connect" 
            className="import-button"
          >
            <span className="action-icon">📥</span>
            Import from Gradescope
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="assignments">
      <h1>📚 Assignments</h1>
      
      {/* Course filter */}
      <div className="filter-card">
        <div className="filter-header">
          <h3 className="filter-title">
            <span className="filter-icon">🎯</span>
            Filter Assignments
          </h3>
          <p className="filter-subtitle">Choose a course to view specific assignments</p>
        </div>
        <div className="filter-content">
          <div className="filter-group">
            <label htmlFor="course-filter" className="filter-label">
              <span className="label-icon">📚</span>
              Select Course:
            </label>
            <div className="custom-select-wrapper">
              <select
                id="course-filter"
                value={selectedCourseId || ''}
                onChange={(e) => setSelectedCourseId(e.target.value || null)}
                className="custom-select"
              >
                <option value="">🌟 All Courses ({assignments.length} assignments)</option>
                {courses.map(course => {
                  const courseAssignments = assignments.filter(a => a.courseId === course.id);
                  return (
                    <option key={course.id} value={course.id}>
                      📚 {course.code}: {course.name} ({courseAssignments.length} assignments)
                    </option>
                  );
                })}
              </select>
              <div className="select-arrow">
                <span>▼</span>
              </div>
            </div>
          </div>
          {selectedCourseId && (
            <div className="filter-summary">
              <span className="summary-badge">
                <span className="summary-icon">📊</span>
                Showing {assignments.filter(a => a.courseId === selectedCourseId).length} assignments
              </span>
            </div>
          )}
        </div>
      </div>

      {/* No courses message */}
      {courses.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📚</div>
          <h3 className="empty-state-title">No Courses Found</h3>
          <p>You don't have any courses yet. Import some courses from Gradescope to get started.</p>
          <Link 
            to="/connect" 
            className="import-button"
          >
            <span className="action-icon">📥</span>
            Import from Gradescope
          </Link>
        </div>
      )}

      {/* No assignments message */}
      {courses.length > 0 && assignments.length === 0 && !loading && (
        <div className="empty-state">
          <div className="empty-state-icon">📝</div>
          <h3 className="empty-state-title">No Assignments Found</h3>
          <p>No assignments found for the selected course filter.</p>
        </div>
      )}

      {/* Loading assignments indicator */}
      {loading && courses.length > 0 && (
        <div className="loading-container">
          <div className="spinner"></div>
          <p className="loading-text">Loading assignments...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h3 className="error-title">Error Loading Assignments</h3>
          <p className="error-message">{error}</p>
          <Link 
            to="/connect" 
            className="import-button"
          >
            <span className="action-icon">📥</span>
            Import from Gradescope
          </Link>
        </div>
      )}

      {/* Assignments list */}
      {!loading && assignments.length > 0 && (
        <div className="assignments-grid">
          {assignments.map(assignment => (
            <div 
              key={assignment.id} 
              className="assignment-card"
            >
              <div className="assignment-card-header">
                <div className="assignment-info">
                  <h2 className="assignment-title">{assignment.title}</h2>
                  <p className="assignment-course">
                    📚 {getCourseName(assignment.courseId)}
                  </p>
                </div>
                <div className="assignment-badges">
                  <span className={`status-badge ${
                    assignment.status === 'completed' 
                      ? 'completed' 
                      : 'pending'
                  }`}>
                    {assignment.status === 'completed' ? '✅ Completed' : '⏳ Pending'}
                  </span>
                  {assignment.source === 'gradescope' && (
                    <span className="source-badge">
                      🎓 Gradescope
                    </span>
                  )}
                </div>
              </div>
              
              <div className="assignment-due">
                <span className="assignment-due-label">📅 Due:</span> 
                {formatDueDate(assignment.dueDate)}
              </div>
              
              {assignment.description && (
                <div className="assignment-description">
                  📝 {assignment.description}
                </div>
              )}
              
              <div className="assignment-actions">
                {assignment.source === 'gradescope' && assignment.externalId && getCourseExternalId(assignment.courseId) ? (
                  <>
                    <a 
                      href={`https://www.gradescope.com/courses/${getCourseExternalId(assignment.courseId)}/assignments/${assignment.externalId}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="action-button primary"
                    >
                      <span className="action-icon">🔗</span>
                      View on Gradescope
                    </a>
                    <Link
                      to={`/assignments/pdf/${getCourseExternalId(assignment.courseId)}/${assignment.externalId}`}
                      className="action-button tertiary"
                    >
                      <span className="action-icon">📄</span>
                      View PDF
                    </Link>
                  </>
                ) : (
                  <Link 
                    to={`/assignments/${assignment.id}`}
                    className="action-button secondary"
                  >
                    <span className="action-icon">👁️</span>
                    View Details
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Assignments; 