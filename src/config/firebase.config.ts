// Firebase configuration
// Uses environment variables with fallback to default values for development
// For production, set these in your .env file (see FIREBASE_SETUP.md)
export const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyAwzHTgC6JwWOXJW0PskaT86Xz7DDuCuXg",
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "pcmonitoring-2178d.firebaseapp.com",
    databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL || "https://pcmonitoring-2178d-default-rtdb.firebaseio.com",
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "pcmonitoring-2178d",
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "pcmonitoring-2178d.firebasestorage.app",
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "537521857092",
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:537521857092:web:951339630642059502d211"
};

// Database paths (user-based structure)
// All user data is stored under /users/{userId}/...
export const DB_PATHS = {
    users: 'users',
    // Helper function to get user-specific paths
    getUserPath: (userId: string) => `users/${userId}`,
    getUserDataPath: (userId: string, path: string) => `users/${userId}/${path}`,
    // Legacy paths (for backward compatibility during migration)
    sessions: {
        active: 'sessions/active',
        history: 'sessions/history',
    },
    notifications: 'notifications',
    settings: 'settings',
    computers: 'computers',
    reports: 'reports',
};

// User-specific data paths
export const USER_DATA_PATHS = {
    computers: 'computers',
    sessions: {
        active: 'sessions/active',
        history: 'sessions/history',
    },
    activities: 'activities',
    websites: 'websites',
    notifications: 'notifications',
    settings: 'settings',
    reports: 'reports',
    agentCode: 'agentCode',
};
