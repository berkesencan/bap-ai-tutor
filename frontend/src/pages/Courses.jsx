import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCourses } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

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
      <div className="courses p-6">
        <h1 className="text-2xl font-bold mb-6">My Courses</h1>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="courses p-6">
        <h1 className="text-2xl font-bold mb-6">My Courses</h1>
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p>{error}</p>
        </div>
        <Link 
          to="/connect" 
          className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded inline-block"
        >
          Import Courses from Gradescope
        </Link>
      </div>
    );
  }

  return (
    <div className="courses p-6">
      <h1 className="text-2xl font-bold mb-6">My Courses</h1>
      
      {courses.length === 0 ? (
        <div className="bg-gray-100 rounded-lg p-6 text-center">
          <p className="text-gray-600 mb-4">You don't have any courses yet.</p>
          <Link 
            to="/connect" 
            className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded inline-block"
          >
            Import Courses from Gradescope
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(course => (
            <div 
              key={course.id} 
              className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow"
            >
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800">{course.code}</h2>
                    <h3 className="text-lg text-gray-700 mb-2">{course.name}</h3>
                  </div>
                  {course.source === 'gradescope' && (
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">Gradescope</span>
                  )}
                </div>
                
                <p className="text-gray-600 text-sm mb-4">
                  {course.professor ? `Professor: ${course.professor}` : ''}
                </p>
                
                <p className="text-gray-500 text-sm mb-4">
                  {course.description || 'No description available'}
                </p>
                
                <div className="mt-4 flex justify-between">
                  <Link 
                    to={`/courses/${course.id}`} 
                    className="text-blue-500 hover:text-blue-700"
                  >
                    View Details
                  </Link>
                  <Link 
                    to={`/assignments?courseId=${course.id}`} 
                    className="text-blue-500 hover:text-blue-700"
                  >
                    View Assignments
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Courses; 