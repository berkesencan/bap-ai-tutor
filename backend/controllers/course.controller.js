const Course = require('../models/course.model');
const Assignment = require('../models/assignment.model');

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

  // Import courses and assignments from Gradescope
  static async importFromGradescope(req, res) {
    try {
      const { courses, assignments } = req.body;
      const userId = req.user.uid;

      // Process courses
      const importedCourses = [];
      for (const course of courses) {
        const newCourse = {
          name: course.name || 'Unnamed Course',
          code: course.code || 'No Code',
          professor: 'Imported from Gradescope', // Default professor value to avoid undefined
          description: `Imported from Gradescope: ${course.name || 'Unnamed Course'}`,
          schedule: null, // Provide null instead of undefined
          platform: 'Gradescope',
          userId,
          externalId: course.id,
          source: 'gradescope'
        };

        console.log('Creating course with data:', JSON.stringify(newCourse));

        // Add course to database
        const createdCourse = await Course.create(newCourse, userId);
        importedCourses.push(createdCourse);

        // Process assignments for this course
        if (assignments[course.id] && assignments[course.id].length > 0) {
          for (const assignment of assignments[course.id]) {
            // Set default values for all fields to avoid undefined errors
            const newAssignment = {
              title: assignment.name || 'Unnamed Assignment',
              description: `Imported from Gradescope`,
              dueDate: new Date().setDate(new Date().getDate() + 7), // Default to 1 week from now
              priority: 'medium',
              status: 'active',
              platform: 'Gradescope',
              url: null,
              notes: 'Imported from Gradescope',
              externalId: assignment.id,
              source: 'gradescope',
              type: 'assignment',
              files: []
            };

            console.log('Creating assignment with data:', JSON.stringify(newAssignment));

            // Add assignment to database with all required parameters
            await Assignment.create(newAssignment, createdCourse.id, userId);
          }
        }
      }

      res.status(200).json({
        success: true,
        message: 'Successfully imported courses and assignments from Gradescope',
        courses: importedCourses
      });
    } catch (error) {
      console.error('Error importing from Gradescope:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to import from Gradescope',
        details: error.message
      });
    }
  }
}

module.exports = CourseController; 