import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import THEME from '../config/theme';

interface VerificationRequiredModalProps {
  visible: boolean;
  onClose: () => void;
  onVerify?: () => void;
  role?: 'kasambahay' | 'homeowner';
  verificationStatus?: 'Unverified' | 'Pending' | 'Rejected' | string;
}

export function VerificationRequiredModal({
  visible,
  onClose,
  onVerify,
  role = 'kasambahay',
  verificationStatus = 'Unverified',
}: VerificationRequiredModalProps) {
  if (!visible) return null;

  const isKasambahay = role === 'kasambahay';
  const isPending = verificationStatus === 'Pending';
  const isRejected = verificationStatus === 'Rejected';

  const handleVerifyPress = () => {
    onClose();
    if (onVerify) {
      onVerify();
    }
  };

  // Dynamic titles and subtitles based on actual verification state
  let title = 'Account Verification Required';
  let subtitle = isKasambahay
    ? 'To protect both workers and homeowners, you must verify your account before offering household services.'
    : 'To maintain a trusted community, you must verify your identity before posting job listings.';

  let primaryButtonText = 'Verify My Account';
  let primaryButtonIcon: keyof typeof Ionicons.glyphMap = 'shield-outline';

  if (isPending) {
    title = 'Verification Under Review';
    subtitle = isKasambahay
      ? 'Your verification documents are currently being reviewed by our team. You can post services as soon as they are approved.'
      : 'Your verification documents are currently under review. You will be able to post job openings once approved.';
    primaryButtonText = 'View Verification Status';
    primaryButtonIcon = 'time-outline';
  } else if (isRejected) {
    title = 'Verification Needs Attention';
    subtitle = isKasambahay
      ? 'Your previous verification documents were not approved. Please review the feedback in your profile and re-submit valid documents.'
      : 'Your previous identity verification was not approved. Please re-upload clear, valid documents in your profile.';
    primaryButtonText = 'Update Documents Now';
    primaryButtonIcon = 'refresh-outline';
  }

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
          {/* Header Area: Icon Badge + Close Button */}
          <View style={styles.headerArea}>
            <View
              style={[
                styles.iconBadge,
                isPending ? styles.badgePending : isRejected ? styles.badgeRejected : styles.badgeDefault,
              ]}
            >
              <Ionicons
                name={isPending ? 'time-outline' : isRejected ? 'alert-circle-outline' : 'shield-checkmark'}
                size={32}
                color={isPending ? '#D97706' : isRejected ? '#DC2626' : '#E28B50'}
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

          {/* Title & Subtitle */}
          <Text style={styles.titleText}>{title}</Text>
          <Text style={styles.subtitleText}>{subtitle}</Text>

          {/* Guidance Cards / Status Context */}
          {isPending ? (
            <View style={styles.pendingCard}>
              <View style={styles.pendingHeaderRow}>
                <Ionicons name="hourglass-outline" size={18} color="#B45309" />
                <Text style={styles.pendingTitle}>Under active review</Text>
              </View>
              <Text style={styles.pendingBodyText}>
                Our team usually completes document reviews within 24 hours. You'll receive an in-app notification the moment your account is active.
              </Text>
            </View>
          ) : isRejected ? (
            <View style={styles.rejectedCard}>
              <View style={styles.rejectedHeaderRow}>
                <Ionicons name="warning-outline" size={18} color="#B91C1C" />
                <Text style={styles.rejectedTitle}>Action required to unlock posting</Text>
              </View>
              <Text style={styles.rejectedBodyText}>
                Please check the rejection notes on your Profile screen to see what needs correcting (e.g. blurry image, expired document, or mismatched name).
              </Text>
            </View>
          ) : (
            <View style={styles.benefitsCard}>
              <Text style={styles.benefitsCardTitle}>
                {isKasambahay ? 'Required to unlock posting:' : 'What you will need:'}
              </Text>

              <View style={styles.checklistRow}>
                <Ionicons name="checkmark-circle" size={18} color="#10B981" style={styles.checkIcon} />
                <Text style={styles.checklistText}>
                  {isKasambahay
                    ? 'Valid NBI Clearance or Police Clearance'
                    : 'Valid Philippine National ID or Government ID'}
                </Text>
              </View>

              <View style={styles.checklistRow}>
                <Ionicons name="checkmark-circle" size={18} color="#10B981" style={styles.checkIcon} />
                <Text style={styles.checklistText}>
                  {isKasambahay
                    ? 'Selfie liveness verification photo'
                    : 'Fast turnaround — usually verified promptly'}
                </Text>
              </View>

              <View style={styles.checklistRow}>
                <Ionicons name="checkmark-circle" size={18} color="#10B981" style={styles.checkIcon} />
                <Text style={styles.checklistText}>
                  {isKasambahay
                    ? 'Gain a Verified Badge to attract trusted clients'
                    : 'Post unlimited verified jobs & hire with confidence'}
                </Text>
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            {onVerify ? (
              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  isRejected ? styles.reuploadButton : styles.brandButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={handleVerifyPress}
              >
                <Ionicons
                  name={primaryButtonIcon}
                  size={19}
                  color={isRejected ? '#FFFFFF' : '#0D0D11'}
                  style={{ marginRight: 8 }}
                />
                <Text style={isRejected ? styles.reuploadButtonText : styles.brandButtonText}>
                  {primaryButtonText}
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={onClose}
            >
              <Text style={styles.secondaryButtonText}>
                {isPending ? 'Close' : "I'll Do This Later"}
              </Text>
            </Pressable>
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
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDefault: {
    backgroundColor: '#FFF4ED',
  },
  badgePending: {
    backgroundColor: '#FEF3C7',
  },
  badgeRejected: {
    backgroundColor: '#FEE2E2',
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
    marginBottom: 16,
  },
  benefitsCard: {
    backgroundColor: '#FFFBF7',
    borderWidth: 1,
    borderColor: '#FFE2CC',
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
    gap: 10,
  },
  benefitsCardTitle: {
    fontFamily: THEME.typography.fontFamily.mainBold,
    fontSize: 13,
    color: '#8C4D15',
    marginBottom: 2,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  checkIcon: {
    marginTop: 1,
  },
  checklistText: {
    flex: 1,
    fontFamily: THEME.typography.fontFamily.body,
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  pendingCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
  },
  pendingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  pendingTitle: {
    fontFamily: THEME.typography.fontFamily.mainBold,
    fontSize: 13.5,
    color: '#92400E',
  },
  pendingBodyText: {
    fontFamily: THEME.typography.fontFamily.body,
    fontSize: 13,
    color: '#78350F',
    lineHeight: 18,
  },
  rejectedCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
  },
  rejectedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  rejectedTitle: {
    fontFamily: THEME.typography.fontFamily.mainBold,
    fontSize: 13.5,
    color: '#991B1B',
  },
  rejectedBodyText: {
    fontFamily: THEME.typography.fontFamily.body,
    fontSize: 13,
    color: '#7F1D1D',
    lineHeight: 18,
  },
  actionButtonsContainer: {
    gap: 10,
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
  reuploadButton: {
    backgroundColor: '#DC2626',
  },
  reuploadButtonText: {
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
