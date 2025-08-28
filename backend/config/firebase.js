const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin SDK
let serviceAccount;

// Check if we're in development mode and missing environment variables
const isDevelopment = process.env.NODE_ENV === 'development';
const missingEnvVars = [];

if (isDevelopment) {
  // For development, use a mock service account if environment variables are missing
  if (!process.env.FIREBASE_PROJECT_ID) missingEnvVars.push('FIREBASE_PROJECT_ID');
  if (!process.env.FIREBASE_PRIVATE_KEY) missingEnvVars.push('FIREBASE_PRIVATE_KEY');
  if (!process.env.FIREBASE_CLIENT_EMAIL) missingEnvVars.push('FIREBASE_CLIENT_EMAIL');
  
  if (missingEnvVars.length > 0) {
    console.warn('Warning: Missing Firebase environment variables for development:', missingEnvVars);
    console.warn('Using mock Firebase configuration for development');
    
    // Use a mock service account for development
    serviceAccount = {
      type: "service_account",
      project_id: "mock-project-id",
      private_key_id: "mock-private-key-id",
      private_key: "-----BEGIN PRIVATE KEY-----\nMOCK_KEY\n-----END PRIVATE KEY-----\n",
      client_email: "mock@example.com",
      client_id: "mock-client-id",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/mock%40example.com"
    };
  } else {
    // Use the provided environment variables
    serviceAccount = {
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
  }
} else {
  // For production, require all environment variables
  const requiredEnvVars = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_PRIVATE_KEY_ID',
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_CLIENT_ID',
    'FIREBASE_CLIENT_CERT_URL'
  ];
  
  const missingRequiredEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingRequiredEnvVars.length > 0) {
    console.error('Missing required environment variables:', missingRequiredEnvVars);
    console.error('Please set these variables in your .env file');
    console.error('You can get these values from the Firebase Console > Project Settings > Service Accounts > Generate New Private Key');
    process.exit(1);
  }
  
  serviceAccount = {
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
}

// Initialize Firebase Admin
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
    storageBucket: `${serviceAccount.project_id}.appspot.com`
  });
  console.log('Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase Admin SDK:', error);
  if (isDevelopment) {
    console.warn('Continuing with mock Firebase for development');
  } else {
    process.exit(1);
  }
}

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
  db,
  auth,
  storage
}; 