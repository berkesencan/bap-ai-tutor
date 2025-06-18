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
          source: 'gradescope',
          term: course.term || null
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

  // Manage Gradescope course imports (add/remove courses and assignments)
  static async manageGradescopeImports(req, res) {
    try {
      const { selectedCourseIds, gradescopeCourses, assignments } = req.body;
      const userId = req.user.uid;

      console.log('Managing Gradescope imports for user:', userId);
      console.log('Selected course IDs:', selectedCourseIds);

      // Get all currently imported Gradescope courses for this user
      const currentCourses = await Course.getByUserId(userId);
      const currentGradescopeCourses = currentCourses.filter(course => course.source === 'gradescope');

      // Determine which courses to add and remove
      const currentExternalIds = currentGradescopeCourses.map(course => course.externalId);
      const coursesToAdd = selectedCourseIds.filter(id => !currentExternalIds.includes(id));
      const coursesToRemove = currentExternalIds.filter(id => !selectedCourseIds.includes(id));

      console.log('Courses to add:', coursesToAdd);
      console.log('Courses to remove:', coursesToRemove);

      // Remove courses and their assignments
      for (const externalId of coursesToRemove) {
        const courseToRemove = currentGradescopeCourses.find(course => course.externalId === externalId);
        if (courseToRemove) {
          console.log(`Removing course: ${courseToRemove.name} (${courseToRemove.id})`);
          
          // Get all assignments for this course
          const Assignment = require('../models/assignment.model');
          const courseAssignments = await Assignment.getByCourseId(courseToRemove.id);
          
          // Delete all assignments
          for (const assignment of courseAssignments) {
            await Assignment.delete(assignment.id);
            console.log(`Deleted assignment: ${assignment.title}`);
          }
          
          // Delete the course
          await Course.delete(courseToRemove.id);
          console.log(`Deleted course: ${courseToRemove.name}`);
        }
      }

      // Add new courses and their assignments
      const addedCourses = [];
      for (const externalId of coursesToAdd) {
        const gradescopeCourse = gradescopeCourses.find(course => course.id === externalId);
        if (gradescopeCourse) {
          console.log(`Adding course: ${gradescopeCourse.name} (${externalId})`);
          
          const newCourse = {
            name: gradescopeCourse.name || 'Unnamed Course',
            code: gradescopeCourse.code || 'No Code',
            professor: 'Imported from Gradescope',
            description: `Imported from Gradescope: ${gradescopeCourse.name || 'Unnamed Course'}`,
            schedule: null,
            platform: 'Gradescope',
            userId,
            externalId: gradescopeCourse.id,
            source: 'gradescope',
            term: gradescopeCourse.term || null
          };

          const createdCourse = await Course.create(newCourse, userId);
          addedCourses.push(createdCourse);

          // Add assignments for this course
          if (assignments[externalId] && assignments[externalId].length > 0) {
            for (const assignment of assignments[externalId]) {
              const newAssignment = {
                title: assignment.name || 'Unnamed Assignment',
                description: `Imported from Gradescope`,
                dueDate: new Date().setDate(new Date().getDate() + 7),
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

              const Assignment = require('../models/assignment.model');
              await Assignment.create(newAssignment, createdCourse.id, userId);
              console.log(`Added assignment: ${assignment.name}`);
            }
          }
        }
      }

      res.status(200).json({
        success: true,
        message: 'Successfully updated Gradescope course imports',
        added: addedCourses.length,
        removed: coursesToRemove.length,
        addedCourses: addedCourses
      });
    } catch (error) {
      console.error('Error managing Gradescope imports:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to manage Gradescope imports',
        details: error.message
      });
    }
  }
}

module.exports = CourseController; 