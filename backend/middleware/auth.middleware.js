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
        message: 'Authentication required. Please login first.'
      });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    // Only log errors in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error verifying token for path:', req.path, error.message);
    }
    return res.status(403).json({ 
      error: 'Invalid token',
      message: 'Your session may have expired. Please login again.'
    });
  }
};

module.exports = {
  verifyToken
}; 