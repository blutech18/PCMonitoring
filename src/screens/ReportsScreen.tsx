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
import Svg, { Line, Circle, Rect, Text as SvgText, G, Path } from 'react-native-svg';
import * as d3Shape from 'd3-shape';
import reportService from '../services/reportService';
import { ReportData, ReportPeriod } from '../models/types';
import Card from '../components/common/Card';
import Loading from '../components/common/Loading';
import colors from '../constants/colors';

const screenWidth = Dimensions.get('window').width;

interface ChartDataPoint {
    label: string;
    value: number;
}

// SVG Line Chart Component
const SVGLineChart: React.FC<{ data: ChartDataPoint[] }> = ({ data }) => {
    const width = screenWidth - 96;
    const height = 200;
    const padding = { top: 20, right: 20, bottom: 40, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const maxValue = Math.max(...data.map(d => d.value), 1);
    const xStep = chartWidth / (data.length - 1 || 1);

    // Create line path
    const lineGenerator = d3Shape
        .line<ChartDataPoint>()
        .x((d: ChartDataPoint, i: number) => i * xStep)
        .y((d: ChartDataPoint) => chartHeight - (d.value / maxValue) * chartHeight)
        .curve(d3Shape.curveMonotoneX);

    const linePath = lineGenerator(data) || '';

    return (
        <Svg width={width} height={height}>
            <G x={padding.left} y={padding.top}>
                {/* Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
                    <Line
                        key={i}
                        x1={0}
                        y1={chartHeight * ratio}
                        x2={chartWidth}
                        y2={chartHeight * ratio}
                        stroke={colors.divider}
                        strokeWidth="1"
                        strokeDasharray="3,3"
                    />
                ))}

                {/* Line */}
                <Path d={linePath} stroke={colors.primary} strokeWidth="2" fill="none" />

                {/* Data points */}
                {data.map((point, i) => (
                    <Circle
                        key={i}
                        cx={i * xStep}
                        cy={chartHeight - (point.value / maxValue) * chartHeight}
                        r="4"
                        fill={colors.primary}
                        stroke={colors.surface}
                        strokeWidth="2"
                    />
                ))}

                {/* X-axis labels */}
                {data.map((point, i) => (
                    <SvgText
                        key={i}
                        x={i * xStep}
                        y={chartHeight + 20}
                        fontSize="10"
                        fill={colors.textSecondary}
                        textAnchor="middle"
                    >
                        {point.label}
                    </SvgText>
                ))}

                {/* Y-axis labels */}
                {[0, 0.5, 1].map((ratio, i) => (
                    <SvgText
                        key={i}
                        x={-10}
                        y={chartHeight * (1 - ratio) + 4}
                        fontSize="10"
                        fill={colors.textSecondary}
                        textAnchor="end"
                    >
                        {Math.round(maxValue * ratio)}
                    </SvgText>
                ))}
            </G>
        </Svg>
    );
};

// SVG Bar Chart Component
const SVGBarChart: React.FC<{ data: ChartDataPoint[] }> = ({ data }) => {
    const width = screenWidth - 96;
    const height = 200;
    const padding = { top: 20, right: 20, bottom: 50, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const maxValue = Math.max(...data.map(d => d.value), 1);
    const barWidth = chartWidth / data.length - 10;

    return (
        <Svg width={width} height={height}>
            <G x={padding.left} y={padding.top}>
                {/* Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
                    <Line
                        key={i}
                        x1={0}
                        y1={chartHeight * ratio}
                        x2={chartWidth}
                        y2={chartHeight * ratio}
                        stroke={colors.divider}
                        strokeWidth="1"
                        strokeDasharray="3,3"
                    />
                ))}

                {/* Bars */}
                {data.map((point, i) => {
                    const barHeight = (point.value / maxValue) * chartHeight;
                    const x = (i * chartWidth) / data.length + 5;
                    const y = chartHeight - barHeight;

                    return (
                        <G key={i}>
                            <Rect
                                x={x}
                                y={y}
                                width={barWidth}
                                height={barHeight}
                                fill={colors.secondary}
                                rx="4"
                            />
                            <SvgText
                                x={x + barWidth / 2}
                                y={chartHeight + 15}
                                fontSize="9"
                                fill={colors.textSecondary}
                                textAnchor="middle"
                            >
                                {point.label}
                            </SvgText>
                            <SvgText
                                x={x + barWidth / 2}
                                y={y - 5}
                                fontSize="10"
                                fill={colors.textPrimary}
                                textAnchor="middle"
                                fontWeight="600"
                            >
                                {point.value}h
                            </SvgText>
                        </G>
                    );
                })}

                {/* Y-axis labels */}
                {[0, 0.5, 1].map((ratio, i) => (
                    <SvgText
                        key={i}
                        x={-10}
                        y={chartHeight * (1 - ratio) + 4}
                        fontSize="10"
                        fill={colors.textSecondary}
                        textAnchor="end"
                    >
                        {Math.round(maxValue * ratio)}
                    </SvgText>
                ))}
            </G>
        </Svg>
    );
};

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

    // Transform data for charts
    const usageTrendData = reportData.usageTrend.slice(-7).map(item => {
        const date = new Date(item.date);
        return {
            label: date.toLocaleDateString('en-US', { weekday: 'short' }),
            value: Math.max(0, Math.round(item.usage || 0)),
        };
    });

    const usageChartData = usageTrendData.length > 0
        ? usageTrendData
        : [
            { label: 'Mon', value: 0 },
            { label: 'Tue', value: 0 },
            { label: 'Wed', value: 0 },
            { label: 'Thu', value: 0 },
            { label: 'Fri', value: 0 },
            { label: 'Sat', value: 0 },
            { label: 'Sun', value: 0 },
        ];

    const topComputers = reportData.mostUsedComputers.slice(0, 5);
    const computerUsageData = topComputers.length > 0
        ? topComputers.map(c => ({
            label: c.computerName.split(' - ')[1] || c.computerName.substring(0, 8),
            value: Math.max(0, Math.round(c.totalUsage || 0)),
        }))
        : [{ label: 'N/A', value: 0 }];

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
                <View style={styles.chartContainer}>
                    <SVGLineChart data={usageChartData} />
                </View>
            </Card>

            {/* Most Used Computers */}
            <Card style={styles.chartCard}>
                <Text style={styles.chartTitle}>Most Used Computers</Text>
                <Text style={styles.chartSubtitle}>Total hours by computer</Text>
                <View style={styles.chartContainer}>
                    <SVGBarChart data={computerUsageData} />
                </View>
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
        marginBottom: 8,
    },
    chartContainer: {
        alignItems: 'center',
        marginVertical: 8,
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
