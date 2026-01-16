import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Card from './common/Card';
import colors from '../constants/colors';
import { ActiveSession } from '../models/types';
import { formatElapsedTime, getStatusColor } from '../utils/helpers';

interface SessionCardProps {
    session: ActiveSession;
    onPress?: () => void;
}

const SessionCard: React.FC<SessionCardProps> = ({ session, onPress }) => {
    const [elapsedTime, setElapsedTime] = useState(formatElapsedTime(session.startTime));

    // Update elapsed time every second
    useEffect(() => {
        const interval = setInterval(() => {
            setElapsedTime(formatElapsedTime(session.startTime));
        }, 1000);

        return () => clearInterval(interval);
    }, [session.startTime]);

    const statusColor = getStatusColor(session.status);

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
        marginBottom: 12,
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
});

export default SessionCard;
