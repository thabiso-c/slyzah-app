import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from "firebase/app";
import {
    getReactNativePersistence,
    initializeAuth
} from 'firebase/auth';
import { initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import {
    FIREBASE_API_KEY,
    FIREBASE_APP_ID,
    FIREBASE_AUTH_DOMAIN,
    FIREBASE_MEASUREMENT_ID,
    FIREBASE_MESSAGING_SENDER_ID,
    FIREBASE_PROJECT_ID,
    FIREBASE_STORAGE_BUCKET
} from './lib/secrets';

// 1. Your Firebase Configuration
const firebaseConfig = {
    apiKey: FIREBASE_API_KEY,
    authDomain: FIREBASE_AUTH_DOMAIN,
    projectId: FIREBASE_PROJECT_ID,
    storageBucket: FIREBASE_STORAGE_BUCKET,
    messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
    appId: FIREBASE_APP_ID,
    measurementId: FIREBASE_MEASUREMENT_ID
};

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

