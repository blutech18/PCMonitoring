import React, { useRef, useEffect } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/colors';

type StatusType = 'online' | 'offline' | 'away' | 'active' | 'completed' | 'warning' | 'error';

interface StatusBadgeProps {
    status: StatusType;
    label?: string;
    size?: 'small' | 'medium' | 'large';
    pulse?: boolean;
}

const statusColors: Record<StatusType, { bg: string; text: string; dot: string }> = {
    online: { bg: colors.successLight, text: colors.success, dot: colors.online },
    offline: { bg: colors.divider, text: colors.textMuted, dot: colors.offline },
    away: { bg: colors.warningLight, text: colors.warning, dot: colors.away },
    active: { bg: colors.successLight, text: colors.success, dot: colors.success },
    completed: { bg: colors.infoLight, text: colors.info, dot: colors.info },
    warning: { bg: colors.warningLight, text: colors.warning, dot: colors.warning },
    error: { bg: colors.errorLight, text: colors.error, dot: colors.error },
};

const statusLabels: Record<StatusType, string> = {
    online: 'Online',
    offline: 'Offline',
    away: 'Away',
    active: 'Active',
    completed: 'Completed',
    warning: 'Warning',
    error: 'Error',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
    status,
    label,
    size = 'medium',
    pulse = false,
}) => {
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const colorConfig = statusColors[status] || statusColors.offline;
    const displayLabel = label || statusLabels[status];

    useEffect(() => {
        if (pulse && (status === 'online' || status === 'active')) {
            const animation = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.3,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ])
            );
            animation.start();
            return () => animation.stop();
        }
    }, [pulse, status]);

    const sizeStyles = {
        small: { paddingHorizontal: 8, paddingVertical: 2, fontSize: 10, dotSize: 6 },
        medium: { paddingHorizontal: 10, paddingVertical: 4, fontSize: 12, dotSize: 8 },
        large: { paddingHorizontal: 14, paddingVertical: 6, fontSize: 14, dotSize: 10 },
    };

    const currentSize = sizeStyles[size];

    return (
        <View
            style={[
                styles.badge,
                {
                    backgroundColor: colorConfig.bg,
                    paddingHorizontal: currentSize.paddingHorizontal,
                    paddingVertical: currentSize.paddingVertical,
                },
            ]}
        >
            <View style={styles.dotContainer}>
                <Animated.View
                    style={[
                        styles.dot,
                        {
                            backgroundColor: colorConfig.dot,
                            width: currentSize.dotSize,
                            height: currentSize.dotSize,
                            transform: [{ scale: pulseAnim }],
                        },
                    ]}
                />
            </View>
            <Text
                style={[
                    styles.label,
                    { color: colorConfig.text, fontSize: currentSize.fontSize },
                ]}
            >
                {displayLabel}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 20,
    },
    dotContainer: {
        marginRight: 6,
    },
    dot: {
        borderRadius: 50,
    },
    label: {
        fontWeight: '600',
    },
});

export default StatusBadge;
