import React, { useState, useEffect } from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';
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
  const params = useParams();

  // Parse courseId from URL parameters (both route params and query params)
  useEffect(() => {
    // First check route params (for /courses/:courseId)
    if (params.courseId) {
      setSelectedCourseId(params.courseId);
    } else {
      // Then check query parameters (for /assignments?courseId=...)
      const urlParams = new URLSearchParams(location.search);
      const courseId = urlParams.get('courseId');
      if (courseId) {
        setSelectedCourseId(courseId);
      }
    }
  }, [location.search, params.courseId]);

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

  // Helper: map common US timezone abbreviations to offsets (hours relative to UTC)
  const TZ_ABBREV_TO_OFFSET = {
    EDT: -4,
    EST: -5,
    CDT: -5,
    CST: -6,
    MDT: -6,
    MST: -7,
    PDT: -7,
    PST: -8,
  };

  // Format the due date for display
  const formatDueDate = (timestamp) => {
    if (!timestamp) return 'No due date';

    let date = null;

    // 1) Handle Firebase Timestamp objects coming from Firestore
    //    These usually have the shape: { seconds: <number>, nanoseconds: <number> }
    if (typeof timestamp === 'object' && timestamp !== null) {
      // a) Native Firestore Timestamp instance exposes a .toDate() method
      if (typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      }
      // b) Plain object returned through JSON serialisation: { seconds, nanoseconds }
      else if ('seconds' in timestamp) {
        const millis = timestamp.seconds * 1000 + Math.floor((timestamp.nanoseconds || 0) / 1e6);
        date = new Date(millis);
      }
      // c) Another possible serialisation (_seconds / _nanoseconds)
      else if ('_seconds' in timestamp) {
        const millis = timestamp._seconds * 1000 + Math.floor((timestamp._nanoseconds || 0) / 1e6);
        date = new Date(millis);
      }
    }

    // 2) If the value is a string (e.g. "2024-05-22 09:00:00 -0400") try to parse it
    if (!date && typeof timestamp === 'string') {
      let isoLike = timestamp;
      // Convert timezone abbreviation in parentheses e.g. "(EDT)" or trailing "EDT" to numeric offset
      const tzMatch = isoLike.match(/\b([A-Z]{2,4})\b/);
      if (tzMatch && TZ_ABBREV_TO_OFFSET[tzMatch[1]]) {
        const offsetHours = TZ_ABBREV_TO_OFFSET[tzMatch[1]];
        const offsetStr = (offsetHours > 0 ? '+' : '-') + String(Math.abs(offsetHours)).padStart(2, '0') + ':00';
        // Remove the abbreviation and add offset
        isoLike = isoLike.replace(tzMatch[1], '').trim() + ' ' + offsetStr;
      }
      // Replace space between date and time with 'T' to create an ISO-like string
      if (/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(isoLike)) {
        isoLike = isoLike.replace(' ', 'T');
      }
      // Replace timezone like " -0400" with ISO offset "-04:00"
      isoLike = isoLike.replace(/ ([+-]\d{2})(\d{2})$/, ' $1:$2');
      date = new Date(isoLike);
    }

    // 3) If it's a primitive number or Date-parseable string fall back to new Date()
    if (!date) {
      date = new Date(timestamp);
    }

    // Final guard
    if (!date || isNaN(date.getTime())) return 'Invalid date';

    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
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

  // Get the current course name if filtering by course
  const getCurrentCourseName = () => {
    if (selectedCourseId) {
      const course = courses.find(c => c.id === selectedCourseId);
      return course ? `${course.code}: ${course.name}` : 'Selected Course';
    }
    return null;
  };

  const currentCourseName = getCurrentCourseName();

  return (
    <div className="assignments">
      {selectedCourseId && (
        <div className="breadcrumb">
          <Link to="/courses" className="breadcrumb-link">
            <span className="breadcrumb-icon">📚</span>
            Courses
          </Link>
          <span className="breadcrumb-separator">›</span>
          <span className="breadcrumb-current">{currentCourseName}</span>
        </div>
      )}
      <h1>📚 {currentCourseName ? `${currentCourseName} - Assignments` : 'Assignments'}</h1>
      
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
      {courses.length > 0 && assignments.filter(a => !selectedCourseId || a.courseId === selectedCourseId).length === 0 && !loading && (
        <div className="empty-state">
          <div className="empty-state-icon">📝</div>
          <h3 className="empty-state-title">No Assignments Found</h3>
          <p>{selectedCourseId ? `No assignments found for ${currentCourseName}.` : 'No assignments found for the selected course filter.'}</p>
          {selectedCourseId && (
            <Link 
              to="/assignments" 
              className="import-button"
            >
              <span className="action-icon">📚</span>
              View All Assignments
            </Link>
          )}
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
          {assignments
            .filter(assignment => !selectedCourseId || assignment.courseId === selectedCourseId)
            .map(assignment => (
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
                      href={`https://gradescope.com/courses/${getCourseExternalId(assignment.courseId)}/assignments/${assignment.externalId}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="action-button primary"
                    >
                      <span className="action-icon">🔗</span>
                      View on Gradescope
                    </a>
                    <Link
                      to={`/assignments/pdf/${getCourseExternalId(assignment.courseId)}/${assignment.externalId}?source=gradescope`}
                      className="action-button tertiary"
                    >
                      <span className="action-icon">📄</span>
                      View PDF
                    </Link>
                  </>
                ) : (
                  <Link 
                    to={`/assignments/pdf/${assignment.courseId}/${assignment.id}`}
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