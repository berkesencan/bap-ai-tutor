const jwt = require('jsonwebtoken');
const { auth } = require('../config/firebase');

/**
 * Authentication middleware
 * Verifies the JWT token and attaches the user to the request object
 */
const authMiddleware = async (req, res, next) => {
  try {
    // Get the token from the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required. No token provided.' 
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify the token
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get the user from Firebase
    const userRecord = await auth.getUser(decodedToken.uid);
    
    // Attach the user to the request object
    req.user = {
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      ...decodedToken
    };
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication failed. Invalid token.' 
    });
  }
};

module.exports = {
  authMiddleware,
}; 