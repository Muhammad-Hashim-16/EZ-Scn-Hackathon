// ============================================
// PennyWise — Firebase Admin Init
// Loads once, exports the admin instance.
//
// Requires FIREBASE_SERVICE_ACCOUNT env var
// pointing to the service account JSON file path,
// OR set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL,
// and FIREBASE_PRIVATE_KEY individually.
// ============================================

const admin = require('firebase-admin');

let initialized = false;

function getFirebaseAdmin() {
  if (initialized) return admin;

  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      // Path to JSON file
      const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else if (process.env.FIREBASE_PROJECT_ID) {
      // Individual env vars (common in Railway/Vercel)
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Private key comes with escaped newlines from env
          privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        }),
      });
    } else {
      console.warn('Firebase Admin — No credentials found. Push notifications disabled.');
      return null;
    }

    initialized = true;
    console.log('🔔 Firebase Admin — Initialized');
  } catch (err) {
    console.warn('Firebase Admin — Init failed:', err.message);
    return null;
  }

  return admin;
}

module.exports = { getFirebaseAdmin };
