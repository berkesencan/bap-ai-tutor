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
        <h1>Dashboard</h1>
        
        {currentUser && (
          <div className="welcome-card">
            <h2>Welcome, {firstName}!</h2>
            <p>Ready to enhance your learning experience today?</p>
          </div>
        )}
      </div>
      
      {loading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading your dashboard...</p>
        </div>
      ) : error ? (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="retry-button">
            Retry
          </button>
        </div>
      ) : (
        <div className="dashboard-content">
          <div className="dashboard-section">
            <h2>Upcoming Assignments</h2>
            {upcomingAssignments.length === 0 ? (
              <p className="empty-state">No assignments due soon.</p>
            ) : (
              <ul className="assignment-list">
                {upcomingAssignments.map(assignment => (
                  <li key={assignment.id} className="assignment-item">
                    <div className="assignment-details">
                      <h3>{assignment.title}</h3>
                      <p className="course-name">{getCourseName(assignment.courseId)}</p>
                      <p className="due-date">Due: {formatDate(assignment.dueDate)}</p>
                    </div>
                    <div className="assignment-actions">
                      {assignment.source === 'gradescope' ? (
                        <a 
                          href={`https://www.gradescope.com/courses/${getCourseExternalId(assignment.courseId)}/assignments/${assignment.externalId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="view-assignment"
                        >
                          View on Gradescope
                        </a>
                      ) : (
                        <Link to={`/assignments/${assignment.id}`} className="view-assignment">
                          View Details
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <Link to="/assignments" className="dashboard-link">View All Assignments</Link>
          </div>
          
          <div className="dashboard-section">
            <h2>Your Courses</h2>
            {courses.length === 0 ? (
              <p className="empty-state">No courses added yet.</p>
            ) : (
              <ul className="course-list">
                {courses.slice(0, 5).map(course => (
                  <li key={course.id} className="course-item">
                    <h3>{course.name}</h3>
                    <p className="course-code">{course.code}</p>
                    {course.source === 'gradescope' && course.externalId ? (
                      <a 
                        href={`https://www.gradescope.com/courses/${course.externalId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="view-course"
                      >
                        View on Gradescope
                      </a>
                    ) : (
                      <Link to={`/courses/${course.id}`} className="view-course">
                        View Details
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <Link to="/courses" className="dashboard-link">View All Courses</Link>
          </div>
          
          <div className="dashboard-section">
            <h2>Recent Activity</h2>
            {pastAssignments.length === 0 ? (
              <p className="empty-state">No recent activity.</p>
            ) : (
              <ul className="assignment-list">
                {pastAssignments.map(assignment => (
                  <li key={assignment.id} className="assignment-item">
                    <div className="assignment-details">
                      <h3>{assignment.title}</h3>
                      <p className="course-name">{getCourseName(assignment.courseId)}</p>
                      <p className="due-date">Due: {formatDate(assignment.dueDate)}</p>
                      <span className={`status-badge ${assignment.status === 'completed' ? 'completed' : 'overdue'}`}>
                        {assignment.status === 'completed' ? 'Completed' : 'Overdue'}
                      </span>
                    </div>
                    <div className="assignment-actions">
                      {assignment.source === 'gradescope' ? (
                        <a 
                          href={`https://www.gradescope.com/courses/${getCourseExternalId(assignment.courseId)}/assignments/${assignment.externalId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="view-assignment"
                        >
                          View on Gradescope
                        </a>
                      ) : (
                        <Link to={`/assignments/${assignment.id}`} className="view-assignment">
                          View Details
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <Link to="/assignments" className="dashboard-link">View All Assignments</Link>
          </div>
        </div>
      )}
    </div>
  );
}; 