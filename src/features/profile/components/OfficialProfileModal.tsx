import { useLanguage as useUiLanguage } from '../../../shared/localization/LanguageContext';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fetchPublicProfile, type PublicProfile } from '../api/accountApi';
import { ProfileAvatar } from '../../../shared/ui/ProfileAvatar';
import { formatRegisteredLocation } from '../../../shared/services/locationService';
import THEME from '../../../shared/theme/theme';

export interface OfficialProfileModalProps {
  visible: boolean;
  onClose: () => void;
  userId?: string;
  token?: string | null;
  prefilledName?: string;
  prefilledAvatar?: string;
  prefilledRole?: string;
}

type DetailItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  phone?: boolean;
};

function hasContent(value?: string | null): value is string {
  return Boolean(value && value.trim() && value.trim() !== 'No Bio');
}

/**
 * A focused profile view for official chat contacts. Official accounts do not
 * have resident posts or reviews, so their profile opens as an information
 * sheet with the public desk details configured by the administrator.
 */
export function OfficialProfileModal({
  visible,
  onClose,
  userId,
  token,
  prefilledName = 'Official desk',
  prefilledAvatar,
  prefilledRole = 'Support',
}: OfficialProfileModalProps) {
  const { tr: uiText } = useUiLanguage();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const currentRequest = ++requestId.current;
    setProfile(null);
    setError(null);
    setLoading(false);

    if (!visible || !userId || !token) return;

    setLoading(true);
    fetchPublicProfile(token, userId)
      .then((data) => {
        if (requestId.current === currentRequest) setProfile(data);
      })
      .catch(() => {
        if (requestId.current === currentRequest) {
          setError('Some official details could not be loaded. You can still use this chat to contact the desk.');
        }
      })
      .finally(() => {
        if (requestId.current === currentRequest) setLoading(false);
      });

    return () => {
      requestId.current++;
    };
  }, [visible, userId, token]);

  const displayName = profile?.full_name || prefilledName;
  const roleSource = `${profile?.account_type || prefilledRole} ${prefilledRole}`.toLowerCase();
  const isBarangay = roleSource.includes('barangay') || roleSource.includes('desk');
  const roleLabel = uiText(isBarangay ? 'Barangay desk' : 'SerbiSure Support');
  const avatarUri = profile?.profile_link || prefilledAvatar;

  const locationParts = [profile?.street, profile?.barangay, profile?.city, profile?.province]
    .map((part) => part?.trim())
    .filter(Boolean);
  const location = locationParts.join(', ') || (
    profile?.street || profile?.city || profile?.province
      ? formatRegisteredLocation(profile?.street, profile?.city, profile?.province)
      : uiText('Location not posted')
  );

  const phone = profile?.show_contact_number !== false ? profile?.contact_number : undefined;
  const publicNotice = hasContent(profile?.user_about)
    ? profile.user_about.trim()
    : isBarangay
      ? uiText('Office hours and public notices have not been posted yet. Please message this desk for assistance.')
      : uiText('Use this support chat for account access, verification, safety, and platform assistance.');

  const details: DetailItem[] = isBarangay
    ? [
        { icon: 'person-outline', label: 'Desk Officer in Charge', value: displayName },
        { icon: 'call-outline', label: 'Official Desk Hotline', value: phone || uiText('Contact this desk through the chat.'), phone: Boolean(phone) },
        { icon: 'location-outline', label: 'Physical Desk / Barangay Hall Location', value: location },
        { icon: 'time-outline', label: 'Office Operating Hours & Public Notice', value: publicNotice },
      ]
    : [
        { icon: 'shield-checkmark-outline', label: 'Support Desk', value: displayName },
        { icon: 'call-outline', label: 'Official Support Hotline', value: phone || uiText('Contact SerbiSure Support through this chat.'), phone: Boolean(phone) },
        { icon: 'globe-outline', label: 'Service Coverage', value: uiText('City-wide SerbiSure platform support') },
        { icon: 'information-circle-outline', label: 'Support Hours & Public Notice', value: publicNotice },
      ];

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back to chat" onPress={onClose} style={styles.backButton} hitSlop={12}>
            <Ionicons name="arrow-back" size={21} color={THEME.colors.ink} />
          </Pressable>
          <Text style={styles.topBarTitle}>{uiText("Official profile")}</Text>
          <View style={styles.topBarSpacer} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 18) + 24 }]}
        >
          <View style={styles.heroCard}>
            <ProfileAvatar uri={avatarUri} name={displayName} size={84} />
            <Text style={styles.name}>{displayName}</Text>
            <View style={styles.rolePill}>
              <Ionicons name={isBarangay ? 'business-outline' : 'shield-checkmark-outline'} size={14} color="#8A4A20" />
              <Text style={styles.rolePillText}>{roleLabel}</Text>
            </View>
            <Text style={styles.heroHint}>
              {uiText(isBarangay ? 'Your local government contact on SerbiSure' : 'Official platform support contact')}
            </Text>
          </View>

          {loading && !profile ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="small" color={THEME.colors.brandDark} />
              <Text style={styles.loadingText}>{uiText("Loading official details…")}</Text>
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorCard}>
              <Ionicons name="information-circle-outline" size={18} color="#9A5B00" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>{uiText("Contact information")}</Text>
            {details.map((item) => (
              <View key={item.label} style={styles.detailRow}>
                <View style={styles.iconCircle}>
                  <Ionicons name={item.icon} size={17} color={THEME.colors.brandDark} />
                </View>
                <View style={styles.detailCopy}>
                  <Text style={styles.detailLabel}>{uiText(item.label)}</Text>
                  {item.phone ? (
                    <Pressable onPress={() => Linking.openURL(`tel:${item.value}`)} hitSlop={6}>
                      <Text style={[styles.detailValue, styles.linkValue]}>{item.value}</Text>
                    </Pressable>
                  ) : (
                    <Text style={styles.detailValue}>{item.value}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>

          <View style={styles.chatHintCard}>
            <View style={styles.chatHintIcon}>
              <Ionicons name="chatbubble-ellipses-outline" size={19} color="#8A4A20" />
            </View>
            <View style={styles.chatHintCopy}>
              <Text style={styles.chatHintTitle}>{uiText("Need help?")}</Text>
              <Text style={styles.chatHintText}>
                {uiText("Return to this conversation to send a message to")} {uiText(isBarangay ? 'your Barangay desk' : 'SerbiSure Support')}.
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.canvas },
  topBar: {
    paddingHorizontal: 18,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.canvas,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.white,
  },
  topBarTitle: {
    fontFamily: THEME.typography.fontFamily.mainBold,
    fontSize: 17,
    color: THEME.colors.ink,
  },
  topBarSpacer: { width: 40 },
  content: { paddingTop: 10 },
  heroCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 28,
    padding: 22,
    alignItems: 'center',
    backgroundColor: '#FFE9D5',
  },
  name: {
    marginTop: 12,
    fontFamily: THEME.typography.fontFamily.mainExtraBold,
    fontSize: 22,
    color: THEME.colors.ink,
    textAlign: 'center',
  },
  rolePill: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: THEME.roundness.pill,
    backgroundColor: '#FFB380',
  },
  rolePillText: {
    fontFamily: THEME.typography.fontFamily.mainBold,
    fontSize: 11,
    color: '#8A4A20',
  },
  heroHint: {
    marginTop: 10,
    fontFamily: THEME.typography.fontFamily.secondary,
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  loadingCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.white,
  },
  loadingText: {
    marginLeft: 9,
    fontFamily: THEME.typography.fontFamily.secondaryMedium,
    fontSize: 12,
    color: THEME.colors.textSecondary,
  },
  errorCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 14,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF7E6',
  },
  errorText: {
    flex: 1,
    marginLeft: 8,
    fontFamily: THEME.typography.fontFamily.secondary,
    fontSize: 12,
    lineHeight: 18,
    color: '#7A4B00',
  },
  detailsCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 20,
    borderRadius: 26,
    backgroundColor: THEME.colors.white,
  },
  sectionTitle: {
    marginBottom: 6,
    fontFamily: THEME.typography.fontFamily.mainExtraBold,
    fontSize: 17,
    color: THEME.colors.ink,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.divider,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.brandLight,
  },
  detailCopy: { flex: 1, marginLeft: 11 },
  detailLabel: {
    fontFamily: THEME.typography.fontFamily.secondaryMedium,
    fontSize: 11,
    color: THEME.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  detailValue: {
    marginTop: 4,
    fontFamily: THEME.typography.fontFamily.secondaryMedium,
    fontSize: 14,
    lineHeight: 20,
    color: THEME.colors.ink,
  },
  linkValue: { color: '#A85F2D', textDecorationLine: 'underline' },
  chatHintCard: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF4ED',
  },
  chatHintIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFB380',
  },
  chatHintCopy: { flex: 1, marginLeft: 11 },
  chatHintTitle: {
    fontFamily: THEME.typography.fontFamily.mainBold,
    fontSize: 14,
    color: THEME.colors.ink,
  },
  chatHintText: {
    marginTop: 3,
    fontFamily: THEME.typography.fontFamily.secondary,
    fontSize: 12,
    lineHeight: 17,
    color: THEME.colors.textSecondary,
  },
});

