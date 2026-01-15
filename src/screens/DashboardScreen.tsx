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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import sessionService from '../services/sessionService';
import adminService from '../services/adminService';
import notificationService from '../services/notificationService';
import { DashboardStats } from '../models/types';
import Loading from '../components/common/Loading';
import colors from '../constants/colors';
import { APP_CONFIG } from '../constants/config';

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

// Animated Action Card Component
const ActionCard: React.FC<{
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    color: string;
    onPress: () => void;
    delay: number;
}> = ({ title, subtitle, icon, color, onPress, delay }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            delay,
            useNativeDriver: true,
        }).start();
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
        <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} style={styles.actionCardWrapper}>
            <Animated.View
                style={[
                    styles.actionCard,
                    { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
                ]}
            >
                <View style={[styles.actionIcon, { backgroundColor: `${color}15` }]}>
                    {icon}
                </View>
                <Text style={styles.actionTitle}>{title}</Text>
                <Text style={styles.actionSubtitle}>{subtitle}</Text>
            </Animated.View>
        </Pressable>
    );
};

const DashboardScreen: React.FC = () => {
    const { user } = useAuth();
    const { width } = useWindowDimensions();
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    const headerFade = useRef(new Animated.Value(0)).current;
    const isLargeScreen = width >= 768;

    const fetchData = useCallback(async () => {
        try {
            const isAdmin = user?.role === 'admin';
            
            // Admin sees system-wide stats, user sees only their own
            const [statsData, notifCount] = await Promise.all([
                isAdmin ? adminService.getSystemDashboardStats() : sessionService.getDashboardStats(),
                notificationService.getUnreadCount(),
            ]);
            setStats(statsData);
            setUnreadCount(notifCount);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.role]);

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
        return <Loading fullScreen message="Loading dashboard..." />;
    }

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    };

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
                    <Text style={styles.username}>{user?.username || 'User'}</Text>
                    {user?.role === 'admin' && (
                        <Text style={styles.roleTag}>System Administrator</Text>
                    )}
                </View>
                <View style={styles.avatarContainer}>
                    <Text style={styles.avatarText}>
                        {(user?.username || 'U')[0].toUpperCase()}
                    </Text>
                </View>
            </Animated.View>

            {/* Stats Grid */}
            <Text style={styles.sectionTitle}>
                {user?.role === 'admin' ? 'System Overview' : 'My Computers'}
            </Text>
            <View style={[styles.statsGrid, isLargeScreen && styles.statsGridLarge]}>
                <AnimatedStatCard
                    title={user?.role === 'admin' ? 'Active Computers' : 'My Active PCs'}
                    value={stats?.activeComputers || 0}
                    color={colors.success}
                    icon={<Ionicons name="desktop-outline" size={22} color={colors.success} />}
                    delay={100}
                />
                <AnimatedStatCard
                    title={user?.role === 'admin' ? 'Active Users' : 'Active Sessions'}
                    value={stats?.loggedInUsers || 0}
                    color={colors.primary}
                    icon={<Ionicons name="person-outline" size={22} color={colors.primary} />}
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
                    title="Active Alerts"
                    value={stats?.totalAlerts || 0}
                    color={unreadCount > 0 ? colors.warning : colors.textMuted}
                    icon={<Ionicons name="notifications-outline" size={22} color={unreadCount > 0 ? colors.warning : colors.textMuted} />}
                    delay={400}
                />
            </View>

            {/* Quick Actions */}
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={[styles.actionsContainer, isLargeScreen && styles.actionsContainerLarge]}>
                <ActionCard
                    title="Active Sessions"
                    subtitle="View live sessions"
                    icon={<Ionicons name="flash-outline" size={24} color={colors.primary} />}
                    color={colors.primary}
                    onPress={() => navigation.navigate('ActiveSessions')}
                    delay={500}
                />
                <ActionCard
                    title="History"
                    subtitle="Past sessions"
                    icon={<Ionicons name="time-outline" size={24} color={colors.success} />}
                    color={colors.success}
                    onPress={() => navigation.navigate('SessionHistory')}
                    delay={600}
                />
                <ActionCard
                    title="Reports"
                    subtitle="Usage analytics"
                    icon={<Ionicons name="trending-up-outline" size={24} color={colors.warning} />}
                    color={colors.warning}
                    onPress={() => navigation.navigate('Reports')}
                    delay={700}
                />
            </View>

            {/* Notifications Banner */}
            {unreadCount > 0 && (
                <Pressable onPress={() => navigation.navigate('Notifications')}>
                    <Animated.View style={styles.notificationCard}>
                        <View style={styles.notificationBadge}>
                            <Text style={styles.notificationBadgeText}>{unreadCount}</Text>
                        </View>
                        <View style={styles.notificationText}>
                            <Text style={styles.notificationTitle}>
                                {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
                            </Text>
                            <Text style={styles.notificationSubtitle}>
                                Tap to view all
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.warning} />
                    </Animated.View>
                </Pressable>
            )}

            {/* System Status */}
            <View style={styles.statusCard}>
                <View style={styles.statusHeader}>
                    <Text style={styles.statusTitle}>System Status</Text>
                    <View style={styles.statusIndicator}>
                        <View style={styles.statusDot} />
                        <Text style={styles.statusOnline}>Online</Text>
                    </View>
                </View>
                <Text style={styles.statusText}>All systems operational</Text>
                <Text style={styles.lastUpdated}>
                    Updated {new Date().toLocaleTimeString()}
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
    roleTag: {
        fontSize: 12,
        color: colors.primary,
        fontWeight: '600',
        marginTop: 4,
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
    avatarText: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.textLight,
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
    actionsContainer: {
        flexDirection: 'row',
        marginHorizontal: -6,
        marginBottom: 24,
    },
    actionsContainerLarge: {
        marginHorizontal: -8,
    },
    actionCardWrapper: {
        flex: 1,
        padding: 6,
    },
    actionCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        ...Platform.select({
            web: {
                boxShadow: `0 2px 12px ${colors.shadow}`,
                cursor: 'pointer',
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
    actionIcon: {
        width: 52,
        height: 52,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    actionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: 2,
    },
    actionSubtitle: {
        fontSize: 12,
        color: colors.textMuted,
        textAlign: 'center',
    },
    notificationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.warningLight,
        borderRadius: 14,
        padding: 16,
        marginBottom: 24,
        borderLeftWidth: 4,
        borderLeftColor: colors.warning,
    },
    notificationBadge: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.warning,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    notificationBadgeText: {
        color: colors.textLight,
        fontWeight: '700',
        fontSize: 15,
    },
    notificationText: {
        flex: 1,
    },
    notificationTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    notificationSubtitle: {
        fontSize: 13,
        color: colors.textSecondary,
        marginTop: 2,
    },
    chevron: {
        fontSize: 18,
        color: colors.warning,
        fontWeight: '600',
    },
    statusCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 18,
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

export default DashboardScreen;
