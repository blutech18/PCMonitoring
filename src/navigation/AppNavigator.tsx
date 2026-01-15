import React, { useState, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { NavigationProvider } from '../context/NavigationContext';
import { RootStackParamList } from '../models/types';
import colors from '../constants/colors';

// Screens
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ActiveSessionsScreen from '../screens/ActiveSessionsScreen';
import SessionHistoryScreen from '../screens/SessionHistoryScreen';
import SessionDetailsScreen from '../screens/SessionDetailsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ReportsScreen from '../screens/ReportsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import UserManagementScreen from '../screens/UserManagementScreen';
// Admin-specific screens
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminActiveSessionsScreen from '../screens/admin/AdminActiveSessionsScreen';
import AdminSessionHistoryScreen from '../screens/admin/AdminSessionHistoryScreen';
import AdminSettingsScreen from '../screens/admin/AdminSettingsScreen';
import Loading from '../components/common/Loading';
import BottomNavigation, { NavItem } from '../components/common/BottomNavigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Navigation items configuration - Admin sees all screens including User Management
const ADMIN_NAV_ITEMS: NavItem[] = [
    { key: 'Dashboard', label: 'Dashboard', icon: 'dashboard' },
    { key: 'ActiveSessions', label: 'Active', icon: 'active' },
    { key: 'SessionHistory', label: 'History', icon: 'history' },
    { key: 'Users', label: 'Users', icon: 'users' },
    { key: 'Reports', label: 'Reports', icon: 'reports' },
    { key: 'Settings', label: 'Settings', icon: 'settings' },
];

// User sees limited screens (no Reports for now)
const USER_NAV_ITEMS: NavItem[] = [
    { key: 'Dashboard', label: 'Dashboard', icon: 'dashboard' },
    { key: 'ActiveSessions', label: 'Active', icon: 'active' },
    { key: 'SessionHistory', label: 'History', icon: 'history' },
    { key: 'Notifications', label: 'Alerts', icon: 'alerts' },
    { key: 'Settings', label: 'Settings', icon: 'settings' },
];

// Header titles for each screen
const HEADER_TITLES: Record<string, string> = {
    Dashboard: 'PC Monitoring',
    ActiveSessions: 'Active Sessions',
    SessionHistory: 'Session History',
    Notifications: 'Notifications',
    Users: 'User Management',
    Reports: 'Usage Reports',
    Settings: 'Settings',
};

// User screen components mapping
const SCREEN_COMPONENTS: Record<string, React.FC<any>> = {
    Dashboard: DashboardScreen,
    ActiveSessions: ActiveSessionsScreen,
    SessionHistory: SessionHistoryScreen,
    Notifications: NotificationsScreen,
    Users: UserManagementScreen,
    Reports: ReportsScreen,
    Settings: SettingsScreen,
};

// Admin screen components mapping - uses admin-specific screens
const ADMIN_SCREEN_COMPONENTS: Record<string, React.FC<any>> = {
    Dashboard: AdminDashboardScreen,
    ActiveSessions: AdminActiveSessionsScreen,
    SessionHistory: AdminSessionHistoryScreen,
    Users: UserManagementScreen,
    Reports: ReportsScreen,
    Settings: AdminSettingsScreen,
};

// Simple Header Component
const SimpleHeader: React.FC<{ title: string; onLogout: () => void }> = ({ title, onLogout }) => (
    <View style={styles.header}>
        <Text style={styles.headerTitle}>{title}</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout} activeOpacity={0.7}>
            <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
    </View>
);

// Main SPA Navigator with custom bottom navigation
const MainSPANavigator: React.FC = () => {
    const [activeScreen, setActiveScreen] = useState<string>('Dashboard');
    const { logout, user } = useAuth();

    const handleNavigate = useCallback((key: string) => {
        setActiveScreen(key);
    }, []);

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const ActiveComponent = user?.role === 'admin'
        ? ADMIN_SCREEN_COMPONENTS[activeScreen]
        : SCREEN_COMPONENTS[activeScreen];
    const headerTitle = HEADER_TITLES[activeScreen] || activeScreen;

    // Get role-appropriate navigation items
    const navItems = user?.role === 'admin' ? ADMIN_NAV_ITEMS : USER_NAV_ITEMS;

    return (
        <NavigationProvider initialScreen={activeScreen} onScreenChange={handleNavigate}>
            <View style={styles.container}>
                <SimpleHeader title={headerTitle} onLogout={handleLogout} />
                <View style={styles.screenContainer}>
                    <ActiveComponent />
                </View>
                <BottomNavigation
                    items={navItems}
                    activeKey={activeScreen}
                    onNavigate={handleNavigate}
                />
            </View>
        </NavigationProvider>
    );
};

// Auth Navigator for Login/Signup flow
const AuthNavigator: React.FC = () => {
    const [showLogin, setShowLogin] = useState(true);

    if (showLogin) {
        return <LoginScreen onNavigateToSignup={() => setShowLogin(false)} />;
    }
    return <SignupScreen onNavigateToLogin={() => setShowLogin(true)} />;
};

// Root Navigator
const AppNavigator: React.FC = () => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return <Loading fullScreen message="Loading..." />;
    }

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {isAuthenticated ? (
                    <>
                        <Stack.Screen name="Main" component={MainSPANavigator} />
                        <Stack.Screen
                            name="SessionDetails"
                            component={SessionDetailsScreen}
                            options={{
                                headerShown: true,
                                headerTitle: 'Session Details',
                                headerStyle: { backgroundColor: colors.primary },
                                headerTintColor: colors.textLight,
                                headerTitleStyle: { fontWeight: '600' },
                            }}
                        />
                    </>
                ) : (
                    <Stack.Screen name="Login" component={AuthNavigator} />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
};


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        backgroundColor: colors.primary,
        paddingVertical: 16,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerTitle: {
        color: colors.textLight,
        fontSize: 18,
        fontWeight: '600',
    },
    logoutButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 6,
    },
    logoutButtonText: {
        color: colors.textLight,
        fontSize: 14,
        fontWeight: '600',
    },
    screenContainer: {
        flex: 1,
    },
});

export default AppNavigator;
