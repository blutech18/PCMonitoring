import { ref, get, update, onValue, off, DataSnapshot } from 'firebase/database';
import { database, auth } from './firebase';
import { Notification } from '../models/types';
import { USER_DATA_PATHS } from '../config/firebase.config';

// Helper to get current user ID
const getCurrentUserId = (): string | null => {
    return auth.currentUser?.uid || null;
};

// Helper to get user-specific database path
const getUserDataRef = (path: string) => {
    const userId = getCurrentUserId();
    if (!userId) {
        throw new Error('User not authenticated');
    }
    return ref(database, `users/${userId}/${path}`);
};

export const notificationService = {
    /**
     * Get all notifications for current user
     */
    getNotifications: async (): Promise<Notification[]> => {
        try {
            const notifRef = getUserDataRef(USER_DATA_PATHS.notifications);
            const snapshot = await get(notifRef);
            const data = snapshot.val();

            if (!data) return [];

            const notifications: Notification[] = Object.entries(data).map(([id, notif]) => {
                const notification = notif as Record<string, unknown>;
                return {
                    id,
                    type: notification.type as Notification['type'],
                    title: notification.title as string,
                    message: notification.message as string,
                    timestamp: notification.timestamp as string,
                    read: (notification.read as boolean) || false,
                    acknowledged: (notification.acknowledged as boolean) || false,
                };
            });

            // Sort by timestamp descending
            notifications.sort((a, b) =>
                new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );

            return notifications;
        } catch (error) {
            console.error('Error fetching notifications:', error);
            throw error;
        }
    },

    /**
     * Subscribe to notifications (real-time updates)
     */
    subscribeToNotifications: (callback: (notifications: Notification[]) => void): (() => void) => {
        const userId = getCurrentUserId();
        if (!userId) {
            callback([]);
            return () => {};
        }
        const notifRef = ref(database, `users/${userId}/${USER_DATA_PATHS.notifications}`);

        const listener = (snapshot: DataSnapshot) => {
            const data = snapshot.val();
            if (!data) {
                callback([]);
                return;
            }

            const notifications: Notification[] = Object.entries(data).map(([id, notif]) => {
                const notification = notif as Record<string, unknown>;
                return {
                    id,
                    type: notification.type as Notification['type'],
                    title: notification.title as string,
                    message: notification.message as string,
                    timestamp: notification.timestamp as string,
                    read: (notification.read as boolean) || false,
                    acknowledged: (notification.acknowledged as boolean) || false,
                };
            });

            notifications.sort((a, b) =>
                new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );

            callback(notifications);
        };

        onValue(notifRef, listener);

        return () => off(notifRef, 'value', listener);
    },

    /**
     * Get unread notification count
     */
    getUnreadCount: async (): Promise<number> => {
        try {
            const notifRef = getUserDataRef(USER_DATA_PATHS.notifications);
            const snapshot = await get(notifRef);
            const data = snapshot.val();

            if (!data) return 0;

            return Object.values(data).filter((n) => {
                const notif = n as Record<string, unknown>;
                return !notif.read;
            }).length;
        } catch (error) {
            console.error('Error getting unread count:', error);
            return 0;
        }
    },

    /**
     * Mark notification as read
     */
    markAsRead: async (notificationId: string): Promise<void> => {
        try {
            const userId = getCurrentUserId();
            if (!userId) throw new Error('User not authenticated');
            const notifRef = ref(database, `users/${userId}/${USER_DATA_PATHS.notifications}/${notificationId}`);
            await update(notifRef, { read: true });
        } catch (error) {
            console.error('Error marking notification as read:', error);
            throw error;
        }
    },

    /**
     * Acknowledge/dismiss notification
     */
    acknowledgeNotification: async (notificationId: string): Promise<void> => {
        try {
            const userId = getCurrentUserId();
            if (!userId) throw new Error('User not authenticated');
            const notifRef = ref(database, `users/${userId}/${USER_DATA_PATHS.notifications}/${notificationId}`);
            await update(notifRef, {
                acknowledged: true,
                read: true,
                acknowledgedAt: new Date().toISOString(),
                acknowledgedBy: auth.currentUser?.uid || 'unknown',
            });
        } catch (error) {
            console.error('Error acknowledging notification:', error);
            throw error;
        }
    },

    /**
     * Mark all notifications as read
     */
    markAllAsRead: async (): Promise<void> => {
        try {
            const userId = getCurrentUserId();
            if (!userId) throw new Error('User not authenticated');
            const notifRef = ref(database, `users/${userId}/${USER_DATA_PATHS.notifications}`);
            const snapshot = await get(notifRef);
            const data = snapshot.val();

            if (!data) return;

            const updates: Record<string, boolean> = {};
            Object.keys(data).forEach(id => {
                updates[`users/${userId}/${USER_DATA_PATHS.notifications}/${id}/read`] = true;
            });

            await update(ref(database), updates);
        } catch (error) {
            console.error('Error marking all as read:', error);
            throw error;
        }
    },
};

export default notificationService;
