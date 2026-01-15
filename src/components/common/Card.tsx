import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import colors from '../../constants/colors';

interface CardProps {
    children: ReactNode;
    style?: ViewStyle;
    elevated?: boolean;
}

const Card: React.FC<CardProps> = ({ children, style, elevated = true }) => {
    return (
        <View style={[styles.card, elevated && styles.elevated, style]}>
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        marginVertical: 8,
        marginHorizontal: 4,
    },
    elevated: {
        shadowColor: colors.shadow,
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
});

export default Card;
