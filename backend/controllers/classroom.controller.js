const { validationResult } = require('express-validator');
const Classroom = require('../models/classroom.model');

class ClassroomController {
  /**
   * Create a new classroom (Teachers only)
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async create(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const teacherId = req.user.uid;
      const classroomData = req.body;

      const classroom = await Classroom.create(classroomData, teacherId);

      res.status(201).json({
        success: true,
        message: 'Classroom created successfully',
        data: {
          classroom,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all classrooms for the current user (Teachers get their classrooms, Students get enrolled classrooms)
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async getAll(req, res, next) {
    try {
      const userId = req.user.uid;
      const { role } = req.query; // 'teacher' or 'student'

      let classrooms;
      if (role === 'teacher') {
        classrooms = await Classroom.getByTeacherId(userId);
      } else {
        // Default to student view or get both
        const teacherClassrooms = await Classroom.getByTeacherId(userId);
        const studentClassrooms = await Classroom.getByStudentId(userId);
        
        classrooms = {
          teaching: teacherClassrooms,
          enrolled: studentClassrooms
        };
      }

      res.status(200).json({
        success: true,
        data: {
          classrooms,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get classroom by ID
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async getById(req, res, next) {
    try {
      const { classroomId } = req.params;
      const userId = req.user.uid;

      const classroom = await Classroom.getById(classroomId);

      if (!classroom) {
        return res.status(404).json({
          success: false,
          message: 'Classroom not found',
        });
      }

      // Check if user has access (teacher or enrolled student)
      const hasAccess = classroom.teacherId === userId || 
                       classroom.enrolledStudents.includes(userId);

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this classroom',
        });
      }

      res.status(200).json({
        success: true,
        data: {
          classroom,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Join classroom via invite code
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async joinByInviteCode(req, res, next) {
    try {
      const { inviteCode, password } = req.body;
      const studentId = req.user.uid;

      if (!inviteCode) {
        return res.status(400).json({
          success: false,
          message: 'Invite code is required',
        });
      }

      const classroom = await Classroom.getByInviteCode(inviteCode);

      if (!classroom) {
        return res.status(404).json({
          success: false,
          message: 'Invalid invite code',
        });
      }

      const updatedClassroom = await Classroom.addStudent(classroom.id, studentId, password);

      res.status(200).json({
        success: true,
        message: 'Successfully joined classroom',
        data: {
          classroom: updatedClassroom,
        },
      });
    } catch (error) {
      if (error.message === 'Invalid password') {
        return res.status(401).json({
          success: false,
          message: 'Invalid password for this classroom',
        });
      }
      if (error.message === 'Student already enrolled') {
        return res.status(409).json({
          success: false,
          message: 'You are already enrolled in this classroom',
        });
      }
      next(error);
    }
  }

  /**
   * Update classroom settings (Teachers only)
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async update(req, res, next) {
    try {
      const { classroomId } = req.params;
      const updateData = req.body;
      const userId = req.user.uid;

      const classroom = await Classroom.getById(classroomId);

      if (!classroom) {
        return res.status(404).json({
          success: false,
          message: 'Classroom not found',
        });
      }

      // Check if user is the teacher
      if (classroom.teacherId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Only the teacher can update classroom settings',
        });
      }

      const updatedClassroom = await Classroom.update(classroomId, updateData);

      res.status(200).json({
        success: true,
        message: 'Classroom updated successfully',
        data: {
          classroom: updatedClassroom,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add integration to classroom
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async addIntegration(req, res, next) {
    try {
      const { classroomId } = req.params;
      const { platform, integrationData } = req.body;
      const studentId = req.user.uid;

      const classroom = await Classroom.getByInviteCode(classroomId);

      if (!classroom) {
        return res.status(404).json({
          success: false,
          message: 'Classroom not found',
        });
      }

      // Check if platform is allowed
      if (!classroom.aiSettings.allowedIntegrations.includes(platform)) {
        return res.status(403).json({
          success: false,
          message: `${platform} integration is not allowed for this classroom`,
        });
      }

      const updatedClassroom = await Classroom.addIntegration(
        classroom.id, 
        studentId, 
        platform, 
        integrationData
      );

      res.status(200).json({
        success: true,
        message: 'Integration added successfully',
        data: {
          classroom: updatedClassroom,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get classroom analytics (Teachers only)
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async getAnalytics(req, res, next) {
    try {
      const { classroomId } = req.params;
      const userId = req.user.uid;

      const classroom = await Classroom.getById(classroomId);

      if (!classroom) {
        return res.status(404).json({
          success: false,
          message: 'Classroom not found',
        });
      }

      // Check if user is the teacher
      if (classroom.teacherId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Only the teacher can view classroom analytics',
        });
      }

      // Get detailed AI interaction analytics
      const { db } = require('../config/firebase');
      const interactionsSnapshot = await db.collection('ai_interactions')
        .where('classroomId', '==', classroomId)
        .orderBy('timestamp', 'desc')
        .limit(100)
        .get();

      const interactions = [];
      interactionsSnapshot.forEach(doc => {
        interactions.push(doc.data());
      });

      // Calculate engagement metrics
      const engagementByStudent = {};
      interactions.forEach(interaction => {
        if (!engagementByStudent[interaction.studentId]) {
          engagementByStudent[interaction.studentId] = 0;
        }
        engagementByStudent[interaction.studentId]++;
      });

      const analytics = {
        ...classroom.analytics,
        recentInteractions: interactions.slice(0, 20),
        engagementByStudent,
        averageEngagement: Object.keys(engagementByStudent).length > 0 
          ? Object.values(engagementByStudent).reduce((a, b) => a + b, 0) / Object.keys(engagementByStudent).length 
          : 0
      };

      res.status(200).json({
        success: true,
        data: {
          analytics,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete classroom (Teachers only)
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async delete(req, res, next) {
    try {
      const { classroomId } = req.params;
      const userId = req.user.uid;

      const classroom = await Classroom.getById(classroomId);

      if (!classroom) {
        return res.status(404).json({
          success: false,
          message: 'Classroom not found',
        });
      }

      // Check if user is the teacher
      if (classroom.teacherId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Only the teacher can delete the classroom',
        });
      }

      await Classroom.delete(classroomId);

      res.status(200).json({
        success: true,
        message: 'Classroom deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get available integrations for a classroom
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async getAvailableIntegrations(req, res, next) {
    try {
      const { classroomId } = req.params;
      const userId = req.user.uid;

      const classroom = await Classroom.getById(classroomId);

      if (!classroom) {
        return res.status(404).json({
          success: false,
          message: 'Classroom not found',
        });
      }

      // Check if user has access
      const hasAccess = classroom.teacherId === userId || 
                       classroom.enrolledStudents.includes(userId);

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this classroom',
        });
      }

      const integrations = {
        gradescope: {
          name: 'Gradescope',
          description: 'Import assignments and grades from Gradescope',
          enabled: classroom.aiSettings.allowedIntegrations.includes('gradescope'),
          icon: '🎓'
        },
        canvas: {
          name: 'Canvas',
          description: 'Import courses and materials from Canvas LMS',
          enabled: classroom.aiSettings.allowedIntegrations.includes('canvas'),
          icon: '🎨'
        },
        brightspace: {
          name: 'Brightspace',
          description: 'Import content from Brightspace D2L',
          enabled: classroom.aiSettings.allowedIntegrations.includes('brightspace'),
          icon: '💡'
        }
      };

      res.status(200).json({
        success: true,
        data: {
          integrations,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ClassroomController; 