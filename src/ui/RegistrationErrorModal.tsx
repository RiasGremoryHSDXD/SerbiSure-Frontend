import React, { useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import THEME from '../config/theme';

export interface ParsedErrorItem {
  fieldKey: string;
  label: string;
  message: string;
  iconName: keyof typeof Ionicons.glyphMap;
  step: 1 | 2 | 3;
}

export interface ParsedRegistrationError {
  title: string;
  subtitle: string;
  items: ParsedErrorItem[];
  hasAccountConflict: boolean;
  isNetworkError: boolean;
  suggestedStep: 1 | 2 | 3;
}

/**
 * Sanitizes and humanizes raw backend/DRF error responses into clean, idiot-proof copy.
 * Removes all database table names (like `tbl_user_profile`), SQL constraints, and tech jargon.
 */
export function parseRegistrationErrors(errorData: any): ParsedRegistrationError {
  // Edge Case 1: Empty or null
  if (!errorData) {
    return {
      title: 'Registration Issue',
      subtitle: 'An unexpected issue occurred. Please check your details and try again.',
      items: [],
      hasAccountConflict: false,
      isNetworkError: false,
      suggestedStep: 1,
    };
  }

  // Edge Case 2: Network / Timeout / Offline Error
  const rawStr = typeof errorData === 'string' ? errorData : errorData.message || errorData.detail || '';
  const isNetwork =
    errorData instanceof Error ||
    /network|timeout|aborted|failed to fetch|econnrefused|unable to connect/i.test(rawStr);

  if (isNetwork && (!errorData || typeof errorData !== 'object' || (!errorData.email && !errorData.contact_number))) {
    return {
      title: 'Connection Issue',
      subtitle: 'Unable to reach the SerbiSure server. Please check your internet connection and try again.',
      items: [
        {
          fieldKey: 'network',
          label: 'Network Connection',
          message: 'The request timed out or the server could not be reached. Please verify your connection.',
          iconName: 'cloud-offline-outline',
          step: 3,
        },
      ],
      hasAccountConflict: false,
      isNetworkError: true,
      suggestedStep: 3,
    };
  }

  // Edge Case 3: Raw HTML server error page (e.g. 502 Bad Gateway / Cloudflare / Vercel error)
  if (typeof errorData === 'string' && (errorData.includes('<!DOCTYPE') || errorData.includes('<html'))) {
    return {
      title: 'Server Temporarily Unavailable',
      subtitle: 'Our servers are experiencing high traffic. Please wait a moment and try again.',
      items: [],
      hasAccountConflict: false,
      isNetworkError: true,
      suggestedStep: 3,
    };
  }

  // Field metadata mapping (Label, icon, and which registration step it belongs to)
  const FIELD_MAP: Record<
    string,
    { label: string; icon: keyof typeof Ionicons.glyphMap; step: 1 | 2 | 3 }
  > = {
    email: { label: 'Email Address', icon: 'mail-outline', step: 1 },
    contact_number: { label: 'Contact Number', icon: 'call-outline', step: 1 },
    password: { label: 'Password', icon: 'lock-closed-outline', step: 1 },
    first_name: { label: 'First Name', icon: 'person-outline', step: 1 },
    middle_name: { label: 'Middle Name', icon: 'person-outline', step: 1 },
    last_name: { label: 'Last Name', icon: 'person-outline', step: 1 },
    date_of_birth: { label: 'Date of Birth', icon: 'calendar-outline', step: 1 },
    gender: { label: 'Gender', icon: 'people-outline', step: 1 },
    nationality: { label: 'Nationality', icon: 'flag-outline', step: 1 },
    religion: { label: 'Religion', icon: 'book-outline', step: 1 },
    // Step 2
    language: { label: 'Spoken Dialects', icon: 'chatbubbles-outline', step: 2 },
    desired_salary: { label: 'Desired Salary', icon: 'cash-outline', step: 2 },
    user_about: { label: 'Bio / About', icon: 'document-text-outline', step: 2 },
    user_tags: { label: 'Services & Skills', icon: 'pricetag-outline', step: 2 },
    roles: { label: 'Selected Roles', icon: 'briefcase-outline', step: 2 },
    civil_status: { label: 'Civil Status', icon: 'heart-outline', step: 2 },
    children: { label: 'Children Status', icon: 'people-outline', step: 2 },
    // Step 3
    region: { label: 'Region', icon: 'map-outline', step: 3 },
    province: { label: 'Province', icon: 'map-outline', step: 3 },
    city: { label: 'City / Municipality', icon: 'business-outline', step: 3 },
    barangay: { label: 'Barangay', icon: 'home-outline', step: 3 },
    street: { label: 'Street Address', icon: 'navigate-outline', step: 3 },
    zipcode: { label: 'Zip Code', icon: 'mail-unread-outline', step: 3 },
    location: { label: 'Location', icon: 'map-outline', step: 3 },
    consent: { label: 'Terms & Privacy Policy', icon: 'shield-checkmark-outline', step: 3 },
    non_field_errors: { label: 'General', icon: 'alert-circle-outline', step: 1 },
    detail: { label: 'Notice', icon: 'alert-circle-outline', step: 1 },
  };

  const sanitizeMessage = (rawMsg: string, fieldKey: string): string => {
    let msg = String(rawMsg || '').trim();

    // 1. Remove database table references (tbl_user_profile, accounts_tbl_user_profile, etc.)
    msg = msg.replace(/tbl_user_profile\s+with\s+this\s+email\s+already\s+exists\.?/gi, 'A user with this email address is already registered.');
    msg = msg.replace(/tbl_user_profile\s+with\s+this\s+contact_number\s+already\s+exists\.?/gi, 'A user with this contact number is already registered.');
    msg = msg.replace(/tbl_user_profile\s+with\s+this\s+(\w+)\s+already\s+exists\.?/gi, 'An account with this $1 already exists.');
    msg = msg.replace(/tbl_[a-z0-9_]+/gi, 'account');

    // 2. Remove SQL / Django constraint terms
    msg = msg.replace(/unique_tbl_user_profile_[a-z0-9_]+/gi, 'already in use');
    msg = msg.replace(/duplicate key value violates unique constraint/gi, 'already registered');
    msg = msg.replace(/Key \((.*?)\)=\((.*?)\) already exists\.?/gi, '$1 ($2) is already registered.');

    // 3. Humanize standard validation phrases
    if (/already (registered|exists|in use)/i.test(msg)) {
      if (fieldKey === 'email') {
        return 'This email address is already registered to an existing account.';
      }
      if (fieldKey === 'contact_number') {
        return 'This contact number is already registered to an existing account.';
      }
    }

    if (/this field is required/i.test(msg) || /this field may not be blank/i.test(msg)) {
      const fieldName = FIELD_MAP[fieldKey]?.label || fieldKey.replace(/_/g, ' ');
      return `Please provide your ${fieldName}.`;
    }

    return msg;
  };

  const items: ParsedErrorItem[] = [];
  let hasEmailConflict = false;
  let hasPhoneConflict = false;
  let suggestedStep: 1 | 2 | 3 = 1;

  if (typeof errorData === 'object') {
    for (const [key, value] of Object.entries(errorData)) {
      const fieldMeta = FIELD_MAP[key] || {
        label: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        icon: 'alert-circle-outline' as const,
        step: 1 as const,
      };

      const valList = Array.isArray(value) ? value : [value];
      for (const rawVal of valList) {
        if (!rawVal) continue;
        const cleanMsg = sanitizeMessage(String(rawVal), key);

        if (key === 'email' && /already registered|already in use|already exists/i.test(cleanMsg)) {
          hasEmailConflict = true;
        }
        if (key === 'contact_number' && /already registered|already in use|already exists/i.test(cleanMsg)) {
          hasPhoneConflict = true;
        }

        items.push({
          fieldKey: key,
          label: fieldMeta.label,
          message: cleanMsg,
          iconName: fieldMeta.icon,
          step: fieldMeta.step,
        });

        // Track the earliest step with an issue so we can guide the user there
        if (fieldMeta.step < suggestedStep) {
          suggestedStep = fieldMeta.step;
        }
      }
    }
  } else if (typeof errorData === 'string') {
    items.push({
      fieldKey: 'general',
      label: 'Notice',
      message: sanitizeMessage(errorData, 'general'),
      iconName: 'alert-circle-outline',
      step: 1,
    });
  }

  const hasAccountConflict = hasEmailConflict || hasPhoneConflict;

  let title = 'Registration Issue';
  let subtitle = 'Please review the highlighted details below to complete your registration.';

  if (hasAccountConflict) {
    title = 'Account Already Exists';
    subtitle = hasEmailConflict && hasPhoneConflict
      ? 'Both this email and contact number are already associated with an existing account.'
      : hasEmailConflict
      ? 'This email address is already associated with an existing account.'
      : 'This contact number is already associated with an existing account.';
    suggestedStep = 1;
  } else if (items.length === 1 && items[0]?.fieldKey === 'password') {
    title = 'Password Requirement';
    subtitle = 'Please adjust your password to meet the security requirements.';
    suggestedStep = 1;
  }

  return {
    title,
    subtitle,
    items,
    hasAccountConflict,
    isNetworkError: false,
    suggestedStep,
  };
}

export interface RegistrationErrorModalProps {
  visible: boolean;
  errorData: any;
  onClose: () => void;
  onGoToStep?: (step: 1 | 2 | 3) => void;
  onNavigateToLogin?: () => void;
}

export function RegistrationErrorModal({
  visible,
  errorData,
  onClose,
  onGoToStep,
  onNavigateToLogin,
}: RegistrationErrorModalProps) {
  const parsed = useMemo(() => parseRegistrationErrors(errorData), [errorData]);

  if (!visible) return null;

  const handleFixDetails = () => {
    onClose();
    if (onGoToStep) {
      onGoToStep(parsed.suggestedStep);
    }
  };

  const handleGoToLogin = () => {
    onClose();
    if (onNavigateToLogin) {
      onNavigateToLogin();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.dismissOverlay} onPress={onClose} />

        <View style={styles.modalCard}>
          {/* Top Status Icon Header */}
          <View style={styles.headerArea}>
            <View
              style={[
                styles.iconBadge,
                parsed.hasAccountConflict
                  ? styles.iconBadgeConflict
                  : parsed.isNetworkError
                  ? styles.iconBadgeNetwork
                  : styles.iconBadgeError,
              ]}
            >
              <Ionicons
                name={
                  parsed.hasAccountConflict
                    ? 'person-circle-outline'
                    : parsed.isNetworkError
                    ? 'cloud-offline-outline'
                    : 'alert-circle-outline'
                }
                size={34}
                color={
                  parsed.hasAccountConflict
                    ? '#E28B50'
                    : parsed.isNetworkError
                    ? '#6B7280'
                    : '#EF4444'
                }
              />
            </View>

            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={styles.closeIconButton}
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={20} color={THEME.colors.textSecondary} />
            </Pressable>
          </View>

          {/* Modal Titles */}
          <Text style={styles.titleText}>{parsed.title}</Text>
          <Text style={styles.subtitleText}>{parsed.subtitle}</Text>

          {/* Account Conflict Helpful Prompt */}
          {parsed.hasAccountConflict && (
            <View style={styles.conflictBanner}>
              <Ionicons name="information-circle" size={18} color="#E28B50" style={{ marginRight: 8, marginTop: 1 }} />
              <Text style={styles.conflictBannerText}>
                If you already have an account, you can sign in directly. Or you can update your entries to use a different email or phone.
              </Text>
            </View>
          )}

          {/* Error Details List */}
          {parsed.items.length > 0 && (
            <ScrollView
              style={styles.scrollList}
              contentContainerStyle={styles.scrollListContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {parsed.items.map((item, idx) => (
                <View key={`${item.fieldKey}-${idx}`} style={styles.errorItemCard}>
                  <View style={styles.errorItemIconWrapper}>
                    <Ionicons name={item.iconName} size={18} color="#EF4444" />
                  </View>
                  <View style={styles.errorItemContent}>
                    <Text style={styles.errorItemLabel}>{item.label}</Text>
                    <Text style={styles.errorItemMessage}>{item.message}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Action Buttons (Idiot-Proof UX) */}
          <View style={styles.actionButtonsContainer}>
            {parsed.hasAccountConflict ? (
              <>
                {/* Option 1: Log in directly */}
                {onNavigateToLogin && (
                  <Pressable
                    style={({ pressed }) => [
                      styles.primaryButton,
                      styles.brandButton,
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={handleGoToLogin}
                  >
                    <Ionicons name="log-in-outline" size={20} color="#0D0D11" style={{ marginRight: 6 }} />
                    <Text style={styles.brandButtonText}>Sign In to Account</Text>
                  </Pressable>
                )}

                {/* Option 2: Change email/phone in Step 1 */}
                <Pressable
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={handleFixDetails}
                >
                  <Text style={styles.secondaryButtonText}>Change Details in Step 1</Text>
                </Pressable>
              </>
            ) : parsed.isNetworkError ? (
              <>
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    styles.darkButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={onClose}
                >
                  <Text style={styles.darkButtonText}>Try Again</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    styles.darkButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={handleFixDetails}
                >
                  <Text style={styles.darkButtonText}>
                    Review & Fix (Step {parsed.suggestedStep})
                  </Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={onClose}
                >
                  <Text style={styles.secondaryButtonText}>Dismiss</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(13, 13, 17, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  dismissOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: '100%',
    maxWidth: 390,
    backgroundColor: THEME.colors.white,
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.18,
        shadowRadius: 24,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  headerArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  iconBadge: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadgeError: {
    backgroundColor: '#FEE2E2',
  },
  iconBadgeConflict: {
    backgroundColor: '#FFF4ED',
  },
  iconBadgeNetwork: {
    backgroundColor: '#F3F4F6',
  },
  closeIconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    fontFamily: THEME.typography.fontFamily.mainBold,
    fontSize: 21,
    color: THEME.colors.textPrimary,
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  subtitleText: {
    fontFamily: THEME.typography.fontFamily.body,
    fontSize: 14,
    color: THEME.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 14,
  },
  conflictBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF8F2',
    borderWidth: 1,
    borderColor: '#FFE2CC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  conflictBannerText: {
    flex: 1,
    fontFamily: THEME.typography.fontFamily.bodyMedium,
    fontSize: 13,
    color: '#8C4D15',
    lineHeight: 18,
  },
  scrollList: {
    maxHeight: 190,
    marginBottom: 16,
  },
  scrollListContent: {
    gap: 8,
  },
  errorItemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  errorItemIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  errorItemContent: {
    flex: 1,
  },
  errorItemLabel: {
    fontFamily: THEME.typography.fontFamily.mainBold,
    fontSize: 13,
    color: '#991B1B',
    marginBottom: 2,
  },
  errorItemMessage: {
    fontFamily: THEME.typography.fontFamily.body,
    fontSize: 13,
    color: '#7F1D1D',
    lineHeight: 18,
  },
  actionButtonsContainer: {
    gap: 10,
    marginTop: 4,
  },
  primaryButton: {
    height: 50,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  brandButton: {
    backgroundColor: THEME.colors.brand,
  },
  brandButtonText: {
    fontFamily: THEME.typography.fontFamily.mainBold,
    fontSize: 15,
    color: '#0D0D11',
  },
  darkButton: {
    backgroundColor: '#0D0D11',
  },
  darkButtonText: {
    fontFamily: THEME.typography.fontFamily.mainBold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  secondaryButton: {
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F6F5F2',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    fontFamily: THEME.typography.fontFamily.mainMedium,
    fontSize: 14,
    color: THEME.colors.textPrimary,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
});
