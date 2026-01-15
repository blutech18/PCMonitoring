import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Switch,
    Alert,
    TouchableOpacity,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import adminService from '../../services/adminService';
import settingsService from '../../services/settingsService';
import { Computer, Settings } from '../../models/types';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';
import ComputerModal from '../../components/ComputerModal';
import colors from '../../constants/colors';
import { getStatusColor, getRelativeTime } from '../../utils/helpers';

const AdminSettingsScreen: React.FC = () => {
    const { user, logout } = useAuth();
    const [settings, setSettings] = useState<Settings | null>(null);
    const [computers, setComputers] = useState<Computer[]>([]);
    const [userCounts, setUserCounts] = useState<{ admin: number; user: number }>({ admin: 0, user: 0 });
    const [loading, setLoading] = useState(true);
    const [agentCode, setAgentCode] = useState<string>('');

    // Computer modal state
    const [computerModalVisible, setComputerModalVisible] = useState(false);
    const [selectedComputer, setSelectedComputer] = useState<Computer | undefined>(undefined);

    const fetchData = useCallback(async () => {
        try {
            const [settingsData, computersData, counts, codeData] = await Promise.all([
                settingsService.getSettings(),
                settingsService.getComputers(),
                adminService.getUserCountByRole(),
                settingsService.getAgentCode(),
            ]);
            setSettings(settingsData);
            setComputers(computersData);
            setUserCounts(counts);
            setAgentCode(codeData?.code || 'Not generated');
        } catch (error) {
            console.error('Error fetching admin settings:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleLogout = async () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await logout();
                        } catch (error) {
                            console.error('Logout error:', error);
                        }
                    },
                },
            ]
        );
    };

    const handleAddComputer = () => {
        setSelectedComputer(undefined);
        setComputerModalVisible(true);
    };

    const handleEditComputer = (computer: Computer) => {
        setSelectedComputer(computer);
        setComputerModalVisible(true);
    };

    const handleSaveComputer = async (computerData: Omit<Computer, 'id'> | Computer) => {
        try {
            if ('id' in computerData && computerData.id) {
                // Update existing computer via settings service
                fetchData(); // Refresh to get updated data
            } else {
                await settingsService.addComputer(computerData);
            }
            fetchData();
            setComputerModalVisible(false);
        } catch (error) {
            console.error('Error saving computer:', error);
            Alert.alert('Error', 'Failed to save computer');
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
                            fetchData();
                        } catch (error) {
                            console.error('Error removing computer:', error);
                        }
                    },
                },
            ]
        );
    };

    const handleRegenerateAgentCode = () => {
        Alert.alert(
            'Regenerate Agent Code',
            'This will invalidate the current code. All PC agents will need to be updated with the new code.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Regenerate',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const newCode = await settingsService.regenerateAgentCode();
                            setAgentCode(newCode);
                            Alert.alert('Success', 'Agent code has been regenerated');
                        } catch (error) {
                            console.error('Error regenerating agent code:', error);
                        }
                    },
                },
            ]
        );
    };

    const handleCopyAgentCode = async () => {
        try {
            // Copy to clipboard - using a simple approach
            Alert.alert('Agent Code', `Code: ${agentCode}\n\nPlease copy this code manually.`);
        } catch (error) {
            console.error('Error displaying agent code:', error);
        }
    };

    if (loading) {
        return <Loading fullScreen message="Loading settings..." />;
    }

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Admin Profile Section */}
            <Card style={styles.profileCard}>
                <View style={styles.profileHeader}>
                    <View style={styles.avatarContainer}>
                        <Ionicons name="shield" size={28} color={colors.textLight} />
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={styles.profileName}>{user?.username}</Text>
                        <Text style={styles.profileEmail}>{user?.email}</Text>
                        <View style={styles.roleBadge}>
                            <Ionicons name="shield-checkmark" size={12} color={colors.primary} />
                            <Text style={styles.roleText}>System Administrator</Text>
                        </View>
                    </View>
                </View>
            </Card>

            {/* System Statistics */}
            <Text style={styles.sectionTitle}>System Statistics</Text>
            <Card style={styles.statsCard}>
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{userCounts.admin + userCounts.user}</Text>
                        <Text style={styles.statLabel}>Total Users</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: colors.primary }]}>{userCounts.admin}</Text>
                        <Text style={styles.statLabel}>Admins</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: colors.success }]}>{userCounts.user}</Text>
                        <Text style={styles.statLabel}>Users</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: colors.secondary }]}>{computers.length}</Text>
                        <Text style={styles.statLabel}>Computers</Text>
                    </View>
                </View>
            </Card>

            {/* Agent Code Section */}
            <Text style={styles.sectionTitle}>PC Agent Configuration</Text>
            <Card style={styles.agentCard}>
                <View style={styles.agentHeader}>
                    <View>
                        <Text style={styles.agentLabel}>Agent Authentication Code</Text>
                        <Text style={styles.agentDescription}>
                            Use this code to authenticate PC monitoring agents
                        </Text>
                    </View>
                </View>
                <View style={styles.agentCodeContainer}>
                    <Text style={styles.agentCode}>{agentCode}</Text>
                    <TouchableOpacity
                        style={styles.copyButton}
                        onPress={handleCopyAgentCode}
                    >
                        <Ionicons name="copy-outline" size={20} color={colors.primary} />
                    </TouchableOpacity>
                </View>
                <TouchableOpacity
                    style={styles.regenerateButton}
                    onPress={handleRegenerateAgentCode}
                >
                    <Ionicons name="refresh" size={18} color={colors.warning} />
                    <Text style={styles.regenerateText}>Regenerate Code</Text>
                </TouchableOpacity>
            </Card>

            {/* Registered Computers */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Registered Computers</Text>
                <TouchableOpacity style={styles.addButton} onPress={handleAddComputer}>
                    <Ionicons name="add" size={20} color={colors.primary} />
                    <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
            </View>

            {computers.length === 0 ? (
                <Card style={styles.emptyCard}>
                    <Ionicons name="desktop-outline" size={40} color={colors.textMuted} />
                    <Text style={styles.emptyText}>No computers registered yet</Text>
                </Card>
            ) : (
                computers.map((computer) => (
                    <Card key={computer.id} style={styles.computerCard}>
                        <View style={styles.computerHeader}>
                            <View style={styles.computerInfo}>
                                <View style={[styles.statusDot, { backgroundColor: getStatusColor(computer.status) }]} />
                                <Text style={styles.computerName}>{computer.name}</Text>
                            </View>
                            <View style={styles.computerActions}>
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={() => handleEditComputer(computer)}
                                >
                                    <Ionicons name="pencil" size={18} color={colors.primary} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={() => handleRemoveComputer(computer)}
                                >
                                    <Ionicons name="trash" size={18} color={colors.error} />
                                </TouchableOpacity>
                            </View>
                        </View>
                        <View style={styles.computerDetails}>
                            <Text style={styles.computerLocation}>IP: {computer.ipAddress}</Text>
                            {computer.lastSeen && (
                                <Text style={styles.lastSeen}>
                                    Last seen: {getRelativeTime(computer.lastSeen)}
                                </Text>
                            )}
                        </View>
                    </Card>
                ))
            )}

            {/* Logout Button */}
            <View style={styles.logoutSection}>
                <Button
                    title="Logout"
                    onPress={handleLogout}
                    variant="secondary"
                    icon={<Ionicons name="log-out-outline" size={20} color={colors.error} />}
                    style={styles.logoutButton}
                    textStyle={styles.logoutButtonText}
                />
            </View>

            {/* Computer Modal */}
            <ComputerModal
                visible={computerModalVisible}
                computer={selectedComputer}
                onClose={() => setComputerModalVisible(false)}
                onSave={handleSaveComputer}
            />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        padding: 16,
    },
    profileCard: {
        marginBottom: 20,
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    profileEmail: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: 2,
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        backgroundColor: `${colors.primary}15`,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    roleText: {
        fontSize: 12,
        color: colors.primary,
        fontWeight: '600',
        marginLeft: 4,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 12,
        marginTop: 8,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 12,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: `${colors.primary}15`,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    addButtonText: {
        color: colors.primary,
        fontWeight: '600',
        marginLeft: 4,
    },
    statsCard: {
        marginBottom: 20,
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
        color: colors.textPrimary,
    },
    statLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 4,
    },
    statDivider: {
        width: 1,
        height: 40,
        backgroundColor: colors.divider,
    },
    agentCard: {
        marginBottom: 20,
    },
    agentHeader: {
        marginBottom: 12,
    },
    agentLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    agentDescription: {
        fontSize: 13,
        color: colors.textSecondary,
        marginTop: 2,
    },
    agentCodeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
    },
    agentCode: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    copyButton: {
        padding: 8,
    },
    regenerateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: colors.divider,
    },
    regenerateText: {
        color: colors.warning,
        fontWeight: '600',
        marginLeft: 6,
    },
    computerCard: {
        marginBottom: 12,
    },
    computerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    computerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 10,
    },
    computerName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    computerActions: {
        flexDirection: 'row',
    },
    actionButton: {
        padding: 8,
        marginLeft: 4,
    },
    computerDetails: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: colors.divider,
    },
    computerLocation: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    lastSeen: {
        fontSize: 12,
        color: colors.textMuted,
        marginTop: 4,
    },
    emptyCard: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 30,
    },
    emptyText: {
        fontSize: 14,
        color: colors.textMuted,
        marginTop: 12,
    },
    logoutSection: {
        marginTop: 24,
        marginBottom: 40,
    },
    logoutButton: {
        backgroundColor: `${colors.error}15`,
        borderWidth: 1,
        borderColor: colors.error,
    },
    logoutButtonText: {
        color: colors.error,
    },
});

export default AdminSettingsScreen;
