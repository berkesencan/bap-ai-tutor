const express = require('express');
const { body } = require('express-validator');
const ScheduleController = require('../controllers/schedule.controller');

const router = express.Router();

/**
 * @route POST /api/schedule
 * @desc Create a new schedule entry
 * @access Private
 */
router.post(
  '/',
  [
    body('courseId').notEmpty().withMessage('Course ID is required'),
    body('dayOfWeek').isInt({ min: 0, max: 6 }).withMessage('Day of week must be between 0 and 6'),
    body('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Start time must be in HH:MM format'),
    body('endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('End time must be in HH:MM format'),
    body('location').optional(),
    body('type').optional().isIn(['lecture', 'lab', 'recitation']).withMessage('Type must be lecture, lab, or recitation'),
  ],
  ScheduleController.create
);

/**
 * @route GET /api/schedule
 * @desc Get schedule for the current user
 * @access Private
 */
router.get('/', ScheduleController.getSchedule);

/**
 * @route GET /api/schedule/week
 * @desc Get weekly schedule for the current user
 * @access Private
 */
router.get('/week', ScheduleController.getWeeklySchedule);

/**
 * @route GET /api/schedule/day
 * @desc Get daily schedule for the current user
 * @access Private
 */
router.get('/day', ScheduleController.getDailySchedule);

/**
 * @route PUT /api/schedule/:scheduleId
 * @desc Update a schedule entry
 * @access Private
 */
router.put(
  '/:scheduleId',
  [
    body('dayOfWeek').optional().isInt({ min: 0, max: 6 }).withMessage('Day of week must be between 0 and 6'),
    body('startTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Start time must be in HH:MM format'),
    body('endTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('End time must be in HH:MM format'),
    body('location').optional(),
    body('type').optional().isIn(['lecture', 'lab', 'recitation']).withMessage('Type must be lecture, lab, or recitation'),
  ],
  ScheduleController.update
);

/**
 * @route DELETE /api/schedule/:scheduleId
 * @desc Delete a schedule entry
 * @access Private
 */
router.delete('/:scheduleId', ScheduleController.delete);

module.exports = router; 