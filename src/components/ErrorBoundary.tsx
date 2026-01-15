import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import colors from '../constants/colors';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        // Log error to error reporting service in production
        // For now, we'll just store it in state
        this.setState({
            error,
            errorInfo,
        });
    }

    handleReset = (): void => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    render(): ReactNode {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <View style={styles.container}>
                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        <View style={styles.content}>
                            <Text style={styles.title}>Something went wrong</Text>
                            <Text style={styles.message}>
                                An unexpected error occurred. Please try again.
                            </Text>

                            {__DEV__ && this.state.error && (
                                <View style={styles.errorDetails}>
                                    <Text style={styles.errorTitle}>Error Details:</Text>
                                    <Text style={styles.errorText}>
                                        {this.state.error.toString()}
                                    </Text>
                                    {this.state.errorInfo && (
                                        <Text style={styles.errorStack}>
                                            {this.state.errorInfo.componentStack}
                                        </Text>
                                    )}
                                </View>
                            )}

                            <TouchableOpacity
                                style={styles.button}
                                onPress={this.handleReset}
                            >
                                <Text style={styles.buttonText}>Try Again</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            );
        }

        return this.props.children;
    }
}

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
    content: {
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 24,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
    },
    emoji: {
        fontSize: 64,
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 8,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 24,
    },
    errorDetails: {
        width: '100%',
        backgroundColor: '#FFF5F5',
        borderRadius: 8,
        padding: 16,
        marginBottom: 24,
        borderLeftWidth: 4,
        borderLeftColor: colors.error,
    },
    errorTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.error,
        marginBottom: 8,
    },
    errorText: {
        fontSize: 12,
        color: colors.textPrimary,
        fontFamily: 'monospace',
        marginBottom: 8,
    },
    errorStack: {
        fontSize: 10,
        color: colors.textSecondary,
        fontFamily: 'monospace',
    },
    button: {
        backgroundColor: colors.primary,
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 8,
        minWidth: 120,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
});

export default ErrorBoundary;
