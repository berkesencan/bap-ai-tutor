/**
 * Development Debug Routes
 * 
 * Provides debugging endpoints for development mode only.
 * These routes are only active when DEV_NO_AUTH=true.
 */

const express = require('express');
const flags = require('../config/flags');
const { resolveEffectiveUser } = require('../utils/effectiveUser');

const router = express.Router();

// Only active in dev mode
if (!flags.DEV_NO_AUTH) {
  module.exports = () => router; // Return empty router in production
}

/**
 * Debug endpoint to show effective user IDs
 * GET /api/dev/whoami
 */
router.get('/whoami', (req, res) => {
  const { authUserId, effectiveReadUserId, effectiveWriteUserId, shadowed } = resolveEffectiveUser(req);
  
  res.json({
    success: true,
    data: {
      authUserId,
      effectiveReadUserId,
      effectiveWriteUserId,
      shadowed,
      devMode: flags.DEV_NO_AUTH,
      shadowUserId: flags.DEV_SHADOW_USER_ID,
      allowShadowHeader: flags.ALLOW_DEV_SHADOW_HEADER,
      headers: {
        'x-dev-user-id': req.headers['x-dev-user-id'],
        'x-dev-shadow-user-id': req.headers['x-dev-shadow-user-id']
      }
    }
  });
});

module.exports = () => router;
