import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from "firebase/app";
import { initializeAuth, getAuth } from "firebase/auth";
import { initializeFirestore, getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Safe Auth initialization with persistence
/** @type {import('firebase/auth').Auth} */
let auth;
try {
  auth = getAuth(app);
} catch (error) {
  try {
    const { getReactNativePersistence } = require('firebase/auth');
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage)
    });
  } catch (initError) {
    console.error("Failed to initialize Firebase Auth with AsyncStorage persistence, falling back to default:", initError);
    auth = initializeAuth(app);
  }
}

// Safe Firestore initialization with Long Polling
/** @type {import('firebase/firestore').Firestore} */
let db;
try {
  db = getFirestore(app);
} catch (error) {
  try {
    db = initializeFirestore(app, {
      experimentalForceLongPolling: true,
    });
  } catch (initError) {
    console.error("Failed to initialize Firestore with long polling, falling back to default:", initError);
    db = initializeFirestore(app, {});
  }
}

const storage = getStorage(app);

export { app, auth, db, storage };
