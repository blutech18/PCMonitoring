import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    RefreshControl,
} from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import reportService from '../services/reportService';
import { ReportData, ReportPeriod } from '../models/types';
import Card from '../components/common/Card';
import Loading from '../components/common/Loading';
import colors from '../constants/colors';

const screenWidth = Dimensions.get('window').width;

const ReportsScreen: React.FC = () => {
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>('weekly');

    const fetchReport = useCallback(async () => {
        try {
            const data = await reportService.getReportData(selectedPeriod);
            setReportData(data);
        } catch (error) {
            console.error('Error fetching report:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [selectedPeriod]);

    useEffect(() => {
        setLoading(true);
        fetchReport();
    }, [fetchReport]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchReport();
    }, [fetchReport]);

    if (loading) {
        return <Loading fullScreen message="Loading reports..." />;
    }

    if (!reportData) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Failed to load report data</Text>
            </View>
        );
    }

    const chartConfig = {
        backgroundColor: colors.surface,
        backgroundGradientFrom: colors.surface,
        backgroundGradientTo: colors.surface,
        decimalPlaces: 0,
        color: (opacity = 1) => `rgba(25, 118, 210, ${opacity})`,
        labelColor: () => colors.textSecondary,
        style: {
            borderRadius: 16,
        },
        propsForDots: {
            r: '6',
            strokeWidth: '2',
            stroke: colors.primary,
        },
    };

    const usageTrendData = reportData.usageTrend.slice(-7);
    const usageChartData = {
        labels: usageTrendData.length > 0 
            ? usageTrendData.map(item => {
                const date = new Date(item.date);
                return date.toLocaleDateString('en-US', { weekday: 'short' });
            })
            : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
            {
                data: usageTrendData.length > 0 
                    ? usageTrendData.map(item => Math.max(0, item.usage || 0))
                    : [0, 0, 0, 0, 0, 0, 0],
            },
        ],
    };

    const topComputers = reportData.mostUsedComputers.slice(0, 5);
    const computerUsageData = {
        labels: topComputers.length > 0
            ? topComputers.map(c => c.computerName.split(' - ')[1] || c.computerName.substring(0, 6))
            : ['N/A'],
        datasets: [
            {
                data: topComputers.length > 0
                    ? topComputers.map(c => Math.max(0, c.totalUsage || 0))
                    : [0],
            },
        ],
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
        >
            {/* Period Selector */}
            <View style={styles.periodSelector}>
                {(['daily', 'weekly', 'monthly'] as ReportPeriod[]).map((period) => (
                    <TouchableOpacity
                        key={period}
                        style={[
                            styles.periodButton,
                            selectedPeriod === period && styles.periodButtonActive,
                        ]}
                        onPress={() => setSelectedPeriod(period)}
                    >
                        <Text
                            style={[
                                styles.periodText,
                                selectedPeriod === period && styles.periodTextActive,
                            ]}
                        >
                            {period.charAt(0).toUpperCase() + period.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Summary Stats */}
            <View style={styles.statsGrid}>
                <Card style={styles.statCard}>
                    <Text style={styles.statValue}>{reportData.totalUsageTime}h</Text>
                    <Text style={styles.statLabel}>Total Usage</Text>
                </Card>
                <Card style={styles.statCard}>
                    <Text style={styles.statValue}>{reportData.averageSessionDuration}m</Text>
                    <Text style={styles.statLabel}>Avg. Session</Text>
                </Card>
                <Card style={styles.statCard}>
                    <Text style={styles.statValue}>{reportData.totalSessions}</Text>
                    <Text style={styles.statLabel}>Total Sessions</Text>
                </Card>
            </View>

            {/* Usage Trend Chart */}
            <Card style={styles.chartCard}>
                <Text style={styles.chartTitle}>Usage Trend</Text>
                <Text style={styles.chartSubtitle}>Hours of usage over time</Text>
                <LineChart
                    data={usageChartData}
                    width={screenWidth - 64}
                    height={200}
                    chartConfig={chartConfig}
                    bezier
                    style={styles.chart}
                />
            </Card>

            {/* Most Used Computers */}
            <Card style={styles.chartCard}>
                <Text style={styles.chartTitle}>Most Used Computers</Text>
                <Text style={styles.chartSubtitle}>Total hours by computer</Text>
                <BarChart
                    data={computerUsageData}
                    width={screenWidth - 64}
                    height={200}
                    chartConfig={{
                        ...chartConfig,
                        color: (opacity = 1) => `rgba(0, 137, 123, ${opacity})`,
                    }}
                    style={styles.chart}
                    yAxisLabel=""
                    yAxisSuffix="h"
                />
            </Card>

            {/* Top Computers List */}
            <Card>
                <Text style={styles.chartTitle}>Computer Rankings</Text>
                {reportData.mostUsedComputers.map((computer, index) => (
                    <View key={computer.computerId} style={styles.rankItem}>
                        <View style={[styles.rankBadge, index < 3 && styles.topRankBadge]}>
                            <Text style={[styles.rankNumber, index < 3 && styles.topRankNumber]}>
                                {index + 1}
                            </Text>
                        </View>
                        <View style={styles.rankInfo}>
                            <Text style={styles.rankName}>{computer.computerName}</Text>
                            <Text style={styles.rankStats}>
                                {computer.sessionCount} sessions
                            </Text>
                        </View>
                        <Text style={styles.rankHours}>{computer.totalUsage}h</Text>
                    </View>
                ))}
            </Card>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        padding: 16,
        paddingBottom: 32,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        fontSize: 16,
        color: colors.error,
    },
    periodSelector: {
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 4,
        marginBottom: 16,
    },
    periodButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
    },
    periodButtonActive: {
        backgroundColor: colors.primary,
    },
    periodText: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.textSecondary,
    },
    periodTextActive: {
        color: colors.textLight,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 8,
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 16,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.primary,
    },
    statLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 4,
    },
    chartCard: {
        marginBottom: 8,
    },
    chartTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 4,
    },
    chartSubtitle: {
        fontSize: 13,
        color: colors.textSecondary,
        marginBottom: 16,
    },
    chart: {
        marginVertical: 8,
        borderRadius: 12,
    },
    rankItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    rankBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    topRankBadge: {
        backgroundColor: colors.primary,
    },
    rankNumber: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    topRankNumber: {
        color: colors.textLight,
    },
    rankInfo: {
        flex: 1,
    },
    rankName: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.textPrimary,
    },
    rankStats: {
        fontSize: 12,
        color: colors.textMuted,
        marginTop: 2,
    },
    rankHours: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.secondary,
    },
});

export default ReportsScreen;
