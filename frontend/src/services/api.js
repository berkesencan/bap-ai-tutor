import axios from 'axios';
import { auth } from '../config/firebase'; // Fixed import path

// Use the backend URL from environment variables or default
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Create a separate client for unauthenticated test requests
const testApiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add the auth token to requests
apiClient.interceptors.request.use(
  async (config) => {
    const user = auth.currentUser;
    if (user) {
      try {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      } catch (error) {
        console.error('Error getting ID token:', error);
        // Handle error, maybe redirect to login
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Global callback for handling Gradescope auth errors
let gradescopeAuthErrorCallback = null;

export const setGradescopeAuthErrorCallback = (callback) => {
  gradescopeAuthErrorCallback = callback;
};

// Function to handle API errors more gracefully
const handleApiError = (error) => {
  console.error('API Error:', error);
  
  // Check for Gradescope authentication errors
  if (error.response?.status === 401 && error.response?.data?.needsReauth) {
    console.log('Gradescope authentication error detected');
    if (gradescopeAuthErrorCallback) {
      gradescopeAuthErrorCallback();
    }
  }
  
  if (error.response) {
    // Request made and server responded
    console.error('Data:', error.response.data);
    console.error('Status:', error.response.status);
    console.error('Headers:', error.response.headers);
    // Return a user-friendly error message or object
    return { 
      success: false, 
      error: error.response.data?.error || 'Server error occurred', 
      status: error.response.status,
      needsReauth: error.response.data?.needsReauth || false
    };
  } else if (error.request) {
    // Request was made but no response was received
    console.error('Request:', error.request);
    return { success: false, error: 'Network error - please check your connection', status: 0 };
  } else {
    // Something happened in setting up the request
    console.error('Error Message:', error.message);
    return { success: false, error: error.message || 'An unexpected error occurred', status: 0 };
  }
};

// Test Gemini 1.5 Flash API (no authentication required)
export const testGemini = async (prompt) => {
  try {
    console.log('Calling test-gemini API with prompt:', prompt);
    console.log('API URL:', `${API_BASE_URL}/test-ai/test-gemini`);
    const response = await testApiClient.post('/test-ai/test-gemini', { prompt });
    console.log('Test API response:', response.data);
    return response.data; // { success: true, data: { response: '...', model: '...' } }
  } catch (error) {
    console.error('Test API error details:', error);
    return handleApiError(error);
  }
};

// --- API Call Functions ---

// AI Endpoints
export const generateStudyPlan = async (data) => {
  try {
    const response = await apiClient.post('/ai/study-plan', data);
    return response.data; // { success: true, data: { studyPlan: '...' } }
  } catch (error) {
    return handleApiError(error);
  }
};

export const explainConcept = async (data) => {
  try {
    const response = await apiClient.post('/ai/explain', data);
    return response.data; // { success: true, data: { explanation: '...' } }
  } catch (error) {
    return handleApiError(error);
  }
};

export const generatePracticeQuestions = async (data) => {
  try {
    const response = await apiClient.post('/ai/practice-questions', data);
    return response.data; // { success: true, data: { questions: '...' } }
  } catch (error) {
    return handleApiError(error);
  }
};

export const postChatMessage = async (data) => {
  // data should contain { history: [], message: "user's message" }
  try {
    const response = await apiClient.post('/ai/chat', data);
    return response.data; // { success: true, data: { response: "ai's response" } }
  } catch (error) {
    return handleApiError(error);
  }
};

// Add other API call functions as needed (e.g., for courses, assignments, schedule)

// Example for Courses
export const getCourses = async () => {
  try {
    const response = await apiClient.get('/courses');
    return response.data; // { success: true, data: { courses: [...] } }
  } catch (error) {
    return handleApiError(error);
  }
};

export const createCourse = async (courseData) => {
  try {
    const response = await apiClient.post('/courses', courseData);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// Example for Assignments (assuming course material upload relates to assignments)
export const getAssignmentsForCourse = async (courseId) => {
  try {
    // Note: Route based on backend/routes/assignment.routes.js
    const response = await apiClient.get(`/assignments/course/${courseId}`); 
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getAllAssignments = async () => {
  try {
    const response = await apiClient.get('/assignments');
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getUpcomingAssignments = async (limit = 5) => {
  try {
    const response = await apiClient.get(`/assignments/upcoming?limit=${limit}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getPastAssignments = async (limit = 5) => {
  try {
    const response = await apiClient.get(`/assignments/past?limit=${limit}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const createAssignment = async (courseId, assignmentData) => {
  try {
    // Note: Route based on backend/routes/assignment.routes.js
    const response = await apiClient.post(`/assignments/course/${courseId}`, assignmentData);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// Add functions for schedule, study sessions, user profile etc.

// Gradescope Endpoints
export const gradescopeLogin = async (credentials) => {
  try {
    const response = await apiClient.post('/gradescope/login', credentials);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getGradescopeCourses = async () => {
  try {
    const response = await apiClient.get('/gradescope/courses');
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getGradescopeAssignments = async (courseId) => {
  try {
    const response = await apiClient.get(`/gradescope/courses/${courseId}/assignments`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const importGradescopeData = async (data) => {
  try {
    const response = await apiClient.post('/courses/import', data);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const manageGradescopeImports = async (data) => {
  try {
    const response = await apiClient.post('/courses/manage-gradescope', data);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// Fetch Gradescope Assignment PDF
export const getGradescopeAssignmentPDF = async (courseId, assignmentId) => {
  try {
    const response = await apiClient.get(`/gradescope/assignments/${courseId}/${assignmentId}/pdf`, {
      responseType: 'blob', // Important for PDF
    });
    return response.data; // Blob
  } catch (error) {
    return handleApiError(error);
  }
};

// Upload and process a PDF file with message and real-time progress
export const processPDFWithMessage = async (file, message = '', onProgress) => {
  try {
    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('message', message);
    
    // Get the auth token
    const user = auth.currentUser;
    let authHeaders = {};
    if (user) {
      try {
        const token = await user.getIdToken();
        authHeaders.Authorization = `Bearer ${token}`;
      } catch (error) {
        console.error('Error getting ID token:', error);
        throw new Error('Authentication failed');
      }
    }

    return new Promise((resolve, reject) => {
      // Use fetch with proper auth headers for Server-Sent Events
      fetch(`${API_BASE_URL}/ai/process-pdf-with-message`, {
        method: 'POST',
        body: formData,
        headers: {
          ...authHeaders
        }
      }).then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        function readStream() {
          return reader.read().then(({ done, value }) => {
            if (done) {
              return;
            }
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            lines.forEach(line => {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  
                  switch (data.type) {
                    case 'progress':
                      if (onProgress) {
                        onProgress(data.progress, data.message);
                      }
                      break;
                      
                    case 'complete':
                      if (onProgress) {
                        onProgress(data.progress, 'Complete!');
                      }
                      resolve({
                        success: true,
                        data: data.data,
                        userMessage: data.userMessage,
                        fileName: data.fileName
                      });
                      return;
                      
                    case 'error':
                      reject(new Error(data.error));
                      return;
                  }
                } catch (error) {
                  console.warn('Error parsing SSE data:', error);
                }
              }
            });
            
            return readStream();
          });
        }
        
        return readStream();
      }).catch(reject);
    });
    
  } catch (error) {
    return handleApiError(error);
  }
};

// Upload and process a PDF file
export const processPDF = async (file, prompt = 'Please analyze this PDF and provide a summary of its contents.') => {
  try {
    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('prompt', prompt);
    const response = await apiClient.post('/ai/process-pdf', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// Check Gradescope authentication status
export const checkGradescopeAuthStatus = async () => {
  try {
    const response = await apiClient.get('/gradescope/auth/status');
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// Calendar API Functions
export const getCalendarData = async (startDate, endDate) => {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const response = await apiClient.get(`/schedules/calendar?${params}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getCalendarEvents = async (startDate, endDate) => {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const response = await apiClient.get(`/schedules/events?${params}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const createCalendarEvent = async (eventData) => {
  try {
    const response = await apiClient.post('/schedules/events', eventData);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const updateCalendarEvent = async (eventId, eventData) => {
  try {
    const response = await apiClient.put(`/schedules/events/${eventId}`, eventData);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const deleteCalendarEvent = async (eventId) => {
  try {
    const response = await apiClient.delete(`/schedules/events/${eventId}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const importICSCalendar = async (icsData) => {
  try {
    const response = await apiClient.post('/schedules/import/ics', { icsData });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// Schedule API Functions (existing functionality)
export const getSchedules = async () => {
  try {
    const response = await apiClient.get('/schedules');
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const createSchedule = async (scheduleData) => {
  try {
    const response = await apiClient.post('/schedules', scheduleData);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const updateSchedule = async (scheduleId, scheduleData) => {
  try {
    const response = await apiClient.put(`/schedules/${scheduleId}`, scheduleData);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const deleteSchedule = async (scheduleId) => {
  try {
    const response = await apiClient.delete(`/schedules/${scheduleId}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export default apiClient; 