const { auth } = require('../config/firebase');

/**
 * Authentication middleware
 * Verifies the JWT token and attaches the user to the request object
 */
const verifyToken = async (req, res, next) => {
  console.log('Auth middleware running for path:', req.path);
  console.log('Request headers:', req.headers);
  
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No valid auth header found for path:', req.path);
      return res.status(403).json({ 
        error: 'No token provided', 
        message: 'Authentication required. Please login first.'
      });
    }

    const token = authHeader.split('Bearer ')[1];
    console.log('Token received, attempting to verify for path:', req.path);
    
    const decodedToken = await auth.verifyIdToken(token);
    console.log('Token verified successfully, user:', decodedToken.uid);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying token for path:', req.path, error);
    return res.status(403).json({ 
      error: 'Invalid token',
      message: 'Your session may have expired. Please login again.'
    });
  }
};

module.exports = {
  verifyToken
}; 