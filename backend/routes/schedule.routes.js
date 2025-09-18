const express = require('express');
const { body } = require('express-validator');
const ScheduleController = require('../controllers/schedule.controller');

const router = express.Router();

/**
 * @route POST /api/schedules/events
 * @desc Create a new calendar event
 * @access Private
 */
router.post(
  '/events',
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('start').isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
    body('end').isISO8601().withMessage('End date must be a valid ISO 8601 date'),
    body('allDay').optional().isBoolean().withMessage('All day must be a boolean'),
    body('location').optional(),
    body('description').optional(),
    body('color').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Color must be a valid hex color'),
    body('type').optional().isIn(['custom', 'assignment', 'class', 'exam', 'imported']).withMessage('Invalid event type'),
  ],
  ScheduleController.createEvent
);

/**
 * @route GET /api/schedules/events
 * @desc Get calendar events for the current user
 * @access Private
 */
router.get('/events', ScheduleController.getCalendarEvents);

/**
 * @route GET /api/schedules/calendar
 * @desc Get comprehensive calendar data (events + assignments)
 * @access Private
 */
router.get('/calendar', ScheduleController.getCalendarData);

/**
 * @route PUT /api/schedules/events/:eventId
 * @desc Update a calendar event
 * @access Private
 */
router.put(
  '/events/:eventId',
  [
    body('title').optional().notEmpty().withMessage('Title cannot be empty'),
    body('start').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
    body('end').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date'),
    body('allDay').optional().isBoolean().withMessage('All day must be a boolean'),
    body('location').optional(),
    body('description').optional(),
    body('color').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Color must be a valid hex color'),
  ],
  ScheduleController.updateCalendarEvent
);

/**
 * @route DELETE /api/schedules/events/:eventId
 * @desc Delete a calendar event
 * @access Private
 */
router.delete('/events/:eventId', ScheduleController.deleteCalendarEvent);

/**
 * @route DELETE /api/schedules/events/:eventId/recurring
 * @desc Delete recurring events with options (this, all, or following)
 * @access Private
 */
router.delete('/events/:eventId/recurring', ScheduleController.deleteRecurringEvent);

/**
 * @route POST /api/schedules/import/ics
 * @desc Import calendar events from ICS file
 * @access Private
 */
router.post(
  '/import/ics',
  [
    body('icsData').notEmpty().withMessage('ICS data is required'),
  ],
  ScheduleController.importICS
);

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