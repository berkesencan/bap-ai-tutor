const Schedule = require('../models/schedule.model');

/**
 * Schedule controller for handling schedule-related operations
 */
class ScheduleController {
  /**
   * Create a new schedule
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async create(req, res, next) {
    try {
      const scheduleData = req.body;
      const userId = req.user.uid;
      
      const schedule = await Schedule.create(scheduleData, userId);
      
      res.status(201).json({
        success: true,
        data: {
          schedule,
        },
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Create a new calendar event
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async createEvent(req, res, next) {
    try {
      const eventData = req.body;
      const userId = req.user.uid;
      
      const event = await Schedule.createEvent(eventData, userId);
      
      res.status(201).json({
        success: true,
        data: {
          event,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all calendar events for the current user
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async getCalendarEvents(req, res, next) {
    try {
      const userId = req.user.uid;
      const { startDate, endDate } = req.query;
      
      const events = await Schedule.getCalendarEvents(userId, startDate, endDate);
      
      res.status(200).json({
        success: true,
        data: {
          events,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get calendar data including events and assignments (OPTIMIZED)
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async getCalendarData(req, res, next) {
    try {
      const userId = req.user.uid;
      let { startDate, endDate } = req.query;
      
      // If no date range provided, default to current month to reduce reads
      if (!startDate && !endDate) {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        // Get start of current month
        startDate = new Date(currentYear, currentMonth, 1).toISOString();
        // Get end of current month
        endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).toISOString();
        
        console.log(`[Calendar] No date range provided, defaulting to current month: ${startDate} to ${endDate}`);
      }
      
      // If only one date provided, create a reasonable range
      if (startDate && !endDate) {
        const start = new Date(startDate);
        const end = new Date(start);
        end.setMonth(end.getMonth() + 1); // Add 1 month
        endDate = end.toISOString();
      } else if (!startDate && endDate) {
        const end = new Date(endDate);
        const start = new Date(end);
        start.setMonth(start.getMonth() - 1); // Subtract 1 month
        startDate = start.toISOString();
      }
      
      console.log(`[Calendar] Fetching calendar data for date range: ${startDate} to ${endDate}`);
      
      const calendarData = await Schedule.getCalendarDataOptimized(userId, startDate, endDate);
      
      // Handle graceful error case
      if (calendarData.error) {
        return res.status(200).json({
          success: false,
          error: calendarData.error,
          data: {
            events: [],
            summary: calendarData.summary
          }
        });
      }
      
      res.status(200).json({
        success: true,
        data: calendarData,
      });
    } catch (error) {
      console.error('Controller error getting calendar data:', error);
      
      // Return graceful error response instead of throwing
      res.status(200).json({
        success: false,
        error: 'Failed to load calendar data. Please try again later.',
        data: {
          events: [],
          summary: {
            totalEvents: 0,
            totalAssignments: 0,
            upcomingCount: 0,
          }
        }
      });
    }
  }

  /**
   * Update a calendar event
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async updateCalendarEvent(req, res, next) {
    try {
      const { eventId } = req.params;
      const updateData = req.body;
      const userId = req.user.uid;
      
      const updatedEvent = await Schedule.updateCalendarEvent(eventId, updateData, userId);
      
      res.status(200).json({
        success: true,
        data: {
          event: updatedEvent,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a calendar event
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async deleteCalendarEvent(req, res, next) {
    try {
      const { eventId } = req.params;
      const userId = req.user.uid;
      
      await Schedule.deleteCalendarEvent(eventId, userId);
      
      res.status(200).json({
        success: true,
        message: 'Event deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Import calendar data from ICS file
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async importICS(req, res, next) {
    try {
      const { icsData } = req.body;
      const userId = req.user.uid;
      
      const importedEvents = await Schedule.importICS(icsData, userId);
      
      res.status(200).json({
        success: true,
        data: {
          events: importedEvents,
          message: `Successfully imported ${importedEvents.length} events`,
        },
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get all schedules for the current user
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async getAll(req, res, next) {
    try {
      const userId = req.user.uid;
      
      const schedules = await Schedule.getByUserId(userId);
      
      res.status(200).json({
        success: true,
        data: {
          schedules,
        },
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get schedule for the current user
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async getSchedule(req, res, next) {
    try {
      const userId = req.user.uid;
      
      const schedules = await Schedule.getByUserId(userId);
      
      res.status(200).json({
        success: true,
        data: {
          schedules,
        },
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get weekly schedule for the current user
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async getWeeklySchedule(req, res, next) {
    try {
      const userId = req.user.uid;
      
      const schedules = await Schedule.getByUserId(userId);
      
      // Group schedules by day of week
      const weeklySchedule = Array(7).fill().map(() => []);
      
      schedules.forEach(schedule => {
        weeklySchedule[schedule.dayOfWeek].push(schedule);
      });
      
      res.status(200).json({
        success: true,
        data: {
          weeklySchedule,
        },
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get daily schedule for the current user
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async getDailySchedule(req, res, next) {
    try {
      const userId = req.user.uid;
      const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      const schedules = await Schedule.getByUserId(userId);
      
      // Filter schedules for today
      const dailySchedule = schedules.filter(schedule => schedule.dayOfWeek === today);
      
      res.status(200).json({
        success: true,
        data: {
          dailySchedule,
        },
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get a schedule by ID
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async getById(req, res, next) {
    try {
      const { scheduleId } = req.params;
      const userId = req.user.uid;
      
      const schedule = await Schedule.getById(scheduleId);
      
      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: 'Schedule not found',
        });
      }
      
      // Check if the schedule belongs to the current user
      if (schedule.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this schedule',
        });
      }
      
      res.status(200).json({
        success: true,
        data: {
          schedule,
        },
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Add an event to a schedule
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async addEvent(req, res, next) {
    try {
      const { scheduleId } = req.params;
      const eventData = req.body;
      const userId = req.user.uid;
      
      const schedule = await Schedule.getById(scheduleId);
      
      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: 'Schedule not found',
        });
      }
      
      // Check if the schedule belongs to the current user
      if (schedule.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to add events to this schedule',
        });
      }
      
      const updatedSchedule = await Schedule.addEvent(scheduleId, eventData);
      
      res.status(200).json({
        success: true,
        data: {
          schedule: updatedSchedule,
        },
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Update an event in a schedule
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async updateEvent(req, res, next) {
    try {
      const { scheduleId, eventId } = req.params;
      const updateData = req.body;
      const userId = req.user.uid;
      
      const schedule = await Schedule.getById(scheduleId);
      
      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: 'Schedule not found',
        });
      }
      
      // Check if the schedule belongs to the current user
      if (schedule.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update events in this schedule',
        });
      }
      
      const updatedSchedule = await Schedule.updateEvent(scheduleId, eventId, updateData);
      
      res.status(200).json({
        success: true,
        data: {
          schedule: updatedSchedule,
        },
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Delete an event from a schedule
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async deleteEvent(req, res, next) {
    try {
      const { scheduleId, eventId } = req.params;
      const userId = req.user.uid;
      
      const schedule = await Schedule.getById(scheduleId);
      
      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: 'Schedule not found',
        });
      }
      
      // Check if the schedule belongs to the current user
      if (schedule.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to delete events from this schedule',
        });
      }
      
      const updatedSchedule = await Schedule.deleteEvent(scheduleId, eventId);
      
      res.status(200).json({
        success: true,
        data: {
          schedule: updatedSchedule,
        },
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Update a schedule
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async update(req, res, next) {
    try {
      const { scheduleId } = req.params;
      const updateData = req.body;
      const userId = req.user.uid;
      
      const schedule = await Schedule.getById(scheduleId);
      
      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: 'Schedule not found',
        });
      }
      
      // Check if the schedule belongs to the current user
      if (schedule.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update this schedule',
        });
      }
      
      const updatedSchedule = await Schedule.update(scheduleId, updateData);
      
      res.status(200).json({
        success: true,
        data: {
          schedule: updatedSchedule,
        },
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Delete a schedule
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async delete(req, res, next) {
    try {
      const { scheduleId } = req.params;
      const userId = req.user.uid;
      
      const schedule = await Schedule.getById(scheduleId);
      
      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: 'Schedule not found',
        });
      }
      
      // Check if the schedule belongs to the current user
      if (schedule.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to delete this schedule',
        });
      }
      
      await Schedule.delete(scheduleId);
      
      res.status(200).json({
        success: true,
        message: 'Schedule deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ScheduleController; 