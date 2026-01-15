import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';

export interface NavItem {
    key: string;
    label: string;
    icon: string;
}

interface BottomNavigationProps {
    items: NavItem[];
    activeKey: string;
    onNavigate: (key: string) => void;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({
    items,
    activeKey,
    onNavigate,
}) => {
    const insets = useSafeAreaInsets();

    const getIcon = (iconName: string, isActive: boolean) => {
        const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
            dashboard: isActive ? 'home' : 'home-outline',
            active: isActive ? 'flash' : 'flash-outline',
            history: isActive ? 'time' : 'time-outline',
            alerts: isActive ? 'notifications' : 'notifications-outline',
            users: isActive ? 'people' : 'people-outline',
            reports: isActive ? 'stats-chart' : 'stats-chart-outline',
            settings: isActive ? 'settings' : 'settings-outline',
        };
        const iconKey = iconMap[iconName] || (isActive ? 'apps' : 'apps-outline');
        return (
            <Ionicons
                name={iconKey}
                size={22}
                color={isActive ? colors.primary : colors.textMuted}
            />
        );
    };

    return (
        <View
            style={[
                styles.container,
                { paddingBottom: Platform.OS === 'web' ? 8 : Math.max(insets.bottom, 8) },
            ]}
        >
            {items.map((item) => {
                const isActive = activeKey === item.key;
                return (
                    <TouchableOpacity
                        key={item.key}
                        style={[
                            styles.navItem,
                            isActive && styles.navItemActive,
                        ]}
                        onPress={() => onNavigate(item.key)}
                        activeOpacity={0.7}
                    >
                        {getIcon(item.icon, isActive)}
                        <Text
                            style={[
                                styles.label,
                                isActive ? styles.labelActive : styles.labelInactive,
                            ]}
                            numberOfLines={1}
                        >
                            {item.label}
                        </Text>
                        {isActive && <View style={styles.activeIndicator} />}
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.divider,
        paddingTop: 8,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 8,
    },
    navItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 6,
        position: 'relative',
    },
    navItemActive: {
        backgroundColor: 'rgba(25, 118, 210, 0.08)',
        borderRadius: 8,
        marginHorizontal: 4,
    },
    label: {
        fontSize: 11,
        marginTop: 4,
        fontWeight: '500',
        textAlign: 'center',
    },
    labelActive: {
        color: colors.primary,
        fontWeight: '600',
    },
    labelInactive: {
        color: colors.textMuted,
    },
    activeIndicator: {
        position: 'absolute',
        bottom: 0,
        width: 24,
        height: 3,
        backgroundColor: colors.primary,
        borderRadius: 2,
    },
});

export default BottomNavigation;
