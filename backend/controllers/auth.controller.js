const jwt = require('jsonwebtoken');
const { auth } = require('../config/firebase');
const User = require('../models/user.model');

/**
 * Authentication controller for handling user authentication
 */
class AuthController {
  /**
   * Register a new user
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async register(req, res, next) {
    try {
      const { email, password, displayName } = req.body;
      
      // Create user in Firebase Auth
      const userRecord = await auth.createUser({
        email,
        password,
        displayName,
      });
      
      // Create user in Firestore
      const user = await User.create({
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
      });
      
      // Generate JWT token
      const token = jwt.sign(
        { uid: userRecord.uid },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );
      
      res.status(201).json({
        success: true,
        data: {
          user,
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Login a user
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async login(req, res, next) {
    try {
      const { idToken } = req.body;
      
      // Verify the ID token
      const decodedToken = await auth.verifyIdToken(idToken);
      
      // Get user from Firestore
      let user = await User.getById(decodedToken.uid);
      
      // If user doesn't exist in Firestore, create them
      if (!user) {
        user = await User.create({
          uid: decodedToken.uid,
          email: decodedToken.email,
          displayName: decodedToken.name,
          photoURL: decodedToken.picture,
        });
      }
      
      // Generate JWT token
      const token = jwt.sign(
        { uid: decodedToken.uid },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );
      
      res.status(200).json({
        success: true,
        data: {
          user,
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get current user
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async getCurrentUser(req, res, next) {
    try {
      let user = await User.getById(req.user.uid);
      
      // If user doesn't exist in Firestore, create them
      if (!user) {
        user = await User.create({
          uid: req.user.uid,
          email: req.user.email,
          displayName: req.user.displayName,
          photoURL: req.user.photoURL,
        });
      }
      
      res.status(200).json({
        success: true,
        data: {
          user,
        },
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Update current user
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async updateCurrentUser(req, res, next) {
    try {
      const { displayName, photoURL } = req.body;
      
      // Update user in Firebase Auth
      await auth.updateUser(req.user.uid, {
        displayName,
        photoURL,
      });
      
      // Update user in Firestore
      const user = await User.update(req.user.uid, {
        displayName,
        photoURL,
      });
      
      res.status(200).json({
        success: true,
        data: {
          user,
        },
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Delete current user
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async deleteCurrentUser(req, res, next) {
    try {
      // Delete user from Firebase Auth
      await auth.deleteUser(req.user.uid);
      
      // Delete user from Firestore
      await User.delete(req.user.uid);
      
      res.status(200).json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController; 