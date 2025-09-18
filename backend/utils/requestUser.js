/**
 * Request User Helper Utilities
 * 
 * Safe extraction of user ID from request objects
 * Handles both production (Firebase) and development (shim) scenarios
 */

const flags = require('../config/flags');

/**
 * Safely extract user ID from request object
 * @param {Object} req - Express request object
 * @returns {string|null} - User ID or null if not available
 */
exports.getRequestUserId = function getRequestUserId(req) {
  // Impersonation header (dev-only)
  if (flags.DEV_NO_AUTH && flags.DEV_IMPERSONATE) {
    const impersonateUser = req.header('x-impersonate-user');
    if (impersonateUser) {
      console.log(`[DEV] Impersonating user: ${impersonateUser}`);
      return impersonateUser;
    }
  }
  
  // Dev user ID header
  const devUserId = req.header('x-dev-user-id');
  if (devUserId) return devUserId;
  
  // Primary: check for Firebase user (production)
  if (req?.user?.uid) return req.user.uid;
  
  // Fallback: dev mode with shim
  if (flags.DEV_NO_AUTH) {
    // Check if shim injected a user
    if (req?.user?.uid) return req.user.uid;
    
    // Fallback to default
    return flags.DEV_USER_ID || 'dev-user';
  }
  
  // Production: enforce presence
  return null;
};

/**
 * Check if request has valid user context
 * @param {Object} req - Express request object
 * @returns {boolean} - True if user context is available
 */
exports.hasValidUser = function hasValidUser(req) {
  return !!exports.getRequestUserId(req);
};

/**
 * Get user context for logging/debugging
 * @param {Object} req - Express request object
 * @returns {Object} - User context info
 */
exports.getUserContext = function getUserContext(req) {
  const userId = exports.getRequestUserId(req);
  return {
    userId,
    hasUser: !!userId,
    isDevMode: flags.DEV_NO_AUTH,
    source: req?.user?.uid ? 'firebase' : (flags.DEV_NO_AUTH ? 'dev-shim' : 'none')
  };
};
