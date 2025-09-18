const { FirebaseStorageProvider } = require('./firebase');

// No mock, no local fallback in real runs:
module.exports = { storageProvider: FirebaseStorageProvider };