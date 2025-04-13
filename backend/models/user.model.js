const { db } = require('../config/firebase');

/**
 * User model for handling user data operations with Firebase
 */
class User {
  /**
   * Create a new user in Firestore
   * @param {Object} userData - User data to be stored
   * @returns {Promise<Object>} - Created user data
   */
  static async create(userData) {
    try {
      const { uid, email, displayName, photoURL } = userData;
      
      const userRef = db.collection('users').doc(uid);
      
      const userDoc = {
        uid,
        email,
        displayName,
        photoURL,
        createdAt: new Date(),
        updatedAt: new Date(),
        preferences: {
          notifications: true,
          theme: 'light',
        },
      };
      
      await userRef.set(userDoc);
      
      return userDoc;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }
  
  /**
   * Get a user by ID
   * @param {string} uid - User ID
   * @returns {Promise<Object>} - User data
   */
  static async getById(uid) {
    try {
      const userRef = db.collection('users').doc(uid);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        return null;
      }
      
      return userDoc.data();
    } catch (error) {
      console.error('Error getting user:', error);
      throw error;
    }
  }
  
  /**
   * Update a user
   * @param {string} uid - User ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} - Updated user data
   */
  static async update(uid, updateData) {
    try {
      const userRef = db.collection('users').doc(uid);
      
      const updateDoc = {
        ...updateData,
        updatedAt: new Date(),
      };
      
      await userRef.update(updateDoc);
      
      return this.getById(uid);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }
  
  /**
   * Delete a user
   * @param {string} uid - User ID
   * @returns {Promise<boolean>} - Success status
   */
  static async delete(uid) {
    try {
      const userRef = db.collection('users').doc(uid);
      await userRef.delete();
      
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }
}

module.exports = User; 