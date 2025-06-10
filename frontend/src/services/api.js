import axios from 'axios';
import { auth } from '../config/firebase'; // Fixed import path

// Use the backend URL from environment variables or default
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

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

// Function to handle API errors more gracefully
const handleApiError = (error) => {
  console.error('API Error:', error);
  if (error.response) {
    // Request made and server responded
    console.error('Data:', error.response.data);
    console.error('Status:', error.response.status);
    console.error('Headers:', error.response.headers);
    // Return a user-friendly error message or object
    return { 
      success: false, 
      message: error.response.data?.message || 'An error occurred on the server.', 
      status: error.response.status 
    };
  } else if (error.request) {
    // Request was made but no response was received
    console.error('Request:', error.request);
    return { success: false, message: 'No response from server. Check network connection.' };
  } else {
    // Something happened in setting up the request
    console.error('Error Message:', error.message);
    return { success: false, message: error.message };
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

export default apiClient; 