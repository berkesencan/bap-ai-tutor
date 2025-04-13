const express = require('express');
const { body } = require('express-validator');
const AssignmentController = require('../controllers/assignment.controller');

const router = express.Router();

/**
 * @route POST /api/assignments/course/:courseId
 * @desc Create a new assignment for a course
 * @access Private
 */
router.post(
  '/course/:courseId',
  [
    body('title').notEmpty().withMessage('Assignment title is required'),
    body('description').notEmpty().withMessage('Assignment description is required'),
    body('dueDate').isISO8601().withMessage('Due date must be a valid date'),
    body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Priority must be low, medium, or high'),
    body('status').optional().isIn(['pending', 'in-progress', 'completed']).withMessage('Status must be pending, in-progress, or completed'),
    body('platform').optional(),
    body('url').optional().isURL().withMessage('URL must be a valid URL'),
    body('notes').optional(),
  ],
  AssignmentController.create
);

/**
 * @route GET /api/assignments/course/:courseId
 * @desc Get all assignments for a course
 * @access Private
 */
router.get('/course/:courseId', AssignmentController.getByCourse);

/**
 * @route GET /api/assignments
 * @desc Get all assignments for the current user
 * @access Private
 */
router.get('/', AssignmentController.getAll);

/**
 * @route GET /api/assignments/upcoming
 * @desc Get upcoming assignments for the current user
 * @access Private
 */
router.get('/upcoming', AssignmentController.getUpcoming);

/**
 * @route GET /api/assignments/past
 * @desc Get past assignments for the current user
 * @access Private
 */
router.get('/past', AssignmentController.getPast);

/**
 * @route GET /api/assignments/:assignmentId
 * @desc Get an assignment by ID
 * @access Private
 */
router.get('/:assignmentId', AssignmentController.getById);

/**
 * @route PUT /api/assignments/:assignmentId
 * @desc Update an assignment
 * @access Private
 */
router.put(
  '/:assignmentId',
  [
    body('title').optional().notEmpty().withMessage('Assignment title cannot be empty'),
    body('description').optional().notEmpty().withMessage('Assignment description cannot be empty'),
    body('dueDate').optional().isISO8601().withMessage('Due date must be a valid date'),
    body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Priority must be low, medium, or high'),
    body('status').optional().isIn(['pending', 'in-progress', 'completed']).withMessage('Status must be pending, in-progress, or completed'),
    body('platform').optional(),
    body('url').optional().isURL().withMessage('URL must be a valid URL'),
    body('notes').optional(),
  ],
  AssignmentController.update
);

/**
 * @route DELETE /api/assignments/:assignmentId
 * @desc Delete an assignment
 * @access Private
 */
router.delete('/:assignmentId', AssignmentController.delete);

module.exports = router; 