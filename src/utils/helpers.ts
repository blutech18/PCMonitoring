// Utility helper functions

/**
 * Format elapsed time from start time to now (or to pausedAt if provided)
 * @param startTime - ISO date string when session started
 * @param pausedAt - Optional ISO date string when session was paused (freezes time at this point)
 */
export const formatElapsedTime = (startTime: string, pausedAt?: string): string => {
    const start = new Date(startTime);
    // If paused, calculate time up to pausedAt, otherwise up to now
    const end = pausedAt ? new Date(pausedAt) : new Date();
    let diffMs = end.getTime() - start.getTime();
    // Never show negative elapsed (e.g. startTime in future due to timezone bugs)
    if (diffMs < 0) diffMs = 0;

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
};

/**
 * Format duration in minutes to readable string with seconds
 * Note: If input is actually in seconds (from totalDuration), it will be converted
 */
export const formatDuration = (value: number): string => {
    // Assume value is in minutes for history (since database stores minutes)
    const totalMinutes = Math.floor(value);
    const totalSeconds = Math.round((value - totalMinutes) * 60);
    
    if (totalMinutes < 1) {
        // Less than 1 minute, show as seconds
        return `${Math.max(1, totalSeconds)} sec`;
    }
    
    if (totalMinutes < 60) {
        // Less than 1 hour, show minutes and seconds
        return totalSeconds > 0 ? `${totalMinutes}m ${totalSeconds}s` : `${totalMinutes}m`;
    }
    
    // 1 hour or more, show hours, minutes, and optionally seconds
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    
    if (mins > 0) {
        return totalSeconds > 0 ? `${hours}h ${mins}m ${totalSeconds}s` : `${hours}h ${mins}m`;
    }
    return totalSeconds > 0 ? `${hours}h ${totalSeconds}s` : `${hours}h`;
};

/**
 * Format date to readable string
 */
export const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

/**
 * Format time to readable string
 */
export const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
    });
};

/**
 * Format date and time together
 */
export const formatDateTime = (dateString: string): string => {
    return `${formatDate(dateString)} ${formatTime(dateString)}`;
};

/**
 * Get relative time string (e.g., "2 hours ago")
 */
export const getRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();

    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (days > 0) {
        return days === 1 ? '1 day ago' : `${days} days ago`;
    } else if (hours > 0) {
        return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
    } else if (minutes > 0) {
        return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
    }
    return 'Just now';
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
};

/**
 * Get status color based on status type
 */
export const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
        case 'active':
        case 'online':
            return '#4CAF50';
        case 'idle':
        case 'offline':
            return '#9E9E9E';
        case 'paused':
            return '#FF9800';
        case 'maintenance':
            return '#FF9800';
        default:
            return '#757575';
    }
};

/**
 * Check if a computer is online based on lastSeen timestamp
 * A computer is considered offline if it hasn't been seen for more than 90 seconds
 * @param lastSeen - ISO date string of when the computer was last seen
 * @returns true if the computer is considered online
 */
export const isComputerOnline = (lastSeen: string, storedStatus?: unknown): boolean => {
    // If the stored status explicitly says offline, treat it as offline immediately.
    // This is important for "Stop Monitoring" where the agent (or app) sets status='offline'
    // but lastSeen may still be recent.
    if (typeof storedStatus === 'string' && storedStatus.toLowerCase() === 'offline') {
        return false;
    }

    if (!lastSeen) return false;

    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - lastSeenDate.getTime();
    const diffSeconds = diffMs / 1000;

    // Consider offline if not seen for more than 90 seconds
    // This gives the agent time to sync (default 5-60 second intervals)
    // But still removes stopped agents reasonably quickly
    return diffSeconds <= 90;
};

/**
 * Get the computed status of a computer based on lastSeen timestamp
 * This overrides the stored status if the computer hasn't been seen recently
 * @param storedStatus - The status stored in the database
 * @param lastSeen - ISO date string of when the computer was last seen
 * @returns 'online' | 'offline' | 'maintenance'
 */
export const getComputerStatus = (
    storedStatus: 'online' | 'offline' | 'maintenance',
    lastSeen: string
): 'online' | 'offline' | 'maintenance' => {
    // Maintenance status is manually set and should be preserved
    if (storedStatus === 'maintenance') {
        return 'maintenance';
    }

    // If explicitly offline, keep it offline (don't override with lastSeen)
    if (storedStatus === 'offline') {
        return 'offline';
    }

    // For online/offline, compute based on lastSeen
    return isComputerOnline(lastSeen, storedStatus) ? 'online' : 'offline';
};
