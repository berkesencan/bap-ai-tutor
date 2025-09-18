import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGradescope } from '../contexts/GradescopeContext';
import { 
  gradescopeLogin, 
  getGradescopeCourses, 
  getGradescopeAssignments,
  manageGradescopeImports,
  getCourses
} from '../services/api';
import './Connect.css';

const Connect = () => {
  const { currentUser } = useAuth();
  const { isAuthenticated, needsReauth, loading: authLoading, markAuthenticated, checkAuthStatus } = useGradescope();
  const [gradescopeEmail, setGradescopeEmail] = useState('');
  const [gradescopePassword, setGradescopePassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [courses, setCourses] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState({});
  const [assignments, setAssignments] = useState({});
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [importedCourses, setImportedCourses] = useState([]);
  const [isManaging, setIsManaging] = useState(false);

  // Check if we should show the connect form vs manage mode
  const shouldShowConnectForm = !currentUser || needsReauth || !isAuthenticated;
  const isManageMode = isAuthenticated && !needsReauth && currentUser;

  // Load courses and imported courses if already authenticated
  useEffect(() => {
    const loadData = async () => {
      if (isManageMode && courses.length === 0) {
        try {
          // Load Gradescope courses
          const coursesResponse = await getGradescopeCourses();
          
          if (coursesResponse.success) {
            const courseList = Array.isArray(coursesResponse.data) ? coursesResponse.data : Object.values(coursesResponse.data);
            setCourses(courseList);
            
            // Load currently imported courses
            const importedResponse = await getCourses();
            if (importedResponse.success) {
              const imported = importedResponse.data.courses.filter(course => 
                course.source === 'gradescope' || course.platform === 'gradescope'
              );
              setImportedCourses(imported);
              
              // Set initial selection state based on imported courses
              const initialSelectedCourses = {};
              courseList.forEach(course => {
                const isImported = imported.some(importedCourse => {
                  // Convert both to strings for comparison to handle type mismatches
                  return String(importedCourse.externalId) === String(course.id);
                });
                initialSelectedCourses[course.id] = isImported;
              });
              setSelectedCourses(initialSelectedCourses);
            }
          }
        } catch (error) {
          console.error('Error loading data:', error);
          setError('Failed to load course data');
        }
      }
    };

    loadData();
  }, [isManageMode, courses.length]);

  const handleConnect = async () => {
    if (!gradescopeEmail || !gradescopePassword) {
      setError('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      console.log('Attempting to connect to Gradescope...');
      
      const response = await gradescopeLogin({
        email: gradescopeEmail,
        password: gradescopePassword
      });

      console.log('Login response:', response);

      // Clear password from memory immediately after use for security
      setGradescopePassword('');

      if (response.success) {
        console.log('Successfully connected to Gradescope');
        markAuthenticated();
        
        // Load courses after successful login
        const coursesResponse = await getGradescopeCourses();
        
        if (coursesResponse.success) {
          const courseList = Array.isArray(coursesResponse.data) ? coursesResponse.data : Object.values(coursesResponse.data);
          setCourses(courseList);
          
          // Initialize selected courses state
          const initialSelectedCourses = {};
          courseList.forEach(course => {
            initialSelectedCourses[course.id] = false;
          });
          setSelectedCourses(initialSelectedCourses);
        }
      } else {
        setError(response.error || 'Failed to connect to Gradescope');
      }
    } catch (error) {
      console.error('Error connecting to Gradescope:', error);
      
      // Clear password from memory even on error for security
      setGradescopePassword('');
      
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

  // Import selected courses and assignments (for initial import)
  const handleImport = async () => {
    setImporting(true);
    setError('');
    
    try {
      // Get selected course IDs
      const selectedCourseIds = Object.keys(selectedCourses).filter(courseId => selectedCourses[courseId]);
      
      // Get assignments for selected courses
      const assignmentsToImport = {};
      for (const courseId of selectedCourseIds) {
        if (!assignments[courseId]) {
          // Fetch assignments if not already loaded
          try {
            const response = await getGradescopeAssignments(courseId);
            if (response.success) {
              assignmentsToImport[courseId] = response.data;
            }
          } catch (error) {
            console.error(`Failed to fetch assignments for course ${courseId}:`, error);
          }
        } else {
          assignmentsToImport[courseId] = assignments[courseId];
        }
      }
      
      // Use manageGradescopeImports for all imports (including initial)
      const importResponse = await manageGradescopeImports({
        selectedCourseIds,
        gradescopeCourses: courses,
        assignments: assignmentsToImport
      });
      
      console.log('Import response:', importResponse);
      
      if (importResponse.success) {
        setImportSuccess(true);
        
        // Refresh imported courses after successful import
        const importedResponse = await getCourses();
        if (importedResponse.success) {
          const imported = importedResponse.data.courses.filter(course => course.source === 'gradescope');
          setImportedCourses(imported);
          
          // Update selection state based on newly imported courses
          const updatedSelectedCourses = {};
          courses.forEach(course => {
            const isImported = imported.some(importedCourse => String(importedCourse.externalId) === String(course.id));
            updatedSelectedCourses[course.id] = isImported;
          });
          setSelectedCourses(updatedSelectedCourses);
        }
      } else {
        throw new Error(importResponse.error || 'Failed to import data');
      }
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

  // Save changes in manage mode
  const handleSaveChanges = async () => {
    setIsManaging(true);
    setError('');
    
    try {
      // Get selected course IDs
      const selectedCourseIds = Object.keys(selectedCourses).filter(courseId => selectedCourses[courseId]);
      
      // Get assignments for selected courses
      const assignmentsToImport = {};
      for (const courseId of selectedCourseIds) {
        if (!assignments[courseId]) {
          // Fetch assignments if not already loaded
          try {
            const response = await getGradescopeAssignments(courseId);
            if (response.success) {
              assignmentsToImport[courseId] = response.data;
            }
          } catch (error) {
            console.error(`Failed to fetch assignments for course ${courseId}:`, error);
          }
        } else {
          assignmentsToImport[courseId] = assignments[courseId];
        }
      }
      
      // Manage imports
      const manageResponse = await manageGradescopeImports({
        selectedCourseIds,
        gradescopeCourses: courses,
        assignments: assignmentsToImport
      });
      
      console.log('Manage response:', manageResponse);
      
      if (manageResponse.success) {
        setImportSuccess(true);
        
        // Refresh imported courses and update selection state
        const importedResponse = await getCourses();
        if (importedResponse.success) {
          const imported = importedResponse.data.courses.filter(course => course.source === 'gradescope');
          setImportedCourses(imported);
          
          // Update selection state based on newly imported courses
          const updatedSelectedCourses = {};
          courses.forEach(course => {
            const isImported = imported.some(importedCourse => String(importedCourse.externalId) === String(course.id));
            updatedSelectedCourses[course.id] = isImported;
          });
          setSelectedCourses(updatedSelectedCourses);
        }
      } else {
        throw new Error(manageResponse.error || 'Failed to save changes');
      }
    } catch (error) {
      console.error('Error saving changes:', error);
      
      if (error.response?.data) {
        setError(error.response.data.error || error.response.data.message || 'Failed to save changes');
      } else {
        setError(error.message || 'Failed to save changes');
      }
    } finally {
      setIsManaging(false);
    }
  };

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6">Connect to Gradescope</h1>
        <div className="flex justify-center items-center h-32">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="connect-page">
      <div className="connect-container">
        <div className="connect-header">
          <h1 className="connect-title">
            {isManageMode ? (
              <>
                <span className="title-icon">⚙️</span>
                Manage Gradescope Courses
              </>
            ) : (
              <>
                <span className="title-icon">🔗</span>
                Connect to Gradescope
              </>
            )}
          </h1>
          <p className="connect-subtitle">
            {isManageMode 
              ? 'Manage your imported courses and assignments with ease'
              : 'Connect your Gradescope account to import courses and assignments'
            }
          </p>
        </div>
        
        {error && (
          <div className="alert alert-error">
            <div className="alert-icon">⚠️</div>
            <div className="alert-content">
              <strong>Error</strong>
              <p>{error}</p>
            </div>
          </div>
        )}

        {importSuccess && (
          <div className="alert alert-success">
            <div className="alert-icon">✅</div>
            <div className="alert-content">
              <strong>Success!</strong>
              <p>{isManageMode ? 'Changes saved successfully!' : 'Courses and assignments imported successfully!'}</p>
            </div>
          </div>
        )}

        {/* Connect Form (when not authenticated) */}
        {shouldShowConnectForm && (
          <div className="connect-form-card">
            <div className="card-header">
              <h2 className="card-title">
                <span className="card-icon">🎓</span>
                {needsReauth ? 'Reconnect Your Account' : 'Connect Your Account'}
              </h2>
              <p className="card-subtitle">
                {needsReauth 
                  ? 'Your session has expired. Please reconnect to continue.'
                  : 'Enter your Gradescope credentials to get started.'
                }
              </p>
            </div>
            
            <div className="form-group">
              <label className="form-label" htmlFor="email">
                <span className="label-icon">📧</span>
                Gradescope Email
              </label>
              <input
                className="form-input"
                id="email"
                type="email"
                placeholder="Enter your Gradescope email"
                value={gradescopeEmail}
                onChange={(e) => setGradescopeEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            
            <div className="form-group">
              <label className="form-label" htmlFor="password">
                <span className="label-icon">🔒</span>
                Gradescope Password
              </label>
              <input
                className="form-input"
                id="password"
                type="password"
                placeholder="Enter your Gradescope password"
                value={gradescopePassword}
                onChange={(e) => setGradescopePassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            
            <button
              className={`btn-primary ${isLoading ? 'loading' : ''}`}
              onClick={handleConnect}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="loading-spinner"></span>
                  Connecting...
                </>
              ) : (
                <>
                  <span className="btn-icon">🚀</span>
                  Connect to Gradescope
                </>
              )}
            </button>
          </div>
        )}

        {/* Course Management (when authenticated) */}
        {isManageMode && courses.length > 0 && (
          <div className="manage-courses-card">
            <div className="card-header">
              <h2 className="card-title">
                <span className="card-icon">📚</span>
                Course Management
              </h2>
              <p className="card-subtitle">
                Select courses to import or remove. Changes are applied when you save.
              </p>
            </div>
            
            <div className="courses-grid">
              {courses.map(course => {
                const isImported = importedCourses.some(imported => imported.externalId === course.id);
                const isSelected = selectedCourses[course.id] || false;
                
                return (
                  <div 
                    key={course.id} 
                    className={`course-card ${isSelected ? 'selected' : ''} ${isImported ? 'imported' : ''}`}
                  >
                    <div className="course-card-header">
                      <input
                        type="checkbox"
                        id={`course-${course.id}`}
                        checked={isSelected}
                        onChange={() => toggleCourseSelection(course.id)}
                        className="course-checkbox"
                        disabled={isManaging}
                      />
                      <label htmlFor={`course-${course.id}`} className="course-checkbox-label">
                        <div className="course-info">
                          <h3 className="course-title">{course.code}</h3>
                          <p className="course-name">{course.name}</p>
                        </div>
                      </label>
                    </div>
                    
                    <div className="course-card-body">
                      <div className="course-meta">
                        <span className="course-term">
                          <span className="meta-icon">📅</span>
                          {course.term}
                        </span>
                        <span className="course-assignments">
                          <span className="meta-icon">📋</span>
                          {course.assignmentCount} assignment{course.assignmentCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                      
                      {isImported && (
                        <div className="import-status">
                          <span className="status-badge imported">
                            <span className="status-icon">✓</span>
                            Currently Imported
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="manage-actions">
              <div className="selection-summary">
                <span className="summary-icon">📊</span>
                <span className="summary-text">
                  {Object.values(selectedCourses).filter(Boolean).length} course{Object.values(selectedCourses).filter(Boolean).length !== 1 ? 's' : ''} selected
                </span>
              </div>
              
              <button
                className={`btn-save ${isManaging ? 'loading' : ''}`}
                onClick={handleSaveChanges}
                disabled={isManaging}
              >
                {isManaging ? (
                  <>
                    <span className="loading-spinner"></span>
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <span className="btn-icon">💾</span>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Course Selection (for initial import) */}
        {!shouldShowConnectForm && !isManageMode && courses.length > 0 && (
          <div className="import-courses-card">
            <div className="card-header">
              <h2 className="card-title">
                <span className="card-icon">📥</span>
                Import Courses
              </h2>
              <p className="card-subtitle">
                Select the courses you want to import from your Gradescope account.
              </p>
            </div>
            
            <div className="courses-grid">
              {courses.map(course => (
                <div 
                  key={course.id} 
                  className={`course-card ${selectedCourses[course.id] ? 'selected' : ''}`}
                >
                  <div className="course-card-header">
                    <input
                      type="checkbox"
                      id={`course-${course.id}`}
                      checked={selectedCourses[course.id] || false}
                      onChange={() => toggleCourseSelection(course.id)}
                      className="course-checkbox"
                      disabled={importing}
                    />
                    <label htmlFor={`course-${course.id}`} className="course-checkbox-label">
                      <div className="course-info">
                        <h3 className="course-title">{course.code}</h3>
                        <p className="course-name">{course.name}</p>
                      </div>
                    </label>
                  </div>
                  
                  <div className="course-card-body">
                    <div className="course-meta">
                      <span className="course-term">
                        <span className="meta-icon">📅</span>
                        {course.term}
                      </span>
                      <span className="course-assignments">
                        <span className="meta-icon">📋</span>
                        {course.assignmentCount} assignment{course.assignmentCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="import-actions">
              <div className="selection-summary">
                <span className="summary-icon">📊</span>
                <span className="summary-text">
                  {Object.values(selectedCourses).filter(Boolean).length} course{Object.values(selectedCourses).filter(Boolean).length !== 1 ? 's' : ''} selected
                </span>
              </div>
              
              <button
                className={`btn-import ${importing ? 'loading' : ''}`}
                onClick={handleImport}
                disabled={importing || Object.values(selectedCourses).filter(Boolean).length === 0}
              >
                {importing ? (
                  <>
                    <span className="loading-spinner"></span>
                    Importing...
                  </>
                ) : (
                  <>
                    <span className="btn-icon">📥</span>
                    Import Selected Courses
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* No courses message */}
        {isManageMode && courses.length === 0 && (
          <div className="empty-state-card">
            <div className="empty-state-icon">📚</div>
            <h3 className="empty-state-title">No Courses Found</h3>
            <p className="empty-state-message">
              No courses were found in your Gradescope account. Make sure you're enrolled in courses and try refreshing.
            </p>
            <button
              className="btn-secondary"
              onClick={() => window.location.reload()}
            >
              <span className="btn-icon">🔄</span>
              Refresh
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Connect; 