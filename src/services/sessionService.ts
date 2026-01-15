import { ref, get, query, orderByChild, equalTo, onValue, off } from 'firebase/database';
import { database, auth } from './firebase';
import { ActiveSession, SessionHistory, SessionDetail, DashboardStats, ActiveSessionRecord, SessionHistoryRecord, Notification } from '../models/types';
import { DB_PATHS, USER_DATA_PATHS } from '../config/firebase.config';
import { getCachedData, setCachedData, CACHE_KEYS } from './cacheService';

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

export const sessionService = {
    /**
     * Get dashboard statistics
     */
    getDashboardStats: async (): Promise<DashboardStats> => {
        try {
            // Get active sessions count (user-specific)
            const activeRef = getUserDataRef(USER_DATA_PATHS.sessions.active);
            const activeSnapshot = await get(activeRef);
            const activeSessions = activeSnapshot.val() || {};
            const activeSessionRecords = activeSessions as Record<string, ActiveSessionRecord>;
            const activeSessionsArray = Object.values(activeSessionRecords);
            
            // Count unique active computers
            const uniqueComputers = new Set(activeSessionsArray.map((s) => s.computerId));
            const activeComputersCount = uniqueComputers.size;

            // Count active sessions
            const activeSessionsCount = activeSessionsArray.length;

            // Get computers data to show online/offline status
            const computersRef = getUserDataRef(USER_DATA_PATHS.computers);
            const computersSnapshot = await get(computersRef);
            const computersData = computersSnapshot.val() || {};

            // Get today's sessions from history (user-specific)
            const today = new Date().toISOString().split('T')[0];
            const historyRef = getUserDataRef(USER_DATA_PATHS.sessions.history);
            const historySnapshot = await get(historyRef);
            const historyData = historySnapshot.val() || {};
            const historyRecords = historyData as Record<string, SessionHistoryRecord>;
            const todaySessions = Object.values(historyRecords).filter(
                (s) => s.date === today
            ).length + activeSessionsCount;

            // Get alerts count (user-specific)
            const notifRef = getUserDataRef(USER_DATA_PATHS.notifications);
            const notifSnapshot = await get(notifRef);
            const notifications = notifSnapshot.val() || {};
            const notificationRecords = notifications as Record<string, Notification>;
            const alertCount = Object.values(notificationRecords).filter(
                (n) => !n.acknowledged
            ).length;

            return {
                activeComputers: activeComputersCount,
                loggedInUsers: activeSessionsCount,
                todaySessions: todaySessions,
                totalAlerts: alertCount,
            };
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            throw error;
        }
    },

    /**
     * Get all active sessions
     */
    getActiveSessions: async (): Promise<ActiveSession[]> => {
        try {
            const sessionsRef = getUserDataRef(USER_DATA_PATHS.sessions.active);
            const snapshot = await get(sessionsRef);
            const data = snapshot.val();

            if (!data) {
                // Try cache on error
                const cached = await getCachedData<ActiveSession[]>(CACHE_KEYS.activeSessions);
                return cached || [];
            }

            const sessionRecords = data as Record<string, ActiveSessionRecord>;
            const sessions = Object.entries(sessionRecords).map(([id, session]) => ({
                id,
                computerId: session.computerId,
                computerName: session.computerName,
                userId: session.userId,
                userName: session.userName,
                startTime: session.startTime,
                currentActivity: session.currentActivity,
                status: session.status || 'active',
            }));
            
            // Cache the result
            await setCachedData(CACHE_KEYS.activeSessions, sessions);
            return sessions;
        } catch (error) {
            console.error('Error fetching active sessions:', error);
            // Try cache on error
            const cached = await getCachedData<ActiveSession[]>(CACHE_KEYS.activeSessions);
            if (cached) return cached;
            throw error;
        }
    },

    /**
     * Subscribe to active sessions (real-time updates)
     */
    subscribeToActiveSessions: (callback: (sessions: ActiveSession[]) => void) => {
        const userId = getCurrentUserId();
        if (!userId) {
            callback([]);
            return () => {};
        }
        
        const sessionsRef = ref(database, `users/${userId}/${USER_DATA_PATHS.sessions.active}`);

        onValue(sessionsRef, (snapshot) => {
            const data = snapshot.val();
            if (!data) {
                callback([]);
                return;
            }

            const sessionRecords = data as Record<string, ActiveSessionRecord>;
            const sessions = Object.entries(sessionRecords).map(([id, session]) => ({
                id,
                computerId: session.computerId,
                computerName: session.computerName,
                userId: session.userId,
                userName: session.userName,
                startTime: session.startTime,
                currentActivity: session.currentActivity,
                status: session.status || 'active',
            }));

            callback(sessions);
        });

        // Return unsubscribe function
        return () => off(sessionsRef);
    },

    /**
     * Get session history with optional date filter
     */
    getSessionHistory: async (startDate?: string, endDate?: string): Promise<SessionHistory[]> => {
        try {
            const historyRef = getUserDataRef(USER_DATA_PATHS.sessions.history);
            const snapshot = await get(historyRef);
            const data = snapshot.val();

            if (!data) {
                // Try cache on error
                const cached = await getCachedData<SessionHistory[]>(CACHE_KEYS.sessionHistory);
                return cached || [];
            }

            const historyRecords = data as Record<string, SessionHistoryRecord>;
            let sessions = Object.entries(historyRecords).map(([id, session]) => ({
                id,
                computerId: session.computerId,
                computerName: session.computerName,
                userId: session.userId,
                userName: session.userName,
                startTime: session.startTime,
                endTime: session.endTime,
                totalDuration: session.totalDuration,
                date: session.date,
            }));

            // Apply date filter if provided
            if (startDate && endDate) {
                sessions = sessions.filter(session => {
                    const sessionDate = new Date(session.date);
                    return sessionDate >= new Date(startDate) && sessionDate <= new Date(endDate);
                });
            }

            // Sort by date descending
            sessions.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

            // Cache the result
            await setCachedData(CACHE_KEYS.sessionHistory, sessions);
            return sessions;
        } catch (error) {
            console.error('Error fetching session history:', error);
            // Try cache on error
            const cached = await getCachedData<SessionHistory[]>(CACHE_KEYS.sessionHistory);
            if (cached) return cached;
            throw error;
        }
    },

    /**
     * Get detailed session information
     */
    getSessionDetails: async (sessionId: string): Promise<SessionDetail> => {
        try {
            const userId = getCurrentUserId();
            if (!userId) {
                throw new Error('User not authenticated');
            }
            
            // Try active sessions first (user-specific)
            let sessionRef = ref(database, `users/${userId}/${USER_DATA_PATHS.sessions.active}/${sessionId}`);
            let snapshot = await get(sessionRef);
            let data = snapshot.val();

            // If not found in active, try history (user-specific)
            if (!data) {
                sessionRef = ref(database, `users/${userId}/${USER_DATA_PATHS.sessions.history}/${sessionId}`);
                snapshot = await get(sessionRef);
                data = snapshot.val();
            }

            if (!data) {
                throw new Error('Session not found');
            }

            return {
                id: sessionId,
                computerId: data.computerId,
                computerName: data.computerName,
                userId: data.userId,
                userName: data.userName,
                startTime: data.startTime,
                endTime: data.endTime || new Date().toISOString(),
                totalDuration: data.totalDuration || 0,
                applicationsAccessed: data.applicationsAccessed || [],
                filesEdited: data.filesEdited || [],
            };
        } catch (error) {
            console.error('Error fetching session details:', error);
            throw error;
        }
    },
};

export default sessionService;
