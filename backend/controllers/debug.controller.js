const { storageProvider } = require('../services/storage');
const { FirebaseStorageProvider } = require('../services/storage/firebase');
const { normalizeBucket } = require('../services/storage/path');

exports.storageHealth = async (req, res) => {
  try {
    const { admin } = require('../config/firebase');
    const bucket = admin.storage().bucket();
    const [exists] = await bucket.exists();
    const [files] = await bucket.getFiles({ maxResults: 1 });
    res.json({ ok: true, bucket: bucket.name, exists, sample: files[0]?.name || null });
  } catch (e) {
    console.error('[DEBUG] Storage health error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
};