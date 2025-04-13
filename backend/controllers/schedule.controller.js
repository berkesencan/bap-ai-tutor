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