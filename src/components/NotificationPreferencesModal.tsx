import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, Alert } from 'react-native';
import Modal from './common/Modal';
import Button from './common/Button';
import colors from '../constants/colors';
import settingsService from '../services/settingsService';

interface NotificationPreferencesModalProps {
    visible: boolean;
    onClose: () => void;
}

interface NotificationPreferences {
    longUsageAlerts: boolean;
    systemIssueAlerts: boolean;
    networkIssueAlerts: boolean;
    dailySummary: boolean;
}

const NotificationPreferencesModal: React.FC<NotificationPreferencesModalProps> = ({
    visible,
    onClose,
}) => {
    const [preferences, setPreferences] = useState<NotificationPreferences>({
        longUsageAlerts: true,
        systemIssueAlerts: true,
        networkIssueAlerts: true,
        dailySummary: false,
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible) {
            loadPreferences();
        }
    }, [visible]);

    const loadPreferences = async () => {
        try {
            const settings = await settingsService.getSettings();
            if (settings && (settings as any).notificationPreferences) {
                setPreferences((settings as any).notificationPreferences);
            }
        } catch (error) {
            console.error('Error loading notification preferences:', error);
        }
    };

    const handleToggle = (key: keyof NotificationPreferences) => {
        setPreferences((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await settingsService.updateSettings({
                notificationPreferences: preferences,
            } as any);
            Alert.alert('Success', 'Notification preferences saved', [
                { text: 'OK', onPress: onClose },
            ]);
        } catch (error) {
            Alert.alert('Error', 'Failed to save preferences');
        } finally {
            setLoading(false);
        }
    };

    const preferenceItems = [
        {
            key: 'longUsageAlerts' as const,
            title: 'Long Usage Alerts',
            description: 'Get notified when sessions exceed time limits',
        },
        {
            key: 'systemIssueAlerts' as const,
            title: 'System Issue Alerts',
            description: 'Get notified about system problems',
        },
        {
            key: 'networkIssueAlerts' as const,
            title: 'Network Issue Alerts',
            description: 'Get notified about network connectivity issues',
        },
        {
            key: 'dailySummary' as const,
            title: 'Daily Summary',
            description: 'Receive a daily usage summary notification',
        },
    ];

    return (
        <Modal visible={visible} onClose={onClose} title="Notification Preferences">
            <View style={styles.container}>
                {preferenceItems.map((item, index) => (
                    <View
                        key={item.key}
                        style={[
                            styles.preferenceItem,
                            index < preferenceItems.length - 1 && styles.preferenceItemBorder,
                        ]}
                    >
                        <View style={styles.preferenceInfo}>
                            <Text style={styles.preferenceTitle}>{item.title}</Text>
                            <Text style={styles.preferenceDescription}>{item.description}</Text>
                        </View>
                        <Switch
                            value={preferences[item.key]}
                            onValueChange={() => handleToggle(item.key)}
                            trackColor={{ false: colors.divider, true: `${colors.primary}80` }}
                            thumbColor={preferences[item.key] ? colors.primary : colors.textMuted}
                        />
                    </View>
                ))}

                <View style={styles.buttons}>
                    <Button
                        title="Cancel"
                        onPress={onClose}
                        variant="outline"
                        style={styles.cancelButton}
                    />
                    <Button
                        title="Save Preferences"
                        onPress={handleSave}
                        loading={loading}
                        style={styles.submitButton}
                    />
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingBottom: 8,
    },
    preferenceItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
    },
    preferenceItemBorder: {
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    preferenceInfo: {
        flex: 1,
        marginRight: 12,
    },
    preferenceTitle: {
        fontSize: 15,
        fontWeight: '500',
        color: colors.textPrimary,
    },
    preferenceDescription: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
    },
    buttons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
    },
    cancelButton: {
        flex: 1,
    },
    submitButton: {
        flex: 1,
    },
});

export default NotificationPreferencesModal;
