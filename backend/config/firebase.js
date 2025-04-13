const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin SDK
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

// Initialize the app
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`,
  storageBucket: `${process.env.FIREBASE_PROJECT_ID}.appspot.com`,
});

// Get Firestore instance
const db = admin.firestore();

// Get Auth instance
const auth = admin.auth();

// Get Storage instance
const storage = admin.storage();

module.exports = {
  admin,
  db,
  auth,
  storage,
}; 