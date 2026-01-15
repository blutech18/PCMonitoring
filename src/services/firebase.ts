import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getDatabase, Database } from 'firebase/database';
import { firebaseConfig } from '../config/firebase.config';

// Initialize Firebase
let app: FirebaseApp;
if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApp();
}

// Initialize Auth
const auth: Auth = getAuth(app);

// Initialize Realtime Database
const database: Database = getDatabase(app);

export { app, auth, database };
