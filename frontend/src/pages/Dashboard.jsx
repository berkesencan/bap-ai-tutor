import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUpcomingAssignments, getPastAssignments, getCourses } from '../services/api';
import './Dashboard.css';

export const Dashboard = () => {
  const { currentUser } = useAuth();
  const [upcomingAssignments, setUpcomingAssignments] = useState([]);
  const [pastAssignments, setPastAssignments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Extract first name for a more personal greeting
  const firstName = currentUser?.displayName?.split(' ')[0] || 'there';

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!currentUser) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Fetch upcoming assignments
        const upcomingResponse = await getUpcomingAssignments(5);
        if (upcomingResponse.success && upcomingResponse.data) {
          setUpcomingAssignments(upcomingResponse.data.assignments || []);
        }
        
        // Fetch recent (past) assignments
        const pastResponse = await getPastAssignments(5);
        if (pastResponse.success && pastResponse.data) {
          setPastAssignments(pastResponse.data.assignments || []);
        }
        
        // Fetch courses
        const coursesResponse = await getCourses();
        if (coursesResponse.success && coursesResponse.data) {
          setCourses(coursesResponse.data.courses || []);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [currentUser]);

  // Format date for display
  const formatDate = (timestamp) => {
    if (!timestamp) return 'No date';
    
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Invalid date';
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Get course name from course ID
  const getCourseName = (courseId) => {
    const course = courses.find(c => c.id === courseId);
    return course ? course.name : 'Unknown Course';
  };

  // Get course external ID from course ID
  const getCourseExternalId = (courseId) => {
    const course = courses.find(c => c.id === courseId);
    return course && course.source === 'gradescope' ? course.externalId : null;
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">🏠 Dashboard</h1>
        
        {currentUser && (
          <div className="welcome-card">
            <div className="welcome-content">
              <h2 className="welcome-title">Welcome back, {firstName}! 👋</h2>
              <p className="welcome-subtitle">Ready to enhance your learning experience today?</p>
            </div>
            <div className="welcome-stats">
              <div className="quick-stat">
                <span className="quick-stat-number">{upcomingAssignments.length}</span>
                <span className="quick-stat-label">Upcoming</span>
              </div>
              <div className="quick-stat">
                <span className="quick-stat-number">{courses.length}</span>
                <span className="quick-stat-label">Courses</span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p className="loading-text">Loading your dashboard...</p>
        </div>
      ) : error ? (
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h3 className="error-title">Error Loading Dashboard</h3>
          <p className="error-message">{error}</p>
          <button onClick={() => window.location.reload()} className="retry-button">
            <span className="button-icon">🔄</span>
            Retry
          </button>
        </div>
      ) : (
        <div className="dashboard-content">
          <div className="dashboard-section">
            <div className="section-header">
              <h2 className="section-title">
                <span className="section-icon">⏰</span>
                Upcoming Assignments
              </h2>
              <span className="section-count">{upcomingAssignments.length} items</span>
            </div>
            
            {upcomingAssignments.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📝</div>
                <p className="empty-message">No assignments due soon. You're all caught up!</p>
              </div>
            ) : (
              <div className="assignment-list">
                {upcomingAssignments.map(assignment => (
                  <div key={assignment.id} className="assignment-card">
                    <div className="assignment-info">
                      <h3 className="assignment-title">{assignment.title}</h3>
                      <p className="assignment-course">
                        <span className="course-icon">📚</span>
                        {getCourseName(assignment.courseId)}
                      </p>
                      <p className="assignment-due">
                        <span className="due-icon">📅</span>
                        Due: {formatDate(assignment.dueDate)}
                      </p>
                    </div>
                    <div className="assignment-actions">
                      {assignment.source === 'gradescope' ? (
                        <a 
                          href={`https://www.gradescope.com/courses/${getCourseExternalId(assignment.courseId)}/assignments/${assignment.externalId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="action-button primary"
                        >
                          <span className="action-icon">🔗</span>
                          View on Gradescope
                        </a>
                      ) : (
                        <Link to={`/assignments/${assignment.id}`} className="action-button secondary">
                          <span className="action-icon">👁️</span>
                          View Details
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="section-footer">
              <Link to="/assignments" className="section-link">
                <span className="link-icon">📋</span>
                View All Assignments
              </Link>
            </div>
          </div>
          
          <div className="dashboard-section">
            <div className="section-header">
              <h2 className="section-title">
                <span className="section-icon">📚</span>
                Your Courses
              </h2>
              <span className="section-count">{courses.length} courses</span>
            </div>
            
            {courses.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🎓</div>
                <p className="empty-message">No courses added yet. Import some from Gradescope!</p>
                <Link to="/connect" className="empty-action">
                  <span className="action-icon">📥</span>
                  Import Courses
                </Link>
              </div>
            ) : (
              <div className="course-list">
                {courses.slice(0, 5).map(course => (
                  <div key={course.id} className="course-card">
                    <div className="course-info">
                      <h3 className="course-name">{course.name}</h3>
                      <p className="course-code">
                        <span className="code-icon">🏷️</span>
                        {course.code}
                      </p>
                      {course.source === 'gradescope' && (
                        <span className="course-badge">
                          <span className="badge-icon">🎓</span>
                          Gradescope
                        </span>
                      )}
                    </div>
                    <div className="course-actions">
                      {course.source === 'gradescope' && course.externalId ? (
                        <a 
                          href={`https://www.gradescope.com/courses/${course.externalId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="action-button primary"
                        >
                          <span className="action-icon">🔗</span>
                          View
                        </a>
                      ) : (
                        <Link to={`/courses/${course.id}`} className="action-button secondary">
                          <span className="action-icon">👁️</span>
                          View
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="section-footer">
              <Link to="/courses" className="section-link">
                <span className="link-icon">📚</span>
                View All Courses
              </Link>
            </div>
          </div>
          
          <div className="dashboard-section">
            <div className="section-header">
              <h2 className="section-title">
                <span className="section-icon">📈</span>
                Recent Activity
              </h2>
              <span className="section-count">{pastAssignments.length} items</span>
            </div>
            
            {pastAssignments.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📊</div>
                <p className="empty-message">No recent activity to show.</p>
              </div>
            ) : (
              <div className="assignment-list">
                {pastAssignments.map(assignment => (
                  <div key={assignment.id} className="assignment-card">
                    <div className="assignment-info">
                      <h3 className="assignment-title">{assignment.title}</h3>
                      <p className="assignment-course">
                        <span className="course-icon">📚</span>
                        {getCourseName(assignment.courseId)}
                      </p>
                      <p className="assignment-due">
                        <span className="due-icon">📅</span>
                        Due: {formatDate(assignment.dueDate)}
                      </p>
                      <span className={`status-badge ${assignment.status === 'completed' ? 'completed' : 'overdue'}`}>
                        {assignment.status === 'completed' ? '✅ Completed' : '⏰ Overdue'}
                      </span>
                    </div>
                    <div className="assignment-actions">
                      {assignment.source === 'gradescope' ? (
                        <a 
                          href={`https://www.gradescope.com/courses/${getCourseExternalId(assignment.courseId)}/assignments/${assignment.externalId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="action-button primary"
                        >
                          <span className="action-icon">🔗</span>
                          View on Gradescope
                        </a>
                      ) : (
                        <Link to={`/assignments/${assignment.id}`} className="action-button secondary">
                          <span className="action-icon">👁️</span>
                          View Details
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="section-footer">
              <Link to="/assignments" className="section-link">
                <span className="link-icon">📋</span>
                View All Assignments
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 