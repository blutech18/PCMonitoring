import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import colors from '../constants/colors';
import { Notification } from '../models/types';
import { getRelativeTime } from '../utils/helpers';

interface NotificationItemProps {
    notification: Notification;
    onPress?: () => void;
    onDismiss?: () => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
    notification,
    onPress,
    onDismiss,
}) => {
    const getTypeColor = () => {
        switch (notification.type) {
            case 'long_usage':
                return colors.warning;
            case 'system_issue':
                return colors.error;
            case 'network_issue':
                return colors.info;
            default:
                return colors.primary;
        }
    };

    const getTypeLabel = () => {
        switch (notification.type) {
            case 'long_usage':
                return 'Usage Alert';
            case 'system_issue':
                return 'System Issue';
            case 'network_issue':
                return 'Network Issue';
            default:
                return 'Notification';
        }
    };

    const typeColor = getTypeColor();

    return (
        <TouchableOpacity
            style={[
                styles.container,
                !notification.read && styles.unread,
                notification.acknowledged && styles.acknowledged,
            ]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={[styles.indicator, { backgroundColor: typeColor }]} />

            <View style={styles.content}>
                <View style={styles.header}>
                    <View style={[styles.typeBadge, { backgroundColor: `${typeColor}20` }]}>
                        <Text style={[styles.typeText, { color: typeColor }]}>{getTypeLabel()}</Text>
                    </View>
                    <Text style={styles.timestamp}>{getRelativeTime(notification.timestamp)}</Text>
                </View>

                <Text style={styles.title}>{notification.title}</Text>
                <Text style={styles.message} numberOfLines={2}>{notification.message}</Text>

                {!notification.acknowledged && onDismiss && (
                    <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
                        <Text style={styles.dismissText}>Dismiss</Text>
                    </TouchableOpacity>
                )}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: colors.surface,
        marginHorizontal: 16,
        marginVertical: 6,
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 2,
    },
    unread: {
        backgroundColor: '#F0F7FF',
    },
    acknowledged: {
        opacity: 0.6,
    },
    indicator: {
        width: 4,
    },
    content: {
        flex: 1,
        padding: 14,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    typeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    typeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    timestamp: {
        fontSize: 11,
        color: colors.textMuted,
    },
    title: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 4,
    },
    message: {
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 18,
    },
    dismissButton: {
        alignSelf: 'flex-end',
        marginTop: 10,
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: colors.background,
        borderRadius: 6,
    },
    dismissText: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '500',
    },
});

export default NotificationItem;
