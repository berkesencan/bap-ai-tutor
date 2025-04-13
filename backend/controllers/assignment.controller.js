const Assignment = require('../models/assignment.model');
const Course = require('../models/course.model');

/**
 * Assignment controller for handling assignment-related operations
 */
class AssignmentController {
  /**
   * Create a new assignment
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async create(req, res, next) {
    try {
      const assignmentData = req.body;
      const { courseId } = req.params;
      const userId = req.user.uid;
      
      // Check if the course exists and belongs to the current user
      const course = await Course.getById(courseId);
      
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found',
        });
      }
      
      if (course.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to create assignments for this course',
        });
      }
      
      const assignment = await Assignment.create(assignmentData, courseId, userId);
      
      res.status(201).json({
        success: true,
        data: {
          assignment,
        },
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get all assignments for a course
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async getByCourse(req, res, next) {
    try {
      const { courseId } = req.params;
      const userId = req.user.uid;
      
      // Check if the course exists and belongs to the current user
      const course = await Course.getById(courseId);
      
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found',
        });
      }
      
      if (course.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access assignments for this course',
        });
      }
      
      const assignments = await Assignment.getByCourseId(courseId);
      
      res.status(200).json({
        success: true,
        data: {
          assignments,
        },
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get all assignments for the current user
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async getAll(req, res, next) {
    try {
      const userId = req.user.uid;
      
      const assignments = await Assignment.getByUserId(userId);
      
      res.status(200).json({
        success: true,
        data: {
          assignments,
        },
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get upcoming assignments for the current user
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async getUpcoming(req, res, next) {
    try {
      const userId = req.user.uid;
      const { limit } = req.query;
      
      const assignments = await Assignment.getUpcoming(userId, limit ? parseInt(limit) : 10);
      
      res.status(200).json({
        success: true,
        data: {
          assignments,
        },
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get an assignment by ID
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async getById(req, res, next) {
    try {
      const { assignmentId } = req.params;
      const userId = req.user.uid;
      
      const assignment = await Assignment.getById(assignmentId);
      
      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: 'Assignment not found',
        });
      }
      
      // Check if the assignment belongs to the current user
      if (assignment.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this assignment',
        });
      }
      
      res.status(200).json({
        success: true,
        data: {
          assignment,
        },
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Update an assignment
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async update(req, res, next) {
    try {
      const { assignmentId } = req.params;
      const updateData = req.body;
      const userId = req.user.uid;
      
      const assignment = await Assignment.getById(assignmentId);
      
      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: 'Assignment not found',
        });
      }
      
      // Check if the assignment belongs to the current user
      if (assignment.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update this assignment',
        });
      }
      
      const updatedAssignment = await Assignment.update(assignmentId, updateData);
      
      res.status(200).json({
        success: true,
        data: {
          assignment: updatedAssignment,
        },
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Delete an assignment
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async delete(req, res, next) {
    try {
      const { assignmentId } = req.params;
      const userId = req.user.uid;
      
      const assignment = await Assignment.getById(assignmentId);
      
      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: 'Assignment not found',
        });
      }
      
      // Check if the assignment belongs to the current user
      if (assignment.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to delete this assignment',
        });
      }
      
      await Assignment.delete(assignmentId);
      
      res.status(200).json({
        success: true,
        message: 'Assignment deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AssignmentController; 