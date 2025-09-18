const express = require('express');
const { startImport, streamImportProgress, getImportStatus } = require('../controllers/gradescope-import.controller');

const router = express.Router();

// Start import job
router.post('/import/:courseId', startImport);

// Get import job status (non-SSE)
router.get('/import/:jobId/status', getImportStatus);

// Stream import progress (SSE)
router.get('/import/:jobId/stream', streamImportProgress);

module.exports = router;
