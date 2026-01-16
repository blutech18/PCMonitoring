import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getDatabase, Database, ref as dbRef, get, DataSnapshot } from 'firebase/database';
import { Platform } from 'react-native';
import { firebaseConfig } from '../config/firebase.config';

// Sanitize function to fix boolean strings in Firebase data
const sanitizeFirebaseValue = (value: any): any => {
    if (value === null || value === undefined) {
        return value;
    }
    
    // Handle string booleans
    if (typeof value === 'string') {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    }
    
    // Handle arrays
    if (Array.isArray(value)) {
        return value.map(sanitizeFirebaseValue);
    }
    
    // Handle objects recursively
    if (typeof value === 'object') {
        const sanitized: any = {};
        for (const [key, val] of Object.entries(value)) {
            sanitized[key] = sanitizeFirebaseValue(val);
        }
        return sanitized;
    }
    
    return value;
};

// Initialize Firebase
let app: FirebaseApp;
if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApp();
}

// Initialize Auth with platform-specific persistence
let auth: Auth;

// For React Native (iOS/Android), use AsyncStorage persistence
if (Platform.OS === 'ios' || Platform.OS === 'android') {
    try {
        // Import these only for native platforms
        const { initializeAuth, getReactNativePersistence } = require('firebase/auth');
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        
        auth = initializeAuth(app, {
            persistence: getReactNativePersistence(AsyncStorage)
        });
    } catch (error: any) {
        // If auth is already initialized, get the existing instance
        if (error.code === 'auth/already-initialized') {
            auth = getAuth(app);
        } else {
            throw error;
        }
    }
} else {
    // For web, use default persistence (IndexedDB)
    auth = getAuth(app);
}

// Initialize Realtime Database with automatic sanitization
const databaseInstance: Database = getDatabase(app);

// Wrap database reference to automatically sanitize data
const database = databaseInstance;

// Export sanitizeFirebaseValue for use in services
export { app, auth, database, sanitizeFirebaseValue };
