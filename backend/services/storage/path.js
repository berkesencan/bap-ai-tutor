/**
 * Uniform path builder for storage keys
 */

/**
 * Normalize bucket name (keep exact bucket name)
 * @param {string} name - Bucket name
 * @returns {string} Exact bucket name
 */
function normalizeBucket(name) {
  return name; // keep exact bucket name
}

/**
 * Parse GCS path into bucket and key
 * @param {string} gcsPath - GCS path like gs://bucket/key
 * @returns {object} { bucket, key }
 */
function parseGsPath(gcsPath) {
  const m = /^gs:\/\/([^/]+)\/(.+)$/.exec(gcsPath || '');
  if (!m) throw new Error('Invalid gcsPath');
  return { bucket: m[1], key: m[2] };
}

/**
 * Generate a Gradescope storage key with user namespace
 * @param {Object} params - Parameters
 * @param {string} params.uid - User ID
 * @param {string} params.courseId - Course ID (external ID from Gradescope)
 * @param {string} params.assignmentId - Assignment ID (external ID from Gradescope)
 * @param {string} [params.prefix] - Optional storage prefix (defaults to STORAGE_PREFIX env var)
 * @returns {string} Storage key
 */
function gradescopeKey({ uid, courseId, assignmentId, prefix = process.env.STORAGE_PREFIX }) {
  const key = `gradescope/${uid}/${courseId}/${assignmentId}.pdf`;
  return prefix ? `${prefix}/${key}` : key;
}

/**
 * Generate a GCS path from a storage key
 * @param {string} key - Storage key
 * @param {string} bucket - GCS bucket name
 * @returns {string} GCS path (gs://bucket/key)
 */
function gcsPath(key, bucket = process.env.GCS_BUCKET_NAME) {
  return `gs://${bucket}/${key}`;
}

/**
 * Validate that a key is a valid Gradescope key
 * @param {string} key - Storage key to validate
 * @param {string} [prefix] - Optional prefix to check for
 * @returns {boolean} True if valid
 */
function isValidGradescopeKey(key, prefix = process.env.STORAGE_PREFIX) {
  if (prefix) {
    return key.startsWith(`${prefix}/gradescope/`);
  }
  return key.startsWith('gradescope/');
}

/**
 * Extract user ID from a Gradescope key
 * @param {string} key - Storage key
 * @param {string} [prefix] - Optional prefix
 * @returns {string|null} User ID or null if invalid
 */
function extractUidFromKey(key, prefix = process.env.STORAGE_PREFIX) {
  if (prefix) {
    if (!key.startsWith(`${prefix}/gradescope/`)) return null;
    const parts = key.split('/');
    return parts[2] || null; // prefix/gradescope/uid/...
  }
  
  if (!key.startsWith('gradescope/')) return null;
  const parts = key.split('/');
  return parts[1] || null; // gradescope/uid/...
}

module.exports = {
  gradescopeKey,
  gcsPath,
  isValidGradescopeKey,
  extractUidFromKey,
  normalizeBucket,
  parseGsPath
};
