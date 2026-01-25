import { ref, push, set, remove, update, get } from 'firebase/database';
import { database, auth } from './firebase';

/**
 * Command Service
 * Handles sending remote commands to PC agents via Firebase
 */

export type CommandType = 'stop_monitoring' | 'start_monitoring';

interface Command {
    type: CommandType;
    computerId: string;
    computerName?: string;
    timestamp: string;
}

export interface StopMonitoringTarget {
    /**
     * The user that owns/linked the PC agent (users/{userId}/...).
     * If omitted, defaults to the currently authenticated user.
     */
    targetUserId?: string;
    /**
     * The active session key under users/{userId}/sessions/active/{sessionId}.
     * If provided, we will remove it immediately so the UI updates instantly.
     */
    sessionId?: string;
}

const resolveTargetUserId = (targetUserId?: string): string | null => {
    return targetUserId || auth.currentUser?.uid || null;
};

/**
 * Send a stop monitoring command to a specific computer
 */
export const sendStopCommand = async (
    computerId: string,
    computerName?: string,
    options?: StopMonitoringTarget
): Promise<boolean> => {
    try {
        const userId = resolveTargetUserId(options?.targetUserId);
        if (!userId) {
            console.error('sendStopCommand: User not authenticated');
            return false;
        }

        const commandPath = `users/${userId}/commands`;
        console.log('Writing stop command to:', commandPath);
        const commandsRef = ref(database, commandPath);
        const newCommandRef = push(commandsRef);

        const command: Command = {
            type: 'stop_monitoring',
            computerId,
            computerName,
            timestamp: new Date().toISOString(),
        };

        console.log('Command payload:', command);
        await set(newCommandRef, command);
        console.log(`Stop command written successfully to: ${commandPath}/${newCommandRef.key}`);
        return true;
    } catch (error) {
        console.error('Error sending stop command:', error);
        return false;
    }
};

/**
 * Pause monitoring (Stop Monitoring button) – app-only, instant.
 * Updates Firebase session to 'paused' only. No commands to PC agent.
 * Keeps label "Stop Monitoring". Timer freezes; resume continues from elapsed.
 */
export const stopMonitoringNow = async (
    computerId: string,
    computerName?: string,
    options?: StopMonitoringTarget
): Promise<boolean> => {
    const userId = resolveTargetUserId(options?.targetUserId);
    if (!userId) {
        console.error('stopMonitoringNow: No user ID resolved');
        return false;
    }

    try {
        if (!options?.sessionId) return false;
        const sessionPath = `users/${userId}/sessions/active/${options.sessionId}`;
        const activeSessionRef = ref(database, sessionPath);
        const pausedAt = new Date().toISOString();

        const snapshot = await get(activeSessionRef);
        const sessionData = snapshot.val();
        let elapsedMsAtPause: number | null = null;
        if (sessionData?.startTime) {
            const startMs = new Date(sessionData.startTime).getTime();
            const pausedMs = new Date(pausedAt).getTime();
            elapsedMsAtPause = Math.max(0, pausedMs - startMs);
        }

        await update(activeSessionRef, {
            status: 'paused',
            pausedAt,
            ...(typeof elapsedMsAtPause === 'number' && { elapsedMsAtPause }),
        });
        console.log(`✓ Session ${options.sessionId} marked as paused in Firebase`);
        
        // Also send stop command for instant PC agent response
        const commandPath = `users/${userId}/commands`;
        const commandsRef = ref(database, commandPath);
        const newCommandRef = push(commandsRef);
        await set(newCommandRef, {
            type: 'stop_monitoring',
            computerId,
            timestamp: new Date().toISOString(),
        });
        console.log(`✓ Stop command sent to PC agent`);
        
        return true;
    } catch (e) {
        console.error('Failed to mark session as paused:', e);
        return false;
    }
};

/**
 * Resume monitoring (Start Monitoring button) – app-only, instant.
 * Updates Firebase session to 'active' only. No commands to PC agent.
 * Timer continues from elapsed-at-pause.
 */
export const startMonitoringNow = async (
    computerId: string,
    computerName?: string,
    options?: StopMonitoringTarget
): Promise<boolean> => {
    const userId = resolveTargetUserId(options?.targetUserId);
    if (!userId) {
        console.error('startMonitoringNow: No user ID resolved');
        return false;
    }

    try {
        if (!options?.sessionId) return false;
        const sessionPath = `users/${userId}/sessions/active/${options.sessionId}`;
        const activeSessionRef = ref(database, sessionPath);
        const snapshot = await get(activeSessionRef);
        const sessionData = snapshot.val();

        if (sessionData?.pausedAt) {
            const now = Date.now();
            let adjustedStart: string;
            if (typeof sessionData.elapsedMsAtPause === 'number' && sessionData.elapsedMsAtPause >= 0) {
                const elapsedMs = Math.max(0, sessionData.elapsedMsAtPause);
                adjustedStart = new Date(now - elapsedMs).toISOString();
            } else if (sessionData?.startTime) {
                const startMs = new Date(sessionData.startTime).getTime();
                const pausedMs = new Date(sessionData.pausedAt).getTime();
                const elapsedMs = Math.max(0, pausedMs - startMs);
                adjustedStart = new Date(now - elapsedMs).toISOString();
            } else {
                adjustedStart = new Date(now).toISOString();
            }
            const adjustedMs = new Date(adjustedStart).getTime();
            const safeStart = adjustedMs > now ? new Date(now).toISOString() : adjustedStart;
            await update(activeSessionRef, {
                status: 'active',
                pausedAt: null,
                startTime: safeStart,
                elapsedMsAtPause: null,
            });
        } else {
            await update(activeSessionRef, { status: 'active', pausedAt: null });
        }
        console.log(`✓ Session ${options.sessionId} marked as active in Firebase`);
        
        // Also send start command for instant PC agent response
        const commandPath = `users/${userId}/commands`;
        const commandsRef = ref(database, commandPath);
        const newCommandRef = push(commandsRef);
        await set(newCommandRef, {
            type: 'start_monitoring',
            computerId,
            timestamp: new Date().toISOString(),
        });
        console.log(`✓ Start command sent to PC agent`);
        
        return true;
    } catch (e) {
        console.error('Failed to mark session as active:', e);
        return false;
    }
};

/**
 * Send a start monitoring command to a specific computer
 */
export const sendStartCommand = async (
    computerId: string,
    computerName?: string,
    options?: { targetUserId?: string }
): Promise<boolean> => {
    try {
        const userId = resolveTargetUserId(options?.targetUserId);
        if (!userId) {
            console.error('User not authenticated');
            return false;
        }

        const commandsRef = ref(database, `users/${userId}/commands`);
        const newCommandRef = push(commandsRef);

        const command: Command = {
            type: 'start_monitoring',
            computerId,
            computerName,
            timestamp: new Date().toISOString(),
        };

        await set(newCommandRef, command);
        console.log(`Start command sent for computer: ${computerId}`);
        return true;
    } catch (error) {
        console.error('Error sending start command:', error);
        return false;
    }
};

/**
 * Clear a specific command (after processing)
 */
export const clearCommand = async (commandId: string): Promise<boolean> => {
    try {
        const userId = auth.currentUser?.uid;
        if (!userId) return false;

        const commandRef = ref(database, `users/${userId}/commands/${commandId}`);
        await remove(commandRef);
        return true;
    } catch (error) {
        console.error('Error clearing command:', error);
        return false;
    }
};

export default {
    sendStopCommand,
    stopMonitoringNow,
    sendStartCommand,
    startMonitoringNow,
    clearCommand,
};
