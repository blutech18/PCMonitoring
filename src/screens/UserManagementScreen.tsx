import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    Alert,
    Modal,
    TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import adminService from '../services/adminService';
import { User, UserRole } from '../models/types';
import Card from '../components/common/Card';
import Loading from '../components/common/Loading';
import Button from '../components/common/Button';
import colors from '../constants/colors';
import { ref, update } from 'firebase/database';
import { database } from '../services/firebase';

const UserManagementScreen: React.FC = () => {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editRole, setEditRole] = useState<UserRole>('user');
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchUsers = useCallback(async () => {
        try {
            const data = await adminService.getAllUsers();
            setUsers(data);
        } catch (error) {
            console.error('Error fetching users:', error);
            Alert.alert('Error', 'Failed to load users');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchUsers();
    }, [fetchUsers]);

    const handleEditUser = (user: User) => {
        setSelectedUser(user);
        setEditRole(user.role);
        setShowEditModal(true);
    };

    const handleSaveRole = async () => {
        if (!selectedUser) return;

        setSaving(true);
        try {
            const userRef = ref(database, `users/${selectedUser.id}`);
            await update(userRef, { role: editRole });
            
            // Update local state
            setUsers(prev => prev.map(u => 
                u.id === selectedUser.id ? { ...u, role: editRole } : u
            ));
            
            setShowEditModal(false);
            Alert.alert('Success', `User role updated to ${editRole}`);
        } catch (error) {
            console.error('Error updating user role:', error);
            Alert.alert('Error', 'Failed to update user role');
        } finally {
            setSaving(false);
        }
    };

    const filteredUsers = users.filter(user => 
        user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const adminCount = users.filter(u => u.role === 'admin').length;
    const userCount = users.filter(u => u.role === 'user').length;

    if (loading) {
        return <Loading fullScreen message="Loading users..." />;
    }

    const renderUserItem = ({ item }: { item: User }) => {
        const isCurrentUser = item.id === currentUser?.id;
        
        return (
            <TouchableOpacity
                style={styles.userCard}
                onPress={() => handleEditUser(item)}
                disabled={isCurrentUser}
            >
                <View style={styles.userAvatar}>
                    <Text style={styles.avatarText}>
                        {(item.username || 'U')[0].toUpperCase()}
                    </Text>
                </View>
                <View style={styles.userInfo}>
                    <View style={styles.userNameRow}>
                        <Text style={styles.userName}>{item.username || 'Unknown'}</Text>
                        {isCurrentUser && (
                            <View style={styles.youBadge}>
                                <Text style={styles.youBadgeText}>You</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.userEmail}>{item.email || 'No email'}</Text>
                </View>
                <View style={[
                    styles.roleBadge,
                    item.role === 'admin' ? styles.adminBadge : styles.userBadge
                ]}>
                    <Text style={[
                        styles.roleText,
                        item.role === 'admin' ? styles.adminText : styles.userText
                    ]}>
                        {item.role?.toUpperCase()}
                    </Text>
                </View>
                {!isCurrentUser && (
                    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                )}
            </TouchableOpacity>
        );
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{users.length}</Text>
                    <Text style={styles.statLabel}>Total Users</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: colors.primary }]}>{adminCount}</Text>
                    <Text style={styles.statLabel}>Admins</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: colors.success }]}>{userCount}</Text>
                    <Text style={styles.statLabel}>Users</Text>
                </View>
            </View>
            
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search users..."
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
        </View>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Users Found</Text>
            <Text style={styles.emptyText}>
                {searchQuery ? 'Try a different search term' : 'No users in the system yet'}
            </Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={filteredUsers}
                keyExtractor={(item) => item.id}
                renderItem={renderUserItem}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmptyState}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                showsVerticalScrollIndicator={false}
            />

            {/* Edit User Modal */}
            <Modal
                visible={showEditModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowEditModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Edit User Role</Text>
                        
                        <View style={styles.modalUserInfo}>
                            <View style={styles.modalAvatar}>
                                <Text style={styles.modalAvatarText}>
                                    {(selectedUser?.username || 'U')[0].toUpperCase()}
                                </Text>
                            </View>
                            <View>
                                <Text style={styles.modalUserName}>{selectedUser?.username}</Text>
                                <Text style={styles.modalUserEmail}>{selectedUser?.email}</Text>
                            </View>
                        </View>

                        <Text style={styles.roleLabel}>Select Role:</Text>
                        <View style={styles.roleOptions}>
                            <TouchableOpacity
                                style={[
                                    styles.roleOption,
                                    editRole === 'admin' && styles.roleOptionSelected
                                ]}
                                onPress={() => setEditRole('admin')}
                            >
                                <Ionicons 
                                    name={editRole === 'admin' ? 'radio-button-on' : 'radio-button-off'} 
                                    size={24} 
                                    color={editRole === 'admin' ? colors.primary : colors.textMuted} 
                                />
                                <View style={styles.roleOptionContent}>
                                    <Text style={styles.roleOptionTitle}>Admin</Text>
                                    <Text style={styles.roleOptionDesc}>Full system access</Text>
                                </View>
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                                style={[
                                    styles.roleOption,
                                    editRole === 'user' && styles.roleOptionSelected
                                ]}
                                onPress={() => setEditRole('user')}
                            >
                                <Ionicons 
                                    name={editRole === 'user' ? 'radio-button-on' : 'radio-button-off'} 
                                    size={24} 
                                    color={editRole === 'user' ? colors.primary : colors.textMuted} 
                                />
                                <View style={styles.roleOptionContent}>
                                    <Text style={styles.roleOptionTitle}>User</Text>
                                    <Text style={styles.roleOptionDesc}>Personal PC monitoring only</Text>
                                </View>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalActions}>
                            <Button
                                title="Cancel"
                                onPress={() => setShowEditModal(false)}
                                variant="outline"
                                style={styles.modalButton}
                            />
                            <Button
                                title="Save"
                                onPress={handleSaveRole}
                                loading={saving}
                                style={styles.modalButton}
                            />
                        </View>
                    </View>
                </View>
            </Modal>
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
    header: {
        padding: 16,
    },
    statsContainer: {
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
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
        backgroundColor: colors.divider,
        marginHorizontal: 8,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: colors.textPrimary,
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        marginHorizontal: 16,
        marginVertical: 4,
        padding: 14,
        borderRadius: 12,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    userAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textLight,
    },
    userInfo: {
        flex: 1,
    },
    userNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    youBadge: {
        backgroundColor: colors.primary,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
    },
    youBadgeText: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.textLight,
    },
    userEmail: {
        fontSize: 13,
        color: colors.textSecondary,
        marginTop: 2,
    },
    roleBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
        marginRight: 8,
    },
    adminBadge: {
        backgroundColor: `${colors.primary}20`,
    },
    userBadge: {
        backgroundColor: `${colors.success}20`,
    },
    roleText: {
        fontSize: 11,
        fontWeight: '700',
    },
    adminText: {
        color: colors.primary,
    },
    userText: {
        color: colors.success,
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
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 20,
        textAlign: 'center',
    },
    modalUserInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        padding: 12,
        backgroundColor: colors.background,
        borderRadius: 10,
    },
    modalAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    modalAvatarText: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.textLight,
    },
    modalUserName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    modalUserEmail: {
        fontSize: 13,
        color: colors.textSecondary,
        marginTop: 2,
    },
    roleLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: 12,
    },
    roleOptions: {
        marginBottom: 24,
    },
    roleOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.divider,
        marginBottom: 10,
    },
    roleOptionSelected: {
        borderColor: colors.primary,
        backgroundColor: `${colors.primary}08`,
    },
    roleOptionContent: {
        marginLeft: 12,
    },
    roleOptionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    roleOptionDesc: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    modalButton: {
        flex: 1,
        marginHorizontal: 6,
    },
});

export default UserManagementScreen;
