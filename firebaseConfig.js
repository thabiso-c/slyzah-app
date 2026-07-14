import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from "firebase/app";
import {
    getReactNativePersistence,
    initializeAuth,
    getAuth
} from 'firebase/auth';
import { initializeFirestore, getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase Configuration — read from EAS env vars (aligned with slyzah-pro)
const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Safe Auth initialization with persistence
let auth;
try {
    auth = getAuth(app);
} catch (error) {
    try {
        auth = initializeAuth(app, {
            persistence: getReactNativePersistence(AsyncStorage)
        });
    } catch (initError) {
        console.error("Failed to initialize Firebase Auth with AsyncStorage persistence, falling back to default:", initError);
        auth = initializeAuth(app);
    }
}

// Safe Firestore initialization with Long Polling
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

// Initialize Storage
const storage = getStorage(app);

export { app, auth, db, storage };
