const router = require('express').Router();
const ctrl = require('../controllers/import-status.controller');
// maybeAuth is defined in index.js, we'll pass it as a parameter

console.log('[IMPORT STATUS] Routes loaded');

router.get('/_ping', (req,res)=>res.json({ ok:true, ts:new Date().toISOString() }));

// Accept both styles and querystring fallback to avoid path mismatches
router.get('/status/:courseId', ctrl.status);
router.get('/:courseId/status',   ctrl.status);
router.get('/status',             ctrl.status); // ?courseId=...

module.exports = router;
