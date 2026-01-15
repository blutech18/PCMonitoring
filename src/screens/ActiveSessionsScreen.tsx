import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import sessionService from '../services/sessionService';
import adminService from '../services/adminService';
import { ActiveSession } from '../models/types';
import SessionCard from '../components/SessionCard';
import Loading from '../components/common/Loading';
import colors from '../constants/colors';
import { APP_CONFIG } from '../constants/config';

const ActiveSessionsScreen: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const { user } = useAuth();
    const [sessions, setSessions] = useState<ActiveSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchSessions = useCallback(async () => {
        try {
            const isAdmin = user?.role === 'admin';
            // Admin sees all sessions, user sees only their own
            const data = isAdmin 
                ? await adminService.getAllActiveSessions()
                : await sessionService.getActiveSessions();
            setSessions(data);
        } catch (error) {
            console.error('Error fetching active sessions:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.role]);

    useEffect(() => {
        fetchSessions();

        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchSessions, APP_CONFIG.refreshInterval);
        return () => clearInterval(interval);
    }, [fetchSessions]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchSessions();
    }, [fetchSessions]);

    const handleSessionPress = (session: ActiveSession) => {
        navigation.navigate('SessionDetails', { sessionId: session.id });
    };

    if (loading) {
        return <Loading fullScreen message="Loading active sessions..." />;
    }

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Active Sessions</Text>
            <Text style={styles.emptyText}>
                There are no computers currently in use.
                Pull down to refresh.
            </Text>
        </View>
    );

    const renderHeader = () => (
        <View style={styles.header}>
            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{sessions.length}</Text>
                    <Text style={styles.statLabel}>Active Sessions</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                        {sessions.filter(s => s.status === 'active').length}
                    </Text>
                    <Text style={styles.statLabel}>Currently Active</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                        {sessions.filter(s => s.status === 'idle').length}
                    </Text>
                    <Text style={styles.statLabel}>Idle</Text>
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={sessions}
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
                ListHeaderComponent={sessions.length > 0 ? renderHeader : null}
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
    header: {
        backgroundColor: colors.surface,
        marginHorizontal: 16,
        marginVertical: 12,
        borderRadius: 12,
        padding: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
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
        lineHeight: 20,
    },
});

export default ActiveSessionsScreen;
