import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { auth, database } from '../services/firebase';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import colors from '../constants/colors';
import { validateEmail, validateRequired } from '../utils/validation';
import { ensureBoolean } from '../utils/firebaseHelpers';

interface SignupScreenProps {
    onNavigateToLogin: () => void;
}

const SignupScreen: React.FC<SignupScreenProps> = ({ onNavigateToLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSignup = async () => {
        setError('');

        // Validation
        if (!validateRequired(username)) {
            setError('Username is required');
            return;
        }

        if (!validateRequired(email)) {
            setError('Email is required');
            return;
        }

        if (!validateEmail(email)) {
            setError('Please enter a valid email address');
            return;
        }

        if (!validateRequired(password)) {
            setError('Password is required');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            // Create user in Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const userId = userCredential.user.uid;

            // Create user profile in database with user-specific structure
            const userRef = ref(database, `users/${userId}`);
            await set(userRef, {
                username,
                email,
                role: 'user',
                createdAt: new Date().toISOString(),
                settings: {
                    sessionTimeLimit: 480,
                    alertThreshold: 80,
                    autoLogoutEnabled: ensureBoolean(false),
                },
            });

            // Generate a unique agent linking code for this user
            const agentCode = generateAgentCode();
            const agentCodeRef = ref(database, `users/${userId}/agentCode`);
            await set(agentCodeRef, {
                code: agentCode,
                createdAt: new Date().toISOString(),
                active: ensureBoolean(true),
            });

            // Also write to public agentCodes lookup path for PC agent connection
            const publicCodeRef = ref(database, `agentCodes/${agentCode}`);
            await set(publicCodeRef, {
                userId: userId,
                createdAt: new Date().toISOString(),
                active: ensureBoolean(true),
            });

            // User will be automatically logged in via onAuthStateChanged
        } catch (err: unknown) {
            let message = 'Signup failed. Please try again.';
            if (err instanceof Error) {
                if (err.message.includes('email-already-in-use')) {
                    message = 'This email is already registered';
                } else if (err.message.includes('weak-password')) {
                    message = 'Password is too weak';
                } else if (err.message.includes('invalid-email')) {
                    message = 'Invalid email address';
                } else {
                    message = err.message;
                }
            }
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        <Text style={styles.logoText}>PC</Text>
                    </View>
                    <Text style={styles.title}>PC Monitoring</Text>
                    <Text style={styles.subtitle}>Create Your Account</Text>
                </View>

                <View style={styles.form}>
                    <Text style={styles.welcomeText}>Get Started</Text>
                    <Text style={styles.instructionText}>
                        Create an account to start monitoring your PCs
                    </Text>

                    {error ? (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : null}

                    <Input
                        label="Username"
                        placeholder="Enter your username"
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />

                    <Input
                        label="Email"
                        placeholder="Enter your email"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="email-address"
                    />

                    <Input
                        label="Password"
                        placeholder="Enter your password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        autoCapitalize="none"
                    />

                    <Input
                        label="Confirm Password"
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                        autoCapitalize="none"
                    />

                    <Button
                        title="Create Account"
                        onPress={handleSignup}
                        loading={loading}
                        fullWidth
                        style={styles.signupButton}
                    />

                    <View style={styles.loginLinkContainer}>
                        <Text style={styles.loginLinkText}>Already have an account? </Text>
                        <TouchableOpacity onPress={onNavigateToLogin}>
                            <Text style={styles.loginLink}>Sign In</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        Computer Usage Monitoring System
                    </Text>
                    <Text style={styles.versionText}>Version 1.0.0</Text>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

// Generate a unique 8-character agent linking code
const generateAgentCode = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    logoContainer: {
        width: 80,
        height: 80,
        borderRadius: 20,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    logoText: {
        fontSize: 40,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 16,
        color: colors.textSecondary,
    },
    form: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 24,
    },
    welcomeText: {
        fontSize: 22,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 8,
    },
    instructionText: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 24,
    },
    errorContainer: {
        backgroundColor: '#FFEBEE',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: colors.error,
    },
    errorText: {
        color: colors.error,
        fontSize: 14,
    },
    signupButton: {
        marginTop: 8,
    },
    loginLinkContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 20,
    },
    loginLinkText: {
        color: colors.textSecondary,
        fontSize: 14,
    },
    loginLink: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: '600',
    },
    footer: {
        alignItems: 'center',
        marginTop: 32,
    },
    footerText: {
        fontSize: 12,
        color: colors.textMuted,
    },
    versionText: {
        fontSize: 11,
        color: colors.textMuted,
        marginTop: 4,
    },
});

export default SignupScreen;
