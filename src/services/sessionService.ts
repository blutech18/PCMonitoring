import { ref, get, onValue, off } from 'firebase/database';
import { database, auth, sanitizeFirebaseValue } from './firebase';
import { ActiveSession, SessionHistory, SessionDetail, DashboardStats, ActiveSessionRecord, SessionHistoryRecord, Notification } from '../models/types';
import { USER_DATA_PATHS } from '../config/firebase.config';
import { getCachedData, setCachedData, CACHE_KEYS } from './cacheService';
import { isComputerOnline } from '../utils/helpers';
import { toBoolean } from '../utils/firebaseHelpers';

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
            // Get computers data first to check online/offline status
            const computersRef = getUserDataRef(USER_DATA_PATHS.computers);
            const computersSnapshot = await get(computersRef);
            const computersData = computersSnapshot.val() || {} as Record<string, any>;

            // Get active sessions count (user-specific)
            const activeRef = getUserDataRef(USER_DATA_PATHS.sessions.active);
            const activeSnapshot = await get(activeRef);
            const activeSessions = activeSnapshot.val() || {};
            const activeSessionRecords = activeSessions as Record<string, ActiveSessionRecord>;
            const activeSessionsArray = Object.values(activeSessionRecords);

            // Filter sessions to only include those from computers that are actually online
            // A computer is considered online if lastSeen is within the last 10 seconds
            const onlineSessionsArray = activeSessionsArray.filter((session) => {
                const computer = Object.values(computersData).find(
                    (c: any) => c.name && session.computerName &&
                        (c.name === session.computerName || c.name.includes(session.computerName))
                );

                // Also check by computerId directly in computersData
                const computerById = computersData[session.computerId];
                const targetComputer = computerById || computer;

                if (targetComputer?.lastSeen) {
                    return isComputerOnline(targetComputer.lastSeen, targetComputer.status);
                }

                // If no computer data found, assume offline (stale session)
                return false;
            });

            // Count unique active computers (only from online sessions)
            const uniqueComputers = new Set(onlineSessionsArray.map((s) => s.computerId));
            const activeComputersCount = uniqueComputers.size;

            // Count active sessions (only from online computers)
            const activeSessionsCount = onlineSessionsArray.length;

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
            let notifications = notifSnapshot.val() || {};
            notifications = sanitizeFirebaseValue(notifications);
            const notificationRecords = notifications as Record<string, any>;
            const alertCount = Object.values(notificationRecords).filter(
                (n) => !toBoolean(n.acknowledged)
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
            const currentUserId = getCurrentUserId();
            // First get computers data to check online status
            const computersRef = getUserDataRef(USER_DATA_PATHS.computers);
            const computersSnapshot = await get(computersRef);
            const computersData = computersSnapshot.val() || {} as Record<string, any>;

            const sessionsRef = getUserDataRef(USER_DATA_PATHS.sessions.active);
            const snapshot = await get(sessionsRef);
            const data = snapshot.val();

            if (!data) {
                // Try cache on error
                const cached = await getCachedData<ActiveSession[]>(CACHE_KEYS.activeSessions);
                return cached || [];
            }

            const sessionRecords = data as Record<string, ActiveSessionRecord>;
            const allSessions = Object.entries(sessionRecords).map(([id, session]) => ({
                id,
                computerId: session.computerId,
                computerName: session.computerName,
                userId: session.userId,
                userName: session.userName,
                startTime: session.startTime,
                currentActivity: session.currentActivity,
                status: session.status || 'active',
                pausedAt: session.pausedAt,
                ownerUserId: currentUserId || undefined,
            }));

            // Filter sessions to only include those from computers that are actually online
            // Exception: Keep paused sessions visible even if computer is offline
            const sessions = allSessions.filter((session) => {
                // Always show paused sessions (user explicitly paused them)
                if (session.status === 'paused') {
                    return true;
                }

                const computer = Object.values(computersData).find(
                    (c: any) => c.name && session.computerName &&
                        (c.name === session.computerName || c.name.includes(session.computerName))
                );

                const computerById = computersData[session.computerId];
                const targetComputer = computerById || computer;

                if (targetComputer?.lastSeen) {
                    return isComputerOnline(targetComputer.lastSeen, targetComputer.status);
                }

                // If no computer data found, assume offline (stale session)
                return false;
            });

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
            return () => { };
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
                pausedAt: session.pausedAt,
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

            // Calculate duration from start and end times for accuracy
            const startTime = new Date(data.startTime);
            const endTime = data.endTime ? new Date(data.endTime) : new Date();
            const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);

            // Fetch activities for this session's computer and time range
            const activitiesRef = ref(database, `users/${userId}/${USER_DATA_PATHS.activities}`);
            const activitiesSnapshot = await get(activitiesRef);
            const activitiesData = activitiesSnapshot.val() || {};

            // Filter and aggregate activities for this session
            const sessionActivities: { [appName: string]: { duration: number; startTime: string; endTime: string } } = {};

            Object.entries(activitiesData).forEach(([activityId, activity]: [string, any]) => {
                // Check if activity belongs to this session's computer
                if (activityId.startsWith(data.computerId)) {
                    const activityStart = new Date(activity.startTime);
                    const activityEnd = activity.endTime ? new Date(activity.endTime) : new Date();

                    // Check if activity falls within session time range
                    if (activityStart >= startTime && activityStart <= endTime) {
                        const appName = activity.applicationName || 'Unknown';
                        const durationSecs = activity.durationSeconds ||
                            Math.floor((activityEnd.getTime() - activityStart.getTime()) / 1000);

                        if (sessionActivities[appName]) {
                            sessionActivities[appName].duration += durationSecs;
                            // Update end time if this activity is later
                            if (activityEnd > new Date(sessionActivities[appName].endTime)) {
                                sessionActivities[appName].endTime = activity.endTime || activityEnd.toISOString();
                            }
                        } else {
                            sessionActivities[appName] = {
                                duration: durationSecs,
                                startTime: activity.startTime,
                                endTime: activity.endTime || activityEnd.toISOString(),
                            };
                        }
                    }
                }
            });

            // Convert to ApplicationAccessed array and sort by duration
            const applicationsAccessed = Object.entries(sessionActivities)
                .map(([name, data]) => ({
                    name: name.replace('.exe', '').replace('.EXE', ''),
                    duration: Math.round(data.duration / 60 * 100) / 100, // Convert to minutes with 2 decimal places
                    startTime: data.startTime,
                    endTime: data.endTime,
                }))
                .sort((a, b) => b.duration - a.duration);

            // Fetch file edits for this session's computer and time range
            const fileEditsRef = ref(database, `users/${userId}/${USER_DATA_PATHS.fileEdits}`);
            const fileEditsSnapshot = await get(fileEditsRef);
            const fileEditsData = fileEditsSnapshot.val() || {};

            // Filter file edits for this session
            const filesEdited = Object.entries(fileEditsData)
                .filter(([fileEditId, fileEdit]: [string, any]) => {
                    if (fileEditId.startsWith(data.computerId)) {
                        const editTime = new Date(fileEdit.editTime);
                        return editTime >= startTime && editTime <= endTime;
                    }
                    return false;
                })
                .map(([_, fileEdit]: [string, any]) => ({
                    fileName: fileEdit.fileName,
                    filePath: fileEdit.filePath || '',
                    application: fileEdit.application,
                    editTime: fileEdit.editTime,
                }))
                .sort((a, b) => new Date(b.editTime).getTime() - new Date(a.editTime).getTime());

            return {
                id: sessionId,
                computerId: data.computerId,
                computerName: data.computerName,
                userId: data.userId,
                userName: data.userName,
                startTime: data.startTime,
                endTime: data.endTime || new Date().toISOString(),
                totalDuration: durationMinutes,
                applicationsAccessed,
                filesEdited,
            };
        } catch (error) {
            console.error('Error fetching session details:', error);
            throw error;
        }
    },

    /**
     * Subscribe to dashboard stats (real-time updates)
     * Listens to both computers and active sessions for changes
     */
    subscribeToDashboardStats: (callback: (stats: DashboardStats) => void) => {
        const userId = getCurrentUserId();
        if (!userId) {
            callback({
                activeComputers: 0,
                loggedInUsers: 0,
                todaySessions: 0,
                totalAlerts: 0,
            });
            return () => { };
        }

        const computersRef = ref(database, `users/${userId}/${USER_DATA_PATHS.computers}`);
        const sessionsRef = ref(database, `users/${userId}/${USER_DATA_PATHS.sessions.active}`);
        const historyRef = ref(database, `users/${userId}/${USER_DATA_PATHS.sessions.history}`);
        const notifRef = ref(database, `users/${userId}/${USER_DATA_PATHS.notifications}`);

        let computersData: Record<string, any> = {};
        let sessionsData: Record<string, ActiveSessionRecord> = {};
        let historyData: Record<string, SessionHistoryRecord> = {};
        let notificationsData: Record<string, Notification> = {};

        const calculateStats = () => {
            const activeSessionsArray = Object.values(sessionsData);

            // Filter sessions by online computers
            const onlineSessionsArray = activeSessionsArray.filter((session) => {
                const computer = Object.values(computersData).find(
                    (c: any) => c.name && session.computerName &&
                        (c.name === session.computerName || c.name.includes(session.computerName))
                );

                const computerById = computersData[session.computerId];
                const targetComputer = computerById || computer;

                if (targetComputer?.lastSeen) {
                    return isComputerOnline(targetComputer.lastSeen, targetComputer.status);
                }
                return false;
            });

            const uniqueComputers = new Set(onlineSessionsArray.map((s) => s.computerId));
            const activeComputersCount = uniqueComputers.size;
            const activeSessionsCount = onlineSessionsArray.length;

            const today = new Date().toISOString().split('T')[0];
            const todaySessions = Object.values(historyData).filter(
                (s) => s.date === today
            ).length + activeSessionsCount;

            const alertCount = Object.values(notificationsData).filter(
                (n) => !toBoolean(n.acknowledged)
            ).length;

            callback({
                activeComputers: activeComputersCount,
                loggedInUsers: activeSessionsCount,
                todaySessions: todaySessions,
                totalAlerts: alertCount,
            });
        };

        // Listen to computers changes
        onValue(computersRef, (snapshot) => {
            computersData = snapshot.val() || {};
            calculateStats();
        });

        // Listen to active sessions changes
        onValue(sessionsRef, (snapshot) => {
            sessionsData = snapshot.val() || {};
            calculateStats();
        });

        // Listen to history changes
        onValue(historyRef, (snapshot) => {
            historyData = snapshot.val() || {};
            calculateStats();
        });

        // Listen to notifications changes
        onValue(notifRef, (snapshot) => {
            notificationsData = snapshot.val() || {};
            calculateStats();
        });

        // Periodic re-check for time-based offline detection
        // This catches when computers become offline due to elapsed time (not data changes)
        const periodicInterval = setInterval(() => {
            calculateStats();
        }, 1000); // Re-check every 1 second for real-time updates

        // Return unsubscribe function
        return () => {
            off(computersRef);
            off(sessionsRef);
            off(historyRef);
            off(notifRef);
            clearInterval(periodicInterval);
        };
    },

    /**
     * Subscribe to active sessions with online filtering (real-time updates)
     */
    subscribeToActiveSessionsFiltered: (callback: (sessions: ActiveSession[]) => void) => {
        const userId = getCurrentUserId();
        if (!userId) {
            callback([]);
            return () => { };
        }

        const computersRef = ref(database, `users/${userId}/${USER_DATA_PATHS.computers}`);
        const sessionsRef = ref(database, `users/${userId}/${USER_DATA_PATHS.sessions.active}`);

        let computersData: Record<string, any> = {};
        let sessionsData: Record<string, ActiveSessionRecord> = {};

        const calculateSessions = () => {
            const allSessions = Object.entries(sessionsData).map(([id, session]) => ({
                id,
                computerId: session.computerId,
                computerName: session.computerName,
                userId: session.userId,
                userName: session.userName,
                startTime: session.startTime,
                currentActivity: session.currentActivity,
                status: session.status || 'active',
                pausedAt: session.pausedAt,
                ownerUserId: userId,
            }));

            // Filter sessions by online computers
            // Exception: Keep paused sessions visible even if computer is offline
            const onlineSessions = allSessions.filter((session) => {
                // Always show paused sessions (user explicitly paused them)
                if (session.status === 'paused') {
                    return true;
                }

                const computer = Object.values(computersData).find(
                    (c: any) => c.name && session.computerName &&
                        (c.name === session.computerName || c.name.includes(session.computerName))
                );

                const computerById = computersData[session.computerId];
                const targetComputer = computerById || computer;

                if (targetComputer?.lastSeen) {
                    return isComputerOnline(targetComputer.lastSeen, targetComputer.status);
                }
                return false;
            });

            callback(onlineSessions);
        };

        // Listen to computers changes
        onValue(computersRef, (snapshot) => {
            computersData = snapshot.val() || {};
            calculateSessions();
        });

        // Listen to active sessions changes
        onValue(sessionsRef, (snapshot) => {
            sessionsData = snapshot.val() || {};
            calculateSessions();
        });

        // Periodic re-check for time-based offline detection
        const periodicInterval = setInterval(() => {
            calculateSessions();
        }, 1000); // Re-check every 1 second for real-time offline detection

        // Return unsubscribe function
        return () => {
            off(computersRef);
            off(sessionsRef);
            clearInterval(periodicInterval);
        };
    },

    /**
     * Subscribe to computer status changes to detect when computers come online
     * Triggers notifications when a computer transitions from offline to online
     */
    subscribeToComputerStatus: (onComputerOnline: (computerId: string, computerName: string) => void) => {
        const userId = getCurrentUserId();
        if (!userId) {
            return () => { };
        }

        const computersRef = ref(database, `users/${userId}/${USER_DATA_PATHS.computers}`);

        // Track previous computer states to detect transitions
        let previousStates: Record<string, boolean> = {};
        let isFirstLoad = true;

        const checkComputerStatus = (computersData: Record<string, any>) => {
            const currentStates: Record<string, boolean> = {};

            Object.entries(computersData).forEach(([computerId, computer]: [string, any]) => {
                const isOnline = computer.lastSeen ? isComputerOnline(computer.lastSeen) : false;
                currentStates[computerId] = isOnline;

                // Only trigger notification if this is not the first load
                // and the computer transitioned from offline to online
                if (!isFirstLoad && isOnline && !previousStates[computerId]) {
                    const computerName = computer.name || computerId;
                    onComputerOnline(computerId, computerName);
                }
            });

            previousStates = currentStates;
            isFirstLoad = false;
        };

        // Listen to computers changes
        onValue(computersRef, (snapshot) => {
            const computersData = snapshot.val() || {};
            checkComputerStatus(computersData);
        });

        // Also periodically check for time-based online detection
        const periodicInterval = setInterval(() => {
            // Re-fetch and check status periodically
            get(computersRef).then((snapshot) => {
                const computersData = snapshot.val() || {};
                checkComputerStatus(computersData);
            }).catch(() => { });
        }, 5000); // Check every 5 seconds

        return () => {
            off(computersRef);
            clearInterval(periodicInterval);
        };
    },
};

export default sessionService;
