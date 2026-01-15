// Platform-aware storage utility
// Uses SecureStore on native platforms (iOS/Android) and AsyncStorage on web
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const isWeb = Platform.OS === 'web';

/**
 * Store an item securely
 */
export const setItem = async (key: string, value: string): Promise<void> => {
    if (isWeb) {
        await AsyncStorage.setItem(key, value);
    } else {
        await SecureStore.setItemAsync(key, value);
    }
};

/**
 * Get an item from secure storage
 */
export const getItem = async (key: string): Promise<string | null> => {
    if (isWeb) {
        return await AsyncStorage.getItem(key);
    } else {
        return await SecureStore.getItemAsync(key);
    }
};

/**
 * Delete an item from secure storage
 */
export const deleteItem = async (key: string): Promise<void> => {
    if (isWeb) {
        await AsyncStorage.removeItem(key);
    } else {
        await SecureStore.deleteItemAsync(key);
    }
};