const { db } = require('../config/firebase');
const Assignment = require('../models/assignment.model');
const Study = require('../models/study.model');
const Course = require('../models/course.model');

/**
 * Analytics controller for handling analytics-related operations
 */
class AnalyticsController {
  /**
   * Get overview analytics for the current user
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async getOverview(req, res, next) {
    try {
      const userId = req.user.uid;
      
      // Get user's courses
      const courses = await Course.getByUserId(userId);
      
      // Get user's assignments
      const assignments = await Assignment.getByUserId(userId);
      
      // Get user's study sessions
      const studySessions = await Study.getByUserId(userId);
      
      // Calculate analytics
      const totalCourses = courses.length;
      const totalAssignments = assignments.length;
      const completedAssignments = assignments.filter(a => a.status === 'completed').length;
      const pendingAssignments = assignments.filter(a => a.status === 'pending').length;
      const inProgressAssignments = assignments.filter(a => a.status === 'in-progress').length;
      
      const totalStudyTime = studySessions.reduce((total, session) => total + session.duration, 0);
      const averageFocusScore = studySessions.length > 0 
        ? studySessions.reduce((total, session) => total + (session.focusScore || 0), 0) / studySessions.length 
        : 0;
      
      res.status(200).json({
        success: true,
        data: {
          courses: {
            total: totalCourses,
            list: courses
          },
          assignments: {
            total: totalAssignments,
            completed: completedAssignments,
            pending: pendingAssignments,
            inProgress: inProgressAssignments
          },
          study: {
            totalTime: totalStudyTime,
            averageFocusScore: averageFocusScore,
            totalSessions: studySessions.length
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get analytics for a specific course
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async getCourseAnalytics(req, res, next) {
    try {
      const userId = req.user.uid;
      const { courseId } = req.params;
      
      // Check if the course exists and belongs to the current user
      const course = await Course.getById(courseId);
      
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }
      
      if (course.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this course'
        });
      }
      
      // Get assignments for this course
      const assignments = await Assignment.getByCourseId(courseId);
      
      // Get study sessions for this course
      const studySessions = await Study.getByCourseId(courseId);
      
      // Calculate analytics
      const totalAssignments = assignments.length;
      const completedAssignments = assignments.filter(a => a.status === 'completed').length;
      const pendingAssignments = assignments.filter(a => a.status === 'pending').length;
      const inProgressAssignments = assignments.filter(a => a.status === 'in-progress').length;
      
      const totalStudyTime = studySessions.reduce((total, session) => total + session.duration, 0);
      const averageFocusScore = studySessions.length > 0 
        ? studySessions.reduce((total, session) => total + (session.focusScore || 0), 0) / studySessions.length 
        : 0;
      
      res.status(200).json({
        success: true,
        data: {
          course,
          assignments: {
            total: totalAssignments,
            completed: completedAssignments,
            pending: pendingAssignments,
            inProgress: inProgressAssignments,
            list: assignments
          },
          study: {
            totalTime: totalStudyTime,
            averageFocusScore: averageFocusScore,
            totalSessions: studySessions.length,
            sessions: studySessions
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get study analytics for the current user
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async getStudyAnalytics(req, res, next) {
    try {
      const userId = req.user.uid;
      
      // Get user's study sessions
      const studySessions = await Study.getByUserId(userId);
      
      // Get user's courses
      const courses = await Course.getByUserId(userId);
      
      // Calculate analytics
      const totalStudyTime = studySessions.reduce((total, session) => total + session.duration, 0);
      const averageFocusScore = studySessions.length > 0 
        ? studySessions.reduce((total, session) => total + (session.focusScore || 0), 0) / studySessions.length 
        : 0;
      
      // Group study sessions by course
      const studyByCourse = {};
      courses.forEach(course => {
        const courseSessions = studySessions.filter(session => session.courseId === course.id);
        const courseTotalTime = courseSessions.reduce((total, session) => total + session.duration, 0);
        const courseAverageFocus = courseSessions.length > 0 
          ? courseSessions.reduce((total, session) => total + (session.focusScore || 0), 0) / courseSessions.length 
          : 0;
        
        studyByCourse[course.id] = {
          courseName: course.name,
          totalTime: courseTotalTime,
          averageFocusScore: courseAverageFocus,
          sessions: courseSessions.length
        };
      });
      
      res.status(200).json({
        success: true,
        data: {
          totalStudyTime,
          averageFocusScore,
          totalSessions: studySessions.length,
          studyByCourse,
          sessions: studySessions
        }
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get AI interaction analytics for the current user
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async getAIAnalytics(req, res, next) {
    try {
      const userId = req.user.uid;
      
      // Get user's chat sessions from Firestore
      const chatSessionsRef = db.collection('chatSessions').where('userId', '==', userId);
      const chatSessionsSnapshot = await chatSessionsRef.get();
      
      const chatSessions = [];
      chatSessionsSnapshot.forEach(doc => {
        chatSessions.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Calculate analytics
      const totalChatSessions = chatSessions.length;
      const totalMessages = chatSessions.reduce((total, session) => total + (session.messages?.length || 0), 0);
      
      // Group chat sessions by course
      const chatByCourse = {};
      const courses = await Course.getByUserId(userId);
      
      courses.forEach(course => {
        const courseSessions = chatSessions.filter(session => session.courseId === course.id);
        const courseMessages = courseSessions.reduce((total, session) => total + (session.messages?.length || 0), 0);
        
        chatByCourse[course.id] = {
          courseName: course.name,
          sessions: courseSessions.length,
          messages: courseMessages
        };
      });
      
      res.status(200).json({
        success: true,
        data: {
          totalChatSessions,
          totalMessages,
          chatByCourse,
          sessions: chatSessions
        }
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get learning trends for the current user
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  static async getLearningTrends(req, res, next) {
    try {
      const userId = req.user.uid;
      
      // Get user's study sessions
      const studySessions = await Study.getByUserId(userId);
      
      // Get user's assignments
      const assignments = await Assignment.getByUserId(userId);
      
      // Group study sessions by week
      const studyByWeek = {};
      studySessions.forEach(session => {
        const date = new Date(session.startTime);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
        const weekKey = weekStart.toISOString().split('T')[0];
        
        if (!studyByWeek[weekKey]) {
          studyByWeek[weekKey] = {
            totalTime: 0,
            sessions: 0,
            averageFocusScore: 0,
            focusScores: []
          };
        }
        
        studyByWeek[weekKey].totalTime += session.duration;
        studyByWeek[weekKey].sessions += 1;
        if (session.focusScore) {
          studyByWeek[weekKey].focusScores.push(session.focusScore);
        }
      });
      
      // Calculate average focus score for each week
      Object.keys(studyByWeek).forEach(week => {
        const weekData = studyByWeek[week];
        if (weekData.focusScores.length > 0) {
          weekData.averageFocusScore = weekData.focusScores.reduce((total, score) => total + score, 0) / weekData.focusScores.length;
        }
        delete weekData.focusScores; // Remove the array from the response
      });
      
      // Group assignments by week
      const assignmentsByWeek = {};
      assignments.forEach(assignment => {
        const dueDate = new Date(assignment.dueDate);
        const weekStart = new Date(dueDate);
        weekStart.setDate(dueDate.getDate() - dueDate.getDay()); // Start of week (Sunday)
        const weekKey = weekStart.toISOString().split('T')[0];
        
        if (!assignmentsByWeek[weekKey]) {
          assignmentsByWeek[weekKey] = {
            total: 0,
            completed: 0,
            pending: 0,
            inProgress: 0
          };
        }
        
        assignmentsByWeek[weekKey].total += 1;
        if (assignment.status === 'completed') {
          assignmentsByWeek[weekKey].completed += 1;
        } else if (assignment.status === 'pending') {
          assignmentsByWeek[weekKey].pending += 1;
        } else if (assignment.status === 'in-progress') {
          assignmentsByWeek[weekKey].inProgress += 1;
        }
      });
      
      res.status(200).json({
        success: true,
        data: {
          studyByWeek,
          assignmentsByWeek
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AnalyticsController; 