import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    TouchableOpacity,
    TextInput,
    Platform,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import adminService from '../../services/adminService';
import { SessionHistory } from '../../models/types';
import Card from '../../components/common/Card';
import Loading from '../../components/common/Loading';
import colors from '../../constants/colors';
import { formatDuration, getRelativeTime } from '../../utils/helpers';

const AdminSessionHistoryScreen: React.FC = () => {
    const [sessions, setSessions] = useState<SessionHistory[]>([]);
    const [filteredSessions, setFilteredSessions] = useState<SessionHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

    const fetchSessions = useCallback(async () => {
        try {
            const data = await adminService.getAllSessionHistory();
            setSessions(data);
            applyFilters(data, searchQuery, dateFilter);
        } catch (error) {
            console.error('Error fetching session history:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [searchQuery, dateFilter]);

    const applyFilters = (data: SessionHistory[], query: string, dateRange: string) => {
        let filtered = data;

        // Apply search filter
        if (query.trim()) {
            const lowerQuery = query.toLowerCase();
            filtered = filtered.filter(session =>
                session.userName?.toLowerCase().includes(lowerQuery) ||
                session.computerName?.toLowerCase().includes(lowerQuery)
            );
        }

        // Apply date filter
        const now = new Date();
        const today = now.toISOString().split('T')[0];

        if (dateRange === 'today') {
            filtered = filtered.filter(session => session.date === today);
        } else if (dateRange === 'week') {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            filtered = filtered.filter(session => new Date(session.date) >= weekAgo);
        } else if (dateRange === 'month') {
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            filtered = filtered.filter(session => new Date(session.date) >= monthAgo);
        }

        setFilteredSessions(filtered);
    };

    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    useEffect(() => {
        applyFilters(sessions, searchQuery, dateFilter);
    }, [searchQuery, dateFilter, sessions]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchSessions();
    }, [fetchSessions]);

    if (loading) {
        return <Loading fullScreen message="Loading session history..." />;
    }

    const getTotalDuration = () => {
        const totalMinutes = filteredSessions.reduce((acc, session) => {
            return acc + (session.totalDuration || 0);
        }, 0);
        return formatDuration(totalMinutes);
    };

    const getUniqueUsers = () => {
        const users = new Set(filteredSessions.map(s => s.userName));
        return users.size;
    };

    const getUniqueComputers = () => {
        const computers = new Set(filteredSessions.map(s => s.computerName));
        return computers.size;
    };

    const exportToCSV = () => {
        if (filteredSessions.length === 0) {
            Alert.alert('No Data', 'No sessions to export.');
            return;
        }

        const headers = ['User', 'Computer', 'Date', 'Start Time', 'End Time', 'Duration (min)'];
        const rows = filteredSessions.map(session => [
            session.userName || 'Unknown',
            session.computerName || 'Unknown',
            session.date,
            new Date(session.startTime).toLocaleTimeString(),
            new Date(session.endTime).toLocaleTimeString(),
            String(session.totalDuration || 0),
        ]);

        const csvContent = [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');

        if (Platform.OS === 'web') {
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `session-history-${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            URL.revokeObjectURL(url);
            Alert.alert('Success', 'CSV file downloaded successfully!');
        } else {
            Alert.alert('Export', 'CSV export is only available on web platform.');
        }
    };

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <Ionicons name="time-outline" size={64} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Session History</Text>
            <Text style={styles.emptyText}>
                {searchQuery || dateFilter !== 'all'
                    ? 'No sessions match your filters.'
                    : 'No past sessions recorded in the system yet.'}
            </Text>
        </View>
    );

    const renderSessionItem = ({ item }: { item: SessionHistory }) => (
        <Card style={styles.sessionCard}>
            <View style={styles.sessionHeader}>
                <View style={styles.sessionInfo}>
                    <View style={styles.userRow}>
                        <Ionicons name="person-circle" size={20} color={colors.primary} />
                        <Text style={styles.userName}>{item.userName || 'Unknown User'}</Text>
                    </View>
                    <View style={styles.computerRow}>
                        <Ionicons name="desktop-outline" size={16} color={colors.textSecondary} />
                        <Text style={styles.computerName}>{item.computerName}</Text>
                    </View>
                </View>
                <View style={styles.durationBadge}>
                    <Text style={styles.durationText}>{formatDuration(item.totalDuration || 0)}</Text>
                </View>
            </View>
            <View style={styles.sessionFooter}>
                <View style={styles.timeRow}>
                    <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                    <Text style={styles.timeText}>{item.date}</Text>
                </View>
                <View style={styles.timeRow}>
                    <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                    <Text style={styles.timeText}>
                        {new Date(item.startTime).toLocaleTimeString()} - {new Date(item.endTime).toLocaleTimeString()}
                    </Text>
                </View>
            </View>
        </Card>
    );

    const renderHeader = () => (
        <View style={styles.headerContainer}>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by user or computer..."
                    placeholderTextColor={colors.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Date Filters */}
            <View style={styles.filterActionRow}>
                <View style={styles.filterRow}>
                    {(['all', 'today', 'week', 'month'] as const).map((filter) => (
                        <TouchableOpacity
                            key={filter}
                            style={[styles.filterButton, dateFilter === filter && styles.filterButtonActive]}
                            onPress={() => setDateFilter(filter)}
                        >
                            <Text style={[styles.filterText, dateFilter === filter && styles.filterTextActive]}>
                                {filter.charAt(0).toUpperCase() + filter.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <TouchableOpacity style={styles.exportButton} onPress={exportToCSV}>
                    <Ionicons name="download-outline" size={18} color={colors.textLight} />
                    <Text style={styles.exportButtonText}>Export</Text>
                </TouchableOpacity>
            </View>

            {/* Stats Summary */}
            <View style={styles.statsCard}>
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{filteredSessions.length}</Text>
                        <Text style={styles.statLabel}>Sessions</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: colors.primary }]}>{getUniqueUsers()}</Text>
                        <Text style={styles.statLabel}>Users</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: colors.success }]}>{getUniqueComputers()}</Text>
                        <Text style={styles.statLabel}>Computers</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: colors.secondary }]}>{getTotalDuration()}</Text>
                        <Text style={styles.statLabel}>Total Time</Text>
                    </View>
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={filteredSessions}
                keyExtractor={(item) => item.id}
                renderItem={renderSessionItem}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmptyState}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    listContent: {
        flexGrow: 1,
        paddingBottom: 20,
    },
    headerContainer: {
        padding: 16,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 12,
        paddingHorizontal: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.divider,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 15,
        color: colors.textPrimary,
    },
    filterActionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    filterRow: {
        flexDirection: 'row',
        gap: 8,
    },
    filterButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.divider,
    },
    filterButtonActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    filterText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    filterTextActive: {
        color: colors.textLight,
    },
    exportButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.success,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
    },
    exportButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textLight,
    },
    statsCard: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
        ...Platform.select({
            web: {
                boxShadow: `0 2px 8px ${colors.shadow}`,
            },
            default: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
                elevation: 1,
            },
        }),
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    statLabel: {
        fontSize: 11,
        color: colors.textSecondary,
        marginTop: 4,
        textAlign: 'center',
    },
    divider: {
        width: 1,
        height: 36,
        backgroundColor: colors.divider,
    },
    sessionCard: {
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 16,
    },
    sessionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    sessionInfo: {
        flex: 1,
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
        marginLeft: 8,
    },
    computerRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    computerName: {
        fontSize: 14,
        color: colors.textSecondary,
        marginLeft: 6,
    },
    durationBadge: {
        backgroundColor: `${colors.primary}15`,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    durationText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.primary,
    },
    sessionFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: colors.divider,
        paddingTop: 12,
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    timeText: {
        fontSize: 12,
        color: colors.textMuted,
        marginLeft: 4,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.textPrimary,
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
});

export default AdminSessionHistoryScreen;
