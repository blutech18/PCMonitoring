import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text } from 'react-native';
import colors from '../../constants/colors';

interface SearchBarProps {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    onClear?: () => void;
    style?: object;
}

const SearchBar: React.FC<SearchBarProps> = ({
    value,
    onChangeText,
    placeholder = 'Search...',
    onClear,
    style,
}) => {
    return (
        <View style={[styles.container, style]}>
            <TextInput
                style={styles.input}
                placeholder={placeholder}
                placeholderTextColor={colors.textMuted}
                value={value}
                onChangeText={onChangeText}
                autoCapitalize="none"
                autoCorrect={false}
            />
            {value.length > 0 && onClear && (
                <TouchableOpacity onPress={onClear} style={styles.clearButton}>
                    <Text style={styles.clearText}>✕</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 12,
        marginVertical: 8,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: colors.textPrimary,
        paddingVertical: 10,
    },
    clearButton: {
        padding: 4,
        marginLeft: 8,
    },
    clearText: {
        fontSize: 18,
        color: colors.textMuted,
        fontWeight: '600',
    },
});

export default SearchBar;
