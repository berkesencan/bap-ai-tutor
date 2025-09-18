// Storage provider interface definitions
// These are TypeScript-style interfaces for documentation purposes
// In JavaScript, we use duck typing

/**
 * @typedef {Object} PutOptions
 * @property {string} [contentType] - MIME type of the content
 * @property {string} [cacheControl] - Cache control header
 */

/**
 * @typedef {Object} HeadResult
 * @property {boolean} exists - Whether the object exists
 * @property {number} [contentLength] - Size of the object in bytes
 * @property {string} [etag] - ETag of the object
 * @property {Date} [lastModified] - Last modified date
 */

/**
 * @typedef {Object} StorageProvider
 * @property {Function} putObject - Upload an object
 * @property {Function} getSignedUrl - Get a signed URL for an object
 * @property {Function} headObject - Get object metadata
 * @property {Function} deleteObject - Delete an object
 */
