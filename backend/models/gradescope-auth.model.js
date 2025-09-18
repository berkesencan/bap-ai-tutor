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
      
      // Encrypt session data before storing
      const encryptedSessionData = this.encrypt(JSON.stringify(sessionData));
      
      await authRef.update({
        sessionData: encryptedSessionData,
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
      
      // Decrypt session data
      const decryptedSessionData = this.decrypt(authDoc.data().sessionData);
      return JSON.parse(decryptedSessionData);
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
   * Encrypt a string using AES-256-CBC with random salt and IV
   * @param {string} text - Text to encrypt
   * @returns {string} - Encrypted text in format: salt:iv:encrypted
   */
  static encrypt(text) {
    // Require encryption key to be set
    if (!process.env.ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY environment variable is required for security');
    }
    
    if (!text || typeof text !== 'string') {
      throw new Error('Text to encrypt must be a non-empty string');
    }
    
    const algorithm = 'aes-256-cbc';
    
    // Generate random salt and IV for each encryption
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(16);
    
    // Derive key from password and salt
    const key = crypto.scryptSync(process.env.ENCRYPTION_KEY, salt, 32);
    
    // Encrypt the text
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Return salt:iv:encrypted format
    return salt.toString('hex') + ':' + iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt a string using AES-256-CBC
   * @param {string} encryptedText - Encrypted text in format: salt:iv:encrypted
   * @returns {string} - Decrypted text
   */
  static decrypt(encryptedText) {
    // Require encryption key to be set
    if (!process.env.ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY environment variable is required for security');
    }
    
    if (!encryptedText || typeof encryptedText !== 'string') {
      throw new Error('Encrypted text must be a non-empty string');
    }
    
    const algorithm = 'aes-256-cbc';
    
    try {
      // Parse the encrypted data
      const textParts = encryptedText.split(':');
      if (textParts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }
      
      const salt = Buffer.from(textParts[0], 'hex');
      const iv = Buffer.from(textParts[1], 'hex');
      const encrypted = textParts[2];
      
      // Derive the same key using the stored salt
      const key = crypto.scryptSync(process.env.ENCRYPTION_KEY, salt, 32);
      
      // Decrypt the text
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error.message);
      throw new Error('Failed to decrypt data - data may be corrupted or key may be incorrect');
    }
  }

  /**
   * Clean up old authentication records (data retention policy)
   * @param {number} daysOld - Delete records older than this many days (default: 90)
   * @returns {Promise<number>} - Number of records deleted
   */
  static async cleanupOldRecords(daysOld = 90) {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
      
      const oldRecords = await db.collection('gradescope_auth')
        .where('updatedAt', '<', cutoffDate)
        .get();
      
      let deletedCount = 0;
      const batch = db.batch();
      
      oldRecords.forEach(doc => {
        batch.delete(doc.ref);
        deletedCount++;
      });
      
      if (deletedCount > 0) {
        await batch.commit();
        console.log(`Cleaned up ${deletedCount} old authentication records`);
      }
      
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up old records:', error);
      throw error;
    }
  }

  /**
   * Store session data (cookies, user agent, etc.)
   * @param {string} userId - User ID
   * @param {Object} sessionData - Session data object
   * @returns {Promise<void>}
   */
  static async storeSessionData(userId, sessionData) {
    try {
      const authRef = db.collection('gradescope_auth').doc(userId);
      
      const updateData = {
        sessionData: {
          ...sessionData,
          updatedAt: new Date()
        },
        lastValidatedAt: new Date(),
        updatedAt: new Date()
      };
      
      await authRef.update(updateData);
      console.log(`Stored session data for user ${userId}`);
    } catch (error) {
      console.error('Error storing session data:', error);
      throw error;
    }
  }

  /**
   * Get session data for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} - Session data or null
   */
  static async getSessionData(userId) {
    try {
      const authRef = db.collection('gradescope_auth').doc(userId);
      const authDoc = await authRef.get();
      
      if (!authDoc.exists) {
        return null;
      }
      
      const authData = authDoc.data();
      return authData.sessionData || null;
    } catch (error) {
      console.error('Error getting session data:', error);
      return null;
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
      if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        console.error('[GRADESCOPE AUTH] updateAuthStatus called with invalid userId:', userId);
        throw new Error('Invalid userId provided to updateAuthStatus');
      }
      
      const authRef = db.collection('gradescope_auth').doc(userId);
      
      const updateData = {
        isAuthenticated,
        updatedAt: new Date(),
        lastError: error
      };
      
      if (isAuthenticated) {
        updateData.lastValidatedAt = new Date();
        updateData.failureCount = 0;
      } else {
        updateData.failureCount = await this.incrementFailureCount(userId);
      }
      
      await authRef.update(updateData);
      console.log(`Updated auth status for user ${userId}: ${isAuthenticated}`);
    } catch (error) {
      console.error('Error updating auth status:', error);
      throw error;
    }
  }

  /**
   * Check if session needs refresh
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} - True if needs refresh
   */
  static async needsSessionRefresh(userId) {
    try {
      const authRef = db.collection('gradescope_auth').doc(userId);
      const authDoc = await authRef.get();
      
      if (!authDoc.exists) {
        return true;
      }
      
      const authData = authDoc.data();
      const lastValidated = authData.lastValidatedAt?.toDate();
      
      if (!lastValidated) {
        return true;
      }
      
      const maxAgeMin = parseInt(process.env.GRADESCOPE_SESSION_MAX_AGE_MIN) || 120;
      const refreshAheadMin = parseInt(process.env.GRADESCOPE_SESSION_REFRESH_AHEAD_MIN) || 20;
      const refreshThreshold = maxAgeMin - refreshAheadMin;
      
      const minutesSinceValidation = (Date.now() - lastValidated.getTime()) / (1000 * 60);
      
      return minutesSinceValidation >= refreshThreshold;
    } catch (error) {
      console.error('Error checking session refresh need:', error);
      return true;
    }
  }
}

module.exports = GradescopeAuth; 