import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { getAssignmentsForCourse, getCourses, getAllAssignments } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

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

  if (loading && courses.length === 0) {
    return (
      <div className="assignments p-6">
        <h1 className="text-2xl font-bold mb-6">Assignments</h1>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
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
          className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded inline-block"
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
        <label htmlFor="course-filter" className="block text-sm font-medium text-gray-700 mb-1">
          Filter by Course:
        </label>
        <select
          id="course-filter"
          value={selectedCourseId || ''}
          onChange={(e) => setSelectedCourseId(e.target.value || null)}
          className="block w-full max-w-md px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
        <div className="bg-gray-100 rounded-lg p-6 text-center">
          <p className="text-gray-600 mb-4">You don't have any courses yet.</p>
          <Link 
            to="/connect" 
            className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded inline-block"
          >
            Import from Gradescope
          </Link>
        </div>
      )}

      {/* No assignments message */}
      {courses.length > 0 && assignments.length === 0 && !loading && (
        <div className="bg-gray-100 rounded-lg p-6">
          <p className="text-gray-600">No assignments found.</p>
        </div>
      )}

      {/* Loading assignments indicator */}
      {loading && courses.length > 0 && (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Assignments list */}
      {!loading && assignments.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {assignments.map(assignment => (
            <div 
              key={assignment.id} 
              className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200 p-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">{assignment.title}</h2>
                  <p className="text-sm text-gray-500">
                    {getCourseName(assignment.courseId)}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-2 py-1 text-xs rounded ${
                    assignment.status === 'completed' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {assignment.status === 'completed' ? 'Completed' : 'Pending'}
                  </span>
                  {assignment.source === 'gradescope' && (
                    <span className="block mt-1 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                      Gradescope
                    </span>
                  )}
                </div>
              </div>
              
              <div className="mt-3">
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Due:</span> {formatDueDate(assignment.dueDate)}
                </p>
                {assignment.description && (
                  <p className="text-sm text-gray-500 mt-2">
                    {assignment.description}
                  </p>
                )}
              </div>
              
              <div className="mt-4 flex justify-end space-x-2">
                {assignment.source === 'gradescope' && (
                  <a 
                    href={`https://www.gradescope.com/courses/${assignment.externalId}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-700 text-sm"
                  >
                    View on Gradescope
                  </a>
                )}
                <Link 
                  to={`/assignments/${assignment.id}`}
                  className="text-blue-500 hover:text-blue-700 text-sm"
                >
                  Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Assignments; 