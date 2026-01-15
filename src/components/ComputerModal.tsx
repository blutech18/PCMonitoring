import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import Modal from './common/Modal';
import Input from './common/Input';
import Button from './common/Button';
import { Computer } from '../models/types';
import colors from '../constants/colors';
import { validateComputerName, validateIP } from '../utils/validation';

interface ComputerModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (computer: Omit<Computer, 'id'> | Computer) => Promise<void>;
    computer?: Computer | null;
}

type ComputerStatus = 'online' | 'offline' | 'maintenance';

const ComputerModal: React.FC<ComputerModalProps> = ({ visible, onClose, onSave, computer }) => {
    const [name, setName] = useState('');
    const [ipAddress, setIpAddress] = useState('');
    const [status, setStatus] = useState<ComputerStatus>('offline');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ name?: string; ip?: string }>({});

    const isEditing = !!computer;

    useEffect(() => {
        if (computer) {
            setName(computer.name);
            setIpAddress(computer.ipAddress);
            setStatus(computer.status);
        } else {
            resetForm();
        }
    }, [computer, visible]);

    const resetForm = () => {
        setName('');
        setIpAddress('');
        setStatus('offline');
        setErrors({});
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const validate = (): boolean => {
        const newErrors: { name?: string; ip?: string } = {};

        const nameValidation = validateComputerName(name);
        if (!nameValidation.isValid) {
            newErrors.name = nameValidation.error;
        }

        const ipValidation = validateIP(ipAddress);
        if (!ipValidation.isValid) {
            newErrors.ip = ipValidation.error;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        setLoading(true);
        try {
            const computerData = {
                ...(isEditing && computer ? { id: computer.id } : {}),
                name: name.trim(),
                ipAddress: ipAddress.trim(),
                status,
                lastSeen: new Date().toISOString(),
            };
            await onSave(computerData as Computer);
            handleClose();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to save computer';
            Alert.alert('Error', message);
        } finally {
            setLoading(false);
        }
    };

    const statusOptions: { value: ComputerStatus; label: string; color: string }[] = [
        { value: 'online', label: 'Online', color: colors.success },
        { value: 'offline', label: 'Offline', color: colors.textMuted },
        { value: 'maintenance', label: 'Maintenance', color: colors.warning },
    ];

    return (
        <Modal
            visible={visible}
            onClose={handleClose}
            title={isEditing ? 'Edit Computer' : 'Add Computer'}
        >
            <View style={styles.container}>
                <Input
                    label="Computer Name"
                    placeholder="e.g., PC-001 - Reception"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="none"
                    error={errors.name}
                />

                <Input
                    label="IP Address"
                    placeholder="e.g., 192.168.1.100"
                    value={ipAddress}
                    onChangeText={setIpAddress}
                    autoCapitalize="none"
                    keyboardType="numeric"
                    error={errors.ip}
                />

                <Text style={styles.label}>Status</Text>
                <View style={styles.statusContainer}>
                    {statusOptions.map((option) => (
                        <TouchableOpacity
                            key={option.value}
                            style={[
                                styles.statusOption,
                                status === option.value && styles.statusOptionActive,
                                status === option.value && { borderColor: option.color },
                            ]}
                            onPress={() => setStatus(option.value)}
                        >
                            <View
                                style={[
                                    styles.statusDot,
                                    { backgroundColor: option.color },
                                ]}
                            />
                            <Text
                                style={[
                                    styles.statusText,
                                    status === option.value && styles.statusTextActive,
                                ]}
                            >
                                {option.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.buttons}>
                    <Button
                        title="Cancel"
                        onPress={handleClose}
                        variant="outline"
                        style={styles.cancelButton}
                    />
                    <Button
                        title={isEditing ? 'Save Changes' : 'Add Computer'}
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
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.textSecondary,
        marginBottom: 8,
    },
    statusContainer: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 20,
    },
    statusOption: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: colors.border,
        backgroundColor: colors.background,
        gap: 6,
    },
    statusOptionActive: {
        backgroundColor: colors.surface,
        borderWidth: 2,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '500',
        color: colors.textSecondary,
    },
    statusTextActive: {
        color: colors.textPrimary,
        fontWeight: '600',
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

export default ComputerModal;
