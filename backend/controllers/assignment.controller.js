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
      
      // Check if the course exists and user has access
      const course = await Course.getById(courseId);
      
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found',
        });
      }
      
      // Check if user is a member of the course (and has permission to create assignments)
      if (!course.members || !course.members.includes(userId)) {
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
   * Get all assignments for a course (user-specific from linked integrations)
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async getByCourse(req, res, next) {
    try {
      const { courseId } = req.params;
      const userId = req.user.uid;
      
      // Check if the course exists and user has access
      const course = await Course.getById(courseId);
      
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found',
        });
      }
      
      // Check if user is a member of the course
      if (!course.members || !course.members.includes(userId)) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access assignments for this course',
        });
      }
      
      let assignments = [];
      
      // NEW: Get user-specific assignments from linked integrations
      if (course.userLinkedIntegrations && course.userLinkedIntegrations[userId]) {
        console.log(`[Assignment Controller] Getting user-specific assignments for ${course.userLinkedIntegrations[userId].length} linked integrations`);
        
        // Check if user has aggregated data
        const userAggregatedData = course.userAggregatedData?.[userId];
        if (userAggregatedData && userAggregatedData.assignments) {
          assignments = userAggregatedData.assignments;
          console.log(`[Assignment Controller] Found ${assignments.length} user-specific assignments`);
        } else {
          // Trigger aggregation for this user if not done yet
          console.log(`[Assignment Controller] No aggregated data found, triggering aggregation`);
          await Course.aggregateUserLinkedIntegrationContent(courseId, userId);
          
          // Reload course data
          const updatedCourse = await Course.getById(courseId);
          const updatedUserData = updatedCourse.userAggregatedData?.[userId];
          if (updatedUserData && updatedUserData.assignments) {
            assignments = updatedUserData.assignments;
          }
        }
      }
      // Fallback: Check for legacy global linked integrations
      else if (course.linkedIntegrations && course.linkedIntegrations.length > 0) {
        console.log(`[Assignment Controller] Using legacy linked integrations`);
        assignments = course.assignments || [];
      }
      // Fallback: Get regular course assignments
      else {
        console.log(`[Assignment Controller] Getting regular course assignments`);
        assignments = await Assignment.getByCourseId(courseId);
      }
      
      // Also include user-specific integration assignments (old format)
      if (course.integrations && course.integrations[userId]) {
        console.log(`[Assignment Controller] Including user-specific integration assignments (old format)`);
        Object.values(course.integrations[userId]).forEach(integration => {
          if (integration.isActive && integration.assignments) {
            assignments = assignments.concat(integration.assignments.map(assignment => ({
              ...assignment,
              sourceIntegration: 'user-specific',
              sourcePlatform: 'legacy',
              courseName: course.name
            })));
          }
        });
      }
      
      console.log(`[Assignment Controller] Returning ${assignments.length} total assignments for course ${course.name}`);
      
      res.status(200).json({
        success: true,
        data: {
          assignments,
          userSpecific: !!(course.userLinkedIntegrations && course.userLinkedIntegrations[userId]),
          totalLinkedIntegrations: course.userLinkedIntegrations?.[userId]?.length || 0
        },
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get all assignments for the current user (including from linked integrations)
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async getAll(req, res, next) {
    try {
      const userId = req.user.uid;
      
      // Get regular assignments
      let assignments = await Assignment.getByUserId(userId);
      
      // Get assignments from user's courses with linked integrations
      const userCourses = await Course.getByUserId(userId);
      
      for (const course of userCourses) {
        // Check for user-specific linked integrations
        if (course.userLinkedIntegrations && course.userLinkedIntegrations[userId]) {
          const userAggregatedData = course.userAggregatedData?.[userId];
          if (userAggregatedData && userAggregatedData.assignments) {
            // Add course assignments with course context, but preserve original assignment data
            const courseAssignments = userAggregatedData.assignments.map(assignment => ({
              ...assignment,
              // Preserve original courseId (integration course ID) for proper frontend filtering
              // Don't overwrite courseName - it should remain the integration course name
              // Add BAP course context for reference only
              parentBapCourseId: course.id,
              parentBapCourseName: course.name,
              parentBapCourseCode: course.code,
              fromLinkedIntegration: true
            }));
            assignments = assignments.concat(courseAssignments);
          }
        }
        // Fallback: Check legacy linked integrations
        else if (course.linkedIntegrations && course.linkedIntegrations.length > 0) {
          const courseAssignments = (course.assignments || []).map(assignment => ({
            ...assignment,
            // Preserve original assignment data for legacy integrations too
            parentBapCourseId: course.id,
            parentBapCourseName: course.name,
            parentBapCourseCode: course.code,
            fromLinkedIntegration: true
          }));
          assignments = assignments.concat(courseAssignments);
        }
        
        // Also include user-specific integration assignments (old format)
        if (course.integrations && course.integrations[userId]) {
          Object.values(course.integrations[userId]).forEach(integration => {
            if (integration.isActive && integration.assignments) {
              const integrationAssignments = integration.assignments.map(assignment => ({
                ...assignment,
                // For old format, preserve original data and add BAP course context
                parentBapCourseId: course.id,
                parentBapCourseName: course.name,
                parentBapCourseCode: course.code,
                sourceIntegration: 'user-specific',
                sourcePlatform: 'legacy',
                fromLinkedIntegration: true
              }));
              assignments = assignments.concat(integrationAssignments);
            }
          });
        }
      }
      
      console.log(`[Assignment Controller] Returning ${assignments.length} total assignments for user`);
      
      // Deduplicate assignments based on assignment ID and external ID
      const uniqueAssignments = [];
      const seenIds = new Set();
      const seenExternalIds = new Set();
      
      for (const assignment of assignments) {
        const assignmentKey = assignment.id || assignment.externalId || `${assignment.title}-${assignment.courseId}`;
        const externalKey = assignment.externalId ? `${assignment.externalId}-${assignment.courseId}` : null;
        
        // Skip if we've already seen this assignment
        if (seenIds.has(assignmentKey) || (externalKey && seenExternalIds.has(externalKey))) {
          console.log(`[Assignment Controller] Skipping duplicate assignment: ${assignment.title} (${assignmentKey})`);
          continue;
        }
        
        seenIds.add(assignmentKey);
        if (externalKey) {
          seenExternalIds.add(externalKey);
        }
        
        uniqueAssignments.push(assignment);
      }
      
      console.log(`[Assignment Controller] After deduplication: ${uniqueAssignments.length} unique assignments (removed ${assignments.length - uniqueAssignments.length} duplicates)`);
      
      res.status(200).json({
        success: true,
        data: {
          assignments: uniqueAssignments,
          totalCourses: userCourses.length,
          coursesWithLinkedIntegrations: userCourses.filter(c => 
            (c.userLinkedIntegrations && c.userLinkedIntegrations[userId]) || 
            (c.linkedIntegrations && c.linkedIntegrations.length > 0)
          ).length
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
   * Get past assignments for the current user
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async getPast(req, res, next) {
    try {
      const userId = req.user.uid;
      const { limit } = req.query;
      
      const assignments = await Assignment.getPast(userId, limit ? parseInt(limit) : 10);
      
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