import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal as RNModal,
    TouchableOpacity,
    TouchableWithoutFeedback,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import colors from '../../constants/colors';

interface ModalProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ visible, onClose, title, children }) => {
    return (
        <RNModal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                            style={styles.keyboardView}
                        >
                            <View style={styles.container}>
                                <View style={styles.header}>
                                    <Text style={styles.title}>{title}</Text>
                                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                        <Text style={styles.closeText}>✕</Text>
                                    </TouchableOpacity>
                                </View>
                                <ScrollView
                                    style={styles.content}
                                    showsVerticalScrollIndicator={false}
                                    keyboardShouldPersistTaps="handled"
                                >
                                    {children}
                                </ScrollView>
                            </View>
                        </KeyboardAvoidingView>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </RNModal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: colors.overlay,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    keyboardView: {
        width: '100%',
        maxWidth: 400,
    },
    container: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        maxHeight: '80%',
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeText: {
        fontSize: 16,
        color: colors.textSecondary,
    },
    content: {
        padding: 16,
    },
});

export default Modal;
