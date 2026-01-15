import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updatePassword,
    EmailAuthProvider,
    reauthenticateWithCredential,
    User as FirebaseUser,
    Unsubscribe,
} from 'firebase/auth';
import { ref, get, set } from 'firebase/database';
import { auth, database } from './firebase';
import { LoginCredentials, LoginResponse, User, UserRole } from '../models/types';
import { DB_PATHS } from '../config/firebase.config';
import { setItem, getItem, deleteItem } from '../utils/storage';

// Convert Firebase user to app user
const convertFirebaseUser = async (firebaseUser: FirebaseUser): Promise<User> => {
    // Get additional user data from database
    const userRef = ref(database, `${DB_PATHS.users}/${firebaseUser.uid}`);
    const snapshot = await get(userRef);
    const userData = snapshot.val();

    return {
        id: firebaseUser.uid,
        username: userData?.username || firebaseUser.email?.split('@')[0] || 'User',
        role: (userData?.role as UserRole) || 'user',
        email: firebaseUser.email || undefined,
    };
};

export const authService = {
    /**
     * Login with email and password
     */
    login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
            const user = await convertFirebaseUser(userCredential.user);
            const token = await userCredential.user.getIdToken();

            return { token, user };
        } catch (error: unknown) {
            console.error('Login error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Login failed. Please check your credentials.';
            throw new Error(errorMessage);
        }
    },

    /**
     * Logout and clear stored token
     */
    logout: async (): Promise<void> => {
        try {
            await signOut(auth);
            await deleteItem('authToken');
            await deleteItem('userData');
        } catch (error) {
            console.error('Logout error:', error);
            throw error;
        }
    },

    /**
     * Store authentication token securely
     */
    storeToken: async (token: string): Promise<void> => {
        await setItem('authToken', token);
    },

    /**
     * Get stored authentication token
     */
    getToken: async (): Promise<string | null> => {
        return await getItem('authToken');
    },

    /**
     * Store user data
     */
    storeUser: async (user: User): Promise<void> => {
        await setItem('userData', JSON.stringify(user));
    },

    /**
     * Get stored user data
     */
    getUser: async (): Promise<User | null> => {
        try {
            const userData = await getItem('userData');
            return userData ? JSON.parse(userData) : null;
        } catch {
            return null;
        }
    },

    /**
     * Check if user is authenticated
     */
    isAuthenticated: async (): Promise<boolean> => {
        return auth.currentUser !== null;
    },

    /**
     * Get current Firebase user
     */
    getCurrentUser: (): FirebaseUser | null => {
        return auth.currentUser;
    },

    /**
     * Listen to auth state changes
     */
    onAuthStateChange: (callback: (user: FirebaseUser | null) => void): Unsubscribe => {
        return onAuthStateChanged(auth, callback);
    },

    /**
     * Refresh token
     */
    refreshToken: async (): Promise<string> => {
        const user = auth.currentUser;
        if (!user) throw new Error('No user logged in');
        return await user.getIdToken(true);
    },

    /**
     * Create user profile in database
     */
    createUserProfile: async (userId: string, username: string, role: UserRole): Promise<void> => {
        const userRef = ref(database, `${DB_PATHS.users}/${userId}`);
        await set(userRef, {
            username,
            role,
            createdAt: new Date().toISOString(),
        });
    },

    /**
     * Change user password
     */
    changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
        const user = auth.currentUser;
        if (!user || !user.email) {
            throw new Error('No user logged in');
        }

        try {
            // Re-authenticate user before changing password
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);
            
            // Update password
            await updatePassword(user, newPassword);
        } catch (error: unknown) {
            console.error('Change password error:', error);
            if (error instanceof Error) {
                if (error.message.includes('wrong-password')) {
                    throw new Error('Current password is incorrect');
                }
                if (error.message.includes('weak-password')) {
                    throw new Error('New password is too weak. Use at least 6 characters.');
                }
                throw new Error(error.message);
            }
            throw new Error('Failed to change password');
        }
    },
};

export default authService;
