const { db } = require('../config/firebase');

/**
 * Course model for handling course data operations with Firebase
 */
class Course {
  /**
   * Create a new course in Firestore
   * @param {Object} courseData - Course data to be stored
   * @param {string} userId - User ID who created the course
   * @returns {Promise<Object>} - Created course data
   */
  static async create(courseData, userId) {
    try {
      const { name, code, professor, description, schedule, platform } = courseData;
      
      const courseRef = db.collection('courses').doc();
      
      const courseDoc = {
        id: courseRef.id,
        name,
        code,
        professor,
        description,
        schedule,
        platform,
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await courseRef.set(courseDoc);
      
      return courseDoc;
    } catch (error) {
      console.error('Error creating course:', error);
      throw error;
    }
  }
  
  /**
   * Get a course by ID
   * @param {string} courseId - Course ID
   * @returns {Promise<Object>} - Course data
   */
  static async getById(courseId) {
    try {
      const courseRef = db.collection('courses').doc(courseId);
      const courseDoc = await courseRef.get();
      
      if (!courseDoc.exists) {
        return null;
      }
      
      return courseDoc.data();
    } catch (error) {
      console.error('Error getting course:', error);
      throw error;
    }
  }
  
  /**
   * Get all courses for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Array of course data
   */
  static async getByUserId(userId) {
    try {
      const coursesRef = db.collection('courses').where('userId', '==', userId);
      const coursesSnapshot = await coursesRef.get();
      
      const courses = [];
      coursesSnapshot.forEach(doc => {
        courses.push(doc.data());
      });
      
      return courses;
    } catch (error) {
      console.error('Error getting courses by user ID:', error);
      throw error;
    }
  }
  
  /**
   * Update a course
   * @param {string} courseId - Course ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} - Updated course data
   */
  static async update(courseId, updateData) {
    try {
      const courseRef = db.collection('courses').doc(courseId);
      
      const updateDoc = {
        ...updateData,
        updatedAt: new Date(),
      };
      
      await courseRef.update(updateDoc);
      
      return this.getById(courseId);
    } catch (error) {
      console.error('Error updating course:', error);
      throw error;
    }
  }
  
  /**
   * Delete a course
   * @param {string} courseId - Course ID
   * @returns {Promise<boolean>} - Success status
   */
  static async delete(courseId) {
    try {
      const courseRef = db.collection('courses').doc(courseId);
      await courseRef.delete();
      
      return true;
    } catch (error) {
      console.error('Error deleting course:', error);
      throw error;
    }
  }
}

module.exports = Course; 