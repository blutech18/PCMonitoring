import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    TouchableOpacity,
} from 'react-native';
import notificationService from '../services/notificationService';
import { Notification } from '../models/types';
import NotificationItem from '../components/NotificationItem';
import Loading from '../components/common/Loading';
import colors from '../constants/colors';

const NotificationsScreen: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchNotifications = useCallback(async () => {
        try {
            const data = await notificationService.getNotifications();
            setNotifications(data);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchNotifications();
    }, [fetchNotifications]);

    const handleDismiss = async (notificationId: string) => {
        try {
            await notificationService.acknowledgeNotification(notificationId);
            setNotifications(prev =>
                prev.map(n =>
                    n.id === notificationId ? { ...n, acknowledged: true, read: true } : n
                )
            );
        } catch (error) {
            console.error('Error dismissing notification:', error);
        }
    };

    const handleMarkAsRead = async (notificationId: string) => {
        try {
            await notificationService.markAsRead(notificationId);
            setNotifications(prev =>
                prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
            );
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await notificationService.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    if (loading) {
        return <Loading fullScreen message="Loading notifications..." />;
    }

    const unreadCount = notifications.filter(n => !n.read).length;
    const activeNotifications = notifications.filter(n => !n.acknowledged);

    const renderHeader = () => (
        <View style={styles.header}>
            <View style={styles.headerLeft}>
                <Text style={styles.headerTitle}>Notifications</Text>
                {unreadCount > 0 && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{unreadCount}</Text>
                    </View>
                )}
            </View>
            {unreadCount > 0 && (
                <TouchableOpacity onPress={handleMarkAllAsRead}>
                    <Text style={styles.markAllText}>Mark all as read</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptyText}>
                You're all caught up! New alerts will appear here.
            </Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={activeNotifications}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <NotificationItem
                        notification={item}
                        onPress={() => handleMarkAsRead(item.id)}
                        onDismiss={() => handleDismiss(item.id)}
                    />
                )}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmptyState}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    listContent: {
        flexGrow: 1,
        paddingBottom: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    badge: {
        backgroundColor: colors.error,
        minWidth: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
    },
    badgeText: {
        color: colors.textLight,
        fontSize: 12,
        fontWeight: '700',
    },
    markAllText: {
        fontSize: 14,
        color: colors.primary,
        fontWeight: '500',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        marginTop: 80,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
    },
});

export default NotificationsScreen;
