// Export utility functions for data export

import { SessionHistory, ActiveSession, Notification, ReportData } from '../models/types';
import { formatDate, formatTime, formatDuration } from './helpers';

/**
 * Convert sessions to CSV format
 */
export const sessionsToCSV = (sessions: SessionHistory[] | ActiveSession[]): string => {
    const headers = ['ID', 'Computer Name', 'User Name', 'Start Time', 'End Time', 'Duration (min)'];
    const rows = sessions.map(session => {
        const endTime = 'endTime' in session ? session.endTime : 'Active';
        const duration = 'totalDuration' in session ? session.totalDuration : 0;
        return [
            session.id,
            session.computerName,
            session.userName,
            formatDateTime(session.startTime),
            endTime !== 'Active' ? formatDateTime(endTime) : 'Active',
            duration.toString(),
        ].map(cell => `"${cell}"`).join(',');
    });

    return [headers.map(h => `"${h}"`).join(','), ...rows].join('\n');
};

/**
 * Convert notifications to CSV format
 */
export const notificationsToCSV = (notifications: Notification[]): string => {
    const headers = ['ID', 'Type', 'Title', 'Message', 'Timestamp', 'Read', 'Acknowledged'];
    const rows = notifications.map(notif => [
        notif.id,
        notif.type,
        notif.title,
        notif.message,
        formatDateTime(notif.timestamp),
        notif.read ? 'Yes' : 'No',
        notif.acknowledged ? 'Yes' : 'No',
    ].map(cell => `"${cell}"`).join(','));

    return [headers.map(h => `"${h}"`).join(','), ...rows].join('\n');
};

/**
 * Convert report data to CSV format
 */
export const reportDataToCSV = (reportData: ReportData): string => {
    const lines: string[] = [];
    
    lines.push('Report Summary');
    lines.push(`Total Usage Time,${reportData.totalUsageTime} hours`);
    lines.push(`Average Session Duration,${reportData.averageSessionDuration} minutes`);
    lines.push(`Total Sessions,${reportData.totalSessions}`);
    lines.push('');
    
    lines.push('Most Used Computers');
    lines.push('Computer Name,Total Usage (hours),Session Count');
    reportData.mostUsedComputers.forEach(computer => {
        lines.push(`"${computer.computerName}",${computer.totalUsage},${computer.sessionCount}`);
    });
    lines.push('');
    
    lines.push('Usage Trend');
    lines.push('Date,Usage (hours)');
    reportData.usageTrend.forEach(trend => {
        lines.push(`${trend.date},${trend.usage}`);
    });
    
    return lines.join('\n');
};

/**
 * Export data as JSON
 */
export const exportToJSON = <T,>(data: T, filename: string): string => {
    return JSON.stringify(data, null, 2);
};

/**
 * Helper to format date and time
 */
const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return `${formatDate(dateString)} ${formatTime(dateString)}`;
};

/**
 * Save CSV to file (for web/desktop)
 * Note: For mobile, this would need platform-specific implementations
 */
export const saveCSV = (csvContent: string, filename: string): void => {
    // For web platforms
    if (typeof window !== 'undefined') {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
