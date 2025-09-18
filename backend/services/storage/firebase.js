const admin = require('firebase-admin');

function configuredBucket() {
  return admin.storage().bucket(); // uses the one from init
}

const FirebaseStorageProvider = {
  async putObject(key, bytes, opts = {}) {
    const bucket = configuredBucket();
    const prefix = process.env.STORAGE_PREFIX ? String(process.env.STORAGE_PREFIX).replace(/^\/|\/$/g,'') + '/' : '';
    const withPrefix = (k) => prefix + k;
    const prefixedKey = withPrefix(key);
    
    const file = bucket.file(prefixedKey);
    await file.save(bytes, {
      resumable: false,
      metadata: {
        contentType: opts.contentType || 'application/octet-stream',
        cacheControl: opts.cacheControl || 'public, max-age=31536000'
      }
    });
    
    const gcsPath = `gs://${bucket.name}/${prefixedKey}`;
    return { etag: 'uploaded', gcsPath, prefixedKey };
  },

  async getObject(key) {
    const bucket = configuredBucket();
    const prefix = process.env.STORAGE_PREFIX ? String(process.env.STORAGE_PREFIX).replace(/^\/|\/$/g,'') + '/' : '';
    const withPrefix = (k) => prefix + k;
    const prefixedKey = withPrefix(key);
    
    const file = bucket.file(prefixedKey);
    const [data] = await file.download();
    return data;
  },

  async headObject(key) {
    const bucket = configuredBucket();
    const prefix = process.env.STORAGE_PREFIX ? String(process.env.STORAGE_PREFIX).replace(/^\/|\/$/g,'') + '/' : '';
    const withPrefix = (k) => prefix + k;
    const prefixedKey = withPrefix(key);
    
    const file = bucket.file(prefixedKey);
    const [metadata] = await file.getMetadata();
    return {
      exists: true,
      contentLength: parseInt(metadata.size),
      etag: metadata.etag,
      lastModified: new Date(metadata.updated)
    };
  },

  async getSignedUrl(key, ttlSeconds = 3600) {
    const bucket = configuredBucket();
    const bucketName = bucket.name;
    const filePath = key.replace(/^gs:\/\/[^/]+\//,'');
    const file = bucket.file(filePath);

    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 1000 * 60 * 10,
      version: 'v4',
      contentType: 'application/pdf',
    });
    return { url, bucket: bucketName, path: filePath };
  },

  async deleteObject(key) {
    const bucket = configuredBucket();
    const prefix = process.env.STORAGE_PREFIX ? String(process.env.STORAGE_PREFIX).replace(/^\/|\/$/g,'') + '/' : '';
    const withPrefix = (k) => prefix + k;
    const prefixedKey = withPrefix(key);
    
    await bucket.file(prefixedKey).delete({ ignoreNotFound: true });
  },
};

module.exports = { FirebaseStorageProvider };