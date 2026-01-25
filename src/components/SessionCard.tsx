import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import Card from './common/Card';
import colors from '../constants/colors';
import { ActiveSession } from '../models/types';
import { formatElapsedTime, getStatusColor } from '../utils/helpers';
import commandService from '../services/commandService';

interface SessionCardProps {
    session: ActiveSession;
    onPress?: () => void;
}

const SessionCard: React.FC<SessionCardProps> = ({ session, onPress }) => {
    const [elapsedTime, setElapsedTime] = useState(
        formatElapsedTime(session.startTime, session.pausedAt)
    );
    const [isSending, setIsSending] = useState(false);

    // Update elapsed time every second (but freeze if paused)
    useEffect(() => {
        const interval = setInterval(() => {
            // If paused, calculate time from startTime to pausedAt (frozen)
            // If active, calculate time from startTime to now (live)
            setElapsedTime(formatElapsedTime(session.startTime, session.pausedAt));
        }, 1000);

        return () => clearInterval(interval);
    }, [session.startTime, session.pausedAt]);

    const statusColor = getStatusColor(session.status);

    const isPaused = session.status === 'paused';

    const handleStopMonitoring = async (event?: any) => {
        event?.stopPropagation?.();
        event?.preventDefault?.();

        setIsSending(true);
        try {
            const targetUser = session.ownerUserId;
            console.log('Stop monitoring - session:', {
                id: session.id,
                computerId: session.computerId,
                computerName: session.computerName,
                userId: session.userId,
                ownerUserId: session.ownerUserId,
                targetUser,
            });
            
            const success = await commandService.stopMonitoringNow(
                session.computerId,
                session.computerName,
                { targetUserId: targetUser, sessionId: session.id }
            );
            
            if (success) {
                Alert.alert('Success', 'Session paused.');
            } else {
                Alert.alert('Error', 'Failed to pause session.');
            }
        } catch (error) {
            console.error('Stop monitoring failed', error);
            Alert.alert('Error', `An error occurred: ${error}`);
        } finally {
            setIsSending(false);
        }
    };

    const handleStartMonitoring = async (event?: any) => {
        event?.stopPropagation?.();
        event?.preventDefault?.();

        setIsSending(true);
        try {
            const targetUser = session.ownerUserId;
            console.log('Start monitoring - session:', {
                id: session.id,
                computerId: session.computerId,
                computerName: session.computerName,
                userId: session.userId,
                ownerUserId: session.ownerUserId,
                targetUser,
            });
            
            const success = await commandService.startMonitoringNow(
                session.computerId,
                session.computerName,
                { targetUserId: targetUser, sessionId: session.id }
            );
            
            if (success) {
                Alert.alert('Success', 'Session resumed.');
            } else {
                Alert.alert('Error', 'Failed to resume session.');
            }
        } catch (error) {
            console.error('Start monitoring failed', error);
            Alert.alert('Error', `An error occurred: ${error}`);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
            <Card>
                <View style={styles.header}>
                    <View style={styles.computerInfo}>
                        <Text style={styles.computerName}>{session.computerName}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
                            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                            <Text style={[styles.statusText, { color: statusColor }]}>
                                {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                            </Text>
                        </View>
                    </View>
                    <Text style={styles.elapsedTime}>{elapsedTime}</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.details}>
                    <View style={styles.detailRow}>
                        <Text style={styles.label}>User:</Text>
                        <Text style={styles.value}>{session.userName}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.label}>Activity:</Text>
                        <Text style={styles.activityValue} numberOfLines={1}>
                            {session.currentActivity || 'No activity detected'}
                        </Text>
                    </View>
                </View>

                <View style={styles.divider} />

                {isPaused ? (
                    <TouchableOpacity
                        style={[styles.startButton, isSending && styles.buttonDisabled]}
                        onPress={handleStartMonitoring}
                        disabled={isSending}
                        activeOpacity={0.7}
                    >
                        {isSending ? (
                            <ActivityIndicator size="small" color={colors.textLight} />
                        ) : (
                            <Text style={styles.startButtonText}>▶ Start Monitoring</Text>
                        )}
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={[styles.stopButton, isSending && styles.buttonDisabled]}
                        onPress={handleStopMonitoring}
                        disabled={isSending}
                        activeOpacity={0.7}
                    >
                        {isSending ? (
                            <ActivityIndicator size="small" color={colors.textLight} />
                        ) : (
                            <Text style={styles.stopButtonText}>⏸ Pause</Text>
                        )}
                    </TouchableOpacity>
                )}
            </Card>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    computerInfo: {
        flex: 1,
    },
    computerName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 6,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '500',
    },
    elapsedTime: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.primary,
    },
    divider: {
        height: 1,
        backgroundColor: colors.divider,
        marginVertical: 12,
    },
    details: {
        gap: 6,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    label: {
        fontSize: 13,
        color: colors.textSecondary,
        width: 80,
    },
    value: {
        fontSize: 13,
        color: colors.textPrimary,
        fontWeight: '500',
        flex: 1,
    },
    activityValue: {
        fontSize: 13,
        color: colors.secondary,
        fontWeight: '500',
        flex: 1,
    },
    stopButton: {
        backgroundColor: colors.error,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    startButton: {
        backgroundColor: colors.success,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    stopButtonText: {
        color: colors.textLight,
        fontSize: 14,
        fontWeight: '600',
    },
    startButtonText: {
        color: colors.textLight,
        fontSize: 14,
        fontWeight: '600',
    },
});

export default SessionCard;
