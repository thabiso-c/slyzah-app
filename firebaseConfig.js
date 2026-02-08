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
    apiKey: "AIzaSyDihondydupBhiZf9Wb_BavwKQYDlg9Jjg",
    authDomain: "slyzah-10d1c.firebaseapp.com",
    projectId: "slyzah-10d1c",
    storageBucket: "slyzah-10d1c.firebasestorage.app",
    messagingSenderId: "155997597456",
    appId: "1:155997597456:web:39612f8de2c94ceebc7f95",
    measurementId: "G-SR8L1N64NS"
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
