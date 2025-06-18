const { db } = require('../config/firebase');
const crypto = require('crypto');

/**
 * GradescopeAuth model for handling Gradescope authentication persistence
 */
class GradescopeAuth {
  /**
   * Store or update Gradescope credentials for a user
   * @param {string} userId - User ID
   * @param {string} email - Gradescope email
   * @param {string} password - Gradescope password (encrypted)
   * @returns {Promise<Object>} - Auth record
   */
  static async storeCredentials(userId, email, password) {
    try {
      // Encrypt password before storing
      const encryptedPassword = this.encrypt(password);
      
      const authRef = db.collection('gradescope_auth').doc(userId);
      
      const authDoc = {
        userId,
        email,
        encryptedPassword,
        isAuthenticated: true,
        lastLoginAt: new Date(),
        lastValidatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        sessionData: null, // Will store serialized cookies if needed
        failureCount: 0,
        lastError: null
      };
      
      await authRef.set(authDoc, { merge: true });
      
      // Return without sensitive data
      const { encryptedPassword: _, ...safeAuthDoc } = authDoc;
      return safeAuthDoc;
    } catch (error) {
      console.error('Error storing Gradescope credentials:', error);
      throw error;
    }
  }

  /**
   * Get Gradescope credentials for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} - Auth record with decrypted password
   */
  static async getCredentials(userId) {
    try {
      const authRef = db.collection('gradescope_auth').doc(userId);
      const authDoc = await authRef.get();
      
      if (!authDoc.exists) {
        return null;
      }
      
      const authData = authDoc.data();
      
      // Decrypt password
      const password = this.decrypt(authData.encryptedPassword);
      
      return {
        ...authData,
        password,
        encryptedPassword: undefined // Remove encrypted version
      };
    } catch (error) {
      console.error('Error getting Gradescope credentials:', error);
      throw error;
    }
  }

  /**
   * Update authentication status
   * @param {string} userId - User ID
   * @param {boolean} isAuthenticated - Authentication status
   * @param {string} error - Error message if any
   * @returns {Promise<void>}
   */
  static async updateAuthStatus(userId, isAuthenticated, error = null) {
    try {
      const authRef = db.collection('gradescope_auth').doc(userId);
      
      const updateData = {
        isAuthenticated,
        updatedAt: new Date(),
        lastValidatedAt: new Date()
      };

      if (isAuthenticated) {
        updateData.lastLoginAt = new Date();
        updateData.failureCount = 0;
        updateData.lastError = null;
      } else {
        updateData.failureCount = await this.incrementFailureCount(userId);
        updateData.lastError = error;
      }
      
      await authRef.update(updateData);
    } catch (error) {
      console.error('Error updating auth status:', error);
      throw error;
    }
  }

  /**
   * Store session data (cookies, etc.)
   * @param {string} userId - User ID
   * @param {Object} sessionData - Session data to store
   * @returns {Promise<void>}
   */
  static async storeSessionData(userId, sessionData) {
    try {
      const authRef = db.collection('gradescope_auth').doc(userId);
      
      await authRef.update({
        sessionData: JSON.stringify(sessionData),
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error storing session data:', error);
      throw error;
    }
  }

  /**
   * Get session data
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} - Session data
   */
  static async getSessionData(userId) {
    try {
      const authRef = db.collection('gradescope_auth').doc(userId);
      const authDoc = await authRef.get();
      
      if (!authDoc.exists || !authDoc.data().sessionData) {
        return null;
      }
      
      return JSON.parse(authDoc.data().sessionData);
    } catch (error) {
      console.error('Error getting session data:', error);
      return null;
    }
  }

  /**
   * Check if user needs re-authentication
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} - True if needs re-auth
   */
  static async needsReauth(userId) {
    try {
      const authRef = db.collection('gradescope_auth').doc(userId);
      const authDoc = await authRef.get();
      
      if (!authDoc.exists) {
        console.log(`No auth record found for user ${userId}, needs reauth`);
        return true;
      }
      
      const authData = authDoc.data();
      console.log(`Auth data for user ${userId}:`, {
        isAuthenticated: authData.isAuthenticated,
        failureCount: authData.failureCount,
        lastValidatedAt: authData.lastValidatedAt?.toDate()
      });
      
      // Check if not authenticated
      if (!authData.isAuthenticated) {
        console.log(`User ${userId} not authenticated, needs reauth`);
        return true;
      }
      
      // Check if too many failures
      if (authData.failureCount >= 3) {
        console.log(`User ${userId} has too many failures (${authData.failureCount}), needs reauth`);
        return true;
      }
      
      // Check if last validation was too long ago (30 minutes)
      const lastValidated = authData.lastValidatedAt?.toDate();
      if (!lastValidated || (Date.now() - lastValidated.getTime()) > 30 * 60 * 1000) {
        console.log(`User ${userId} session too old or missing, needs reauth. Last validated: ${lastValidated}`);
        return true;
      }
      
      console.log(`User ${userId} authentication is valid, no reauth needed`);
      return false;
    } catch (error) {
      console.error('Error checking reauth need:', error);
      return true; // Default to needing reauth on error
    }
  }

  /**
   * Delete auth record for user
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  static async deleteAuth(userId) {
    try {
      const authRef = db.collection('gradescope_auth').doc(userId);
      await authRef.delete();
    } catch (error) {
      console.error('Error deleting auth record:', error);
      throw error;
    }
  }

  /**
   * Increment failure count
   * @param {string} userId - User ID
   * @returns {Promise<number>} - New failure count
   */
  static async incrementFailureCount(userId) {
    try {
      const authRef = db.collection('gradescope_auth').doc(userId);
      const authDoc = await authRef.get();
      
      if (!authDoc.exists) {
        return 1;
      }
      
      const currentCount = authDoc.data().failureCount || 0;
      return currentCount + 1;
    } catch (error) {
      console.error('Error incrementing failure count:', error);
      return 1;
    }
  }

  /**
   * Encrypt a string
   * @param {string} text - Text to encrypt
   * @returns {string} - Encrypted text
   */
  static encrypt(text) {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt a string
   * @param {string} encryptedText - Encrypted text
   * @returns {string} - Decrypted text
   */
  static decrypt(encryptedText) {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32);
    
    const textParts = encryptedText.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encrypted = textParts.join(':');
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

module.exports = GradescopeAuth; 