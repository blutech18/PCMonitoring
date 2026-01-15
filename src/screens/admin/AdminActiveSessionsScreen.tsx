import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    TouchableOpacity,
    TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import adminService from '../../services/adminService';
import { ActiveSession } from '../../models/types';
import SessionCard from '../../components/SessionCard';
import Loading from '../../components/common/Loading';
import colors from '../../constants/colors';
import { APP_CONFIG } from '../../constants/config';

const AdminActiveSessionsScreen: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const [sessions, setSessions] = useState<ActiveSession[]>([]);
    const [filteredSessions, setFilteredSessions] = useState<ActiveSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'idle'>('all');

    const fetchSessions = useCallback(async () => {
        try {
            const data = await adminService.getAllActiveSessions();
            setSessions(data);
            applyFilters(data, searchQuery, statusFilter);
        } catch (error) {
            console.error('Error fetching active sessions:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [searchQuery, statusFilter]);

    const applyFilters = (data: ActiveSession[], query: string, status: string) => {
        let filtered = data;

        // Apply search filter
        if (query.trim()) {
            const lowerQuery = query.toLowerCase();
            filtered = filtered.filter(session =>
                session.userName?.toLowerCase().includes(lowerQuery) ||
                session.computerName?.toLowerCase().includes(lowerQuery) ||
                session.currentActivity?.toLowerCase().includes(lowerQuery)
            );
        }

        // Apply status filter
        if (status !== 'all') {
            filtered = filtered.filter(session => session.status === status);
        }

        setFilteredSessions(filtered);
    };

    useEffect(() => {
        fetchSessions();
        const interval = setInterval(fetchSessions, APP_CONFIG.refreshInterval);
        return () => clearInterval(interval);
    }, [fetchSessions]);

    useEffect(() => {
        applyFilters(sessions, searchQuery, statusFilter);
    }, [searchQuery, statusFilter, sessions]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchSessions();
    }, [fetchSessions]);

    const handleSessionPress = (session: ActiveSession) => {
        navigation.navigate('SessionDetails', { sessionId: session.id });
    };

    if (loading) {
        return <Loading fullScreen message="Loading all sessions..." />;
    }

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <Ionicons name="desktop-outline" size={64} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Active Sessions</Text>
            <Text style={styles.emptyText}>
                {searchQuery || statusFilter !== 'all'
                    ? 'No sessions match your filters. Try adjusting your search.'
                    : 'There are no computers currently in use across the system.'}
            </Text>
        </View>
    );

    const renderHeader = () => (
        <View style={styles.headerContainer}>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by user, computer, or activity..."
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

            {/* Status Filters */}
            <View style={styles.filterRow}>
                <TouchableOpacity
                    style={[styles.filterButton, statusFilter === 'all' && styles.filterButtonActive]}
                    onPress={() => setStatusFilter('all')}
                >
                    <Text style={[styles.filterText, statusFilter === 'all' && styles.filterTextActive]}>
                        All ({sessions.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.filterButton, statusFilter === 'active' && styles.filterButtonActive]}
                    onPress={() => setStatusFilter('active')}
                >
                    <Text style={[styles.filterText, statusFilter === 'active' && styles.filterTextActive]}>
                        Active ({sessions.filter(s => s.status === 'active').length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.filterButton, statusFilter === 'idle' && styles.filterButtonActive]}
                    onPress={() => setStatusFilter('idle')}
                >
                    <Text style={[styles.filterText, statusFilter === 'idle' && styles.filterTextActive]}>
                        Idle ({sessions.filter(s => s.status === 'idle').length})
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Stats Summary */}
            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{filteredSessions.length}</Text>
                    <Text style={styles.statLabel}>Showing</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: colors.success }]}>
                        {filteredSessions.filter(s => s.status === 'active').length}
                    </Text>
                    <Text style={styles.statLabel}>Active</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: colors.warning }]}>
                        {filteredSessions.filter(s => s.status === 'idle').length}
                    </Text>
                    <Text style={styles.statLabel}>Idle</Text>
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={filteredSessions}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View style={styles.cardContainer}>
                        <SessionCard
                            session={item}
                            onPress={() => handleSessionPress(item)}
                        />
                    </View>
                )}
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
        paddingVertical: 8,
    },
    cardContainer: {
        paddingHorizontal: 12,
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
    filterRow: {
        flexDirection: 'row',
        marginBottom: 16,
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
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
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
        textAlign: 'center',
    },
    divider: {
        width: 1,
        height: 40,
        backgroundColor: colors.divider,
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

export default AdminActiveSessionsScreen;
