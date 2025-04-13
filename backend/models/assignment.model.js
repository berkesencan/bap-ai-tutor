const { db } = require('../config/firebase');

/**
 * Assignment model for handling assignment data operations with Firebase
 */
class Assignment {
  /**
   * Create a new assignment in Firestore
   * @param {Object} assignmentData - Assignment data to be stored
   * @param {string} courseId - Course ID
   * @param {string} userId - User ID who created the assignment
   * @returns {Promise<Object>} - Created assignment data
   */
  static async create(assignmentData, courseId, userId) {
    try {
      const { 
        title, 
        description, 
        dueDate, 
        priority, 
        status = 'pending',
        platform,
        url,
        notes,
        externalId,
        source
      } = assignmentData;
      
      const assignmentRef = db.collection('assignments').doc();
      
      const assignmentDoc = {
        id: assignmentRef.id,
        title,
        description,
        dueDate,
        priority,
        status,
        platform,
        url,
        notes,
        courseId,
        userId,
        externalId,
        source,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await assignmentRef.set(assignmentDoc);
      
      return assignmentDoc;
    } catch (error) {
      console.error('Error creating assignment:', error);
      throw error;
    }
  }
  
  /**
   * Get an assignment by ID
   * @param {string} assignmentId - Assignment ID
   * @returns {Promise<Object>} - Assignment data
   */
  static async getById(assignmentId) {
    try {
      const assignmentRef = db.collection('assignments').doc(assignmentId);
      const assignmentDoc = await assignmentRef.get();
      
      if (!assignmentDoc.exists) {
        return null;
      }
      
      return assignmentDoc.data();
    } catch (error) {
      console.error('Error getting assignment:', error);
      throw error;
    }
  }
  
  /**
   * Get all assignments for a course
   * @param {string} courseId - Course ID
   * @returns {Promise<Array>} - Array of assignment data
   */
  static async getByCourseId(courseId) {
    try {
      const assignmentsRef = db.collection('assignments').where('courseId', '==', courseId);
      const assignmentsSnapshot = await assignmentsRef.get();
      
      const assignments = [];
      assignmentsSnapshot.forEach(doc => {
        assignments.push(doc.data());
      });
      
      return assignments;
    } catch (error) {
      console.error('Error getting assignments by course ID:', error);
      throw error;
    }
  }
  
  /**
   * Get all assignments for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Array of assignment data
   */
  static async getByUserId(userId) {
    try {
      const assignmentsRef = db.collection('assignments').where('userId', '==', userId);
      const assignmentsSnapshot = await assignmentsRef.get();
      
      const assignments = [];
      assignmentsSnapshot.forEach(doc => {
        assignments.push(doc.data());
      });
      
      return assignments;
    } catch (error) {
      console.error('Error getting assignments by user ID:', error);
      throw error;
    }
  }
  
  /**
   * Get upcoming assignments for a user
   * @param {string} userId - User ID
   * @param {number} limit - Maximum number of assignments to return
   * @returns {Promise<Array>} - Array of upcoming assignment data
   */
  static async getUpcoming(userId, limit = 10) {
    try {
      const now = new Date();
      
      const assignmentsRef = db.collection('assignments')
        .where('userId', '==', userId)
        .where('dueDate', '>=', now)
        .where('status', '==', 'pending')
        .orderBy('dueDate', 'asc')
        .limit(limit);
      
      const assignmentsSnapshot = await assignmentsRef.get();
      
      const assignments = [];
      assignmentsSnapshot.forEach(doc => {
        assignments.push(doc.data());
      });
      
      return assignments;
    } catch (error) {
      console.error('Error getting upcoming assignments:', error);
      throw error;
    }
  }
  
  /**
   * Update an assignment
   * @param {string} assignmentId - Assignment ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} - Updated assignment data
   */
  static async update(assignmentId, updateData) {
    try {
      const assignmentRef = db.collection('assignments').doc(assignmentId);
      
      const updateDoc = {
        ...updateData,
        updatedAt: new Date(),
      };
      
      await assignmentRef.update(updateDoc);
      
      return this.getById(assignmentId);
    } catch (error) {
      console.error('Error updating assignment:', error);
      throw error;
    }
  }
  
  /**
   * Delete an assignment
   * @param {string} assignmentId - Assignment ID
   * @returns {Promise<boolean>} - Success status
   */
  static async delete(assignmentId) {
    try {
      const assignmentRef = db.collection('assignments').doc(assignmentId);
      await assignmentRef.delete();
      
      return true;
    } catch (error) {
      console.error('Error deleting assignment:', error);
      throw error;
    }
  }
  
  /**
   * Get past assignments for a user
   * @param {string} userId - User ID
   * @param {number} limit - Maximum number of assignments to return
   * @returns {Promise<Array>} - Array of past assignment data
   */
  static async getPast(userId, limit = 10) {
    try {
      const now = new Date();
      
      const assignmentsRef = db.collection('assignments')
        .where('userId', '==', userId)
        .where('dueDate', '<', now)
        .orderBy('dueDate', 'desc') // Most recent first
        .limit(limit);
      
      const assignmentsSnapshot = await assignmentsRef.get();
      
      const assignments = [];
      assignmentsSnapshot.forEach(doc => {
        assignments.push(doc.data());
      });
      
      return assignments;
    } catch (error) {
      console.error('Error getting past assignments:', error);
      throw error;
    }
  }
}

module.exports = Assignment; 