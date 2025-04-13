const { db } = require('../config/firebase');
const { handleError } = require('../middleware/error.middleware');

/**
 * Study model for handling study session data operations with Firebase
 */
class Study {
  /**
   * Create a new study session
   * @param {Object} studyData - Study session data
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Created study session
   */
  static async create(studyData, userId) {
    try {
      const studyRef = db.collection('study_sessions').doc();
      const study = {
        id: studyRef.id,
        ...studyData,
        userId
      };

      await studyRef.set(study);
      return study;
    } catch (error) {
      throw handleError(error);
    }
  }

  /**
   * Get a study session by ID
   * @param {string} id - Study session ID
   * @returns {Promise<Object|null>} Study session or null if not found
   */
  static async getById(id) {
    try {
      const studyRef = db.collection('study_sessions').doc(id);
      const study = await studyRef.get();

      if (!study.exists) {
        return null;
      }

      return study.data();
    } catch (error) {
      throw handleError(error);
    }
  }

  /**
   * Get all study sessions for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of study sessions
   */
  static async getByUserId(userId) {
    try {
      const studyRef = db.collection('study_sessions');
      const snapshot = await studyRef.where('userId', '==', userId).get();

      return snapshot.docs.map(doc => doc.data());
    } catch (error) {
      throw handleError(error);
    }
  }

  /**
   * Get all study sessions for a course
   * @param {string} courseId - Course ID
   * @returns {Promise<Array>} Array of study sessions
   */
  static async getByCourseId(courseId) {
    try {
      const studyRef = db.collection('study_sessions');
      const snapshot = await studyRef.where('courseId', '==', courseId).get();

      return snapshot.docs.map(doc => doc.data());
    } catch (error) {
      throw handleError(error);
    }
  }

  /**
   * Update a study session
   * @param {string} id - Study session ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated study session
   */
  static async update(id, updateData) {
    try {
      const studyRef = db.collection('study_sessions').doc(id);
      await studyRef.update(updateData);
      
      const updated = await studyRef.get();
      return updated.data();
    } catch (error) {
      throw handleError(error);
    }
  }

  /**
   * Delete a study session
   * @param {string} id - Study session ID
   * @returns {Promise<void>}
   */
  static async delete(id) {
    try {
      const studyRef = db.collection('study_sessions').doc(id);
      await studyRef.delete();
    } catch (error) {
      throw handleError(error);
    }
  }

  /**
   * Get study statistics for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Study statistics
   */
  static async getStats(userId) {
    try {
      const studyRef = db.collection('study_sessions');
      const snapshot = await studyRef.where('userId', '==', userId).get();

      const sessions = snapshot.docs.map(doc => doc.data());
      
      // Calculate statistics
      const totalSessions = sessions.length;
      const totalDuration = sessions.reduce((sum, session) => sum + session.duration, 0);
      const averageFocusScore = sessions.reduce((sum, session) => sum + session.focusScore, 0) / totalSessions;
      
      // Group by course
      const courseStats = sessions.reduce((stats, session) => {
        if (!stats[session.courseId]) {
          stats[session.courseId] = {
            totalDuration: 0,
            sessionCount: 0,
            averageFocusScore: 0
          };
        }
        
        stats[session.courseId].totalDuration += session.duration;
        stats[session.courseId].sessionCount += 1;
        stats[session.courseId].averageFocusScore = 
          (stats[session.courseId].averageFocusScore * (stats[session.courseId].sessionCount - 1) + 
           session.focusScore) / stats[session.courseId].sessionCount;
        
        return stats;
      }, {});

      return {
        totalSessions,
        totalDuration,
        averageFocusScore,
        courseStats
      };
    } catch (error) {
      throw handleError(error);
    }
  }
}

module.exports = Study; 