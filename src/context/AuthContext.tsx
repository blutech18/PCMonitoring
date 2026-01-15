import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { AuthState, User, LoginCredentials, UserRole } from '../models/types';
import authService from '../services/authService';
import { auth, database } from '../services/firebase';
import { DB_PATHS } from '../config/firebase.config';

interface AuthContextType extends AuthState {
    login: (credentials: LoginCredentials) => Promise<void>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
}

const initialState: AuthState = {
    isAuthenticated: false,
    user: null,
    token: null,
    loading: true,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Convert Firebase user to app user
const convertFirebaseUser = async (firebaseUser: FirebaseUser): Promise<User> => {
    const userRef = ref(database, `${DB_PATHS.users}/${firebaseUser.uid}`);
    const snapshot = await get(userRef);
    const userData = snapshot.val() as Record<string, unknown> | null;

    return {
        id: firebaseUser.uid,
        username: (userData?.username as string) || firebaseUser.email?.split('@')[0] || 'User',
        role: (userData?.role as UserRole) || 'user',
        email: firebaseUser.email || undefined,
    };
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, setState] = useState<AuthState>(initialState);

    // Listen to Firebase auth state changes
    useEffect(() => {
        const unsubscribe = authService.onAuthStateChange(async (firebaseUser: FirebaseUser | null) => {
            if (firebaseUser) {
                try {
                    const user = await convertFirebaseUser(firebaseUser);
                    const token = await firebaseUser.getIdToken();

                    // Store for offline access
                    await authService.storeToken(token);
                    await authService.storeUser(user);

                    setState({
                        isAuthenticated: true,
                        user,
                        token,
                        loading: false,
                    });
                } catch (error) {
                    console.error('Error converting user:', error);
                    setState({
                        isAuthenticated: false,
                        user: null,
                        token: null,
                        loading: false,
                    });
                }
            } else {
                setState({
                    isAuthenticated: false,
                    user: null,
                    token: null,
                    loading: false,
                });
            }
        });

        return () => unsubscribe();
    }, []);

    const checkAuth = async (): Promise<void> => {
        setState(prev => ({ ...prev, loading: true }));

        const firebaseUser = auth.currentUser;
        if (firebaseUser) {
            try {
                const user = await convertFirebaseUser(firebaseUser);
                const token = await firebaseUser.getIdToken();

                setState({
                    isAuthenticated: true,
                    user,
                    token,
                    loading: false,
                });
            } catch {
                setState({
                    isAuthenticated: false,
                    user: null,
                    token: null,
                    loading: false,
                });
            }
        } else {
            // Try to restore from secure storage
            const storedToken = await authService.getToken();
            const storedUser = await authService.getUser();

            if (storedToken && storedUser) {
                setState({
                    isAuthenticated: true,
                    user: storedUser,
                    token: storedToken,
                    loading: false,
                });
            } else {
                setState({
                    isAuthenticated: false,
                    user: null,
                    token: null,
                    loading: false,
                });
            }
        }
    };

    const login = async (credentials: LoginCredentials): Promise<void> => {
        setState(prev => ({ ...prev, loading: true }));
        try {
            const response = await authService.login(credentials);

            await authService.storeToken(response.token);
            await authService.storeUser(response.user);

            setState({
                isAuthenticated: true,
                user: response.user,
                token: response.token,
                loading: false,
            });
        } catch (error) {
            setState(prev => ({ ...prev, loading: false }));
            throw error;
        }
    };

    const logout = async (): Promise<void> => {
        try {
            await authService.logout();
            setState({
                isAuthenticated: false,
                user: null,
                token: null,
                loading: false,
            });
        } catch (error) {
            console.error('Logout error:', error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{ ...state, login, logout, checkAuth }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;
