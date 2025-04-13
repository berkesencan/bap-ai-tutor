const express = require('express');
const { body } = require('express-validator');
const CourseController = require('../controllers/course.controller');

const router = express.Router();

/**
 * @route POST /api/courses
 * @desc Create a new course
 * @access Private
 */
router.post(
  '/',
  [
    body('name').notEmpty().withMessage('Course name is required'),
    body('code').notEmpty().withMessage('Course code is required'),
    body('professor').notEmpty().withMessage('Professor name is required'),
    body('description').optional(),
    body('schedule').optional(),
    body('platform').optional(),
  ],
  CourseController.create
);

/**
 * @route GET /api/courses
 * @desc Get all courses for the current user
 * @access Private
 */
router.get('/', CourseController.getAll);

/**
 * @route GET /api/courses/:courseId
 * @desc Get a course by ID
 * @access Private
 */
router.get('/:courseId', CourseController.getById);

/**
 * @route PUT /api/courses/:courseId
 * @desc Update a course
 * @access Private
 */
router.put(
  '/:courseId',
  [
    body('name').optional().notEmpty().withMessage('Course name cannot be empty'),
    body('code').optional().notEmpty().withMessage('Course code cannot be empty'),
    body('professor').optional().notEmpty().withMessage('Professor name cannot be empty'),
    body('description').optional(),
    body('schedule').optional(),
    body('platform').optional(),
  ],
  CourseController.update
);

/**
 * @route DELETE /api/courses/:courseId
 * @desc Delete a course
 * @access Private
 */
router.delete('/:courseId', CourseController.delete);

module.exports = router; 