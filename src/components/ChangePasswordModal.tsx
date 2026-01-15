import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import Modal from './common/Modal';
import Input from './common/Input';
import Button from './common/Button';
import authService from '../services/authService';
import { validatePassword } from '../utils/validation';

interface ChangePasswordModalProps {
    visible: boolean;
    onClose: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ visible, onClose }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ current?: string; new?: string; confirm?: string }>({});

    const resetForm = () => {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setErrors({});
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const validate = (): boolean => {
        const newErrors: { current?: string; new?: string; confirm?: string } = {};

        if (!currentPassword.trim()) {
            newErrors.current = 'Current password is required';
        }

        const passwordValidation = validatePassword(newPassword);
        if (!passwordValidation.isValid) {
            newErrors.new = passwordValidation.error;
        }

        if (!confirmPassword.trim()) {
            newErrors.confirm = 'Please confirm your new password';
        } else if (newPassword !== confirmPassword) {
            newErrors.confirm = 'Passwords do not match';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        setLoading(true);
        try {
            await authService.changePassword(currentPassword, newPassword);
            Alert.alert('Success', 'Your password has been changed successfully', [
                { text: 'OK', onPress: handleClose },
            ]);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to change password';
            Alert.alert('Error', message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} onClose={handleClose} title="Change Password">
            <View style={styles.container}>
                <Input
                    label="Current Password"
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    error={errors.current}
                />

                <Input
                    label="New Password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    error={errors.new}
                />

                <Input
                    label="Confirm New Password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    error={errors.confirm}
                />

                <View style={styles.buttons}>
                    <Button
                        title="Cancel"
                        onPress={handleClose}
                        variant="outline"
                        style={styles.cancelButton}
                    />
                    <Button
                        title="Change Password"
                        onPress={handleSubmit}
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
    buttons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    cancelButton: {
        flex: 1,
    },
    submitButton: {
        flex: 1,
    },
});

export default ChangePasswordModal;
