const express = require('express');
const { getSignedUrlForAssignment, getAssignmentFileMetadata, getSignedUrlForGcsPath, checkFileExists } = require('../controllers/files.controller');

const router = express.Router();

// Get signed URL for assignment file
router.get('/:assignmentId/signed-url', getSignedUrlForAssignment);

// Get assignment file metadata
router.get('/:assignmentId/metadata', getAssignmentFileMetadata);

// Get signed URL for GCS path
router.get('/signed-url', getSignedUrlForGcsPath);

// Check if file exists
router.head('/exists', checkFileExists);

module.exports = router;
