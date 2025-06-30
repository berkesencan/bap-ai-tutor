const GradescopeService = require('../services/gradescope.service');
const GradescopeAuth = require('../models/gradescope-auth.model');

// Create a service instance map to store instances by user ID
const serviceInstances = new Map();

// Helper to get a service instance for a user
const getServiceForUser = async (userId) => {
  if (!serviceInstances.has(userId)) {
    console.log(`Creating new Gradescope service instance for user ${userId}`);
    const service = new GradescopeService(userId);
    serviceInstances.set(userId, service);
    
    // Don't initialize here - let the calling method handle initialization
    console.log(`Created new service instance for user ${userId}`);
  } else {
    console.log(`Using existing Gradescope service instance for user ${userId}`);
  }
  return serviceInstances.get(userId);
};

// Helper to clear service instance for a user (when auth fails)
const clearServiceForUser = (userId) => {
  if (serviceInstances.has(userId)) {
    console.log(`Clearing service instance for user ${userId} due to auth failure`);
    serviceInstances.delete(userId);
  }
};

// Check Gradescope authentication status
exports.checkAuthStatus = async (req, res) => {
  try {
    const userId = req.user.uid;
    
    // Check if user needs re-authentication at the database level
    const needsReauth = await GradescopeAuth.needsReauth(userId);
    
    if (needsReauth) {
      // Clear any existing service instance since we need reauth
      clearServiceForUser(userId);
      
      return res.status(200).json({
        success: true,
        data: {
          isAuthenticated: false,
          needsReauth: true,
          message: 'Gradescope authentication required'
        }
      });
    }

    // Get or create service instance
    const gradescopeService = await getServiceForUser(userId);
    
    // Try to initialize/validate the service
    let isInitialized = false;
    try {
      isInitialized = await gradescopeService.initialize();
    } catch (error) {
      console.error(`Service initialization failed for user ${userId}:`, error.message);
      // Clear the failed service instance
      clearServiceForUser(userId);
      isInitialized = false;
    }
    
    if (!isInitialized) {
      // Mark as needing reauth in database
      await GradescopeAuth.updateAuthStatus(userId, false, 'Session validation failed');
    }
    
    res.status(200).json({
      success: true,
      data: {
        isAuthenticated: isInitialized,
        needsReauth: !isInitialized,
        message: isInitialized ? 'Gradescope authentication valid' : 'Gradescope authentication required'
      }
    });
  } catch (error) {
    console.error('Error checking Gradescope auth status:', error);
    
    // Clear service instance on error
    if (req.user && req.user.uid) {
      clearServiceForUser(req.user.uid);
    }
    
    res.status(200).json({
      success: true,
      data: {
        isAuthenticated: false,
        needsReauth: true,
        message: 'Unable to verify Gradescope authentication'
      }
    });
  }
};

// Login to Gradescope
exports.login = async (req, res) => {
  try {
    console.log('============================================');
    console.log('Backend received login request at:', new Date().toISOString());
    console.log('Request body:', req.body);
    console.log('Auth user:', req.user ? `${req.user.uid} (${req.user.email})` : 'Not authenticated');
    console.log('============================================');
    
    const { email, password } = req.body;
    const userId = req.user.uid;
    
    if (!email || !password) {
      console.error('Missing email or password in request');
      return res.status(400).json({ 
        success: false,
        error: 'Email and password are required' 
      });
    }
    
    // Clear any existing service instance to start fresh
    clearServiceForUser(userId);
    
    // Get user-specific service instance (this will create a new one)
    const gradescopeService = await getServiceForUser(userId);
    
    // Attempt login
    const loginSuccess = await gradescopeService.login(email, password);
    
    if (loginSuccess) {
      console.log('Login successful, sending response to client');
      res.status(200).json({ 
        success: true,
        message: 'Successfully logged in to Gradescope' 
      });
    } else {
      throw new Error('Login failed - invalid credentials or session could not be established');
    }
  } catch (error) {
    console.error('Error in Gradescope login controller:', error.message);
    
    // Clear service instance on login failure
    if (req.user && req.user.uid) {
      clearServiceForUser(req.user.uid);
    }
    
    res.status(401).json({ 
      success: false,
      error: error.message,
      details: 'Failed to authenticate with Gradescope. Please check your credentials and try again.'
    });
  }
};

// Get courses
exports.getCourses = async (req, res) => {
  try {
    const userId = req.user.uid;
    const gradescopeService = await getServiceForUser(userId);
    
    const courses = await gradescopeService.getCourses();
    res.status(200).json({
      success: true,
      data: courses
    });
  } catch (error) {
    console.error('Error getting Gradescope courses:', error);
    
    // Check if it's an authentication error
    if (error.message.includes('Not logged in') || error.message.includes('authentication')) {
      // Clear service instance and mark as needing re-authentication
      clearServiceForUser(req.user.uid);
      await GradescopeAuth.updateAuthStatus(req.user.uid, false, 'Session expired');
      
      return res.status(401).json({
        success: false,
        error: 'Gradescope session expired. Please reconnect your account.',
        needsReauth: true
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: error.message,
      details: 'Failed to fetch courses from Gradescope.'
    });
  }
};

// Get assignments for a course
exports.getAssignments = async (req, res) => {
  try {
    const userId = req.user.uid;
    const gradescopeService = await getServiceForUser(userId);
    
    const { courseId } = req.params;
    const assignments = await gradescopeService.getAssignments(courseId);
    res.status(200).json({
      success: true,
      data: assignments
    });
  } catch (error) {
    console.error('Error getting Gradescope assignments:', error);
    
    // Check if it's an authentication error
    if (error.message.includes('Not logged in') || error.message.includes('authentication')) {
      // Clear service instance and mark as needing re-authentication
      clearServiceForUser(req.user.uid);
      await GradescopeAuth.updateAuthStatus(req.user.uid, false, 'Session expired');
      
      return res.status(401).json({
        success: false,
        error: 'Gradescope session expired. Please reconnect your account.',
        needsReauth: true
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: error.message,
      details: `Failed to fetch assignments for course ${req.params.courseId} from Gradescope.`
    });
  }
};

// Get assignment PDF
exports.getAssignmentPDF = async (req, res) => {
  try {
    const userId = req.user.uid;
    const gradescopeService = await getServiceForUser(userId);
    
    const { courseId, assignmentId } = req.params;
    const pdfBuffer = await gradescopeService.getAssignmentPDF(courseId, assignmentId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="assignment.pdf"');
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error getting Gradescope assignment PDF:', error);
    
    // Check if it's an authentication error
    if (error.message.includes('Not logged in') || error.message.includes('authentication')) {
      // Clear service instance and mark as needing re-authentication
      clearServiceForUser(req.user.uid);
      await GradescopeAuth.updateAuthStatus(req.user.uid, false, 'Session expired');
      
      return res.status(401).json({
        success: false,
        error: 'Gradescope session expired. Please reconnect your account.',
        needsReauth: true
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message,
      details: `Failed to fetch assignment PDF for course ${req.params.courseId}, assignment ${req.params.assignmentId} from Gradescope.`
    });
  }
};