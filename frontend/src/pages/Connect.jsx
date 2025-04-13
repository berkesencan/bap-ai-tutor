import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  gradescopeLogin, 
  getGradescopeCourses, 
  getGradescopeAssignments,
  importGradescopeData
} from '../services/api';

const Connect = () => {
  const { currentUser } = useAuth();
  const [gradescopeEmail, setGradescopeEmail] = useState('');
  const [gradescopePassword, setGradescopePassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState('');
  const [courses, setCourses] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState({});
  const [assignments, setAssignments] = useState({});
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  // Connect to Gradescope
  const handleConnect = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      console.log('Attempting to connect to Gradescope with email:', gradescopeEmail);
      
      // Login to Gradescope
      console.log('Proceeding to Gradescope login...');
      const loginResponse = await gradescopeLogin({
        email: gradescopeEmail,
        password: gradescopePassword
      });
      
      console.log('Login response:', loginResponse);
      
      if (!loginResponse.success) {
        throw new Error(loginResponse.error || loginResponse.message || 'Failed to connect to Gradescope');
      }
      
      // Fetch courses
      const coursesResponse = await getGradescopeCourses();
      
      console.log('Courses response:', coursesResponse);
      
      if (!coursesResponse.success) {
        throw new Error(coursesResponse.error || 'Failed to fetch courses');
      }
      
      setCourses(Array.isArray(coursesResponse.data) ? coursesResponse.data : Object.values(coursesResponse.data));
      setIsConnected(true);
      
      // Initialize selected courses state
      const initialSelectedCourses = {};
      const courseList = Array.isArray(coursesResponse.data) ? coursesResponse.data : Object.values(coursesResponse.data);
      
      courseList.forEach(course => {
        initialSelectedCourses[course.id] = false;
      });
      setSelectedCourses(initialSelectedCourses);
    } catch (error) {
      console.error('Error connecting to Gradescope:', error);
      
      if (error.response) {
        console.error('Error response:', error.response);
        console.error('Error details:', error.response.data);
        
        if (error.response.status === 403) {
          setError('Authentication required. Please make sure you are logged in and try again.');
        } else {
          setError(error.response.data?.error || error.response.data?.message || `Failed to connect to Gradescope: ${error.message}`);
        }
      } else {
        setError(error.message || 'Failed to connect to Gradescope');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle selection of a course
  const toggleCourseSelection = async (courseId) => {
    const updatedSelection = {
      ...selectedCourses,
      [courseId]: !selectedCourses[courseId]
    };
    
    setSelectedCourses(updatedSelection);
    
    // If selecting a course, fetch its assignments
    if (updatedSelection[courseId] && !assignments[courseId]) {
      try {
        const response = await getGradescopeAssignments(courseId);
        
        if (!response.success) {
          console.error('Failed to fetch assignments:', response.error);
          return;
        }
        
        setAssignments({
          ...assignments,
          [courseId]: response.data
        });
      } catch (error) {
        console.error('Failed to fetch assignments:', error);
      }
    }
  };

  // Import selected courses and assignments
  const handleImport = async () => {
    setImporting(true);
    setError('');
    
    try {
      // Get selected courses
      const coursesToImport = courses.filter(course => selectedCourses[course.id]);
      
      // Get assignments for selected courses
      const assignmentsToImport = {};
      for (const course of coursesToImport) {
        if (assignments[course.id]) {
          assignmentsToImport[course.id] = assignments[course.id];
        }
      }
      
      // Import data
      const importResponse = await importGradescopeData({
        courses: coursesToImport,
        assignments: assignmentsToImport
      });
      
      console.log('Import response:', importResponse);
      
      if (!importResponse.success && !importResponse.courses && !importResponse.message) {
        throw new Error(importResponse.error || 'Failed to import data');
      }
      
      setImportSuccess(true);
    } catch (error) {
      console.error('Error importing data:', error);
      
      if (error.response?.data) {
        setError(error.response.data.error || error.response.data.message || 'Failed to import data');
      } else {
        setError(error.message || 'Failed to import data');
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Connect to Gradescope</h1>
      
      {!currentUser ? (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6">
          <p>Please log in to connect your Gradescope account.</p>
        </div>
      ) : !isConnected ? (
        <div className="bg-white shadow-md rounded p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Connect Your Gradescope Account</h2>
          
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
              <p>{error}</p>
            </div>
          )}
          
          <form onSubmit={handleConnect}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                Gradescope Email
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                id="email"
                type="email"
                placeholder="Email"
                value={gradescopeEmail}
                onChange={(e) => setGradescopeEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                Gradescope Password
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                id="password"
                type="password"
                placeholder="Password"
                value={gradescopePassword}
                onChange={(e) => setGradescopePassword(e.target.value)}
                required
              />
            </div>
            
            <div className="flex items-center justify-between">
              <button
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div>
          {importSuccess ? (
            <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6">
              <p>Successfully imported your Gradescope data!</p>
              <button
                className="mt-4 bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                onClick={() => window.location.href = '/courses'}
              >
                View My Courses
              </button>
            </div>
          ) : (
            <>
              <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6">
                <p>Successfully connected to Gradescope! Select the courses you want to import.</p>
              </div>
              
              {error && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
                  <p>{error}</p>
                </div>
              )}
              
              <div className="bg-white shadow-md rounded p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">Select Courses to Import</h2>
                
                {courses.length === 0 ? (
                  <p>No courses found in your Gradescope account.</p>
                ) : (
                  <div className="space-y-4">
                    {courses.map(course => (
                      <div key={course.id} className="border-b pb-4">
                        <div className="flex items-center mb-2">
                          <input
                            type="checkbox"
                            id={`course-${course.id}`}
                            checked={selectedCourses[course.id] || false}
                            onChange={() => toggleCourseSelection(course.id)}
                            className="mr-2"
                          />
                          <label htmlFor={`course-${course.id}`} className="font-medium">
                            {course.code}: {course.name}
                          </label>
                        </div>
                        
                        {selectedCourses[course.id] && (
                          <div className="ml-6">
                            <h3 className="font-medium text-sm text-gray-600 mb-2">Assignments:</h3>
                            {assignments[course.id] ? (
                              assignments[course.id].length > 0 ? (
                                <ul className="list-disc ml-5">
                                  {assignments[course.id].map(assignment => (
                                    <li key={assignment.id}>{assignment.name}</li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-sm text-gray-500">No assignments found for this course.</p>
                              )
                            ) : (
                              <p className="text-sm text-gray-500">Loading assignments...</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    
                    <div className="mt-6">
                      <button
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                        onClick={handleImport}
                        disabled={importing || Object.values(selectedCourses).every(selected => !selected)}
                      >
                        {importing ? 'Importing...' : 'Import Selected Courses'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Connect; 