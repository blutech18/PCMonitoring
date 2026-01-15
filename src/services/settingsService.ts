import { ref, get, set, update } from 'firebase/database';
import { database, auth } from './firebase';
import { Settings, Computer, ComputerRecord } from '../models/types';
import { DB_PATHS, USER_DATA_PATHS } from '../config/firebase.config';

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

const DEFAULT_SETTINGS: Settings = {
    sessionTimeLimit: 120,
    alertThreshold: 90,
    autoLogoutEnabled: true,
};

export const settingsService = {
    /**
     * Get current settings
     */
    getSettings: async (): Promise<Settings> => {
        try {
            const settingsRef = getUserDataRef(USER_DATA_PATHS.settings);
            const snapshot = await get(settingsRef);
            const data = snapshot.val();

            if (!data) {
                try {
                    await set(settingsRef, DEFAULT_SETTINGS);
                } catch (permError) {
                    console.warn('Unable to initialize settings (using defaults)');
                }
                return DEFAULT_SETTINGS;
            }

            return {
                sessionTimeLimit: data.sessionTimeLimit || DEFAULT_SETTINGS.sessionTimeLimit,
                alertThreshold: data.alertThreshold || DEFAULT_SETTINGS.alertThreshold,
                autoLogoutEnabled: data.autoLogoutEnabled ?? DEFAULT_SETTINGS.autoLogoutEnabled,
            };
        } catch (error: any) {
            if (error?.code === 'PERMISSION_DENIED' || error?.message === 'User not authenticated') {
                console.warn('Settings access restricted - using default settings');
            } else {
                console.error('Error fetching settings:', error);
            }
            return DEFAULT_SETTINGS;
        }
    },

    /**
     * Update settings
     */
    updateSettings: async (settings: Partial<Settings>): Promise<Settings> => {
        try {
            const settingsRef = getUserDataRef(USER_DATA_PATHS.settings);
            await update(settingsRef, {
                ...settings,
                updatedAt: new Date().toISOString(),
            });

            const snapshot = await get(settingsRef);
            return snapshot.val();
        } catch (error: any) {
            if (error?.code === 'PERMISSION_DENIED' || error?.message === 'User not authenticated') {
                console.warn('Settings update restricted - insufficient permissions');
                return { ...DEFAULT_SETTINGS, ...settings };
            }
            console.error('Error updating settings:', error);
            throw error;
        }
    },

    /**
     * Get list of connected computers
     */
    getComputers: async (): Promise<Computer[]> => {
        try {
            const computersRef = getUserDataRef(USER_DATA_PATHS.computers);
            const snapshot = await get(computersRef);
            const data = snapshot.val();

            if (!data) return [];

            const computerRecords = data as Record<string, ComputerRecord>;
            return Object.entries(computerRecords).map(([id, computer]) => ({
                id,
                name: computer.name,
                ipAddress: computer.ipAddress,
                status: computer.status || 'offline',
                lastSeen: computer.lastSeen,
            }));
        } catch (error: any) {
            if (error?.code === 'PERMISSION_DENIED' || error?.message === 'User not authenticated') {
                console.warn('Computers access restricted - returning empty list');
                return [];
            }
            console.error('Error fetching computers:', error);
            return [];
        }
    },

    /**
     * Update computer status
     */
    updateComputerStatus: async (computerId: string, status: Computer['status']): Promise<void> => {
        try {
            const userId = getCurrentUserId();
            if (!userId) throw new Error('User not authenticated');

            const computerRef = ref(database, `users/${userId}/${USER_DATA_PATHS.computers}/${computerId}`);
            await update(computerRef, {
                status,
                lastSeen: new Date().toISOString(),
            });
        } catch (error) {
            console.error('Error updating computer status:', error);
            throw error;
        }
    },

    /**
     * Add a new computer
     */
    addComputer: async (computer: Omit<Computer, 'id'>): Promise<string> => {
        try {
            const userId = getCurrentUserId();
            if (!userId) throw new Error('User not authenticated');

            const computersRef = getUserDataRef(USER_DATA_PATHS.computers);
            const snapshot = await get(computersRef);
            const data = snapshot.val() || {};

            const newId = `PC-${String(Object.keys(data).length + 1).padStart(3, '0')}`;
            const newComputerRef = ref(database, `users/${userId}/${USER_DATA_PATHS.computers}/${newId}`);

            await set(newComputerRef, {
                ...computer,
                createdAt: new Date().toISOString(),
            });

            return newId;
        } catch (error) {
            console.error('Error adding computer:', error);
            throw error;
        }
    },

    /**
     * Remove a computer
     */
    removeComputer: async (computerId: string): Promise<void> => {
        try {
            const userId = getCurrentUserId();
            if (!userId) throw new Error('User not authenticated');

            const computerRef = ref(database, `users/${userId}/${USER_DATA_PATHS.computers}/${computerId}`);
            await set(computerRef, null);
        } catch (error) {
            console.error('Error removing computer:', error);
            throw error;
        }
    },

    /**
     * Get user's agent linking code
     */
    getAgentCode: async (): Promise<{ code: string; active: boolean } | null> => {
        try {
            const agentCodeRef = getUserDataRef(USER_DATA_PATHS.agentCode);
            const snapshot = await get(agentCodeRef);
            return snapshot.val();
        } catch (error) {
            console.error('Error fetching agent code:', error);
            return null;
        }
    },

    /**
     * Regenerate agent linking code
     */
    regenerateAgentCode: async (): Promise<string> => {
        try {
            const agentCodeRef = getUserDataRef(USER_DATA_PATHS.agentCode);
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            let code = '';
            for (let i = 0; i < 8; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }

            await set(agentCodeRef, {
                code,
                createdAt: new Date().toISOString(),
                active: true,
            });

            // Also write to public agentCodes lookup path for PC agent connection
            const userId = getCurrentUserId();
            if (userId) {
                const publicCodeRef = ref(database, `agentCodes/${code}`);
                await set(publicCodeRef, {
                    userId: userId,
                    createdAt: new Date().toISOString(),
                    active: true,
                });
            }

            return code;
        } catch (error) {
            console.error('Error regenerating agent code:', error);
            throw error;
        }
    },
};

export default settingsService;
