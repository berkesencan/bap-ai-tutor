const { storageProvider } = require('../services/storage');
const { Pool } = require('pg');
const flags = require('../config/flags');
const { isValidGradescopeKey, extractUidFromKey, normalizeBucket, parseGsPath } = require('../services/storage/path');

/**
 * Get signed URL for assignment file
 */
async function getSignedUrlForAssignment(req, res) {
  try {
    const { assignmentId } = req.params;
    const userId = req.user?.uid || req.headers['x-dev-user-id'] || process.env.DEV_USER_ID || 'dev-cli';

    console.log(`[FILES] Getting signed URL for assignment ${assignmentId}`);

    const db = new Pool({
      connectionString: flags.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    try {
      // Get the latest file for this assignment
      const result = await db.query(
        `SELECT af.storage_key, af.kind, af.source, af.size_bytes, af.created_at,
                a.title, a.external_id
         FROM assignment_files af
         JOIN assignments a ON af.assignment_id = a.id
         WHERE af.assignment_id = $1
         ORDER BY af.version DESC
         LIMIT 1`,
        [assignmentId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'FILE_NOT_FOUND',
          message: 'No stored file found for this assignment'
        });
      }

      const file = result.rows[0];
      const url = await storageProvider.getSignedUrl(file.storage_key, 3600); // 1 hour TTL

      res.json({
        success: true,
        data: {
          url,
          title: file.title,
          externalId: file.external_id,
          kind: file.kind,
          source: file.source,
          sizeBytes: file.size_bytes,
          createdAt: file.created_at
        }
      });

    } finally {
      await db.end();
    }

  } catch (error) {
    console.error('[FILES] Error getting signed URL:', error);
    res.status(500).json({
      success: false,
      error: 'SIGNED_URL_FAILED',
      message: error.message
    });
  }
}

/**
 * Get assignment file metadata
 */
async function getAssignmentFileMetadata(req, res) {
  try {
    const { assignmentId } = req.params;

    const db = new Pool({
      connectionString: flags.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    try {
      const result = await db.query(
        `SELECT af.*, a.title, a.external_id
         FROM assignment_files af
         JOIN assignments a ON af.assignment_id = a.id
         WHERE af.assignment_id = $1
         ORDER BY af.version DESC`,
        [assignmentId]
      );

      res.json({
        success: true,
        data: {
          files: result.rows,
          totalFiles: result.rows.length
        }
      });

    } finally {
      await db.end();
    }

  } catch (error) {
    console.error('[FILES] Error getting file metadata:', error);
    res.status(500).json({
      success: false,
      error: 'METADATA_FAILED',
      message: error.message
    });
  }
}

/**
 * Get signed URL for GCS path
 */
async function getSignedUrlForGcsPath(req, res) {
  try {
    const { gcsPath } = req.query;
    
    if (!gcsPath) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_GCSPATH',
        message: 'gcsPath query parameter is required'
      });
    }

    // Validate bucket name
    const expectedBucket = process.env.GCS_BUCKET_NAME;
    if (!expectedBucket) {
      return res.status(500).json({
        success: false,
        error: 'BUCKET_NOT_CONFIGURED',
        message: 'GCS_BUCKET_NAME not configured'
      });
    }

    // Parse GCS path robustly
    const { bucket, key } = parseGsPath(gcsPath);
    
    // Compare against the configured bucket name (not hardcoded domain)
    const { admin } = require('../config/firebase');
    const configured = admin.storage().bucket().name; // actual runtime bucket
    
    if (bucket !== configured) {
      return res.status(400).json({
        success: false,
        error: 'BUCKET_MISMATCH',
        message: `Expected bucket ${configured}, got ${bucket}`
      });
    }

    // Validate that this is a valid Gradescope key
    if (!isValidGradescopeKey(key)) {
      return res.status(403).json({
        success: false,
        error: 'INVALID_KEY',
        message: 'Key must be a valid Gradescope key'
      });
    }

    // Generate signed URL with 10 minute TTL
    const ttlSeconds = 600;
    const url = await storageProvider.getSignedUrl(key, ttlSeconds);

    res.json({
      success: true,
      data: {
        url,
        gcsPath,
        ttlSeconds,
        expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString()
      }
    });

  } catch (error) {
    console.error('[FILES] Error getting signed URL for gcsPath:', error);
    res.status(500).json({
      success: false,
      error: 'SIGNED_URL_FAILED',
      message: error.message
    });
  }
}

/**
 * Check if file exists in storage
 */
async function checkFileExists(req, res) {
  try {
    const { gcsPath } = req.query;
    
    if (!gcsPath) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_GCSPATH',
        message: 'gcsPath query parameter is required'
      });
    }

    // Parse gcsPath to extract key
    const gcsPathMatch = gcsPath.match(/^gs:\/\/([^\/]+)\/(.+)$/);
    if (!gcsPathMatch) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_GCSPATH',
        message: 'gcsPath must be in format gs://bucket/path'
      });
    }

    const [, , key] = gcsPathMatch;
    
    // Validate that this is a valid Gradescope key
    if (!isValidGradescopeKey(key)) {
      return res.status(403).json({
        success: false,
        error: 'INVALID_KEY',
        message: 'Key must be a valid Gradescope key'
      });
    }
    
    const headResult = await storageProvider.headObject(key);

    res.json({
      success: true,
      data: {
        exists: headResult.exists,
        gcsPath,
        ...(headResult.exists && {
          contentLength: headResult.contentLength,
          etag: headResult.etag,
          lastModified: headResult.lastModified
        })
      }
    });

  } catch (error) {
    console.error('[FILES] Error checking file existence:', error);
    res.status(500).json({
      success: false,
      error: 'EXISTS_CHECK_FAILED',
      message: error.message
    });
  }
}

module.exports = {
  getSignedUrlForAssignment,
  getAssignmentFileMetadata,
  getSignedUrlForGcsPath,
  checkFileExists
};
