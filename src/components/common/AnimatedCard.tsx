import React, { useRef, useEffect } from 'react';
import {
    Animated,
    StyleSheet,
    ViewStyle,
    Pressable,
    Platform,
} from 'react-native';
import { colors } from '../../constants/colors';

interface AnimatedCardProps {
    children: React.ReactNode;
    style?: ViewStyle;
    onPress?: () => void;
    delay?: number;
    disabled?: boolean;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
    children,
    style,
    onPress,
    delay = 0,
    disabled = false,
}) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(20)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                delay,
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: 0,
                duration: 400,
                delay,
                useNativeDriver: true,
            }),
        ]).start();
    }, [delay]);

    const handlePressIn = () => {
        if (onPress && !disabled) {
            Animated.spring(scaleAnim, {
                toValue: 0.98,
                friction: 8,
                useNativeDriver: true,
            }).start();
        }
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 8,
            useNativeDriver: true,
        }).start();
    };

    const cardContent = (
        <Animated.View
            style={[
                styles.card,
                style,
                {
                    opacity: fadeAnim,
                    transform: [
                        { translateY },
                        { scale: scaleAnim },
                    ],
                },
            ]}
        >
            {children}
        </Animated.View>
    );

    if (onPress) {
        return (
            <Pressable
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={disabled}
            >
                {cardContent}
            </Pressable>
        );
    }

    return cardContent;
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        ...Platform.select({
            web: {
                boxShadow: `0 2px 8px ${colors.shadow}`,
                transition: 'box-shadow 0.2s ease, transform 0.2s ease',
            },
            default: {
                shadowColor: colors.shadow,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 3,
            },
        }),
    },
});

export default AnimatedCard;
