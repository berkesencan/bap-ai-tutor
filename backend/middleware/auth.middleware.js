const { auth } = require('../config/firebase');

/**
 * Authentication middleware
 * Verifies the JWT token and attaches the user to the request object
 */
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(403).json({ 
        error: 'No token provided', 
        message: 'Authentication required. Please login first.',
        code: 'NO_TOKEN'
      });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    // Enhanced error handling with specific error codes
    let errorMessage = 'Authentication failed. Please login again.';
    let errorCode = 'INVALID_TOKEN';
    
    if (error.code === 'auth/id-token-expired') {
      errorMessage = 'Your session has expired. Please login again to continue.';
      errorCode = 'TOKEN_EXPIRED';
    } else if (error.code === 'auth/id-token-revoked') {
      errorMessage = 'Your session has been revoked. Please login again.';
      errorCode = 'TOKEN_REVOKED';
    } else if (error.code === 'auth/invalid-id-token') {
      errorMessage = 'Invalid authentication token. Please login again.';
      errorCode = 'INVALID_TOKEN';
    }

    // Only log detailed errors in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`🔐 Auth error for ${req.method} ${req.path}:`, error.message);
      console.error('Error code:', error.code);
    }
    
    return res.status(403).json({ 
      error: 'Authentication failed',
      message: errorMessage,
      code: errorCode,
      // Include helpful instructions for frontend
      instructions: 'Please refresh the page and login again. Your session may have expired during the 3D model generation process.'
    });
  }
};

/**
 * Optional auth middleware - continues even if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];
      const decodedToken = await auth.verifyIdToken(token);
      req.user = decodedToken;
    }
    next();
  } catch (error) {
    // For optional auth, just continue without user
    next();
  }
};

module.exports = {
  verifyToken,
  optionalAuth
}; 