import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import sessionService from '../services/sessionService';
import adminService from '../services/adminService';
import { SessionHistory } from '../models/types';
import Card from '../components/common/Card';
import Loading from '../components/common/Loading';
import colors from '../constants/colors';
import { formatDate, formatTime, formatDuration } from '../utils/helpers';
import { APP_CONFIG } from '../constants/config';

const SessionHistoryScreen: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const { user } = useAuth();
    const [sessions, setSessions] = useState<SessionHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedFilter, setSelectedFilter] = useState<'all' | 'today' | 'week'>('all');
    const [displayCount, setDisplayCount] = useState(APP_CONFIG.defaultPageSize);

    const fetchHistory = useCallback(async () => {
        try {
            let startDate: string | undefined;
            let endDate: string | undefined;
            const now = new Date();
            endDate = now.toISOString().split('T')[0];

            if (selectedFilter === 'today') {
                startDate = endDate;
            } else if (selectedFilter === 'week') {
                const weekAgo = new Date(now);
                weekAgo.setDate(weekAgo.getDate() - 7);
                startDate = weekAgo.toISOString().split('T')[0];
            }

            const isAdmin = user?.role === 'admin';
            // Admin sees all sessions, user sees only their own
            const data = isAdmin
                ? await adminService.getAllSessionHistory(startDate, endDate)
                : await sessionService.getSessionHistory(startDate, endDate);
            setSessions(data);
        } catch (error) {
            console.error('Error fetching session history:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [selectedFilter, user?.role]);

    useEffect(() => {
        setLoading(true);
        fetchHistory();
    }, [fetchHistory]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchHistory();
    }, [fetchHistory]);

    const handleSessionPress = (session: SessionHistory) => {
        navigation.navigate('SessionDetails', { sessionId: session.id });
    };

    // Paginated data
    const displayedSessions = useMemo(() => {
        return sessions.slice(0, displayCount);
    }, [sessions, displayCount]);

    const hasMore = displayCount < sessions.length;

    const loadMore = useCallback(() => {
        if (hasMore) {
            setDisplayCount(prev => prev + APP_CONFIG.defaultPageSize);
        }
    }, [hasMore]);

    const renderFilterButtons = () => (
        <View style={styles.filterContainer}>
            {(['all', 'today', 'week'] as const).map((filter) => (
                <TouchableOpacity
                    key={filter}
                    style={[
                        styles.filterButton,
                        selectedFilter === filter && styles.filterButtonActive,
                    ]}
                    onPress={() => setSelectedFilter(filter)}
                >
                    <Text
                        style={[
                            styles.filterText,
                            selectedFilter === filter && styles.filterTextActive,
                        ]}
                    >
                        {filter === 'all' ? 'All' : filter === 'today' ? 'Today' : 'This Week'}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    const renderSessionItem = ({ item }: { item: SessionHistory }) => {
        // Calculate actual duration with seconds from start and end times
        const startTime = new Date(item.startTime);
        const endTime = new Date(item.endTime);
        const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
        
        // Format duration with seconds
        const formatDurationWithSeconds = (seconds: number): string => {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = seconds % 60;
            
            if (hours > 0) {
                return `${hours}h ${minutes}m ${secs}s`;
            } else if (minutes > 0) {
                return `${minutes}m ${secs}s`;
            } else {
                return `${secs}s`;
            }
        };
        
        return (
            <TouchableOpacity onPress={() => handleSessionPress(item)}>
                <Card style={styles.sessionCard}>
                    <View style={styles.sessionHeader}>
                        <View>
                            <Text style={styles.computerName}>{item.computerName}</Text>
                            <Text style={styles.userName}>{item.userName}</Text>
                        </View>
                        <View style={styles.durationBadge}>
                            <Text style={styles.durationText}>{formatDurationWithSeconds(durationSeconds)}</Text>
                        </View>
                    </View>
                    <View style={styles.sessionDetails}>
                        <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>📅</Text>
                            <Text style={styles.detailValue}>{formatDate(item.startTime)}</Text>
                        </View>
                        <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>🕐</Text>
                            <Text style={styles.detailValue}>
                                {formatTime(item.startTime)} - {formatTime(item.endTime)}
                            </Text>
                        </View>
                    </View>
                </Card>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return <Loading fullScreen message="Loading session history..." />;
    }

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Session History</Text>
            <Text style={styles.emptyText}>
                No completed sessions found for the selected filter.
            </Text>
        </View>
    );

    return (
        <View style={styles.container}>
            {renderFilterButtons()}
            <FlatList
                data={displayedSessions}
                keyExtractor={(item) => item.id}
                renderItem={renderSessionItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={renderEmptyState}
                ListFooterComponent={
                    hasMore ? (
                        <TouchableOpacity style={styles.loadMoreButton} onPress={loadMore}>
                            <Text style={styles.loadMoreText}>Load More</Text>
                        </TouchableOpacity>
                    ) : null
                }
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                showsVerticalScrollIndicator={false}
                onEndReached={loadMore}
                onEndReachedThreshold={0.5}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    filterContainer: {
        flexDirection: 'row',
        padding: 16,
        gap: 10,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    filterButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.background,
    },
    filterButtonActive: {
        backgroundColor: colors.primary,
    },
    filterText: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.textSecondary,
    },
    filterTextActive: {
        color: colors.textLight,
    },
    listContent: {
        flexGrow: 1,
        padding: 16,
        paddingTop: 8,
    },
    sessionCard: {
        marginBottom: 4,
    },
    sessionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    computerName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    userName: {
        fontSize: 13,
        color: colors.textSecondary,
        marginTop: 2,
    },
    durationBadge: {
        backgroundColor: `${colors.primary}15`,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    durationText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.primary,
    },
    sessionDetails: {
        flexDirection: 'row',
        gap: 20,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    detailLabel: {
        fontSize: 14,
    },
    detailValue: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    loadMoreButton: {
        padding: 16,
        alignItems: 'center',
        marginTop: 8,
    },
    loadMoreText: {
        color: colors.primary,
        fontSize: 16,
        fontWeight: '600',
    },
});

export default SessionHistoryScreen;
