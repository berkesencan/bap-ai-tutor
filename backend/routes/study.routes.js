const express = require('express');
const { body } = require('express-validator');
const StudyController = require('../controllers/study.controller');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');

const router = express.Router();

/**
 * @route   POST /api/study
 * @desc    Create a new study session
 * @access  Private
 */
router.post(
  '/',
  auth,
  [
    body('courseId').isString().notEmpty(),
    body('startTime').isISO8601(),
    body('duration').isInt({ min: 1 }),
    body('focusScore').isFloat({ min: 0, max: 1 }),
    body('notes').optional().isString(),
    body('topics').optional().isArray(),
    body('topics.*').isString()
  ],
  validate,
  StudyController.createSession
);

/**
 * @route   GET /api/study
 * @desc    Get all study sessions for current user
 * @access  Private
 */
router.get('/', auth, StudyController.getSessions);

/**
 * @route   GET /api/study/:id
 * @desc    Get a study session by ID
 * @access  Private
 */
router.get('/:id', auth, StudyController.getSession);

/**
 * @route   PUT /api/study/:id
 * @desc    Update a study session
 * @access  Private
 */
router.put(
  '/:id',
  auth,
  [
    body('startTime').optional().isISO8601(),
    body('duration').optional().isInt({ min: 1 }),
    body('focusScore').optional().isFloat({ min: 0, max: 1 }),
    body('notes').optional().isString(),
    body('topics').optional().isArray(),
    body('topics.*').isString()
  ],
  validate,
  StudyController.updateSession
);

/**
 * @route   DELETE /api/study/:id
 * @desc    Delete a study session
 * @access  Private
 */
router.delete('/:id', auth, StudyController.deleteSession);

/**
 * @route   GET /api/study/stats
 * @desc    Get study statistics for current user
 * @access  Private
 */
router.get('/stats', auth, StudyController.getStats);

/**
 * @route   GET /api/study/course/:courseId
 * @desc    Get study sessions for a specific course
 * @access  Private
 */
router.get('/course/:courseId', auth, StudyController.getCourseSessions);

module.exports = router; 