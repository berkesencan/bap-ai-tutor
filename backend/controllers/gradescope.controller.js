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

// Export helpers for reuse in services (e.g., AI PDF extraction)
exports.getServiceForUser = getServiceForUser;
exports.clearServiceForUser = clearServiceForUser;

// Check Gradescope authentication status
exports.checkAuthStatus = async (req, res) => {
  try {
    const { getRequestUserId } = require('../utils/requestUser');
    const userId = getRequestUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'No token provided', code: 'NO_TOKEN' });
    }
    
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
    const { getRequestUserId } = require('../utils/requestUser');
    const userId = getRequestUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'No token provided', code: 'NO_TOKEN' });
    }
    
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
    const { getRequestUserId } = require('../utils/requestUser');
    const userId = getRequestUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'No token provided', code: 'NO_TOKEN' });
    }
    
    const gradescopeService = await getServiceForUser(userId);
    
    // Ensure authenticated and refresh session if needed
    const authResult = await gradescopeService.ensureAuthenticated();
    if (authResult !== true) {
      return res.status(401).json({
        success: false,
        error: 'Gradescope session expired. Please reconnect your account.',
        needsReauth: true
      });
    }
    
    await gradescopeService.maybeRefreshSession();
    
    const courses = await gradescopeService.getCourses();
    res.status(200).json({
      success: true,
      data: courses
    });
  } catch (error) {
    console.error('Error getting Gradescope courses:', error);
    
    // Check if it's an authentication error
    if (error.message.includes('Not logged in') || error.message.includes('authentication') || 
        error.message.includes('Authentication required')) {
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
    const { getRequestUserId } = require('../utils/requestUser');
    const userId = getRequestUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'No token provided', code: 'NO_TOKEN' });
    }
    
    const gradescopeService = await getServiceForUser(userId);
    
    // Ensure authenticated and refresh session if needed
    const authResult = await gradescopeService.ensureAuthenticated();
    if (authResult !== true) {
      return res.status(401).json({
        success: false,
        error: 'Gradescope session expired. Please reconnect your account.',
        needsReauth: true
      });
    }
    
    await gradescopeService.maybeRefreshSession();
    
    const { courseId } = req.params;
    const assignments = await gradescopeService.getAssignments(courseId);
    res.status(200).json({
      success: true,
      data: assignments
    });
  } catch (error) {
    console.error('Error getting Gradescope assignments:', error);
    
    // Check if it's an authentication error
    if (error.message.includes('Not logged in') || error.message.includes('authentication') || 
        error.message.includes('Authentication required')) {
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
  console.log(`[PDF DEBUG] Starting PDF fetch for course: ${req.params.courseId}, assignment: ${req.params.assignmentId}`);
  console.log(`[PDF DEBUG] User ID: ${req.user?.uid}`);
  
  try {
    const { getRequestUserId } = require('../utils/requestUser');
    const userId = getRequestUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'No token provided', code: 'NO_TOKEN' });
    }
    console.log(`[PDF DEBUG] Getting service for user: ${userId}`);
    const gradescopeService = await getServiceForUser(userId);
    console.log(`[PDF DEBUG] Got service instance:`, !!gradescopeService);

    // Ensure authenticated and refresh session if needed
    const authResult = await gradescopeService.ensureAuthenticated();
    if (authResult !== true) {
      console.log(`[PDF DEBUG] Authentication failed, returning 401`);
      return res.status(401).json({
        success: false,
        error: 'Gradescope session expired. Please reconnect your account.',
        needsReauth: true
      });
    }
    
    await gradescopeService.maybeRefreshSession();

    const { courseId, assignmentId } = req.params;
    console.log(`[PDF DEBUG] Calling getAssignmentPDF with courseId: ${courseId}, assignmentId: ${assignmentId}`);
    const pdfBuffer = await gradescopeService.getAssignmentPDF(courseId, assignmentId);
    console.log(`[PDF DEBUG] Got PDF buffer, size:`, pdfBuffer?.length || 'null/undefined');
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="assignment.pdf"');
    res.send(pdfBuffer);
    console.log(`[PDF DEBUG] PDF sent successfully`);
  } catch (error) {
    console.error('[PDF DEBUG] Error getting Gradescope assignment PDF:', error);
    console.error('[PDF DEBUG] Error stack:', error.stack);
    console.error('[PDF DEBUG] Error message:', error.message);

    const msg = (error?.message || '').toLowerCase();
    const looksAuth =
      msg.includes('not logged in') ||
      msg.includes('login') ||
      msg.includes('authenticate') ||
      msg.includes('csrf') ||
      msg.includes('forbidden') ||
      msg.includes('unauthorized') ||
      msg.includes('session');

    console.log(`[PDF DEBUG] Error looks like auth issue:`, looksAuth);

    if (looksAuth) {
      if (req.user && req.user.uid) {
        clearServiceForUser(req.user.uid);
        try {
          const GradescopeAuth = require('../models/gradescope-auth.model');
          await GradescopeAuth.updateAuthStatus(req.user.uid, false, 'Session expired');
        } catch (_) {}
      }
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

// Health check endpoint
exports.health = async (req, res) => {
  try {
    const { getRequestUserId } = require('../utils/requestUser');
    const userId = getRequestUserId(req);
    
    if (!userId) {
      return res.status(200).json({
        success: true,
        data: {
          session: {
            isAuthenticated: false,
            message: 'No user context available'
          }
        }
      });
    }
    
    // Get auth status from database
    const authData = await GradescopeAuth.getCredentials(userId);
    const sessionData = await GradescopeAuth.getSessionData(userId);
    const needsRefresh = await GradescopeAuth.needsSessionRefresh(userId);
    
    const maxAgeMin = parseInt(process.env.GRADESCOPE_SESSION_MAX_AGE_MIN) || 120;
    const refreshAheadMin = parseInt(process.env.GRADESCOPE_SESSION_REFRESH_AHEAD_MIN) || 20;
    
    res.status(200).json({
      success: true,
      data: {
        session: {
          isAuthenticated: authData?.isAuthenticated || false,
          lastValidatedAt: authData?.lastValidatedAt?.toDate(),
          failureCount: authData?.failureCount || 0,
          maxAgeMin: maxAgeMin,
          refreshAheadMin: refreshAheadMin,
          needsRefresh: needsRefresh,
          hasStoredSession: !!sessionData,
          lastError: authData?.lastError
        }
      }
    });
  } catch (error) {
    console.error('Error checking Gradescope health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check Gradescope health status'
    });
  }
};