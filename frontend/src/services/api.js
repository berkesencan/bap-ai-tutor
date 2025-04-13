import axios from 'axios';
import { auth } from '../config/firebase'; // Fixed import path

// Use the backend URL from environment variables or default
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const apiClient = axios.create({
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

export default apiClient; 