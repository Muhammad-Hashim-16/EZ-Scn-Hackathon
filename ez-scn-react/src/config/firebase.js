// ============================================
// PennyWise — Frontend Firebase Config
//
// Uses env vars from Vite:
//   VITE_FIREBASE_API_KEY
//   VITE_FIREBASE_AUTH_DOMAIN
//   VITE_FIREBASE_PROJECT_ID
//   VITE_FIREBASE_STORAGE_BUCKET
//   VITE_FIREBASE_MESSAGING_SENDER_ID
//   VITE_FIREBASE_APP_ID
//   VITE_FIREBASE_VAPID_KEY
// ============================================

import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

let app = null;
let messaging = null;

function getFirebaseApp() {
  if (!app && firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig);
  }
  return app;
}

function getFirebaseMessaging() {
  if (!messaging) {
    const fbApp = getFirebaseApp();
    if (fbApp) {
      try {
        messaging = getMessaging(fbApp);
      } catch {
        // Messaging not supported in this browser
        return null;
      }
    }
  }
  return messaging;
}

export { getFirebaseApp, getFirebaseMessaging, getToken, onMessage };
