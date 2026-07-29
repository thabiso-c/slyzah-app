import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Read keys from Vite environment or process environment (to support multiple sources)
const env = (import.meta as any).env ?? (typeof process !== 'undefined' ? process.env : {});

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || env.VITE_EXPO_PUBLIC_FIREBASE_API_KEY || env.EXPO_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || env.VITE_EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: env.VITE_FIREBASE_PROJECT_ID || env.VITE_EXPO_PUBLIC_FIREBASE_PROJECT_ID || env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || env.VITE_EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || env.VITE_EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: env.VITE_FIREBASE_APP_ID || env.VITE_EXPO_PUBLIC_FIREBASE_APP_ID || env.EXPO_PUBLIC_FIREBASE_APP_ID || "",
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || env.VITE_EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || "",
};

// Check if any config is provided
const isConfigValid = !!(firebaseConfig.apiKey && firebaseConfig.projectId);

let app;
let auth: any = null;
let db: any = null;
let storage: any = null;

if (isConfigValid) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    console.log("[Firebase] Successfully initialized real connection.");
  } catch (err) {
    console.error("[Firebase] Initialization error:", err);
  }
} else {
  console.warn(
    "[Firebase] Missing environment variables. Running in mock/offline mode.\n" +
    "To connect your real database, set VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID, etc. in Settings."
  );
}

export { app, auth, db, storage, isConfigValid };
