/**
 * Effective User Resolution Utility
 * 
 * Handles dev shadowing for course context - allows reads to use a real user ID
 * while writes use the dev user ID. This fixes the course dropdown issue where
 * dev-cli has no courses but the real user has imported Gradescope data.
 */

const flags = require('../config/flags');

/**
 * Resolve effective user IDs for read/write operations
 * @param {Object} req - Express request object
 * @param {Object} opts - Options (not used currently)
 * @returns {Object} - {authUserId, effectiveReadUserId, effectiveWriteUserId, shadowed}
 */
function resolveEffectiveUser(req, opts = {}) {
  const authUserId = req.user?.uid || null;
  const devHeaderUid = req.headers['x-dev-user-id'];
  const devHeaderShadow = req.headers['x-dev-shadow-user-id'];
  const inDev = !!flags.DEV_NO_AUTH;

  let effectiveReadUserId = authUserId;
  let effectiveWriteUserId = authUserId;
  let shadowed = false;

  if (inDev) {
    const devUid = devHeaderUid || flags.DEV_USER_ID || 'dev-cli';
    const shadowUid = (flags.ALLOW_DEV_SHADOW_HEADER && devHeaderShadow) || flags.DEV_SHADOW_USER_ID || null;

    effectiveWriteUserId = devUid;
    effectiveReadUserId = shadowUid || devUid;

    if (shadowUid && shadowUid !== devUid) {
      shadowed = true;
      console.log(`[DEV_SHADOW] read=${effectiveReadUserId} write=${effectiveWriteUserId} shadowed=${shadowed}`);
    }
  }

  return { authUserId, effectiveReadUserId, effectiveWriteUserId, shadowed };
}

/**
 * Check if user is member of course using effective read user ID
 * @param {Object} req - Express request object
 * @param {string} courseId - Course ID
 * @param {Object} course - Course object (optional, for performance)
 * @returns {boolean} - True if user is member
 */
async function isEffectiveMember(req, courseId, course = null) {
  const { effectiveReadUserId, shadowed } = resolveEffectiveUser(req);
  
  if (!course) {
    const Course = require('../models/course.model');
    course = await Course.getById(courseId);
  }
  
  if (!course) return false;
  
  const isMember = course.members.includes(effectiveReadUserId);
  
  // In dev with shadowing, allow read access if shadow user is member
  if (!isMember && flags.DEV_NO_AUTH && shadowed) {
    const shadowIsMember = course.members.includes(effectiveReadUserId);
    if (shadowIsMember) {
      console.log(`[DEV_SHADOW] Allowing read access for shadowed user ${effectiveReadUserId} to course ${courseId}`);
      return true;
    }
  }
  
  return isMember;
}

module.exports = { 
  resolveEffectiveUser,
  isEffectiveMember
};
