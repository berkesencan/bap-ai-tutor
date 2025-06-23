const express = require('express');
const { verifyToken } = require('../middleware/auth.middleware');
const User = require('../models/user.model');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyToken);

/**
 * @route GET /api/users/:userId
 * @desc Get user details by ID
 * @access Private
 */
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get user details
    const user = await User.getById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Return only safe user information (no sensitive data)
    const safeUserData = {
      uid: user.uid,
      displayName: user.displayName,
      photoURL: user.photoURL,
      // Don't return email or other sensitive information
    };
    
    res.json({
      success: true,
      data: {
        user: safeUserData
      }
    });
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user details',
      error: error.message
    });
  }
});

module.exports = router; 