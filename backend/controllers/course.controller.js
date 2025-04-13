const Course = require('../models/course.model');

/**
 * Course controller for handling course-related operations
 */
class CourseController {
  /**
   * Create a new course
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async create(req, res, next) {
    try {
      const courseData = req.body;
      const userId = req.user.uid;
      
      const course = await Course.create(courseData, userId);
      
      res.status(201).json({
        success: true,
        data: {
          course,
        },
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get all courses for the current user
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async getAll(req, res, next) {
    try {
      const userId = req.user.uid;
      
      const courses = await Course.getByUserId(userId);
      
      res.status(200).json({
        success: true,
        data: {
          courses,
        },
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get a course by ID
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async getById(req, res, next) {
    try {
      const { courseId } = req.params;
      
      const course = await Course.getById(courseId);
      
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found',
        });
      }
      
      // Check if the course belongs to the current user
      if (course.userId !== req.user.uid) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this course',
        });
      }
      
      res.status(200).json({
        success: true,
        data: {
          course,
        },
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Update a course
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async update(req, res, next) {
    try {
      const { courseId } = req.params;
      const updateData = req.body;
      
      const course = await Course.getById(courseId);
      
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found',
        });
      }
      
      // Check if the course belongs to the current user
      if (course.userId !== req.user.uid) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update this course',
        });
      }
      
      const updatedCourse = await Course.update(courseId, updateData);
      
      res.status(200).json({
        success: true,
        data: {
          course: updatedCourse,
        },
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Delete a course
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async delete(req, res, next) {
    try {
      const { courseId } = req.params;
      
      const course = await Course.getById(courseId);
      
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found',
        });
      }
      
      // Check if the course belongs to the current user
      if (course.userId !== req.user.uid) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to delete this course',
        });
      }
      
      await Course.delete(courseId);
      
      res.status(200).json({
        success: true,
        message: 'Course deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = CourseController; 