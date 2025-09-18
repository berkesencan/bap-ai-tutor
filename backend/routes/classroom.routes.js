const express = require('express');
const { body } = require('express-validator');
const ClassroomController = require('../controllers/classroom.controller');
const { verifyToken: authMiddleware } = require('../middleware/auth.middleware');

const router = express.Router();

// Validation middleware
const createClassroomValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Classroom name must be between 1 and 100 characters'),
  body('subject')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Subject must be less than 50 characters'),
  body('semester')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Semester must be less than 20 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('invitePassword')
    .optional()
    .trim()
    .isLength({ min: 4, max: 50 })
    .withMessage('Password must be between 4 and 50 characters'),
];

const joinClassroomValidation = [
  body('inviteCode')
    .trim()
    .isLength({ min: 6, max: 6 })
    .withMessage('Invite code must be exactly 6 characters')
    .isAlphanumeric()
    .withMessage('Invite code must contain only letters and numbers'),
  body('password')
    .optional()
    .trim()
    .isLength({ min: 4, max: 50 })
    .withMessage('Password must be between 4 and 50 characters'),
];

const addIntegrationValidation = [
  body('platform')
    .isIn(['gradescope', 'canvas', 'brightspace'])
    .withMessage('Platform must be one of: gradescope, canvas, brightspace'),
  body('integrationData')
    .isObject()
    .withMessage('Integration data must be an object'),
];

// Note: Authentication middleware is applied globally in index.js

// Routes
router.post('/', createClassroomValidation, ClassroomController.create);
router.get('/', ClassroomController.getAll);
router.get('/:classroomId', ClassroomController.getById);
router.put('/:classroomId', ClassroomController.update);
router.delete('/:classroomId', ClassroomController.delete);

// Student enrollment
router.post('/join', joinClassroomValidation, ClassroomController.joinByInviteCode);

// Integrations
router.get('/:classroomId/integrations', ClassroomController.getAvailableIntegrations);
router.post('/:classroomId/integrations', addIntegrationValidation, ClassroomController.addIntegration);

// Analytics (teacher only)
router.get('/:classroomId/analytics', ClassroomController.getAnalytics);

module.exports = router; 