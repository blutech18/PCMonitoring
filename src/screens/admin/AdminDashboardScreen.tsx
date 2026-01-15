import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    Pressable,
    Animated,
    Platform,
    useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';
import adminService from '../../services/adminService';
import { DashboardStats, User } from '../../models/types';
import Loading from '../../components/common/Loading';
import colors from '../../constants/colors';
import { APP_CONFIG } from '../../constants/config';

// Animated Stat Card Component
const AnimatedStatCard: React.FC<{
    title: string;
    value: number;
    color: string;
    icon: React.ReactNode;
    delay: number;
}> = ({ title, value, color, icon, delay }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(30)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                delay,
                useNativeDriver: true,
            }),
            Animated.spring(translateY, {
                toValue: 0,
                friction: 8,
                delay,
                useNativeDriver: true,
            }),
        ]).start();
    }, [delay]);

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.95,
            friction: 8,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 8,
            useNativeDriver: true,
        }).start();
    };

    return (
        <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} style={styles.statCardWrapper}>
            <Animated.View
                style={[
                    styles.statCard,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY }, { scale: scaleAnim }],
                    },
                ]}
            >
                <View style={[styles.statIconContainer, { backgroundColor: `${color}15` }]}>
                    {icon}
                </View>
                <Text style={styles.statValue}>{value}</Text>
                <Text style={styles.statTitle}>{title}</Text>
            </Animated.View>
        </Pressable>
    );
};

// Quick Action Card
const QuickActionCard: React.FC<{
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    color: string;
    onPress?: () => void;
}> = ({ title, subtitle, icon, color, onPress }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.95,
            friction: 8,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 8,
            useNativeDriver: true,
        }).start();
    };

    return (
        <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} style={styles.quickActionWrapper}>
            <Animated.View style={[styles.quickActionCard, { transform: [{ scale: scaleAnim }] }]}>
                <View style={[styles.quickActionIcon, { backgroundColor: `${color}15` }]}>
                    {icon}
                </View>
                <View style={styles.quickActionText}>
                    <Text style={styles.quickActionTitle}>{title}</Text>
                    <Text style={styles.quickActionSubtitle}>{subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </Animated.View>
        </Pressable>
    );
};

const AdminDashboardScreen: React.FC = () => {
    const { user } = useAuth();
    const { navigate } = useNavigation();
    const { width } = useWindowDimensions();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [userCounts, setUserCounts] = useState<{ admin: number; user: number }>({ admin: 0, user: 0 });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const headerFade = useRef(new Animated.Value(0)).current;
    const isLargeScreen = width >= 768;

    const fetchData = useCallback(async () => {
        try {
            const [statsData, counts] = await Promise.all([
                adminService.getSystemDashboardStats(),
                adminService.getUserCountByRole(),
            ]);
            setStats(statsData);
            setUserCounts(counts);
        } catch (error) {
            console.error('Error fetching admin dashboard data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        Animated.timing(headerFade, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();

        const interval = setInterval(fetchData, APP_CONFIG.refreshInterval);
        return () => clearInterval(interval);
    }, [fetchData]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchData();
    }, [fetchData]);

    if (loading) {
        return <Loading fullScreen message="Loading admin dashboard..." />;
    }

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    };

    const totalUsers = userCounts.admin + userCounts.user;

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={[
                styles.content,
                isLargeScreen && styles.contentLarge,
            ]}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={colors.primary}
                    colors={[colors.primary]}
                />
            }
            showsVerticalScrollIndicator={false}
        >
            {/* Header */}
            <Animated.View style={[styles.header, { opacity: headerFade }]}>
                <View>
                    <Text style={styles.greeting}>{getGreeting()}</Text>
                    <Text style={styles.username}>{user?.username || 'Admin'}</Text>
                    <View style={styles.roleBadge}>
                        <Ionicons name="shield-checkmark" size={14} color={colors.primary} />
                        <Text style={styles.roleTag}>System Administrator</Text>
                    </View>
                </View>
                <View style={styles.avatarContainer}>
                    <Ionicons name="shield" size={24} color={colors.textLight} />
                </View>
            </Animated.View>

            {/* System Overview Stats */}
            <Text style={styles.sectionTitle}>System Overview</Text>
            <View style={[styles.statsGrid, isLargeScreen && styles.statsGridLarge]}>
                <AnimatedStatCard
                    title="Active Computers"
                    value={stats?.activeComputers || 0}
                    color={colors.success}
                    icon={<Ionicons name="desktop-outline" size={22} color={colors.success} />}
                    delay={100}
                />
                <AnimatedStatCard
                    title="Active Users"
                    value={stats?.loggedInUsers || 0}
                    color={colors.primary}
                    icon={<Ionicons name="people-outline" size={22} color={colors.primary} />}
                    delay={200}
                />
                <AnimatedStatCard
                    title="Today's Sessions"
                    value={stats?.todaySessions || 0}
                    color={colors.secondary}
                    icon={<Ionicons name="stats-chart-outline" size={22} color={colors.secondary} />}
                    delay={300}
                />
                <AnimatedStatCard
                    title="System Alerts"
                    value={stats?.totalAlerts || 0}
                    color={(stats?.totalAlerts || 0) > 0 ? colors.warning : colors.textMuted}
                    icon={<Ionicons name="warning-outline" size={22} color={(stats?.totalAlerts || 0) > 0 ? colors.warning : colors.textMuted} />}
                    delay={400}
                />
            </View>

            {/* User Statistics Panel */}
            <Text style={styles.sectionTitle}>User Statistics</Text>
            <View style={styles.userStatsCard}>
                <View style={styles.userStatsRow}>
                    <View style={styles.userStatItem}>
                        <Text style={styles.userStatValue}>{totalUsers}</Text>
                        <Text style={styles.userStatLabel}>Total Users</Text>
                    </View>
                    <View style={styles.userStatDivider} />
                    <View style={styles.userStatItem}>
                        <Text style={[styles.userStatValue, { color: colors.primary }]}>{userCounts.admin}</Text>
                        <Text style={styles.userStatLabel}>Admins</Text>
                    </View>
                    <View style={styles.userStatDivider} />
                    <View style={styles.userStatItem}>
                        <Text style={[styles.userStatValue, { color: colors.success }]}>{userCounts.user}</Text>
                        <Text style={styles.userStatLabel}>Regular Users</Text>
                    </View>
                </View>
            </View>

            {/* Quick Actions */}
            <Text style={styles.sectionTitle}>Admin Quick Actions</Text>
            <View style={styles.quickActionsContainer}>
                <QuickActionCard
                    title="Manage Users"
                    subtitle="View and edit user accounts"
                    icon={<Ionicons name="people" size={22} color={colors.primary} />}
                    color={colors.primary}
                    onPress={() => navigate('Users')}
                />
                <QuickActionCard
                    title="View Reports"
                    subtitle="Usage analytics & statistics"
                    icon={<Ionicons name="bar-chart" size={22} color={colors.success} />}
                    color={colors.success}
                    onPress={() => navigate('Reports')}
                />
                <QuickActionCard
                    title="System Settings"
                    subtitle="Configure global settings"
                    icon={<Ionicons name="settings" size={22} color={colors.secondary} />}
                    color={colors.secondary}
                    onPress={() => navigate('Settings')}
                />
                <QuickActionCard
                    title="Active Sessions"
                    subtitle="Monitor all live sessions"
                    icon={<Ionicons name="pulse" size={22} color={colors.warning} />}
                    color={colors.warning}
                    onPress={() => navigate('ActiveSessions')}
                />
            </View>

            {/* System Status */}
            <View style={styles.statusCard}>
                <View style={styles.statusHeader}>
                    <Text style={styles.statusTitle}>System Health</Text>
                    <View style={styles.statusIndicator}>
                        <View style={styles.statusDot} />
                        <Text style={styles.statusOnline}>All Systems Online</Text>
                    </View>
                </View>
                <Text style={styles.statusText}>
                    Monitoring {stats?.activeComputers || 0} computers with {stats?.loggedInUsers || 0} active users
                </Text>
                <Text style={styles.lastUpdated}>
                    Last updated: {new Date().toLocaleTimeString()}
                </Text>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    contentLarge: {
        paddingHorizontal: 40,
        maxWidth: 1200,
        alignSelf: 'center',
        width: '100%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 28,
        paddingTop: 8,
    },
    greeting: {
        fontSize: 15,
        color: colors.textSecondary,
        marginBottom: 4,
    },
    username: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.textPrimary,
        letterSpacing: -0.5,
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        backgroundColor: `${colors.primary}15`,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    roleTag: {
        fontSize: 12,
        color: colors.primary,
        fontWeight: '600',
        marginLeft: 4,
        textTransform: 'uppercase',
    },
    avatarContainer: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            web: {
                boxShadow: `0 4px 12px rgba(59, 130, 246, 0.3)`,
            },
            default: {
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
            },
        }),
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 16,
        marginTop: 8,
        letterSpacing: -0.3,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -6,
        marginBottom: 24,
    },
    statsGridLarge: {
        marginHorizontal: -8,
    },
    statCardWrapper: {
        width: '50%',
        padding: 6,
    },
    statCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 16,
        ...Platform.select({
            web: {
                boxShadow: `0 2px 12px ${colors.shadow}`,
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            },
            default: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
                elevation: 2,
            },
        }),
    },
    statIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    statValue: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 4,
    },
    statTitle: {
        fontSize: 13,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    userStatsCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        ...Platform.select({
            web: {
                boxShadow: `0 2px 12px ${colors.shadow}`,
            },
            default: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
                elevation: 2,
            },
        }),
    },
    userStatsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    userStatItem: {
        flex: 1,
        alignItems: 'center',
    },
    userStatValue: {
        fontSize: 32,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    userStatLabel: {
        fontSize: 13,
        color: colors.textSecondary,
        marginTop: 4,
    },
    userStatDivider: {
        width: 1,
        height: 40,
        backgroundColor: colors.divider,
    },
    quickActionsContainer: {
        marginBottom: 24,
    },
    quickActionWrapper: {
        marginBottom: 12,
    },
    quickActionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: 14,
        padding: 16,
        ...Platform.select({
            web: {
                boxShadow: `0 2px 8px ${colors.shadow}`,
                cursor: 'pointer',
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
    quickActionIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    quickActionText: {
        flex: 1,
    },
    quickActionTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    quickActionSubtitle: {
        fontSize: 13,
        color: colors.textSecondary,
        marginTop: 2,
    },
    statusCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 18,
        borderLeftWidth: 4,
        borderLeftColor: colors.success,
        ...Platform.select({
            web: {
                boxShadow: `0 2px 12px ${colors.shadow}`,
            },
            default: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
                elevation: 2,
            },
        }),
    },
    statusHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    statusTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    statusIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.success,
        marginRight: 6,
    },
    statusOnline: {
        fontSize: 13,
        color: colors.success,
        fontWeight: '600',
    },
    statusText: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 8,
    },
    lastUpdated: {
        fontSize: 12,
        color: colors.textMuted,
    },
});

export default AdminDashboardScreen;
