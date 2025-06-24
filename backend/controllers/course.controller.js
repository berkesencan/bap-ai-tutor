const Course = require('../models/course.model');
const Assignment = require('../models/assignment.model');
const { GradescopeService } = require('../services/gradescope.service');

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
      
      await Course.delete(courseId, req.user.uid);
      
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
            // Parse the due date properly
            let dueDate;
            if (assignment.dueDate) {
              // If it's already a date string from datetime attribute, parse it
              if (typeof assignment.dueDate === 'string' && assignment.dueDate.includes('-')) {
                dueDate = new Date(assignment.dueDate);
              } else {
                // Try to parse various date formats
                dueDate = new Date(assignment.dueDate);
              }
              
              // If parsing failed, set to null (unknown)
              if (isNaN(dueDate.getTime())) {
                console.warn(`Invalid due date for assignment ${assignment.name}: ${assignment.dueDate}, setting as null`);
                dueDate = null;
              }
            } else {
              console.warn(`No due date found for assignment ${assignment.name}, setting as null`);
              dueDate = null;
            }

            const newAssignment = {
              title: assignment.name || 'Unnamed Assignment',
              description: `Imported from Gradescope`,
              dueDate: dueDate,
              priority: 'medium',
              status: assignment.status || 'active',
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
          await Course.delete(courseToRemove.id, userId);
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
              // Parse the due date properly
              let dueDate;
              if (assignment.dueDate) {
                // If it's already a date string from datetime attribute, parse it
                if (typeof assignment.dueDate === 'string' && assignment.dueDate.includes('-')) {
                  dueDate = new Date(assignment.dueDate);
                } else {
                  // Try to parse various date formats
                  dueDate = new Date(assignment.dueDate);
                }
                
                // If parsing failed, set to null
                if (isNaN(dueDate.getTime())) {
                  console.warn(`Invalid due date for assignment ${assignment.name}: ${assignment.dueDate}, setting as null`);
                  dueDate = null;
                }
              } else {
                console.warn(`No due date found for assignment ${assignment.name}, setting as null`);
                dueDate = null;
              }

              const newAssignment = {
                title: assignment.name || 'Unnamed Assignment',
                description: `Imported from Gradescope`,
                dueDate: dueDate,
                priority: 'medium',
                status: assignment.status || 'active',
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

  /**
   * Create a new course
   */
  static async createCourse(req, res) {
    try {
      const userId = req.user.uid;
      const courseData = req.body;

      console.log('Creating course with data:', JSON.stringify(courseData, null, 2));
      console.log('User ID:', userId);

      // Validate required fields
      if (!courseData.name) {
        return res.status(400).json({
          success: false,
          message: 'Course name is required'
        });
      }

      const course = await Course.create(courseData, userId);
      
      console.log('Course created successfully:', JSON.stringify(course, null, 2));

      res.status(201).json({
        success: true,
        message: 'Course created successfully',
        data: {
          course: course
        }
      });
    } catch (error) {
      console.error('Error creating course:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create course',
        error: error.message
      });
    }
  }

  /**
   * Get all courses for the authenticated user
   */
  static async getUserCourses(req, res) {
    try {
      const userId = req.user.uid;
      const courses = await Course.getByUserId(userId);

      res.json({
        success: true,
        data: {
          courses: courses
        }
      });
    } catch (error) {
      console.error('Error getting user courses:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get courses',
        error: error.message
      });
    }
  }

  /**
   * Get course by ID
   */
  static async getCourseById(req, res) {
    try {
      const { courseId } = req.params;
      const userId = req.user.uid;

      const course = await Course.getById(courseId);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      // Check if user is a member
      if (!course.members.includes(userId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Add user role
      course.userRole = course.memberRoles[userId] || 'member';

      res.json({
        success: true,
        data: {
          course
        }
      });
    } catch (error) {
      console.error('Error getting course:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get course',
        error: error.message
      });
    }
  }

  /**
   * Join a course using join code
   */
  static async joinCourse(req, res) {
    try {
      const userId = req.user.uid;
      const { joinCode, password } = req.body;

      if (!joinCode) {
        return res.status(400).json({
          success: false,
          message: 'Join code is required'
        });
      }

      // Find course by join code
      const course = await Course.getByJoinCode(joinCode);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Invalid join code'
        });
      }

      // Join the course
      const updatedCourse = await Course.joinCourse(course.id, userId, password);

      res.json({
        success: true,
        message: 'Successfully joined course',
        data: updatedCourse
      });
    } catch (error) {
      console.error('Error joining course:', error);
      
      let statusCode = 500;
      if (error.message.includes('Invalid password')) {
        statusCode = 401;
      } else if (error.message.includes('already joined')) {
        statusCode = 409;
      }

      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Leave a course
   */
  static async leaveCourse(req, res) {
    try {
      const { courseId } = req.params;
      const userId = req.user.uid;
      const { newOwnerId } = req.body; // Optional: for ownership transfer

      await Course.leaveCourse(courseId, userId, newOwnerId);

      res.json({
        success: true,
        message: 'Successfully left course'
      });
    } catch (error) {
      console.error('Error leaving course:', error);
      
      let statusCode = 500;
      if (error.message.includes('must transfer ownership')) {
        statusCode = 400;
      } else if (error.message.includes('not found')) {
        statusCode = 404;
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Transfer course ownership
   */
  static async transferOwnership(req, res) {
    try {
      const { courseId } = req.params;
      const userId = req.user.uid;
      const { newOwnerId } = req.body;

      if (!newOwnerId) {
        return res.status(400).json({
          success: false,
          message: 'New owner ID is required'
        });
      }

      await Course.transferOwnership(courseId, userId, newOwnerId);

      res.json({
        success: true,
        message: 'Course ownership transferred successfully'
      });
    } catch (error) {
      console.error('Error transferring ownership:', error);
      
      let statusCode = 500;
      if (error.message.includes('Only the course creator')) {
        statusCode = 403;
      } else if (error.message.includes('not found')) {
        statusCode = 404;
      } else if (error.message.includes('must be a member')) {
        statusCode = 400;
      }
      
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Update course settings
   */
  static async updateCourse(req, res) {
    try {
      const { courseId } = req.params;
      const userId = req.user.uid;
      const updateData = req.body;

      const updatedCourse = await Course.update(courseId, userId, updateData);

      res.json({
        success: true,
        message: 'Course updated successfully',
        data: updatedCourse
      });
    } catch (error) {
      console.error('Error updating course:', error);
      
      let statusCode = 500;
      if (error.message.includes('Only the course creator')) {
        statusCode = 403;
      } else if (error.message.includes('not found')) {
        statusCode = 404;
      }

      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Delete course
   */
  static async deleteCourse(req, res) {
    try {
      const { courseId } = req.params;
      const userId = req.user.uid;

      await Course.delete(courseId, userId);

      res.json({
        success: true,
        message: 'Course deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting course:', error);
      
      let statusCode = 500;
      if (error.message.includes('Only the course creator')) {
        statusCode = 403;
      } else if (error.message.includes('not found')) {
        statusCode = 404;
      }

      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Add integration to course
   */
  static async addIntegration(req, res) {
    try {
      const { courseId } = req.params;
      const userId = req.user.uid;
      const { platform, credentials } = req.body;

      if (!platform || !credentials) {
        return res.status(400).json({
          success: false,
          message: 'Platform and credentials are required'
        });
      }

      let integrationData = {};

      // Handle different integration platforms
      switch (platform.toLowerCase()) {
        case 'gradescope':
          try {
            // Verify Gradescope credentials and fetch data
            const gradescopeData = await GradescopeService.getUserCourses(
              credentials.email,
              credentials.password
            );

            integrationData = {
              email: credentials.email,
              courses: gradescopeData.courses || [],
              assignments: gradescopeData.assignments || [],
              materials: gradescopeData.materials || [],
              announcements: gradescopeData.announcements || [],
              lastSync: new Date(),
              isActive: true
            };
          } catch (gradescopeError) {
            return res.status(400).json({
              success: false,
              message: 'Invalid Gradescope credentials or connection failed',
              error: gradescopeError.message
            });
          }
          break;

        case 'canvas':
          // Canvas integration (placeholder for future implementation)
          integrationData = {
            apiKey: credentials.apiKey,
            baseUrl: credentials.baseUrl,
            courses: [],
            assignments: [],
            materials: [],
            announcements: [],
            lastSync: new Date(),
            isActive: true
          };
          break;

        case 'brightspace':
          // Brightspace integration (placeholder for future implementation)
          integrationData = {
            apiKey: credentials.apiKey,
            baseUrl: credentials.baseUrl,
            courses: [],
            assignments: [],
            materials: [],
            announcements: [],
            lastSync: new Date(),
            isActive: true
          };
          break;

        default:
          return res.status(400).json({
            success: false,
            message: 'Unsupported platform'
          });
      }

      const updatedCourse = await Course.addIntegration(
        courseId,
        userId,
        platform.toLowerCase(),
        integrationData
      );

      res.json({
        success: true,
        message: `${platform} integration added successfully`,
        data: updatedCourse
      });
    } catch (error) {
      console.error('Error adding integration:', error);
      
      let statusCode = 500;
      if (error.message.includes('not a member')) {
        statusCode = 403;
      } else if (error.message.includes('not found')) {
        statusCode = 404;
      }

      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Remove integration from course
   */
  static async removeIntegration(req, res) {
    try {
      const { courseId, platform } = req.params;
      const userId = req.user.uid;

      const updatedCourse = await Course.removeIntegration(courseId, userId, platform);

      res.json({
        success: true,
        message: `${platform} integration removed successfully`,
        data: updatedCourse
      });
    } catch (error) {
      console.error('Error removing integration:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get course integrations for user
   */
  static async getUserIntegrations(req, res) {
    try {
      const { courseId } = req.params;
      const userId = req.user.uid;

      const course = await Course.getById(courseId);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      if (!course.members.includes(userId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const userIntegrations = course.integrations[userId] || {};

      res.json({
        success: true,
        data: userIntegrations
      });
    } catch (error) {
      console.error('Error getting user integrations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get integrations',
        error: error.message
      });
    }
  }

  /**
   * Sync integration data
   */
  static async syncIntegration(req, res) {
    try {
      const { courseId, platform } = req.params;
      const userId = req.user.uid;

      const course = await Course.getById(courseId);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      if (!course.integrations[userId] || !course.integrations[userId][platform]) {
        return res.status(404).json({
          success: false,
          message: 'Integration not found'
        });
      }

      const integration = course.integrations[userId][platform];
      let updatedIntegrationData = { ...integration };

      // Sync based on platform
      switch (platform.toLowerCase()) {
        case 'gradescope':
          try {
            const gradescopeData = await GradescopeService.getUserCourses(
              integration.email,
              integration.password
            );

            updatedIntegrationData = {
              ...integration,
              courses: gradescopeData.courses || [],
              assignments: gradescopeData.assignments || [],
              materials: gradescopeData.materials || [],
              announcements: gradescopeData.announcements || [],
              lastSync: new Date()
            };
          } catch (gradescopeError) {
            return res.status(400).json({
              success: false,
              message: 'Failed to sync Gradescope data',
              error: gradescopeError.message
            });
          }
          break;

        default:
          return res.status(400).json({
            success: false,
            message: 'Sync not supported for this platform'
          });
      }

      // Update the integration
      const updatedCourse = await Course.addIntegration(
        courseId,
        userId,
        platform,
        updatedIntegrationData
      );

      res.json({
        success: true,
        message: `${platform} integration synced successfully`,
        data: updatedCourse
      });
    } catch (error) {
      console.error('Error syncing integration:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Search public courses
   */
  static async searchPublicCourses(req, res) {
    try {
      const { query, filters } = req.query;
      const courses = await Course.searchPublicCourses(query, filters);
      res.status(200).json({
        success: true,
        message: "Public courses fetched successfully",
        data: courses
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Get course assignments (aggregated from all integrations)
   */
  static async getCourseAssignments(req, res) {
    try {
      const { courseId } = req.params;
      const userId = req.user.uid;

      const course = await Course.getById(courseId);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      if (!course.members.includes(userId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      res.json({
        success: true,
        data: {
          assignments: course.assignments || [],
          totalCount: course.assignments?.length || 0,
          lastUpdated: course.updatedAt
        }
      });
    } catch (error) {
      console.error('Error getting course assignments:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get assignments',
        error: error.message
      });
    }
  }

  /**
   * Get course materials (aggregated from all integrations)
   */
  static async getCourseMaterials(req, res) {
    try {
      const { courseId } = req.params;
      const userId = req.user.uid;

      const course = await Course.getById(courseId);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      if (!course.members.includes(userId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      res.json({
        success: true,
        data: {
          materials: course.materials || [],
          totalCount: course.materials?.length || 0,
          lastUpdated: course.updatedAt
        }
      });
    } catch (error) {
      console.error('Error getting course materials:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get materials',
        error: error.message
      });
    }
  }

  /**
   * Get course analytics (for course creators)
   */
  static async getCourseAnalytics(req, res) {
    try {
      const { courseId } = req.params;
      const userId = req.user.uid;

      const course = await Course.getById(courseId);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      if (course.createdBy !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Only course creator can view analytics'
        });
      }

      res.json({
        success: true,
        data: course.analytics
      });
    } catch (error) {
      console.error('Error getting course analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get analytics',
        error: error.message
      });
    }
  }

  /**
   * Update member role
   */
  static async updateMemberRole(req, res) {
    try {
      const { courseId, memberId } = req.params;
      const { role } = req.body;
      const requestingUserId = req.user.uid;

      await Course.updateMemberRole(courseId, requestingUserId, memberId, role);

      res.status(200).json({
        success: true,
        message: "Member role updated successfully."
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Remove member
   */
  static async removeMember(req, res) {
    try {
      const { courseId, memberId } = req.params;
      const requestingUserId = req.user.uid;

      await Course.removeMember(courseId, requestingUserId, memberId);

      res.status(200).json({
        success: true,
        message: "Member removed successfully."
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Get available integrations for merging (integrations not linked to any course by current user)
   */
  static async getAvailableIntegrations(req, res) {
    try {
      const userId = req.user.uid;
      
      // Get all courses for the user
      const allCourses = await Course.getByUserId(userId);
      
      // Get all integration courses (courses with source)
      const integrationCourses = allCourses.filter(course => 
        course.source && course.source !== 'native'
      );
      
      // Get all linked integration IDs for this user
      const linkedIntegrationIds = new Set();
      allCourses.forEach(course => {
        // Check user-specific linked integrations
        if (course.userLinkedIntegrations && course.userLinkedIntegrations[userId]) {
          course.userLinkedIntegrations[userId].forEach(integration => {
            linkedIntegrationIds.add(integration.integrationId);
          });
        }
        // Legacy format fallback
        if (course.linkedIntegrations) {
          course.linkedIntegrations.forEach(integration => {
            linkedIntegrationIds.add(integration.integrationId);
          });
        }
      });
      
      // Filter out linked integrations for this user
      const availableIntegrations = integrationCourses.filter(course => 
        !linkedIntegrationIds.has(course.id)
      );
      
      // Group by platform
      const integrationsByPlatform = availableIntegrations.reduce((acc, course) => {
        const platform = course.source;
        if (!acc[platform]) {
          acc[platform] = [];
        }
        acc[platform].push(course);
        return acc;
      }, {});
      
      console.log(`[Course Controller] Found ${availableIntegrations.length} available integrations for user ${userId}`);
      console.log(`[Course Controller] User has ${linkedIntegrationIds.size} already linked integrations`);
      
      res.json({
        success: true,
        data: {
          availableIntegrations,
          integrationsByPlatform,
          totalAvailable: availableIntegrations.length,
          totalLinked: linkedIntegrationIds.size
        }
      });
    } catch (error) {
      console.error('Error getting available integrations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get available integrations',
        error: error.message
      });
    }
  }

  /**
   * Link existing integrations to a course
   */
  static async linkIntegrationsToCourse(req, res) {
    try {
      const { courseId } = req.params;
      const { integrationIds } = req.body;
      const userId = req.user.uid;

      if (!Array.isArray(integrationIds) || integrationIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Integration IDs array is required'
        });
      }

      const course = await Course.getById(courseId);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      // Check if user is a member of the course (any member can link integrations for themselves)
      if (!course.members || !course.members.includes(userId)) {
        return res.status(403).json({
          success: false,
          message: 'You must be a member of this course to link integrations'
        });
      }

      // Get integration courses
      const integrationCourses = [];
      for (const integrationId of integrationIds) {
        const integrationCourse = await Course.getById(integrationId);
        if (integrationCourse && integrationCourse.source && integrationCourse.source !== 'native') {
          integrationCourses.push(integrationCourse);
        }
      }

      if (integrationCourses.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid integration courses found'
        });
      }

      // Link integrations to the course for this user
      const updatedCourse = await Course.linkIntegrations(courseId, integrationCourses, userId);

      res.json({
        success: true,
        message: `Successfully linked ${integrationCourses.length} integration(s) to course`,
        data: updatedCourse
      });
    } catch (error) {
      console.error('Error linking integrations to course:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to link integrations to course',
        error: error.message
      });
    }
  }

  /**
   * Unlink integration from a course
   */
  static async unlinkIntegrationFromCourse(req, res) {
    try {
      const { courseId, integrationId } = req.params;
      const userId = req.user.uid;

      const course = await Course.getById(courseId);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      // Check if user is a member of the course (any member can unlink their own integrations)
      if (!course.members || !course.members.includes(userId)) {
        return res.status(403).json({
          success: false,
          message: 'You must be a member of this course to unlink integrations'
        });
      }

      const updatedCourse = await Course.unlinkIntegration(courseId, integrationId, userId);

      res.json({
        success: true,
        message: 'Integration unlinked successfully',
        data: updatedCourse
      });
    } catch (error) {
      console.error('Error unlinking integration from course:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to unlink integration from course',
        error: error.message
      });
    }
  }

  /**
   * Merge multiple integrations into a new course
   */
  static async mergeIntegrationsIntoCourse(req, res) {
    try {
      const { integrationIds, courseData } = req.body;
      const userId = req.user.uid;

      console.log('Merging integrations with data:', JSON.stringify({ integrationIds, courseData }, null, 2));
      console.log('User ID:', userId);

      if (!Array.isArray(integrationIds) || integrationIds.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'At least 2 integration IDs are required for merging'
        });
      }

      if (!courseData || !courseData.name) {
        return res.status(400).json({
          success: false,
          message: 'Course data with name is required'
        });
      }

      // Get integration courses
      const integrationCourses = [];
      for (const integrationId of integrationIds) {
        const integrationCourse = await Course.getById(integrationId);
        if (integrationCourse && integrationCourse.source && integrationCourse.source !== 'native') {
          integrationCourses.push(integrationCourse);
        }
      }

      if (integrationCourses.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'At least 2 valid integration courses are required'
        });
      }

      // Create new course with merged data
      const newCourse = await Course.createWithIntegrations(courseData, integrationCourses, userId);
      
      console.log('Course with integrations created successfully:', JSON.stringify(newCourse, null, 2));

      res.status(201).json({
        success: true,
        message: `Successfully created course with ${integrationCourses.length} integrated platforms`,
        data: {
          course: newCourse
        }
      });
    } catch (error) {
      console.error('Error merging integrations into course:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to merge integrations into course',
        error: error.message
      });
    }
  }

  /**
   * Delete integration course with warning if linked
   */
  static async deleteIntegrationCourse(req, res) {
    try {
      const { courseId } = req.params;
      const { force } = req.query; // Allow force deletion
      const userId = req.user.uid;

      const course = await Course.getById(courseId);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      // Check if this is an integration course
      if (!course.source || course.source === 'native') {
        return res.status(400).json({
          success: false,
          message: 'This is not an integration course'
        });
      }

      // Check if user has permission
      const userRole = course.memberRoles[userId];
      if (!userRole || !['creator', 'admin'].includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to delete this course'
        });
      }

      // Check if this integration is linked to any course
      const allCourses = await Course.getByUserId(userId);
      const linkedCourses = allCourses.filter(c => 
        c.linkedIntegrations && 
        c.linkedIntegrations.some(integration => integration.integrationId === courseId)
      );

      if (linkedCourses.length > 0 && force !== 'true') {
        return res.status(409).json({
          success: false,
          message: 'This integration is currently linked to active courses',
          linkedCourses: linkedCourses.map(c => ({ id: c.id, name: c.name, code: c.code })),
          requiresForce: true
        });
      }

      // If force deletion or no links, proceed with deletion
      if (linkedCourses.length > 0) {
        // Remove from linked courses first
        for (const linkedCourse of linkedCourses) {
          await Course.unlinkIntegration(linkedCourse.id, courseId, userId);
        }
      }

      // Delete the integration course
      await Course.delete(courseId, userId);

      res.json({
        success: true,
        message: 'Integration course deleted successfully',
        unlinkedFrom: linkedCourses.length
      });
    } catch (error) {
      console.error('Error deleting integration course:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete integration course',
        error: error.message
      });
    }
  }
}

module.exports = CourseController; 