/**
 * Development User Shim Middleware
 * 
 * Injects a fake Firebase-like user object when DEV_NO_AUTH=true
 * so controllers can continue to work without Firebase authentication
 */

const flags = require('../config/flags');
const crypto = require('crypto');

/**
 * Derive a stable dev user ID from request context
 * @param {Object} req - Express request object
 * @returns {string} - Stable user ID for development
 */
function deriveDevUserId(req) {
  // Prefer explicit header; fallback to email; else .env; else stable per-process
  const fromHeader = req.header('x-dev-user-id');
  if (fromHeader) return String(fromHeader);
  
  const bodyEmail = req.body?.email || req.query?.email;
  if (bodyEmail) return `dev-${crypto.createHash('md5').update(bodyEmail).digest('hex').slice(0,12)}`;
  
  return flags.DEV_USER_ID || 'dev-user';
}

/**
 * Development user shim middleware
 * Injects req.user when DEV_NO_AUTH=true
 */
module.exports = function devUserShim(req, _res, next) {
  if (flags.DEV_NO_AUTH) {
    // Inject a fake Firebase-like user object so controllers keep working
    const uid = deriveDevUserId(req);
    req.user = { uid };
    console.log(`[DEV_USER_SHIM] Injected dev user: ${uid}`);
  }
  next();
};
