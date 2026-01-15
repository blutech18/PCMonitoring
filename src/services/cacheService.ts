// Offline caching service using AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@pcmonitoring_cache_';
const CACHE_EXPIRY_PREFIX = '@pcmonitoring_cache_expiry_';
const DEFAULT_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

/**
 * Get cached data if not expired
 */
export const getCachedData = async <T>(key: string): Promise<T | null> => {
    try {
        const cacheKey = `${CACHE_PREFIX}${key}`;
        const expiryKey = `${CACHE_EXPIRY_PREFIX}${key}`;

        const cachedData = await AsyncStorage.getItem(cacheKey);
        const expiryTime = await AsyncStorage.getItem(expiryKey);

        if (!cachedData || !expiryTime) {
            return null;
        }

        const now = Date.now();
        const expiry = parseInt(expiryTime, 10);

        if (now > expiry) {
            // Cache expired, remove it
            await AsyncStorage.multiRemove([cacheKey, expiryKey]);
            return null;
        }

        return JSON.parse(cachedData) as T;
    } catch (error) {
        console.error(`Error getting cached data for key ${key}:`, error);
        return null;
    }
};

/**
 * Set cached data with expiry
 */
export const setCachedData = async <T>(
    key: string,
    data: T,
    duration: number = DEFAULT_CACHE_DURATION
): Promise<void> => {
    try {
        const cacheKey = `${CACHE_PREFIX}${key}`;
        const expiryKey = `${CACHE_EXPIRY_PREFIX}${key}`;

        const expiryTime = Date.now() + duration;

        await AsyncStorage.multiSet([
            [cacheKey, JSON.stringify(data)],
            [expiryKey, expiryTime.toString()],
        ]);
    } catch (error) {
        console.error(`Error setting cached data for key ${key}:`, error);
    }
};

/**
 * Remove cached data
 */
export const removeCachedData = async (key: string): Promise<void> => {
    try {
        const cacheKey = `${CACHE_PREFIX}${key}`;
        const expiryKey = `${CACHE_EXPIRY_PREFIX}${key}`;
        await AsyncStorage.multiRemove([cacheKey, expiryKey]);
    } catch (error) {
        console.error(`Error removing cached data for key ${key}:`, error);
    }
};

/**
 * Clear all cached data
 */
export const clearAllCache = async (): Promise<void> => {
    try {
        const keys = await AsyncStorage.getAllKeys();
        const cacheKeys = keys.filter(
            key => key.startsWith(CACHE_PREFIX) || key.startsWith(CACHE_EXPIRY_PREFIX)
        );
        await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
        console.error('Error clearing cache:', error);
    }
};

/**
 * Cache keys
 */
export const CACHE_KEYS = {
    activeSessions: 'activeSessions',
    sessionHistory: 'sessionHistory',
    notifications: 'notifications',
    dashboardStats: 'dashboardStats',
    computers: 'computers',
    settings: 'settings',
};
