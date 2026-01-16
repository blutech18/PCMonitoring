import { ref, get } from 'firebase/database';
import { database, auth } from './firebase';
import { ReportData, ReportPeriod, ComputerUsage, UsageTrendItem, SessionHistoryRecord } from '../models/types';

export const reportService = {
    /**
     * Get report data for specified period
     * IMPORTANT: This fetches user-specific data only (users/{userId}/sessions/history)
     * Each user sees only their own sessions and usage data
     */
    getReportData: async (period: ReportPeriod): Promise<ReportData> => {
        try {
            const userId = auth.currentUser?.uid;
            if (!userId) {
                throw new Error('User not authenticated');
            }

            const now = new Date();
            let startDate: Date;

            switch (period) {
                case 'daily':
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    break;
                case 'weekly':
                    startDate = new Date(now);
                    startDate.setDate(startDate.getDate() - 7);
                    break;
                case 'monthly':
                    startDate = new Date(now);
                    startDate.setDate(startDate.getDate() - 30);
                    break;
            }

            // Get session history - USER-SPECIFIC PATH
            // Only fetches sessions belonging to the current user
            const historyPath = `users/${userId}/sessions/history`;
            const historyRef = ref(database, historyPath);
            const snapshot = await get(historyRef);
            const historyData = snapshot.val() || {};

            // Filter by date range
            const historyRecords = historyData as Record<string, SessionHistoryRecord>;
            const sessions = Object.values(historyRecords).filter((session) => {
                const sessionDate = new Date(session.startTime);
                return sessionDate >= startDate && sessionDate <= now;
            });

            // Calculate total usage time (in hours)
            const totalMinutes = sessions.reduce((acc: number, s) => acc + (s.totalDuration || 0), 0);
            const totalUsageTime = Math.round(totalMinutes / 60);

            // Calculate average session duration
            const averageSessionDuration = sessions.length > 0
                ? Math.round(totalMinutes / sessions.length)
                : 0;

            // Calculate computer usage
            const computerUsageMap: { [key: string]: ComputerUsage } = {};
            sessions.forEach((session) => {
                const id = session.computerId;
                if (!computerUsageMap[id]) {
                    computerUsageMap[id] = {
                        computerId: id,
                        computerName: session.computerName,
                        totalUsage: 0,
                        sessionCount: 0,
                    };
                }
                computerUsageMap[id].totalUsage += Math.round((session.totalDuration || 0) / 60);
                computerUsageMap[id].sessionCount += 1;
            });

            const mostUsedComputers = Object.values(computerUsageMap)
                .sort((a, b) => b.totalUsage - a.totalUsage)
                .slice(0, 5);

            // Calculate usage trend
            const trendMap: { [key: string]: number } = {};
            sessions.forEach((session) => {
                const date = session.date || session.startTime.split('T')[0];
                if (!trendMap[date]) {
                    trendMap[date] = 0;
                }
                trendMap[date] += Math.round((session.totalDuration || 0) / 60);
            });

            const usageTrend: UsageTrendItem[] = Object.entries(trendMap)
                .map(([date, usage]) => ({ date, usage }))
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            return {
                totalUsageTime,
                averageSessionDuration,
                totalSessions: sessions.length,
                mostUsedComputers,
                usageTrend,
            };
        } catch (error) {
            console.error('Error fetching report data:', error);
            throw error;
        }
    },

    /**
     * Get report for custom date range
     * IMPORTANT: This fetches user-specific data only (users/{userId}/sessions/history)
     * Each user sees only their own sessions and usage data
     */
    getCustomReport: async (startDate: string, endDate: string): Promise<ReportData> => {
        try {
            const userId = auth.currentUser?.uid;
            if (!userId) {
                throw new Error('User not authenticated');
            }

            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            // Get session history - USER-SPECIFIC PATH
            // Only fetches sessions belonging to the current user
            const historyPath = `users/${userId}/sessions/history`;
            const historyRef = ref(database, historyPath);
            const snapshot = await get(historyRef);
            const historyData = snapshot.val() || {};

            const historyRecords = historyData as Record<string, SessionHistoryRecord>;
            const sessions = Object.values(historyRecords).filter((session) => {
                const sessionDate = new Date(session.startTime);
                return sessionDate >= start && sessionDate <= end;
            });

            const totalMinutes = sessions.reduce((acc: number, s) => acc + (s.totalDuration || 0), 0);
            const totalUsageTime = Math.round(totalMinutes / 60);
            const averageSessionDuration = sessions.length > 0
                ? Math.round(totalMinutes / sessions.length)
                : 0;

            const computerUsageMap: { [key: string]: ComputerUsage } = {};
            sessions.forEach((session) => {
                const id = session.computerId;
                if (!computerUsageMap[id]) {
                    computerUsageMap[id] = {
                        computerId: id,
                        computerName: session.computerName,
                        totalUsage: 0,
                        sessionCount: 0,
                    };
                }
                computerUsageMap[id].totalUsage += Math.round((session.totalDuration || 0) / 60);
                computerUsageMap[id].sessionCount += 1;
            });

            const mostUsedComputers = Object.values(computerUsageMap)
                .sort((a, b) => b.totalUsage - a.totalUsage)
                .slice(0, 5);

            const trendMap: { [key: string]: number } = {};
            sessions.forEach((session) => {
                const date = session.date || session.startTime.split('T')[0];
                if (!trendMap[date]) {
                    trendMap[date] = 0;
                }
                trendMap[date] += Math.round((session.totalDuration || 0) / 60);
            });

            const usageTrend: UsageTrendItem[] = Object.entries(trendMap)
                .map(([date, usage]) => ({ date, usage }))
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            return {
                totalUsageTime,
                averageSessionDuration,
                totalSessions: sessions.length,
                mostUsedComputers,
                usageTrend,
            };
        } catch (error) {
            console.error('Error fetching custom report:', error);
            throw error;
        }
    },
};

export default reportService;
