import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';
import { getCourses, getAllAssignments } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './Assignments.css';

function Assignments() {
  const [allAssignments, setAllAssignments] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCourseId, setSelectedCourseId] = useState('all');
  const { currentUser } = useAuth();
  const location = useLocation();
  const params = useParams();

  // Parse courseId from URL to set the initial filter
  useEffect(() => {
    const courseIdFromUrl = params.courseId || new URLSearchParams(location.search).get('courseId');
    if (courseIdFromUrl) {
      setSelectedCourseId(courseIdFromUrl);
    }
  }, [location.search, params.courseId]);

  // Fetch all courses and all assignments once on component load
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!currentUser) return;
      setLoading(true);
      setError(null);
      try {
        const [coursesRes, assignmentsRes] = await Promise.all([
          getCourses(),
          getAllAssignments(),
        ]);

        if (coursesRes.success && coursesRes.data.courses) {
          setAllCourses(coursesRes.data.courses);
        } else {
          console.error('Failed to fetch courses:', coursesRes);
          setAllCourses([]);
          throw new Error('Could not load your courses.');
    }

        if (assignmentsRes.success && assignmentsRes.data.assignments) {
          setAllAssignments(assignmentsRes.data.assignments);
        } else {
          console.error('Failed to fetch assignments:', assignmentsRes);
          setAllAssignments([]);
          throw new Error('Could not load your assignments.');
        }
      } catch (err) {
        console.error('Error fetching initial data:', err);
        setError(err.message || 'Failed to load page data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [currentUser]);

  // Helper: map common US timezone abbreviations to offsets (hours relative to UTC)
  const TZ_ABBREV_TO_OFFSET = {
    EDT: -4, EST: -5, CDT: -5, CST: -6, MDT: -6,
    MST: -7, PDT: -7, PST: -8,
  };

  // Format the due date for display
  const formatDueDate = (timestamp, returnDateObject = false) => {
    if (!timestamp) return 'No due date';
    let date = null;

    if (typeof timestamp === 'object' && timestamp !== null) {
      if (typeof timestamp.toDate === 'function') date = timestamp.toDate();
      else if ('seconds' in timestamp) date = new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1e6);
      else if ('_seconds' in timestamp) date = new Date(timestamp._seconds * 1000 + (timestamp._nanoseconds || 0) / 1e6);
    }
    
    if (!date && typeof timestamp === 'string') {
      let isoLike = timestamp;
      const tzMatch = isoLike.match(/\b([A-Z]{2,4})\b/);
      if (tzMatch && TZ_ABBREV_TO_OFFSET[tzMatch[1]]) {
        const offsetHours = TZ_ABBREV_TO_OFFSET[tzMatch[1]];
        const offsetStr = (offsetHours >= 0 ? '+' : '-') + String(Math.abs(offsetHours)).padStart(2, '0') + ':00';
        isoLike = isoLike.replace(tzMatch[1], '').trim() + ' ' + offsetStr;
      }
      if (/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(isoLike)) isoLike = isoLike.replace(' ', 'T');
      isoLike = isoLike.replace(/ ([+-]\d{2})(\d{2})$/, ' $1:$2');
      date = new Date(isoLike);
    }

    if (!date) date = new Date(timestamp);
    if (!date || isNaN(date.getTime())) return returnDateObject ? null : 'Invalid date';
    if (returnDateObject) return date;
    
    return date.toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  };

  // Memoized calculation for filtered assignments and course counts
  const { filteredAssignments, courseAssignmentCounts } = useMemo(() => {
    if (loading) {
      return { filteredAssignments: [], courseAssignmentCounts: {} };
    }

    console.log('Processing assignments with courses:', allCourses.length, 'assignments:', allAssignments.length);

    // 1. Create a reverse map: integration course ID -> BAP course ID that has it linked
    const integrationToBapCourseMap = new Map();
    allCourses.forEach(course => {
      // Check for user-specific linked integrations (new format)
      if (course.userLinkedIntegrations && course.userLinkedIntegrations[currentUser?.uid]) {
        const userLinkedIntegrations = course.userLinkedIntegrations[currentUser.uid];
        userLinkedIntegrations.forEach(integration => {
          integrationToBapCourseMap.set(integration.integrationId, course.id);
          console.log(`Mapping integration ${integration.integrationId} (${integration.courseName}) -> BAP course ${course.id} (${course.name})`);
        });
      }
      
      // Legacy format fallback
      if (course.integrations && course.integrations.length > 0) {
        const integratedCourseIds = course.integrations.map(int => int.integratedCourseId || int.integrationId);
        integratedCourseIds.forEach(integrationId => {
          integrationToBapCourseMap.set(integrationId, course.id);
          console.log(`Mapping legacy integration ${integrationId} -> BAP course ${course.id} (${course.name})`);
        });
      }
    });

    // 2. Create a map of course integrations for counting purposes
    const courseIntegrationsMap = new Map();
    allCourses.forEach(course => {
      const userIntegrations = [];
      
      // Check for user-specific linked integrations (new format)
      if (course.userLinkedIntegrations && course.userLinkedIntegrations[currentUser?.uid]) {
        const userLinkedIntegrations = course.userLinkedIntegrations[currentUser.uid];
        userLinkedIntegrations.forEach(integration => {
          userIntegrations.push(integration.integrationId);
        });
      }
      
      // Legacy format fallback
      if (course.integrations && course.integrations.length > 0) {
        const integratedCourseIds = course.integrations.map(int => int.integratedCourseId || int.integrationId);
        userIntegrations.push(...integratedCourseIds);
      }
      
      if (userIntegrations.length > 0) {
        courseIntegrationsMap.set(course.id, userIntegrations);
        console.log(`Course ${course.name} has ${userIntegrations.length} integrated courses:`, userIntegrations);
      }
    });

    // 3. Calculate assignment counts for each course
    const counts = {};
    allCourses.forEach(course => {
      // Count assignments that belong to this course directly OR through integrations
      const count = allAssignments.filter(assignment => {
        // Direct course assignment
        if (assignment.courseId === course.id) return true;
        
        // Assignment from linked integration
        const bapCourseId = integrationToBapCourseMap.get(assignment.courseId);
        return bapCourseId === course.id;
      }).length;
      
      counts[course.id] = count;
      
      if (count > 0) {
        console.log(`Course ${course.name} has ${count} assignments`);
      }
    });

    // 4. Determine the list of currently displayed assignments
    let assignmentsToDisplay = [];
    if (selectedCourseId === 'all') {
      assignmentsToDisplay = allAssignments;
    } else {
      const selectedCourse = allCourses.find(c => c.id === selectedCourseId);
      if (selectedCourse) {
        assignmentsToDisplay = allAssignments.filter(assignment => {
          // Direct course assignment
          if (assignment.courseId === selectedCourse.id) return true;
          
          // Assignment from linked integration
          const bapCourseId = integrationToBapCourseMap.get(assignment.courseId);
          return bapCourseId === selectedCourse.id;
        });
        
        console.log(`Filtering assignments for course ${selectedCourse.name}:`);
        console.log(`Found ${assignmentsToDisplay.length} assignments`);
      }
    }
    
    // Sort assignments by due date, with undated ones last
    const sortedAssignments = [...assignmentsToDisplay].sort((a, b) => {
      const dateA = a.dueDate ? new Date(formatDueDate(a.dueDate, true)).getTime() : Infinity;
      const dateB = b.dueDate ? new Date(formatDueDate(b.dueDate, true)).getTime() : Infinity;
      if (dateA === Infinity && dateB === Infinity) return 0;
      return dateA - dateB;
    });

    return { filteredAssignments: sortedAssignments, courseAssignmentCounts: counts };
  }, [selectedCourseId, allAssignments, allCourses, loading, currentUser]);

  const getCourseInfo = (courseId) => {
    const course = allCourses.find(c => c.id === courseId);
    if (!course) {
      console.warn(`Course not found for ID: ${courseId}`);
      return { name: 'Unknown Course', externalId: null, platform: 'BAP' };
    }
    
    // Handle cases where source might be null/undefined
    const source = course.source || 'bap';
    
    // Additional debugging for troubleshooting
    if (!course.source) {
      console.warn(`Course ${course.name} (${courseId}) has no source field, defaulting to 'bap'`);
    }
    
    const name = source === 'bap' 
      ? `${course.code}: ${course.name}` 
      : `${course.name}`;
    
    // Extra safety check
    if (!source || typeof source !== 'string') {
      console.error(`Invalid source for course ${courseId}:`, source);
      return { name: course.name || 'Unknown Course', externalId: course.externalId, platform: 'BAP' };
    }
    
    const platform = source === 'bap' ? 'BAP' : source.charAt(0).toUpperCase() + source.slice(1);
    return { name, externalId: course.externalId, platform };
  };

  const handleCourseFilterChange = (e) => {
    const newCourseId = e.target.value;
    setSelectedCourseId(newCourseId);
    // Update URL without reloading the page
    const url = newCourseId === 'all' ? '/assignments' : `/assignments?courseId=${newCourseId}`;
    window.history.pushState({}, '', url);
  };
  
  const getCurrentCourseName = () => {
    if (selectedCourseId === 'all') return 'All Assignments';
    const course = allCourses.find(c => c.id === selectedCourseId);
    return course ? `${course.code}: ${course.name}` : 'Assignments';
  };
  
  const totalAssignmentsCount = allAssignments.length;

  const renderLoading = () => (
        <div className="loading-container">
          <div className="spinner"></div>
          <p className="loading-text">Loading assignments...</p>
      </div>
    );

  const renderError = () => (
        <div className="error-container">
          <div className="error-icon">⚠️</div>
      <p className="error-text">
        <strong>Oops! Something went wrong.</strong>
        <br />
        {error}
      </p>
        </div>
  );

  const renderNoAssignments = () => (
    <div className="no-assignments-container">
      <div className="no-assignments-icon">🎉</div>
      <h2 className="no-assignments-title">All Caught Up!</h2>
      <p className="no-assignments-text">
        You have no assignments here. Ready for the next challenge!
      </p>
      </div>
    );

  return (
    <div className="assignments">
      <header className="assignments-header">
        <h1>{getCurrentCourseName()}</h1>
        <div className="filter-container">
          <label htmlFor="course-filter">Filter by course:</label>
              <select
                id="course-filter"
            value={selectedCourseId} 
            onChange={handleCourseFilterChange}
            disabled={loading}
              >
            <option value="all">
              All Courses ({totalAssignmentsCount})
            </option>
            {allCourses.map(course => (
                    <option key={course.id} value={course.id}>
                {course.name} ({courseAssignmentCounts[course.id] || 0})
                    </option>
            ))}
              </select>
        </div>
      </header>

      {loading ? renderLoading() : error ? renderError() : (
        <div className="assignments-list">
          {filteredAssignments.length > 0 ? (
            filteredAssignments.map(assignment => {
              const { name: courseName, externalId: courseExternalId, platform } = getCourseInfo(assignment.courseId);
              const isGradescope = platform === 'Gradescope';

              return (
                <div key={assignment.id} className="assignment-card">
                  <div className="assignment-details">
                    <span className="platform-badge" data-platform={platform.toLowerCase()}>
                      {platform}
                    </span>
                  <h2 className="assignment-title">{assignment.title}</h2>
                  <p className="assignment-course">
                      <span className="course-icon">📘</span> {courseName}
                    </p>
                    <p className="assignment-due-date">
                      <span className="date-icon">📅</span>
                      <strong>Due:</strong> {formatDueDate(assignment.dueDate)}
                  </p>
                </div>
              <div className="assignment-actions">
                    {isGradescope && courseExternalId && assignment.externalId ? (
                  <>
                    <a 
                          href={`https://gradescope.com/courses/${courseExternalId}/assignments/${assignment.externalId}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="action-button primary"
                    >
                      <span className="action-icon">🔗</span>
                      View on Gradescope
                    </a>
                    <Link
                          to={`/assignments/pdf/${courseExternalId}/${assignment.externalId}?source=gradescope`}
                          className="action-button secondary"
                    >
                      <span className="action-icon">📄</span>
                      View PDF
                    </Link>
                  </>
                    ) : assignment.fileUrl ? (
                      <a 
                        href={assignment.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="action-button primary"
                      >
                        <span className="action-icon">📄</span>
                        View Assignment File
                      </a>
                    ) : assignment.url ? (
                       <a 
                        href={assignment.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="action-button primary"
                  >
                        <span className="action-icon">🔗</span>
                    View Details
                      </a>
                    ) : (
                      <span className="no-action">No actions available</span>
                )}
              </div>
            </div>
              );
            })
          ) : (
            renderNoAssignments()
          )}
        </div>
      )}
    </div>
  );
}

export default Assignments; 