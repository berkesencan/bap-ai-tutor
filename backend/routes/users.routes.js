const express = require('express');
const { verifyToken } = require('../middleware/auth.middleware');
const User = require('../models/user.model');
const { auth } = require('../config/firebase');
const admin = require('firebase-admin');

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
    let user = await User.getById(userId);

    if (!user) {
      // Development logging only
      if (process.env.NODE_ENV === 'development') {
        console.log(`User ${userId} not found in Firestore. Fetching from Firebase Auth.`);
      }
      
      const userRecord = await admin.auth().getUser(userId);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`User ${userId} found in Firebase Auth. Creating in Firestore.`);
      }
      
      user = await User.create({
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        photoURL: userRecord.photoURL,
      });
    }

    const safeUserData = {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
    };

    res.json({ success: true, data: { user: safeUserData } });
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ success: false, message: 'Failed to get user details' });
  }
});

module.exports = router; 