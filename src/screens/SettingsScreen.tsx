import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Switch,
    Alert,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import settingsService from '../services/settingsService';
import commandService from '../services/commandService';

import { Settings, Computer } from '../models/types';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Loading from '../components/common/Loading';
import ChangePasswordModal from '../components/ChangePasswordModal';
import ComputerModal from '../components/ComputerModal';
import NotificationPreferencesModal from '../components/NotificationPreferencesModal';
import colors from '../constants/colors';
import { getStatusColor, getRelativeTime } from '../utils/helpers';

const SettingsScreen: React.FC = () => {
    const { logout, user } = useAuth();
    const [settings, setSettings] = useState<Settings | null>(null);
    const [computers, setComputers] = useState<Computer[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [agentCode, setAgentCode] = useState<string | null>(null);
    const [regeneratingCode, setRegeneratingCode] = useState(false);



    // Modal states
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showComputerModal, setShowComputerModal] = useState(false);
    const [showNotificationPrefsModal, setShowNotificationPrefsModal] = useState(false);
    const [selectedComputer, setSelectedComputer] = useState<Computer | null>(null);
    const [sendingStartTo, setSendingStartTo] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            const [settingsData, computersData, agentCodeData] = await Promise.all([
                settingsService.getSettings(),
                settingsService.getComputers(),
                settingsService.getAgentCode(),
            ]);
            setSettings(settingsData);
            setComputers(computersData);
            setAgentCode(agentCodeData?.code || null);
        } catch (error) {
            console.error('Error fetching settings:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        // Poll for computer status updates every 10 seconds
        const interval = setInterval(() => {
            settingsService.getComputers().then(setComputers).catch(console.error);
        }, 10000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const handleToggleAutoLogout = async (value: boolean) => {
        if (!settings) return;

        setSaving(true);
        try {
            const updated = await settingsService.updateSettings({ autoLogoutEnabled: value });
            setSettings(updated);
        } catch (error) {
            Alert.alert('Error', 'Failed to update setting');
        } finally {
            setSaving(false);
        }
    };

    const handleTimeLimit = (change: number) => {
        if (!settings) return;

        const newLimit = settings.sessionTimeLimit + change;
        if (newLimit < 30 || newLimit > 480) return;

        setSettings({ ...settings, sessionTimeLimit: newLimit });
    };

    const handleSaveTimeLimit = async () => {
        if (!settings) return;

        setSaving(true);
        try {
            await settingsService.updateSettings({ sessionTimeLimit: settings.sessionTimeLimit });
            Alert.alert('Success', 'Settings saved successfully');
        } catch (error) {
            Alert.alert('Error', 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = () => {
        Alert.alert(
            'Confirm Logout',
            'Are you sure you want to log out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: logout,
                },
            ]
        );
    };

    const handleAddComputer = () => {
        setSelectedComputer(null);
        setShowComputerModal(true);
    };

    const handleEditComputer = (computer: Computer) => {
        setSelectedComputer(computer);
        setShowComputerModal(true);
    };

    const handleSaveComputer = async (computerData: Omit<Computer, 'id'> | Computer) => {
        try {
            if ('id' in computerData && computerData.id) {
                // Update existing computer
                await settingsService.updateComputerStatus(computerData.id, computerData.status);
                setComputers((prev) =>
                    prev.map((c) =>
                        c.id === computerData.id
                            ? { ...c, ...computerData }
                            : c
                    )
                );
                Alert.alert('Success', 'Computer updated successfully');
            } else {
                // Add new computer
                const newId = await settingsService.addComputer({
                    name: computerData.name,
                    ipAddress: computerData.ipAddress,
                    status: computerData.status,
                    lastSeen: new Date().toISOString(),
                });
                setComputers((prev) => [
                    ...prev,
                    { ...computerData, id: newId } as Computer,
                ]);
                Alert.alert('Success', 'Computer added successfully');
            }
        } catch (error) {
            throw error;
        }
    };

    const handleRemoveComputer = (computer: Computer) => {
        Alert.alert(
            'Remove Computer',
            `Are you sure you want to remove "${computer.name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await settingsService.removeComputer(computer.id);
                            setComputers((prev) => prev.filter((c) => c.id !== computer.id));
                            Alert.alert('Success', 'Computer removed successfully');
                        } catch (error) {
                            Alert.alert('Error', 'Failed to remove computer');
                        }
                    },
                },
            ]
        );
    };

    const handleStartMonitoring = async (computer: Computer) => {
        setSendingStartTo(computer.id);
        try {
            const ok = await commandService.sendStartCommand(computer.id, computer.name);
            if (ok) {
                Alert.alert('Success', `Start command sent to ${computer.name}. The agent will resume monitoring when it receives it.`);
            } else {
                Alert.alert('Error', 'Failed to send start command');
            }
        } catch (error) {
            console.error('Start monitoring failed', error);
            Alert.alert('Error', 'Failed to send start command');
        } finally {
            setSendingStartTo(null);
        }
    };

    const handleRegenerateAgentCode = async () => {
        setRegeneratingCode(true);
        try {
            const newCode = await settingsService.regenerateAgentCode();
            setAgentCode(newCode);
            Alert.alert('Success', `New agent linking code generated: ${newCode}`);
        } catch (error) {
            console.error('Regenerate error:', error);
            Alert.alert('Error', 'Failed to regenerate code. Check console for details.');
        } finally {
            setRegeneratingCode(false);
        }
    };

    const handleCopyAgentCode = () => {
        if (agentCode) {
            // For web, use clipboard API
            if (typeof navigator !== 'undefined' && navigator.clipboard) {
                navigator.clipboard.writeText(agentCode);
                Alert.alert('Copied', 'Agent linking code copied to clipboard');
            } else {
                Alert.alert('Agent Code', `Your agent linking code is: ${agentCode}`);
            }
        }
    };


    if (loading) {
        return <Loading fullScreen message="Loading settings..." />;
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* User Profile */}
            <Card style={styles.profileCard}>
                <View style={styles.profileHeader}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>U</Text>
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={styles.username}>{user?.username || 'Admin'}</Text>
                        <Text style={styles.role}>{user?.role?.toUpperCase() || 'USER'}</Text>
                    </View>
                </View>
            </Card>

            {/* Session Settings */}
            <Text style={styles.sectionHeader}>Session Settings</Text>
            <Card>
                <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                        <Text style={styles.settingLabel}>Session Time Limit</Text>
                        <Text style={styles.settingDescription}>
                            Maximum allowed session duration
                        </Text>
                    </View>
                    <View style={styles.timeLimitControl}>
                        <TouchableOpacity
                            style={styles.adjustButton}
                            onPress={() => handleTimeLimit(-30)}
                        >
                            <Text style={styles.adjustButtonText}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.timeLimitValue}>
                            {settings?.sessionTimeLimit || 120} min
                        </Text>
                        <TouchableOpacity
                            style={styles.adjustButton}
                            onPress={() => handleTimeLimit(30)}
                        >
                            <Text style={styles.adjustButtonText}>+</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                        <Text style={styles.settingLabel}>Auto Logout</Text>
                        <Text style={styles.settingDescription}>
                            Automatically end sessions after time limit
                        </Text>
                    </View>
                    <Switch
                        value={settings?.autoLogoutEnabled || false}
                        onValueChange={handleToggleAutoLogout}
                        trackColor={{ false: colors.divider, true: `${colors.primary}80` }}
                        thumbColor={settings?.autoLogoutEnabled ? colors.primary : colors.textMuted}
                    />
                </View>

                <Button
                    title="Save Settings"
                    onPress={handleSaveTimeLimit}
                    loading={saving}
                    style={styles.saveButton}
                />
            </Card>

            {/* Connected Computers */}
            <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeader}>Connected Computers</Text>
                <TouchableOpacity style={styles.addButton} onPress={handleAddComputer}>
                    <Text style={styles.addButtonText}>+ Add</Text>
                </TouchableOpacity>
            </View>
            <Card>
                {computers.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>No computers configured</Text>
                        <Text style={styles.emptyStateSubtext}>Tap "Add" to add a computer</Text>
                    </View>
                ) : (
                    computers.map((computer, index) => (
                        <View
                            key={computer.id}
                            style={[
                                styles.computerItemWrapper,
                                index < computers.length - 1 && styles.computerItemBorder,
                            ]}
                        >
                            <TouchableOpacity
                                style={styles.computerItem}
                                onPress={() => handleEditComputer(computer)}
                                onLongPress={() => handleRemoveComputer(computer)}
                            >
                                <View style={styles.computerInfo}>
                                    <View style={styles.computerNameRow}>
                                        <View
                                            style={[
                                                styles.statusIndicator,
                                                { backgroundColor: getStatusColor(computer.status) },
                                            ]}
                                        />
                                        <Text style={styles.computerName}>{computer.name}</Text>
                                    </View>
                                    <Text style={styles.computerDetails}>
                                        {computer.ipAddress} • Last seen: {getRelativeTime(computer.lastSeen)}
                                    </Text>
                                </View>
                                <View style={styles.computerActions}>
                                    <View
                                        style={[
                                            styles.statusBadge,
                                            { backgroundColor: `${getStatusColor(computer.status)}20` },
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.statusText,
                                                { color: getStatusColor(computer.status) },
                                            ]}
                                        >
                                            {computer.status}
                                        </Text>
                                    </View>
                                    {computer.status === 'offline' && (
                                        <TouchableOpacity
                                            style={styles.startMonitoringBtn}
                                            onPress={(e) => {
                                                if (Platform.OS === 'web') e?.stopPropagation?.();
                                                handleStartMonitoring(computer);
                                            }}
                                            disabled={sendingStartTo === computer.id}
                                        >
                                            {sendingStartTo === computer.id ? (
                                                <ActivityIndicator size="small" color={colors.textLight} />
                                            ) : (
                                                <Text style={styles.startMonitoringBtnText}>Start Monitoring</Text>
                                            )}
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </TouchableOpacity>


                        </View>
                    ))
                )}
            </Card>

            {/* Agent Linking Code */}
            <Text style={styles.sectionHeader}>PC Agent Setup</Text>
            <Card>
                <View style={styles.agentCodeSection}>
                    <Text style={styles.agentCodeLabel}>Agent Linking Code</Text>
                    <Text style={styles.agentCodeDescription}>
                        Use this code to link PC monitoring agents to your account.
                    </Text>
                    <View style={styles.agentCodeContainer}>
                        <TouchableOpacity
                            style={styles.agentCodeBox}
                            onPress={handleCopyAgentCode}
                        >
                            <Text style={styles.agentCodeText}>
                                {agentCode || 'No code generated'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.copyButton}
                            onPress={handleCopyAgentCode}
                        >
                            <Text style={styles.copyButtonText}>Copy</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.setupInstructions}>
                        <Text style={styles.instructionsTitle}>📥 How to Install Agent:</Text>
                        <Text style={styles.instructionStep}>1. Download "PCMonitoringAgent.exe" to your PC</Text>
                        <Text style={styles.instructionStep}>2. Double-click to run the installer</Text>
                        <Text style={styles.instructionStep}>3. Enter the code above when prompted</Text>
                        <Text style={styles.instructionStep}>4. Click "Connect" - monitoring starts automatically!</Text>
                        <Text style={styles.instructionNote}>
                            💡 Just one .exe file - no installation or setup needed!
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={styles.regenerateButton}
                        onPress={handleRegenerateAgentCode}
                        disabled={regeneratingCode}
                    >
                        <Text style={styles.regenerateButtonText}>
                            {regeneratingCode ? 'Regenerating...' : 'Regenerate Code'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </Card>

            {/* Admin Section - Only visible to admins */}
            {user?.role === 'admin' && (
                <>
                    <Text style={styles.sectionHeader}>Administration</Text>
                    <Card>
                        <View style={styles.adminInfoRow}>
                            <View style={styles.adminInfoItem}>
                                <Text style={styles.adminInfoLabel}>Role</Text>
                                <Text style={styles.adminInfoValue}>System Administrator</Text>
                            </View>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.adminInfoRow}>
                            <Text style={styles.adminNote}>
                                As an admin, you have access to all user data, system-wide reports, and user management features.
                            </Text>
                        </View>
                    </Card>
                </>
            )}

            {/* Account Section */}
            <Text style={styles.sectionHeader}>Account</Text>
            <Card>
                <TouchableOpacity style={styles.menuItem} onPress={() => setShowPasswordModal(true)}>
                    <Text style={styles.menuItemText}>Change Password</Text>
                    <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
                <View style={styles.divider} />
                <TouchableOpacity style={styles.menuItem} onPress={() => setShowNotificationPrefsModal(true)}>
                    <Text style={styles.menuItemText}>Notification Preferences</Text>
                    <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
            </Card>

            {/* Logout Button */}
            <Button
                title="Log Out"
                onPress={handleLogout}
                variant="danger"
                style={styles.logoutButton}
                fullWidth
            />

            {/* Version Info */}
            <View style={styles.versionInfo}>
                <Text style={styles.versionText}>PC Monitoring Dashboard</Text>
                <Text style={styles.versionNumber}>Version 1.0.0</Text>
            </View>

            {/* Modals */}
            <ChangePasswordModal
                visible={showPasswordModal}
                onClose={() => setShowPasswordModal(false)}
            />

            <ComputerModal
                visible={showComputerModal}
                onClose={() => {
                    setShowComputerModal(false);
                    setSelectedComputer(null);
                }}
                onSave={handleSaveComputer}
                computer={selectedComputer}
            />

            <NotificationPreferencesModal
                visible={showNotificationPrefsModal}
                onClose={() => setShowNotificationPrefsModal(false)}
            />
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
        paddingBottom: 40,
    },
    profileCard: {
        marginBottom: 8,
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    avatarText: {
        fontSize: 28,
    },
    profileInfo: {
        flex: 1,
    },
    username: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    role: {
        fontSize: 13,
        color: colors.primary,
        fontWeight: '500',
        marginTop: 4,
    },
    sectionHeader: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textSecondary,
        marginTop: 20,
        marginBottom: 8,
        marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 8,
    },
    addButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: colors.primary,
        borderRadius: 6,
    },
    addButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textLight,
    },
    emptyState: {
        paddingVertical: 24,
        alignItems: 'center',
    },
    emptyStateText: {
        fontSize: 14,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    emptyStateSubtext: {
        fontSize: 12,
        color: colors.textMuted,
        marginTop: 4,
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
    },
    settingInfo: {
        flex: 1,
        marginRight: 16,
    },
    settingLabel: {
        fontSize: 15,
        fontWeight: '500',
        color: colors.textPrimary,
    },
    settingDescription: {
        fontSize: 13,
        color: colors.textSecondary,
        marginTop: 2,
    },
    timeLimitControl: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    adjustButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    adjustButtonText: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.primary,
    },
    timeLimitValue: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
        minWidth: 70,
        textAlign: 'center',
    },
    divider: {
        height: 1,
        backgroundColor: colors.divider,
        marginVertical: 4,
    },
    saveButton: {
        marginTop: 16,
    },
    computerItemWrapper: {
        paddingVertical: 12,
    },
    computerItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    computerItemBorder: {
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    computerInfo: {
        flex: 1,
    },
    computerNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    computerName: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.textPrimary,
    },
    computerDetails: {
        fontSize: 12,
        color: colors.textMuted,
        marginTop: 4,
        marginLeft: 16,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    computerActions: {
        alignItems: 'flex-end',
        flexDirection: 'row',
        gap: 8,
    },
    startMonitoringBtn: {
        backgroundColor: colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        minWidth: 100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    startMonitoringBtnText: {
        color: colors.textLight,
        fontSize: 12,
        fontWeight: '600',
    },
    menuItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
    },
    menuItemText: {
        fontSize: 15,
        color: colors.textPrimary,
    },
    chevron: {
        fontSize: 20,
        color: colors.textMuted,
    },
    logoutButton: {
        marginTop: 24,
    },
    versionInfo: {
        alignItems: 'center',
        marginTop: 24,
    },
    versionText: {
        fontSize: 12,
        color: colors.textMuted,
    },
    versionNumber: {
        fontSize: 11,
        color: colors.textMuted,
        marginTop: 2,
    },
    agentCodeSection: {
        paddingVertical: 8,
    },
    agentCodeLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 8,
    },
    agentCodeDescription: {
        fontSize: 13,
        color: colors.textSecondary,
        marginBottom: 16,
        lineHeight: 18,
    },
    agentCodeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    agentCodeBox: {
        flex: 1,
        backgroundColor: colors.background,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.divider,
    },
    agentCodeText: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.primary,
        letterSpacing: 2,
        textAlign: 'center',
        fontFamily: 'monospace',
    },
    copyButton: {
        backgroundColor: colors.primary,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    copyButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textLight,
    },
    regenerateButton: {
        marginTop: 12,
        alignItems: 'center',
    },
    regenerateButtonText: {
        fontSize: 13,
        color: colors.textSecondary,
        textDecorationLine: 'underline',
    },
    setupInstructions: {
        marginTop: 20,
        padding: 16,
        backgroundColor: colors.background,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: colors.primary,
    },
    instructionsTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 12,
    },
    instructionStep: {
        fontSize: 13,
        color: colors.textSecondary,
        marginBottom: 8,
        paddingLeft: 8,
    },
    instructionNote: {
        fontSize: 12,
        color: colors.primary,
        marginTop: 8,
        fontStyle: 'italic',
    },
    adminInfoRow: {
        paddingVertical: 12,
    },
    adminInfoItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    adminInfoLabel: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    adminInfoValue: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.primary,
    },
    adminNote: {
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 20,
    },
});

export default SettingsScreen;
