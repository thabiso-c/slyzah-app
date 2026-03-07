import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from "firebase/app";
import {
    getReactNativePersistence,
    initializeAuth
} from 'firebase/auth';
import { initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// 1. Your Firebase Configuration
const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Validate that all required environment variables are present
const missingKeys = Object.entries(firebaseConfig).filter(([, value]) => !value);
if (missingKeys.length > 0) {
    const errorMessage = `Missing Firebase config keys: ${missingKeys.map(([key]) => key).join(', ')}. Please set them in your EAS secrets for the 'preview' profile.`;
    // In a build environment, we must throw an error to fail the build clearly.
    if (process.env.EAS_BUILD) {
        throw new Error(errorMessage);
    }
}

// 2. Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// 3. Initialize Auth with Persistence (The "Stay Logged In" fix)
const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
});

// 4. Initialize Firestore with Long Polling (The VPN/Zscaler fix)
const db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
});

// 5. Initialize Storage
const storage = getStorage(app);

export { app, auth, db, storage };

