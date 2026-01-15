import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import sessionService from '../services/sessionService';
import { SessionDetail, RootStackParamList } from '../models/types';
import Card from '../components/common/Card';
import Loading from '../components/common/Loading';
import colors from '../constants/colors';
import { formatDateTime, formatDuration } from '../utils/helpers';

type SessionDetailsRouteProp = RouteProp<RootStackParamList, 'SessionDetails'>;

const SessionDetailsScreen: React.FC = () => {
    const route = useRoute<SessionDetailsRouteProp>();
    const { sessionId } = route.params;
    const [session, setSession] = useState<SessionDetail | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const data = await sessionService.getSessionDetails(sessionId);
                setSession(data);
            } catch (error) {
                console.error('Error fetching session details:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [sessionId]);

    if (loading) {
        return <Loading fullScreen message="Loading session details..." />;
    }

    if (!session) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Session not found</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* Overview Card */}
            <Card style={styles.overviewCard}>
                <Text style={styles.sectionTitle}>Session Overview</Text>

                <View style={styles.infoRow}>
                    <Text style={styles.label}>Computer</Text>
                    <Text style={styles.value}>{session.computerName}</Text>
                </View>

                <View style={styles.infoRow}>
                    <Text style={styles.label}>User</Text>
                    <Text style={styles.value}>{session.userName}</Text>
                </View>

                <View style={styles.infoRow}>
                    <Text style={styles.label}>Start Time</Text>
                    <Text style={styles.value}>{formatDateTime(session.startTime)}</Text>
                </View>

                <View style={styles.infoRow}>
                    <Text style={styles.label}>End Time</Text>
                    <Text style={styles.value}>{formatDateTime(session.endTime)}</Text>
                </View>

                <View style={styles.durationContainer}>
                    <Text style={styles.durationLabel}>Total Duration</Text>
                    <Text style={styles.durationValue}>{formatDuration(session.totalDuration)}</Text>
                </View>
            </Card>

            {/* Applications Accessed */}
            <Card>
                <Text style={styles.sectionTitle}>Applications Accessed</Text>

                {session.applicationsAccessed.length === 0 ? (
                    <Text style={styles.emptyText}>No applications recorded</Text>
                ) : (
                    session.applicationsAccessed.map((app, index) => (
                        <View key={index} style={styles.appItem}>
                            <View style={styles.appIcon}>
                                <MaterialCommunityIcons name="application" size={20} color={colors.primary} />
                            </View>
                            <View style={styles.appInfo}>
                                <Text style={styles.appName}>{app.name}</Text>
                                <Text style={styles.appDuration}>
                                    Used for {formatDuration(app.duration)}
                                </Text>
                            </View>
                        </View>
                    ))
                )}
            </Card>

            {/* Files Edited */}
            <Card style={styles.lastCard}>
                <Text style={styles.sectionTitle}>Files Edited</Text>

                {session.filesEdited.length === 0 ? (
                    <Text style={styles.emptyText}>No files edited during this session</Text>
                ) : (
                    session.filesEdited.map((file, index) => (
                        <View key={index} style={styles.fileItem}>
                            <View style={styles.fileIcon}>
                                <Ionicons name="document-text-outline" size={20} color={colors.secondary} />
                            </View>
                            <View style={styles.fileInfo}>
                                <Text style={styles.fileName}>{file.fileName}</Text>
                                <Text style={styles.filePath} numberOfLines={1}>
                                    {file.filePath}
                                </Text>
                                <Text style={styles.fileDetails}>
                                    Edited with {file.application}
                                </Text>
                            </View>
                        </View>
                    ))
                )}
            </Card>

            {/* Read-only Notice */}
            <View style={styles.notice}>
                <Ionicons name="lock-closed-outline" size={14} color={colors.textMuted} />
                <Text style={styles.noticeText}>
                    This is a read-only view of the session data
                </Text>
            </View>
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
        paddingBottom: 32,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        fontSize: 16,
        color: colors.error,
    },
    overviewCard: {
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 16,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    label: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    value: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.textPrimary,
    },
    durationContainer: {
        marginTop: 16,
        padding: 12,
        backgroundColor: `${colors.primary}10`,
        borderRadius: 8,
        alignItems: 'center',
    },
    durationLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 4,
    },
    durationValue: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.primary,
    },
    emptyText: {
        fontSize: 14,
        color: colors.textMuted,
        fontStyle: 'italic',
    },
    appItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    appIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    appInfo: {
        flex: 1,
    },
    appName: {
        fontSize: 15,
        fontWeight: '500',
        color: colors.textPrimary,
    },
    appDuration: {
        fontSize: 13,
        color: colors.textSecondary,
        marginTop: 2,
    },
    fileItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    fileIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    fileInfo: {
        flex: 1,
    },
    fileName: {
        fontSize: 15,
        fontWeight: '500',
        color: colors.textPrimary,
    },
    filePath: {
        fontSize: 12,
        color: colors.textMuted,
        marginTop: 2,
    },
    fileDetails: {
        fontSize: 13,
        color: colors.textSecondary,
        marginTop: 4,
    },
    lastCard: {
        marginBottom: 8,
    },
    notice: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 6,
    },
    noticeText: {
        fontSize: 12,
        color: colors.textMuted,
    },
});

export default SessionDetailsScreen;
