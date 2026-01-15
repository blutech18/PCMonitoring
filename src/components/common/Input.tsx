import React from 'react';
import {
    View,
    TextInput,
    Text,
    StyleSheet,
    TextInputProps,
    ViewStyle,
} from 'react-native';
import colors from '../../constants/colors';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    containerStyle?: ViewStyle;
}

const Input: React.FC<InputProps> = ({
    label,
    error,
    containerStyle,
    ...props
}) => {
    return (
        <View style={[styles.container, containerStyle]}>
            {label && <Text style={styles.label}>{label}</Text>}
            <TextInput
                style={[
                    styles.input,
                    error && styles.inputError,
                    props.multiline && styles.multiline,
                ]}
                placeholderTextColor={colors.textMuted}
                {...props}
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.textSecondary,
        marginBottom: 8,
    },
    input: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: colors.textPrimary,
    },
    inputError: {
        borderColor: colors.error,
    },
    multiline: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    errorText: {
        fontSize: 12,
        color: colors.error,
        marginTop: 4,
    },
});

export default Input;
