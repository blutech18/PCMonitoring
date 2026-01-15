import React, { useRef } from 'react';
import {
    Animated,
    Pressable,
    Text,
    StyleSheet,
    ActivityIndicator,
    ViewStyle,
    TextStyle,
    Platform,
} from 'react-native';
import colors from '../../constants/colors';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
    size?: 'small' | 'medium' | 'large';
    disabled?: boolean;
    loading?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
    fullWidth?: boolean;
    icon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
    title,
    onPress,
    variant = 'primary',
    size = 'medium',
    disabled = false,
    loading = false,
    style,
    textStyle,
    fullWidth = false,
    icon,
}) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.96,
            friction: 8,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 8,
            useNativeDriver: true,
        }).start();
    };

    const getButtonStyle = () => {
        switch (variant) {
            case 'secondary':
                return styles.secondary;
            case 'outline':
                return styles.outline;
            case 'danger':
                return styles.danger;
            case 'ghost':
                return styles.ghost;
            default:
                return styles.primary;
        }
    };

    const getTextStyle = () => {
        switch (variant) {
            case 'outline':
                return styles.outlineText;
            case 'ghost':
                return styles.ghostText;
            default:
                return styles.buttonText;
        }
    };

    const getSizeStyle = () => {
        switch (size) {
            case 'small':
                return styles.small;
            case 'large':
                return styles.large;
            default:
                return styles.medium;
        }
    };

    const getTextSizeStyle = () => {
        switch (size) {
            case 'small':
                return styles.smallText;
            case 'large':
                return styles.largeText;
            default:
                return styles.mediumText;
        }
    };

    return (
        <Pressable
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled || loading}
        >
            <Animated.View
                style={[
                    styles.button,
                    getButtonStyle(),
                    getSizeStyle(),
                    fullWidth && styles.fullWidth,
                    disabled && styles.disabled,
                    { transform: [{ scale: scaleAnim }] },
                    style,
                ]}
            >
                {loading ? (
                    <ActivityIndicator
                        color={variant === 'outline' || variant === 'ghost' ? colors.primary : colors.textLight}
                        size="small"
                    />
                ) : (
                    <>
                        {icon}
                        <Text style={[getTextStyle(), getTextSizeStyle(), icon ? styles.textWithIcon : null, textStyle]}>
                            {title}
                        </Text>
                    </>
                )}
            </Animated.View>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        ...Platform.select({
            web: {
                cursor: 'pointer',
                transition: 'all 0.2s ease',
            },
        }),
    },
    small: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        minHeight: 36,
    },
    medium: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        minHeight: 48,
    },
    large: {
        paddingVertical: 16,
        paddingHorizontal: 32,
        minHeight: 56,
    },
    primary: {
        backgroundColor: colors.primary,
        ...Platform.select({
            web: {
                boxShadow: `0 4px 14px rgba(59, 130, 246, 0.4)`,
            },
            default: {
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
            },
        }),
    },
    secondary: {
        backgroundColor: colors.secondary,
        ...Platform.select({
            web: {
                boxShadow: `0 4px 14px rgba(20, 184, 166, 0.4)`,
            },
            default: {
                shadowColor: colors.secondary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
            },
        }),
    },
    outline: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: colors.primary,
    },
    danger: {
        backgroundColor: colors.error,
        ...Platform.select({
            web: {
                boxShadow: `0 4px 14px rgba(239, 68, 68, 0.4)`,
            },
            default: {
                shadowColor: colors.error,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
            },
        }),
    },
    ghost: {
        backgroundColor: 'transparent',
    },
    disabled: {
        opacity: 0.5,
    },
    fullWidth: {
        width: '100%',
    },
    buttonText: {
        color: colors.textLight,
        fontWeight: '600',
    },
    outlineText: {
        color: colors.primary,
        fontWeight: '600',
    },
    ghostText: {
        color: colors.primary,
        fontWeight: '600',
    },
    smallText: {
        fontSize: 13,
    },
    mediumText: {
        fontSize: 15,
    },
    largeText: {
        fontSize: 17,
    },
    textWithIcon: {
        marginLeft: 8,
    },
});

export default Button;
