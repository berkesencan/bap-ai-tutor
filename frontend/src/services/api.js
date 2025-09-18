import axios from 'axios';
import { auth } from '../config/firebase'; // Fixed import path

// Frontend flags configuration
const FLAGS = {
  RAG_ENABLED: (import.meta.env.VITE_RAG_ENABLED ?? 'true') === 'true',
  DEV_NO_AUTH: (import.meta.env.VITE_DEV_NO_AUTH ?? 'true') === 'true',
  USE_EMBEDDINGS: (import.meta.env.VITE_USE_EMBEDDINGS ?? 'false') === 'true',
  USE_RERANK: (import.meta.env.VITE_USE_RERANK ?? 'false') === 'true',
};

// Use the backend URL from environment variables or default
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
const API_BASE_URL = `${API_BASE}/api`;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 180000, // 3 minute default timeout for all API calls
});

// Create a separate client for unauthenticated test requests
const testApiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 180000, // 3 minute timeout for test API calls (including practice exams)
});

// Interceptor to add the auth token to requests
apiClient.interceptors.request.use(
  async (config) => {
    const isGradescope = config.url?.includes('/gradescope/');
    const devUid = (window?.localStorage?.getItem('devUid')) || 
                   import.meta.env.VITE_DEV_USER_ID || 
                   'dev-cli';

    if (FLAGS.DEV_NO_AUTH) {
      // best-effort: attach token if available
      const user = auth.currentUser;
      const shadowUid = (window?.localStorage?.getItem('shadowUid')) || 
                       import.meta.env.VITE_DEV_SHADOW_USER_ID || 
                       '';
      
      if (user) {
        try {
          const token = await user.getIdToken();
          config.headers.Authorization = `Bearer ${token}`;
          config.headers['X-Dev-User-Id'] = user.uid;
        } catch { /* ignore */ }
      } else {
        config.headers['X-Dev-User-Id'] = devUid;
      }
      
      // Add shadow header for course context reads
      if (shadowUid) {
        config.headers['X-Dev-Shadow-User-Id'] = shadowUid;
      }
      
      return config;
    }

    // production (always attach token when available)
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
export const testGemini = async (prompt, timeoutMs = 30000) => {
  try {
    console.log('Calling test-gemini API with prompt:', prompt);
    console.log('API URL:', `${API_BASE_URL}/test-ai/test-gemini`);
    
    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timed out')), timeoutMs);
    });
    
    // Race between the API call and timeout
    const apiPromise = testApiClient.post('/test-ai/test-gemini', { prompt });
    
    const response = await Promise.race([apiPromise, timeoutPromise]);
    console.log('Test API response:', response.data);
    return response.data; // { success: true, data: { response: '...', model: '...' } }
  } catch (error) {
    console.error('Test API error details:', error);
    
    // Handle timeout specifically
    if (error.message === 'Request timed out') {
      return { 
        success: false, 
        error: 'Request timed out - please try again', 
        status: 0,
        timeout: true
      };
    }
    
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

// RAG API Functions
export const ragIngest = async (payload) => {
  try {
    const response = await fetch(`${API_BASE}/api/rag/ingest`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(await authHeadersFor('/api/rag/ingest'))
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`ragIngest failed: ${response.status}`);
    return response.json();
  } catch (error) {
    return handleApiError(error);
  }
};

export const ragRetrieve = async (payload) => {
  try {
    const response = await fetch(`${API_BASE}/api/rag/retrieve`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(await authHeadersFor('/api/rag/retrieve'))
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`ragRetrieve failed: ${response.status}`);
    return response.json();
  } catch (error) {
    return handleApiError(error);
  }
};

export const ragHealth = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/rag/health`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        ...(await authHeadersFor('/api/rag/health'))
      },
    });
    if (!response.ok) throw new Error(`ragHealth failed: ${response.status}`);
    return response.json();
  } catch (error) {
    return handleApiError(error);
  }
};

// Helper function to get auth headers
const getAuthHeaders = async () => {
  if (FLAGS.DEV_NO_AUTH) return {};
  
  const user = auth.currentUser;
  if (user) {
    try {
      const token = await user.getIdToken();
      return { Authorization: `Bearer ${token}` };
    } catch (error) {
      console.error('Error getting ID token:', error);
      return {};
    }
  }
  return {};
};

// Generate stable dev user ID for development
const devUid = (() => {
  const key = 'devUid';
  let v = localStorage.getItem(key);
  if (!v) {
    v = 'dev-' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem(key, v);
  }
  return v;
})();

// Helper function to get auth headers for specific URLs
const authHeadersFor = async (url) => {
  const isGradescope = url.includes('/api/gradescope/');
  const headers = {};
  
  // Always include a stable dev user id for Gradescope endpoints
  if (isGradescope) headers['X-Dev-User-Id'] = (auth.currentUser?.uid) || devUid;
  
  // Add shadow header for course context reads in dev
  if (FLAGS.DEV_NO_AUTH) {
    const shadowUid = localStorage.getItem('shadowUid') || import.meta.env.VITE_DEV_SHADOW_USER_ID || '';
    if (shadowUid) {
      headers['X-Dev-Shadow-User-Id'] = shadowUid;
    }
  }
  
  // Attach Firebase token if present (works in both dev and prod)
  if (auth.currentUser) {
    try {
      headers.Authorization = `Bearer ${await auth.currentUser.getIdToken()}`;
    } catch (e) {
      console.warn('Token fetch failed, proceeding without Authorization.');
    }
  }
  
  return headers;
};

// Updated chat function to use RAG
export const chatAsk = async ({ sessionId, courseId, message }) => {
  try {
    const response = await fetch(`${API_BASE}/api/ai/chat`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(await authHeadersFor('/api/ai/chat'))
      },
      body: JSON.stringify({ sessionId, courseId, message }),
    });
    
    const txt = await response.text();
    if (import.meta.env.DEV) console.log('[CHAT RAW BYTES]', txt.length, '[RAW]', txt.slice(0, 200));
    
    if (!response.ok) throw new Error(`chatAsk failed: ${response.status}`);
    
    try { 
      return JSON.parse(txt); 
    } catch { 
      return { success: false, error: 'BAD_JSON', raw: txt }; 
    }
  } catch (error) {
    return handleApiError(error);
  }
};

// RAG retrieve fallback function (updated to match existing signature)
export const ragRetrieveFallback = async ({ courseId, query }) => {
  try {
    const response = await fetch(`${API_BASE}/api/rag/retrieve`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        ...(await authHeadersFor('/api/rag/retrieve')) 
      },
      body: JSON.stringify({ courseId, query, limit: 8 }),
    });
    
    if (!response.ok) throw new Error(`ragRetrieve failed: ${response.status}`);
    return response.json();
  } catch (error) {
    return handleApiError(error);
  }
};

// Legacy chat function for backward compatibility
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
    const response = await fetch(`${API_BASE}/api/gradescope/login`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(await authHeadersFor('/api/gradescope/login'))
      },
      body: JSON.stringify(credentials),
    });
    if (!response.ok) throw new Error(`gradescopeLogin failed: ${response.status}`);
    return response.json();
  } catch (error) {
    return handleApiError(error);
  }
};

export const getGradescopeCourses = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/gradescope/courses`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        ...(await authHeadersFor('/api/gradescope/courses'))
      },
    });
    if (!response.ok) throw new Error(`getGradescopeCourses failed: ${response.status}`);
    return response.json();
  } catch (error) {
    return handleApiError(error);
  }
};

export const getGradescopeAssignments = async (courseId) => {
  try {
    const response = await fetch(`${API_BASE}/api/gradescope/courses/${courseId}/assignments`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        ...(await authHeadersFor(`/api/gradescope/courses/${courseId}/assignments`))
      },
    });
    if (!response.ok) throw new Error(`getGradescopeAssignments failed: ${response.status}`);
    return response.json();
  } catch (error) {
    return handleApiError(error);
  }
};

export const checkGradescopeAuthStatus = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/gradescope/auth/status`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        ...(await authHeadersFor('/api/gradescope/auth/status'))
      },
    });
    if (!response.ok) throw new Error(`checkGradescopeAuthStatus failed: ${response.status}`);
    return response.json();
  } catch (error) {
    return handleApiError(error);
  }
};

export const getGradescopeHealth = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/gradescope/health`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        ...(await authHeadersFor('/api/gradescope/health'))
      },
    });
    if (!response.ok) throw new Error(`getGradescopeHealth failed: ${response.status}`);
    return response.json();
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
    const response = await fetch(`${API_BASE}/api/gradescope/assignments/${courseId}/${assignmentId}/pdf`, {
      method: 'GET',
      headers: { 
        ...(await authHeadersFor('/api/gradescope/assignments'))
      },
    });
    
    if (!response.ok) {
      // Try to parse JSON error response first
      try {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error || `HTTP ${response.status}`,
          status: response.status,
          details: errorData.details
        };
      } catch (jsonError) {
        // If JSON parsing fails, throw generic error
        throw new Error(`getGradescopeAssignmentPDF failed: ${response.status}`);
      }
    }
    
    return response.blob();
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

export const deleteRecurringEvent = async (eventId, deleteType) => {
  try {
    const response = await apiClient.delete(`/schedules/events/${eventId}/recurring`, {
      data: { deleteType } // 'this', 'all', or 'following'
    });
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

// Upload and process a Practice Exam request
export const processPracticeExam = async (form) => {
  try {
    console.log('=== PROCESSING PRACTICE EXAM ===');
    console.log('Form data:', form);
    
    const formData = new FormData();
    formData.append('subject', form.subject);
    formData.append('numQuestions', form.numQuestions);
    formData.append('difficulty', form.difficulty);
    formData.append('generatePDF', form.generatePDF);
    formData.append('instructions', form.instructions || ''); // Always send instructions, even if empty
    if (form.pdf) formData.append('pdf', form.pdf);
    
    // Add question points as JSON string
    if (form.questionPoints && Array.isArray(form.questionPoints)) {
      formData.append('questionPoints', JSON.stringify(form.questionPoints));
      console.log('Added questionPoints to form data:', form.questionPoints);
    }
    
    console.log('FormData entries:');
    for (let [key, value] of formData.entries()) {
      if (key === 'pdf') {
        console.log(`${key}: [File object]`);
      } else {
        console.log(`${key}:`, value);
      }
    }
    
    // Use testApiClient since the route is unprotected
    const response = await testApiClient.post('/ai/practice-exam', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 300000, // 5 minute timeout for practice exam generation (more time for complex PDFs like OS_hw4)
    });
    
    console.log('=== API RESPONSE RECEIVED ===');
    console.log('Response data:', response.data);
    
    return response.data;
  } catch (error) {
    console.log('=== API ERROR ===');
    console.error('Error details:', error);
    return handleApiError(error);
  }
};

// Download PDF file
export const downloadPDF = async (filename) => {
  try {
    const response = await apiClient.get(`/assignments/download/${filename}`, {
      responseType: 'blob'
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// Neural Conquest Game API Functions
export const startNeuralConquestGame = async (playerName, settings = {}) => {
  try {
    const response = await apiClient.post('/activities/neural-conquest/start', {
      playerName,
      settings
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const joinNeuralConquestGame = async (sessionId, playerName) => {
  try {
    const response = await apiClient.post(`/activities/neural-conquest/join/${sessionId}`, {
      playerName
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getNeuralConquestSession = async (sessionId) => {
  try {
    const response = await apiClient.get(`/activities/neural-conquest/session/${sessionId}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const saveNeuralConquestGameState = async (sessionId, gameState) => {
  try {
    const response = await apiClient.post('/activities/neural-conquest/save', {
      sessionId,
      gameState
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getNeuralConquestContent = async () => {
  try {
    const response = await apiClient.get('/activities/neural-conquest/content');
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// Start multiplayer Neural Conquest game
export const startNeuralConquestMultiplayer = async (gameConfig) => {
  try {
    const response = await apiClient.post('/activities/neural-conquest/multiplayer', gameConfig);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// Join multiplayer Neural Conquest game
export const joinNeuralConquestMultiplayer = async (gameId, playerInfo) => {
  try {
    const response = await apiClient.post(`/activities/neural-conquest/multiplayer/${gameId}/join`, playerInfo);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// Get multiplayer game state
export const getNeuralConquestMultiplayerState = async (gameId, playerId = null) => {
  try {
    const params = playerId ? { playerId } : {};
    const response = await apiClient.get(`/activities/neural-conquest/multiplayer/${gameId}`, { params });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// Submit turn in multiplayer game
export const submitNeuralConquestMultiplayerTurn = async (gameId, turnData) => {
  try {
    const response = await apiClient.post(`/activities/neural-conquest/multiplayer/${gameId}/turn`, turnData);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// Enhanced Neural Conquest API endpoints
export const neuralConquestAPI = {
  // Get available topics for Neural Conquest
  getAvailableTopics: () => apiClient.get('/activities/neural-conquest/topics'),
  
  // Start new game with enhanced 3D features
  startNewGame: (data) => apiClient.post('/activities/neural-conquest/start', data),
  
  // Get session with full 3D territory data
  getSession: (sessionId) => apiClient.get(`/activities/neural-conquest/session/${sessionId}`),
  
  // Answer question with enhanced rewards
  answerQuestion: (data) => apiClient.post('/activities/neural-conquest/answer', data),
  
  // Move to territory in 3D space
  moveToTerritory: (data) => apiClient.post('/activities/neural-conquest/move', data),
  
  // Conquer territory with 3D effects
  conquerTerritory: (data) => apiClient.post('/activities/neural-conquest/conquer', data),
  
  // Save game state with 3D data
  saveGameState: (data) => apiClient.post('/activities/neural-conquest/save', data),
  
  // Get nearby territories for movement
  getNearbyTerritories: (sessionId, territoryId) => 
    apiClient.get(`/activities/neural-conquest/nearby/${sessionId}/${territoryId}`),

  // Timer
  startTimer: (sessionId) => apiClient.post('/activities/neural-conquest/timer/start', { sessionId }),
  pauseTimer: (sessionId) => apiClient.post('/activities/neural-conquest/timer/pause', { sessionId }),
  getTimer: (sessionId) => apiClient.get(`/activities/neural-conquest/timer/${sessionId}`),

  // Invitations
  searchUsers: (q) => apiClient.get('/activities/neural-conquest/invite/search', { params: { q } }),
  invitePlayers: (gameId, payload) => apiClient.post(`/activities/neural-conquest/multiplayer/${gameId}/invite`, payload),

  // Territory question start
  startTerritoryQuestion: (sessionId, territoryId) => apiClient.post('/activities/neural-conquest/question/start', { sessionId, territoryId }),

  // Deletions
  deleteSingleSession: (sessionId) => apiClient.delete(`/activities/neural-conquest/session/${sessionId}`),
  deleteOrLeaveMultiplayer: (gameId) => apiClient.delete(`/activities/neural-conquest/multiplayer/${gameId}`),
}

// Convenient API object for all functions
export const api = {
  // RAG functions
  ragIngest,
  ragRetrieve,
  ragHealth,
  chatAsk,
  
  // Neural Conquest functions
  getNeuralConquestTopics: neuralConquestAPI.getAvailableTopics,
  startNeuralConquest: neuralConquestAPI.startNewGame,
  getNeuralConquestSession: neuralConquestAPI.getSession,
  answerNeuralConquestQuestion: neuralConquestAPI.answerQuestion,
  moveToNeuralConquestTerritory: neuralConquestAPI.moveToTerritory,
  conquerNeuralConquestTerritory: neuralConquestAPI.conquerTerritory,
  saveNeuralConquestState: neuralConquestAPI.saveGameState,
  
  // Legacy Neural Conquest functions (for backward compatibility)
  startNeuralConquestGame,
  joinNeuralConquestGame,
  getNeuralConquestContent,
  
  // Other API functions
  testGemini,
  generateStudyPlan,
  explainConcept,
  generatePracticeQuestions,
  postChatMessage, // Legacy
  getCourses,
  createCourse,
  getAssignmentsForCourse,
  getAllAssignments,
  processPracticeExam,
  getGradescopeAssignmentPDF,
  
  // Flags for frontend logic
  FLAGS,
  
  // Dev helpers
  setDevUid: (uid) => localStorage.setItem('devUid', uid),
  setShadowUid: (uid) => localStorage.setItem('shadowUid', uid),
};

export default apiClient; 