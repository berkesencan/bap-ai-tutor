import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCourses } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './Courses.css';

function Courses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();

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
      </div>
      
      {courses.length === 0 ? (
        <div className="empty-state-card">
          <div className="empty-state-icon">🎓</div>
          <h3 className="empty-state-title">No Courses Found</h3>
          <p className="empty-state-message">
            You don't have any courses yet. Import some courses from Gradescope to get started with your academic journey!
          </p>
          <Link 
            to="/connect" 
            className="import-button"
          >
            <span className="action-icon">📥</span>
            Import Courses from Gradescope
          </Link>
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
                <div className="stat-icon">📅</div>
                <div className="stat-content">
                  <div className="stat-number">{new Set(courses.map(c => c.term).filter(Boolean)).size}</div>
                  <div className="stat-label">Terms</div>
                </div>
              </div>
            </div>
          </div>

          <div className="courses-grid">
            {courses.map(course => (
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
                    {course.source === 'gradescope' && (
                      <span className="source-badge">
                        <span className="badge-icon">🎓</span>
                        Gradescope
                      </span>
                    )}
                    {course.term && (
                      <span className="term-badge">
                        <span className="badge-icon">📅</span>
                        {course.term}
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
                      View on Gradescope
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
                  <Link 
                    to={`/courses/${course.id}`} 
                    className="action-button secondary"
                  >
                    <span className="action-icon">👁️</span>
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default Courses; 