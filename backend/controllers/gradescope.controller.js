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
    
    // Try to initialize the service
    const initialized = await service.initialize();
    if (!initialized) {
      console.log(`Failed to initialize Gradescope service for user ${userId}`);
    }
  } else {
    console.log(`Using existing Gradescope service instance for user ${userId}`);
  }
  return serviceInstances.get(userId);
};

// Check Gradescope authentication status
exports.checkAuthStatus = async (req, res) => {
  try {
    const userId = req.user.uid;
    
    // Check if user needs re-authentication
    const needsReauth = await GradescopeAuth.needsReauth(userId);
    
    if (needsReauth) {
      return res.status(200).json({
        success: true,
        data: {
          isAuthenticated: false,
          needsReauth: true,
          message: 'Gradescope authentication required'
        }
      });
    }

    // Try to initialize the service to validate session
    const gradescopeService = await getServiceForUser(userId);
    const isInitialized = await gradescopeService.initialize();
    
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
    
    // Get user-specific service instance
    const gradescopeService = await getServiceForUser(userId);
    
    // Regular flow
    await gradescopeService.login(email, password);
    console.log('Login successful, sending response to client');
    res.status(200).json({ 
      success: true,
      message: 'Successfully logged in to Gradescope' 
    });
  } catch (error) {
    console.error('Error in Gradescope login controller:', error.message);
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
    if (error.message.includes('Not logged in')) {
      // Mark as needing re-authentication
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
    if (error.message.includes('Not logged in')) {
      // Mark as needing re-authentication
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
    if (error.message.includes('Not logged in')) {
      // Mark as needing re-authentication
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