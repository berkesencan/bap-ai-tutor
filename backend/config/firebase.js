const admin = require('firebase-admin');
const { normalizeBucket } = require('../services/storage/path');
require('dotenv').config();

// Check for missing environment variables
const missingEnvVars = [];
if (!process.env.FIREBASE_PROJECT_ID) missingEnvVars.push('FIREBASE_PROJECT_ID');
if (!process.env.FIREBASE_PRIVATE_KEY) missingEnvVars.push('FIREBASE_PRIVATE_KEY');
if (!process.env.FIREBASE_CLIENT_EMAIL) missingEnvVars.push('FIREBASE_CLIENT_EMAIL');

if (missingEnvVars.length > 0) {
  console.error('Missing required Firebase environment variables:', missingEnvVars);
  console.error('Please set these variables in your .env file');
  console.error('You can get these values from the Firebase Console > Project Settings > Service Accounts > Generate New Private Key');
  process.exit(1);
}

// Use the provided environment variables
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
};

// Initialize Firebase Admin
let app;
if (admin.apps.length) {
  app = admin.app();
} else {
  const creds = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
    ? admin.credential.cert(JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON))
    : admin.credential.cert(serviceAccount);

  const projectId = process.env.GCP_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  const storageBucket = process.env.GCS_BUCKET_NAME; // exact bucket only

  if (!projectId) throw new Error('GCP_PROJECT_ID is required');
  if (!storageBucket) throw new Error('GCS_BUCKET_NAME is required');

  app = admin.initializeApp({
    credential: creds,
    projectId,
    storageBucket, // exact bucket only
  });
}

console.log('Firebase Admin SDK initialized successfully');
console.log('Firebase project ID:', app.options.projectId);
console.log('Firebase storage bucket:', app.options.storageBucket);

// Get Firestore instance
const db = admin.firestore();

// Configure Firestore to ignore undefined properties - this is the safest approach
// instead of manually cleaning objects which could cause data loss
db.settings({
  ignoreUndefinedProperties: true
});

// Get Auth instance
const auth = admin.auth();

// Get Storage instance
const storage = admin.storage();

module.exports = {
  admin,
  app,
  db,
  auth,
  storage
};