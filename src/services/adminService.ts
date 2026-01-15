import { ref, get, query, orderByChild } from 'firebase/database';
import { database } from './firebase';
import { User, ActiveSession, SessionHistory, DashboardStats, ActiveSessionRecord, SessionHistoryRecord, Notification } from '../models/types';
import { DB_PATHS, USER_DATA_PATHS } from '../config/firebase.config';

/**
 * Admin Service - Provides system-wide data access for admin users
 * Admins can see all users, all sessions, and system-wide statistics
 */
export const adminService = {
    /**
     * Get all users in the system
     */
    getAllUsers: async (): Promise<User[]> => {
        try {
            const usersRef = ref(database, DB_PATHS.users);
            const snapshot = await get(usersRef);
            const data = snapshot.val();

            if (!data) return [];

            const users = Object.entries(data).map(([id, userData]: [string, any]) => ({
                id,
                username: userData.username,
                email: userData.email,
                role: userData.role,
            }));

            return users;
        } catch (error) {
            console.error('Error fetching all users:', error);
            throw error;
        }
    },

    /**
     * Get system-wide dashboard statistics (all users)
     */
    getSystemDashboardStats: async (): Promise<DashboardStats> => {
        try {
            const usersRef = ref(database, DB_PATHS.users);
            const usersSnapshot = await get(usersRef);
            const usersData = usersSnapshot.val() || {};

            let totalActiveComputers = 0;
            let totalLoggedInUsers = 0;
            let totalTodaysSessions = 0;
            let totalAlerts = 0;

            const today = new Date().toISOString().split('T')[0];
            const uniqueUsers = new Set<string>();

            // Aggregate data from all users
            for (const [userId, userData] of Object.entries(usersData)) {
                const userDataTyped = userData as any;

                // Count active sessions
                const activeSessions = userDataTyped.sessions?.active || {};
                const activeCount = Object.keys(activeSessions).length;
                totalActiveComputers += activeCount;

                // Track unique users with active sessions
                Object.values(activeSessions).forEach((session: any) => {
                    uniqueUsers.add(session.userId);
                });

                // Count today's sessions
                const historySessions = userDataTyped.sessions?.history || {};
                const todaySessionsCount = Object.values(historySessions).filter(
                    (s: any) => s.date === today
                ).length;
                totalTodaysSessions += todaySessionsCount + activeCount;

                // Count unacknowledged alerts
                const notifications = userDataTyped.notifications || {};
                const alertCount = Object.values(notifications).filter(
                    (n: any) => !n.acknowledged
                ).length;
                totalAlerts += alertCount;
            }

            totalLoggedInUsers = uniqueUsers.size;

            return {
                activeComputers: totalActiveComputers,
                loggedInUsers: totalLoggedInUsers,
                todaySessions: totalTodaysSessions,
                totalAlerts: totalAlerts,
            };
        } catch (error) {
            console.error('Error fetching system dashboard stats:', error);
            throw error;
        }
    },

    /**
     * Get all active sessions across all users
     */
    getAllActiveSessions: async (): Promise<ActiveSession[]> => {
        try {
            const usersRef = ref(database, DB_PATHS.users);
            const snapshot = await get(usersRef);
            const usersData = snapshot.val() || {};

            const allSessions: ActiveSession[] = [];

            // Collect sessions from all users
            for (const [userId, userData] of Object.entries(usersData)) {
                const userDataTyped = userData as any;
                const activeSessions = userDataTyped.sessions?.active || {};

                Object.entries(activeSessions).forEach(([sessionId, session]: [string, any]) => {
                    allSessions.push({
                        id: sessionId,
                        computerId: session.computerId,
                        computerName: session.computerName,
                        userId: session.userId,
                        userName: session.userName,
                        startTime: session.startTime,
                        currentActivity: session.currentActivity,
                        status: session.status || 'active',
                    });
                });
            }

            // Sort by start time descending
            allSessions.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

            return allSessions;
        } catch (error) {
            console.error('Error fetching all active sessions:', error);
            throw error;
        }
    },

    /**
     * Get all session history across all users
     */
    getAllSessionHistory: async (startDate?: string, endDate?: string): Promise<SessionHistory[]> => {
        try {
            const usersRef = ref(database, DB_PATHS.users);
            const snapshot = await get(usersRef);
            const usersData = snapshot.val() || {};

            const allSessions: SessionHistory[] = [];

            // Collect sessions from all users
            for (const [userId, userData] of Object.entries(usersData)) {
                const userDataTyped = userData as any;
                const historySessions = userDataTyped.sessions?.history || {};

                Object.entries(historySessions).forEach(([sessionId, session]: [string, any]) => {
                    allSessions.push({
                        id: sessionId,
                        computerId: session.computerId,
                        computerName: session.computerName,
                        userId: session.userId,
                        userName: session.userName,
                        startTime: session.startTime,
                        endTime: session.endTime,
                        totalDuration: session.totalDuration,
                        date: session.date,
                    });
                });
            }

            // Apply date filter if provided
            let filteredSessions = allSessions;
            if (startDate && endDate) {
                filteredSessions = allSessions.filter(session => {
                    const sessionDate = new Date(session.date);
                    return sessionDate >= new Date(startDate) && sessionDate <= new Date(endDate);
                });
            }

            // Sort by start time descending
            filteredSessions.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

            return filteredSessions;
        } catch (error) {
            console.error('Error fetching all session history:', error);
            throw error;
        }
    },

    /**
     * Get user count by role
     */
    getUserCountByRole: async (): Promise<{ admin: number; user: number }> => {
        try {
            const users = await adminService.getAllUsers();
            const adminCount = users.filter(u => u.role === 'admin').length;
            const userCount = users.filter(u => u.role === 'user').length;

            return { admin: adminCount, user: userCount };
        } catch (error) {
            console.error('Error fetching user count by role:', error);
            throw error;
        }
    },
};

export default adminService;
