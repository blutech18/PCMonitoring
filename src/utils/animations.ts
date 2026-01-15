import { Animated, Easing } from 'react-native';

// Animation durations
export const DURATION = {
    fast: 150,
    normal: 250,
    slow: 400,
};

// Easing functions
export const EASING = {
    smooth: Easing.bezier(0.4, 0, 0.2, 1),
    bounce: Easing.bezier(0.68, -0.55, 0.265, 1.55),
    spring: Easing.bezier(0.175, 0.885, 0.32, 1.275),
};

// Fade in animation
export const fadeIn = (value: Animated.Value, duration = DURATION.normal) => {
    return Animated.timing(value, {
        toValue: 1,
        duration,
        easing: EASING.smooth,
        useNativeDriver: true,
    });
};

// Fade out animation
export const fadeOut = (value: Animated.Value, duration = DURATION.normal) => {
    return Animated.timing(value, {
        toValue: 0,
        duration,
        easing: EASING.smooth,
        useNativeDriver: true,
    });
};

// Slide up animation
export const slideUp = (value: Animated.Value, duration = DURATION.normal) => {
    return Animated.timing(value, {
        toValue: 0,
        duration,
        easing: EASING.smooth,
        useNativeDriver: true,
    });
};

// Scale animation
export const scaleIn = (value: Animated.Value, duration = DURATION.fast) => {
    return Animated.spring(value, {
        toValue: 1,
        friction: 8,
        tension: 100,
        useNativeDriver: true,
    });
};

// Press animation for buttons
export const pressAnimation = (value: Animated.Value) => {
    return Animated.sequence([
        Animated.timing(value, {
            toValue: 0.95,
            duration: DURATION.fast,
            easing: EASING.smooth,
            useNativeDriver: true,
        }),
        Animated.timing(value, {
            toValue: 1,
            duration: DURATION.fast,
            easing: EASING.bounce,
            useNativeDriver: true,
        }),
    ]);
};

// Stagger animation for lists
export const staggeredFadeIn = (
    values: Animated.Value[],
    delay = 50,
    duration = DURATION.normal
) => {
    return Animated.stagger(
        delay,
        values.map((value) => fadeIn(value, duration))
    );
};

// Pulse animation
export const pulse = (value: Animated.Value) => {
    return Animated.loop(
        Animated.sequence([
            Animated.timing(value, {
                toValue: 1.05,
                duration: 1000,
                easing: EASING.smooth,
                useNativeDriver: true,
            }),
            Animated.timing(value, {
                toValue: 1,
                duration: 1000,
                easing: EASING.smooth,
                useNativeDriver: true,
            }),
        ])
    );
};

// Shimmer effect for loading
export const shimmer = (value: Animated.Value) => {
    return Animated.loop(
        Animated.timing(value, {
            toValue: 1,
            duration: 1500,
            easing: Easing.linear,
            useNativeDriver: true,
        })
    );
};

export default {
    DURATION,
    EASING,
    fadeIn,
    fadeOut,
    slideUp,
    scaleIn,
    pressAnimation,
    staggeredFadeIn,
    pulse,
    shimmer,
};
