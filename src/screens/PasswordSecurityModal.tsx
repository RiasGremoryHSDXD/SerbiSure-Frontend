import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { changePassword } from '../api/accountApi';

interface PasswordSecurityModalProps {
  visible: boolean;
  onClose: () => void;
  token?: string | null;
}

export function PasswordSecurityModal({
  visible,
  onClose,
  token,
}: PasswordSecurityModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    setErrorMessage(null);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    onClose();
  };

  const isMinLength = newPassword.length >= 8;
  const isMatching = newPassword.length > 0 && newPassword === confirmPassword;
  const canSubmit =
    currentPassword.trim().length > 0 &&
    isMinLength &&
    isMatching &&
    !isSubmitting;

  const handleSubmit = async () => {
    if (!token) {
      Alert.alert('Authentication Error', 'You must be logged in to change your password.');
      return;
    }

    if (!currentPassword) {
      setErrorMessage('Please enter your current password.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('New password and confirmation do not match.');
      return;
    }

    if (currentPassword === newPassword) {
      setErrorMessage('New password must be different from your current password.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await changePassword(token, currentPassword, newPassword, confirmPassword);

      Alert.alert(
        'Password Updated',
        'Your password has been changed successfully. Please remember your new password.',
        [
          {
            text: 'OK',
            onPress: () => {
              resetForm();
              onClose();
            },
          },
        ]
      );
    } catch (err: any) {
      const msg = err?.message || 'Failed to update password. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="lock-closed" size={20} color="#FFB43B" />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.modalTitle}>Password & Security</Text>
                <Text style={styles.modalSubtitle}>Manage your account credentials</Text>
              </View>
            </View>
            <Pressable
              onPress={handleClose}
              disabled={isSubmitting}
              hitSlop={10}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={22} color="#777" />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Error Banner */}
            {errorMessage ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color="#C0392B" style={{ marginRight: 8 }} />
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Current Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Current Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  secureTextEntry={!showCurrent}
                  placeholder="Enter current password"
                  placeholderTextColor="#999"
                  value={currentPassword}
                  onChangeText={(val) => {
                    setCurrentPassword(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  autoCapitalize="none"
                />
                <Pressable
                  onPress={() => setShowCurrent(!showCurrent)}
                  style={styles.eyeBtn}
                  hitSlop={8}
                >
                  <Ionicons
                    name={showCurrent ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#888"
                  />
                </Pressable>
              </View>
            </View>

            {/* New Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>New Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  secureTextEntry={!showNew}
                  placeholder="At least 8 characters"
                  placeholderTextColor="#999"
                  value={newPassword}
                  onChangeText={(val) => {
                    setNewPassword(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  autoCapitalize="none"
                />
                <Pressable
                  onPress={() => setShowNew(!showNew)}
                  style={styles.eyeBtn}
                  hitSlop={8}
                >
                  <Ionicons
                    name={showNew ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#888"
                  />
                </Pressable>
              </View>
            </View>

            {/* Confirm New Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm New Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  secureTextEntry={!showConfirm}
                  placeholder="Re-enter new password"
                  placeholderTextColor="#999"
                  value={confirmPassword}
                  onChangeText={(val) => {
                    setConfirmPassword(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  autoCapitalize="none"
                />
                <Pressable
                  onPress={() => setShowConfirm(!showConfirm)}
                  style={styles.eyeBtn}
                  hitSlop={8}
                >
                  <Ionicons
                    name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#888"
                  />
                </Pressable>
              </View>
            </View>

            {/* Requirements Indicator */}
            <View style={styles.requirementsBox}>
              <View style={styles.requirementRow}>
                <Ionicons
                  name={isMinLength ? 'checkmark-circle' : 'ellipse-outline'}
                  size={15}
                  color={isMinLength ? '#27AE60' : '#A0AEC0'}
                />
                <Text style={[styles.requirementText, isMinLength && styles.requirementTextActive]}>
                  At least 8 characters long
                </Text>
              </View>
              <View style={styles.requirementRow}>
                <Ionicons
                  name={isMatching ? 'checkmark-circle' : 'ellipse-outline'}
                  size={15}
                  color={isMatching ? '#27AE60' : '#A0AEC0'}
                />
                <Text style={[styles.requirementText, isMatching && styles.requirementTextActive]}>
                  Passwords match
                </Text>
              </View>
            </View>

            {/* Security Tip Card */}
            <View style={styles.tipCard}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#D68910" style={{ marginRight: 8, marginTop: 1 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.tipTitle}>Security Tip</Text>
                <Text style={styles.tipText}>
                  Use a strong, unique password with a mix of letters, numbers, and symbols to protect your Serbisure account.
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.modalActionButtons}>
            <Pressable
              style={styles.cancelModalBtn}
              disabled={isSubmitting}
              onPress={handleClose}
            >
              <Text style={styles.cancelModalBtnText}>Cancel</Text>
            </Pressable>

            <Pressable
              style={[
                styles.saveModalBtn,
                (!canSubmit || isSubmitting) && styles.saveModalBtnDisabled,
              ]}
              disabled={!canSubmit || isSubmitting}
              onPress={handleSubmit}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.saveModalBtnText}>Update Password</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EAE1',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF4E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
  closeButton: {
    padding: 6,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 10,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDECEA',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FADBD8',
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#C0392B',
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F8F5',
    borderWidth: 1,
    borderColor: '#E8E2D8',
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  passwordInput: {
    flex: 1,
    height: 46,
    fontSize: 14,
    color: '#1A1A1A',
  },
  eyeBtn: {
    padding: 6,
  },
  requirementsBox: {
    backgroundColor: '#FAFAF8',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EFECE6',
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
  },
  requirementText: {
    fontSize: 12,
    color: '#888',
    marginLeft: 8,
  },
  requirementTextActive: {
    color: '#27AE60',
    fontWeight: '600',
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFDF9',
    borderWidth: 1,
    borderColor: '#FDEBD0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  tipTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#B9770E',
    marginBottom: 2,
  },
  tipText: {
    fontSize: 11.5,
    color: '#666',
    lineHeight: 16,
  },
  modalActionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 12,
  },
  cancelModalBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDD',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  cancelModalBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  saveModalBtn: {
    flex: 2,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#FFB43B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFB43B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  saveModalBtnDisabled: {
    backgroundColor: '#E0DCD5',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveModalBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
});
