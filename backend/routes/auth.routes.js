const express = require('express');
const { body } = require('express-validator');
const AuthController = require('../controllers/auth.controller');

const router = express.Router();

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
    body('displayName').notEmpty().withMessage('Display name is required'),
  ],
  AuthController.register
);

/**
 * @route POST /api/auth/login
 * @desc Login a user
 * @access Public
 */
router.post(
  '/login',
  [body('idToken').notEmpty().withMessage('ID token is required')],
  AuthController.login
);

/**
 * @route GET /api/auth/me
 * @desc Get current user
 * @access Private
 */
router.get('/me', AuthController.getCurrentUser);

/**
 * @route PUT /api/auth/me
 * @desc Update current user
 * @access Private
 */
router.put(
  '/me',
  [
    body('displayName').optional().notEmpty().withMessage('Display name cannot be empty'),
    body('photoURL').optional().isURL().withMessage('Photo URL must be a valid URL'),
  ],
  AuthController.updateCurrentUser
);

/**
 * @route DELETE /api/auth/me
 * @desc Delete current user
 * @access Private
 */
router.delete('/me', AuthController.deleteCurrentUser);

module.exports = router; 