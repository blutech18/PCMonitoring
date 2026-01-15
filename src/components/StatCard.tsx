import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from './common/Card';
import colors from '../constants/colors';

interface StatCardProps {
    title: string;
    value: string | number;
    icon?: React.ReactNode;
    color?: string;
    subtitle?: string;
}

const StatCard: React.FC<StatCardProps> = ({
    title,
    value,
    icon,
    color = colors.primary,
    subtitle,
}) => {
    return (
        <Card style={styles.card}>
            <View style={styles.content}>
                {icon && (
                    <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
                        {icon}
                    </View>
                )}
                <View style={styles.textContainer}>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={[styles.value, { color }]}>{value}</Text>
                    {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
                </View>
            </View>
        </Card>
    );
};

const styles = StyleSheet.create({
    card: {
        flex: 1,
        minWidth: '45%',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 13,
        color: colors.textSecondary,
        marginBottom: 4,
    },
    value: {
        fontSize: 24,
        fontWeight: '700',
    },
    subtitle: {
        fontSize: 11,
        color: colors.textMuted,
        marginTop: 2,
    },
});

export default StatCard;
