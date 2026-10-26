import { useLanguage as useUiLanguage } from '../../../shared/localization/LanguageContext';
import React, { useState, useRef, useEffect } from 'react';
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
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import THEME from '../../../shared/theme/theme';
import { changePassword } from '../api/accountApi';

const logoSource = require('../../../../assets/serbisure-logo.png');
const SCREEN_WIDTH = Dimensions.get('window').width;

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
  const { tr: uiText } = useUiLanguage();
  const insets = useSafeAreaInsets();

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
              handleClose();
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
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View
        style={[
          styles.container,
          {
            paddingTop: Math.max(insets.top, 14),
            paddingBottom: Math.max(insets.bottom, 14),
          },
        ]}
      >
        {/* Global Aligned Header Matching Chat Screen & Booking Screens */}
        <View style={styles.header}>
          <Pressable onPress={handleClose} disabled={isSubmitting} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </Pressable>

          <View style={styles.headerTitleCenter}>
            <Text style={styles.headerTitle}>{uiText("Passwords & Security")}</Text>
          </View>

          <View style={styles.headerRight}>
            <Image source={logoSource} style={styles.logo} resizeMode="contain" />
          </View>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.scrollBody}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Error Banner */}
            {errorMessage ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color="#FF3E3E" style={{ marginRight: 8 }} />
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Change Password Card */}
            <View style={styles.card}>
              <Text style={styles.cardHeaderTitle}>{uiText("CHANGE PASSWORD")}</Text>

              {/* Current Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{uiText("Current Password")}</Text>
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
                      color="#727272"
                    />
                  </Pressable>
                </View>
              </View>

              {/* New Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{uiText("New Password")}</Text>
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
                      color="#727272"
                    />
                  </Pressable>
                </View>
              </View>

              {/* Confirm New Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{uiText("Confirm New Password")}</Text>
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
                      color="#727272"
                    />
                  </Pressable>
                </View>
              </View>

              {/* Requirements Indicator */}
              <View style={styles.requirementsBox}>
                <View style={styles.requirementRow}>
                  <Ionicons
                    name={isMinLength ? 'checkmark-circle' : 'ellipse-outline'}
                    size={16}
                    color={isMinLength ? '#00B13B' : '#A0AEC0'}
                  />
                  <Text style={[styles.requirementText, isMinLength && styles.requirementTextActive]}>
                    {uiText("At least 8 characters long")}
                  </Text>
                </View>
                <View style={styles.requirementRow}>
                  <Ionicons
                    name={isMatching ? 'checkmark-circle' : 'ellipse-outline'}
                    size={16}
                    color={isMatching ? '#00B13B' : '#A0AEC0'}
                  />
                  <Text style={[styles.requirementText, isMatching && styles.requirementTextActive]}>
                    {uiText("Passwords match")}
                  </Text>
                </View>
              </View>

              {/* Submit Button */}
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
                  <Text style={styles.saveModalBtnText}>{uiText("Update Password")}</Text>
                )}
              </Pressable>
            </View>

            {/* Security Tip Card */}
            <View style={styles.card}>
              <View style={styles.tipRow}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={20}
                  color="#FFB380"
                  style={{ marginRight: 10, marginTop: 1 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.tipTitle}>{uiText("Security Tip")}</Text>
                  <Text style={styles.tipText}>
                    {uiText("Use a strong, unique password with a mix of letters, numbers, and symbols to protect your SerbiSure account.")}
                  </Text>
                </View>
              </View>
            </View>

            {/* Data & Privacy Section */}
            <Text style={styles.sectionHeader}>{uiText("DATA & PRIVACY")}</Text>
            <View style={styles.card}>
              {/* Export Data Button */}
              <Pressable
                style={styles.privacyRowBtn}
                onPress={async () => {
                  if (!token) return;
                  try {
                    const { exportUserData } = require('../api/accountApi');
                    const res = await exportUserData(token);
                    const pCount = res?.user_data?.posted_bookings?.length || 0;
                    const aCount = res?.user_data?.assigned_bookings?.length || 0;
                    const rCount = (res?.user_data?.reviews_given?.length || 0) + (res?.user_data?.reviews_received?.length || 0);
                    Alert.alert(
                      'Personal Data Exported',
                      `Your archive is ready!\n• Name: ${res?.user_data?.profile?.first_name} ${res?.user_data?.profile?.last_name}\n• Bookings: ${pCount + aCount}\n• Reviews: ${rCount}\n\nYour data has been compiled in accordance with Data Privacy compliance.`
                    );
                  } catch (e: any) {
                    Alert.alert('Export Failed', e.message || 'Could not export data.');
                  }
                }}
              >
                <Ionicons name="download-outline" size={20} color="#0D0D11" style={styles.privacyRowIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.privacyBtnText}>{uiText("Download Personal Data Archive")}</Text>
                  <Text style={styles.privacyBtnSubtext}>{uiText("Export profile, bookings history, and reviews")}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </Pressable>

              <View style={styles.cardDivider} />

              {/* Delete Account Button */}
              <Pressable
                style={styles.privacyRowBtn}
                onPress={() => {
                  if (!token) return;
                  Alert.prompt
                    ? Alert.prompt(
                      'Deactivate Account',
                      'This will permanently deactivate your account and anonymize your personal data. Enter your current password to confirm:',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Deactivate',
                          style: 'destructive',
                          onPress: async (pwd?: string) => {
                            if (!pwd) {
                              Alert.alert('Error', 'Password is required.');
                              return;
                            }
                            try {
                              const { deleteAccount } = require('../api/accountApi');
                              await deleteAccount(token, pwd);
                              Alert.alert('Account Deactivated', 'Your account has been deactivated.', [
                                { text: 'OK', onPress: handleClose },
                              ]);
                            } catch (err: any) {
                              Alert.alert('Deactivation Failed', err.message || 'Could not deactivate account.');
                            }
                          },
                        },
                      ],
                      'secure-text'
                    )
                    : Alert.alert(
                      'Deactivate Account',
                      'To deactivate your account, please contact privacy support or confirm with your password.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Confirm with Password',
                          style: 'destructive',
                          onPress: async () => {
                            if (!currentPassword) {
                              Alert.alert('Password Required', 'Please enter your current password in the form above first, then tap Deactivate.');
                              return;
                            }
                            try {
                              const { deleteAccount } = require('../api/accountApi');
                              await deleteAccount(token, currentPassword);
                              Alert.alert('Account Deactivated', 'Your account has been deactivated.', [
                                { text: 'OK', onPress: handleClose },
                              ]);
                            } catch (err: any) {
                              Alert.alert('Deactivation Failed', err.message || 'Could not deactivate account.');
                            }
                          },
                        },
                      ]
                    );
                }}
              >
                <Ionicons name="trash-outline" size={20} color="#FF3E3E" style={styles.privacyRowIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.privacyBtnText, { color: '#FF3E3E' }]}>{uiText("Deactivate & Delete Account")}</Text>
                  <Text style={styles.privacyBtnSubtext}>{uiText("Anonymize data and deactivate profile")}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#FF3E3E" />
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F5F2',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EBE9E4',
    backgroundColor: '#F6F5F2',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#1A1A1A',
    fontFamily: THEME.typography.fontFamily.display,
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  logo: {
    height: 34,
    width: 34,
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorBannerText: {
    color: '#FF3E3E',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  cardHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#727272',
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0D0D11',
    marginBottom: 6,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFEFEF',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
  },
  passwordInput: {
    flex: 1,
    fontSize: 14,
    color: '#0D0D11',
    fontWeight: '500',
  },
  eyeBtn: {
    padding: 6,
  },
  requirementsBox: {
    marginTop: 4,
    marginBottom: 18,
    gap: 8,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requirementText: {
    fontSize: 12.5,
    color: '#727272',
    fontWeight: '500',
  },
  requirementTextActive: {
    color: '#0D0D11',
    fontWeight: '600',
  },
  saveModalBtn: {
    backgroundColor: '#0D0D11',
    borderRadius: 14,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveModalBtnDisabled: {
    opacity: 0.45,
  },
  saveModalBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0D0D11',
    marginBottom: 3,
  },
  tipText: {
    fontSize: 12.5,
    color: '#727272',
    lineHeight: 18,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#727272',
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  privacyRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  privacyRowIcon: {
    marginRight: 12,
  },
  privacyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0D0D11',
    marginBottom: 2,
  },
  privacyBtnSubtext: {
    fontSize: 12,
    color: '#727272',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F6F5F2',
    marginVertical: 4,
  },
});
