import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Pressable,
    Animated,
    useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import colors from '../constants/colors';
import { validateEmail, validateRequired } from '../utils/validation';

interface LoginScreenProps {
    onNavigateToSignup: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onNavigateToSignup }) => {
    const { login, loading } = useAuth();
    const { width } = useWindowDimensions();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const logoScale = useRef(new Animated.Value(0.8)).current;
    const formSlide = useRef(new Animated.Value(50)).current;

    const isLargeScreen = width >= 768;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.spring(slideAnim, {
                toValue: 0,
                friction: 8,
                useNativeDriver: true,
            }),
            Animated.spring(logoScale, {
                toValue: 1,
                friction: 6,
                delay: 200,
                useNativeDriver: true,
            }),
            Animated.timing(formSlide, {
                toValue: 0,
                duration: 500,
                delay: 300,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const handleLogin = async () => {
        setError('');
        
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

        try {
            await login({ email, password });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Login failed. Please try again.';
            setError(message);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={[
                    styles.scrollContent,
                    isLargeScreen && styles.scrollContentLarge,
                ]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={[styles.innerContainer, isLargeScreen && styles.innerContainerLarge]}>
                    {/* Header */}
                    <Animated.View 
                        style={[
                            styles.header,
                            {
                                opacity: fadeAnim,
                                transform: [{ translateY: slideAnim }],
                            },
                        ]}
                    >
                        <Animated.View 
                            style={[
                                styles.logoContainer,
                                { transform: [{ scale: logoScale }] },
                            ]}
                        >
                            <Ionicons name="desktop-outline" size={42} color={colors.textLight} />
                        </Animated.View>
                        <Text style={styles.title}>PC Monitoring</Text>
                        <Text style={styles.subtitle}>Administrator Dashboard</Text>
                    </Animated.View>

                    {/* Form */}
                    <Animated.View 
                        style={[
                            styles.form,
                            isLargeScreen && styles.formLarge,
                            {
                                opacity: fadeAnim,
                                transform: [{ translateY: formSlide }],
                            },
                        ]}
                    >
                        <Text style={styles.welcomeText}>Welcome Back</Text>
                        <Text style={styles.instructionText}>
                            Sign in to access the monitoring dashboard
                        </Text>

                        {error ? (
                            <Animated.View style={styles.errorContainer}>
                                <Ionicons name="warning-outline" size={18} color={colors.error} style={styles.errorIcon} />
                                <Text style={styles.errorText}>{error}</Text>
                            </Animated.View>
                        ) : null}

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

                        <Button
                            title="Sign In"
                            onPress={handleLogin}
                            loading={loading}
                            fullWidth
                            size="large"
                            style={styles.loginButton}
                        />

                        <View style={styles.signupLinkContainer}>
                            <Text style={styles.signupLinkText}>Don't have an account? </Text>
                            <Pressable onPress={onNavigateToSignup}>
                                <Text style={styles.signupLink}>Sign Up</Text>
                            </Pressable>
                        </View>
                    </Animated.View>

                    {/* Footer */}
                    <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
                        <Text style={styles.footerText}>
                            Computer Usage Monitoring System
                        </Text>
                        <Text style={styles.versionText}>Version 1.0.0</Text>
                    </Animated.View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
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
    scrollContentLarge: {
        padding: 40,
    },
    innerContainer: {
        width: '100%',
    },
    innerContainerLarge: {
        maxWidth: 440,
        alignSelf: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    logoContainer: {
        width: 88,
        height: 88,
        borderRadius: 24,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        ...Platform.select({
            web: {
                boxShadow: `0 8px 24px rgba(59, 130, 246, 0.35)`,
            },
            default: {
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.35,
                shadowRadius: 16,
                elevation: 12,
            },
        }),
    },
    title: {
        fontSize: 30,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 6,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 15,
        color: colors.textSecondary,
    },
    form: {
        backgroundColor: colors.surface,
        borderRadius: 20,
        padding: 28,
        ...Platform.select({
            web: {
                boxShadow: `0 4px 20px ${colors.shadow}`,
            },
            default: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 16,
                elevation: 6,
            },
        }),
    },
    formLarge: {
        padding: 36,
    },
    welcomeText: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 8,
        letterSpacing: -0.3,
    },
    instructionText: {
        fontSize: 15,
        color: colors.textSecondary,
        marginBottom: 28,
        lineHeight: 22,
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.errorLight,
        padding: 14,
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: `${colors.error}30`,
    },
    errorIcon: {
        marginRight: 10,
    },
    errorText: {
        color: colors.error,
        fontSize: 14,
        flex: 1,
        fontWeight: '500',
    },
    loginButton: {
        marginTop: 12,
    },
    footer: {
        alignItems: 'center',
        marginTop: 36,
    },
    footerText: {
        fontSize: 13,
        color: colors.textMuted,
    },
    versionText: {
        fontSize: 12,
        color: colors.textMuted,
        marginTop: 4,
    },
    signupLinkContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 24,
    },
    signupLinkText: {
        color: colors.textSecondary,
        fontSize: 14,
    },
    signupLink: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: '600',
    },
});

export default LoginScreen;
