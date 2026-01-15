import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import colors from '../../constants/colors';

interface LoadingProps {
    message?: string;
    fullScreen?: boolean;
    size?: 'small' | 'large';
}

const Loading: React.FC<LoadingProps> = ({
    message,
    fullScreen = false,
    size = 'large',
}) => {
    if (fullScreen) {
        return (
            <View style={styles.fullScreen}>
                <ActivityIndicator size={size} color={colors.primary} />
                {message && <Text style={styles.message}>{message}</Text>}
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ActivityIndicator size={size} color={colors.primary} />
            {message && <Text style={styles.message}>{message}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    fullScreen: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background,
    },
    message: {
        marginTop: 12,
        fontSize: 14,
        color: colors.textSecondary,
    },
});

export default Loading;
