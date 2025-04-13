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
      <div className="assignments p-6">
        <h1 className="text-2xl font-bold mb-6">Assignments</h1>
        <div className="flex justify-center items-center h-64">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="assignments p-6">
        <h1 className="text-2xl font-bold mb-6">Assignments</h1>
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p>{error}</p>
        </div>
        <Link 
          to="/connect" 
          className="import-button"
        >
          Import from Gradescope
        </Link>
      </div>
    );
  }

  return (
    <div className="assignments p-6">
      <h1 className="text-2xl font-bold mb-6">Assignments</h1>
      
      {/* Course filter */}
      <div className="mb-6">
        <label htmlFor="course-filter" className="filter-label">
          Filter by Course:
        </label>
        <select
          id="course-filter"
          value={selectedCourseId || ''}
          onChange={(e) => setSelectedCourseId(e.target.value || null)}
          className="filter-select"
        >
          <option value="">All Courses</option>
          {courses.map(course => (
            <option key={course.id} value={course.id}>
              {course.code}: {course.name}
            </option>
          ))}
        </select>
      </div>

      {/* No courses message */}
      {courses.length === 0 && (
        <div className="empty-state">
          <p>You don't have any courses yet.</p>
          <Link 
            to="/connect" 
            className="import-button"
          >
            Import from Gradescope
          </Link>
        </div>
      )}

      {/* No assignments message */}
      {courses.length > 0 && assignments.length === 0 && !loading && (
        <div className="empty-state">
          <p>No assignments found.</p>
        </div>
      )}

      {/* Loading assignments indicator */}
      {loading && courses.length > 0 && (
        <div className="flex justify-center items-center h-32">
          <div className="spinner"></div>
        </div>
      )}

      {/* Assignments list */}
      {!loading && assignments.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {assignments.map(assignment => (
            <div 
              key={assignment.id} 
              className="assignment-card"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="assignment-title">{assignment.title}</h2>
                  <p className="assignment-course">
                    {getCourseName(assignment.courseId)}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`status-badge ${
                    assignment.status === 'completed' 
                      ? 'completed' 
                      : 'pending'
                  }`}>
                    {assignment.status === 'completed' ? 'Completed' : 'Pending'}
                  </span>
                  {assignment.source === 'gradescope' && (
                    <span className="source-badge">
                      Gradescope
                    </span>
                  )}
                </div>
              </div>
              
              <div className="mt-3">
                <p className="assignment-due">
                  <span className="assignment-due-label">Due:</span> {formatDueDate(assignment.dueDate)}
                </p>
                {assignment.description && (
                  <p className="assignment-description">
                    {assignment.description}
                  </p>
                )}
              </div>
              
              <div className="mt-4 flex justify-end space-x-4">
                {assignment.source === 'gradescope' && assignment.externalId && getCourseExternalId(assignment.courseId) ? (
                  <a 
                    href={`https://www.gradescope.com/courses/${getCourseExternalId(assignment.courseId)}/assignments/${assignment.externalId}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="action-link"
                  >
                    View on Gradescope
                  </a>
                ) : (
                  <Link 
                    to={`/assignments/${assignment.id}`}
                    className="action-link"
                  >
                    Details
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