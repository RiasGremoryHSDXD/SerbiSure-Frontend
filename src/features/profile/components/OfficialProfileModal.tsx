import { useLanguage as useUiLanguage } from '../../../shared/localization/LanguageContext';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import { formatRegisteredLocation } from '../../../shared/services/locationService';
import THEME from '../../../shared/theme/theme';
import { AppHeader, APP_HEADER_BACK_ICON_COLOR, APP_HEADER_BACK_ICON_SIZE } from '../../../shared/components/AppHeader';

const serbisureIcon = require('../../../../assets/serbisure-icon.png');

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
  const isSuperAdminOrSupport = !isBarangay || roleSource.includes('superadmin') || roleSource.includes('support') || roleSource.includes('ustp');
  const rawAvatarUri = profile?.profile_link || prefilledAvatar;
  const hasValidCustomPhoto = Boolean(
    rawAvatarUri &&
    !rawAvatarUri.includes('ui-avatars.com') &&
    !rawAvatarUri.includes('placeholder') &&
    !rawAvatarUri.includes('pravatar')
  );
  // Official support desk should always show the SerbiSure logo unless an explicit custom photo is set
  const showSerbiSureLogo = isSuperAdminOrSupport || !hasValidCustomPhoto;

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
    <Modal visible={visible} animationType="none" transparent={false} statusBarTranslucent onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 14) }]}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={uiText("Back to chat")}
            onPress={onClose}
            style={styles.backBtn}
            hitSlop={12}
          >
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </Pressable>

          <Image source={serbisureIcon} style={styles.headerLogo} resizeMode="contain" />

          <View style={styles.headerRightSpacer} />
        </View>

        <ScrollView
          style={styles.scrollBody}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 18) + 24 }}
        >
          {/* Identity Hero Card matching Personal Info and UserProfileView design */}
          <View style={styles.heroCard}>
            {/* Top row: Avatar on left, Role pill badge on right */}
            <View style={styles.heroTopRow}>
              <View style={styles.heroAvatarWrapper}>
                {showSerbiSureLogo ? (
                  <Image
                    source={serbisureIcon}
                    style={styles.heroLogoImage}
                    resizeMode="contain"
                    accessibilityLabel="SerbiSure"
                  />
                ) : (
                  <Image
                    source={{ uri: rawAvatarUri }}
                    style={styles.heroAvatarImage}
                    resizeMode="cover"
                    accessibilityLabel={`${displayName}'s photo`}
                  />
                )}
              </View>

              <View style={styles.heroTopActions}>
                <View style={styles.roleBadgePill}>
                  <Ionicons
                    name={isBarangay ? 'business-outline' : 'shield-checkmark-outline'}
                    size={13}
                    color="#0D0D11"
                  />
                  <Text style={styles.roleBadgePillText}>{roleLabel}</Text>
                </View>
                <View style={[styles.viewCvTopBtn, { opacity: 0 }]} pointerEvents="none">
                  <Text style={styles.viewCvTopBtnText}>{uiText("View CV")}</Text>
                </View>
              </View>
            </View>

            {/* Name Row + Verified checkmark */}
            <View style={styles.nameRow}>
              <Text style={styles.name}>{displayName}</Text>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" style={{ marginLeft: 6 }} />
            </View>

            {/* Subtitle / hint row */}
            <View style={styles.heroInfoRow}>
              <Ionicons
                name={isBarangay ? 'location-sharp' : 'shield-checkmark-sharp'}
                size={14}
                color="#0D0D11"
              />
              <Text style={styles.heroInfoText}>
                {uiText(isBarangay ? location : 'Official platform support contact')}
              </Text>
            </View>
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
                <Ionicons name={item.icon} size={18} color="#0D0D11" style={styles.detailIcon} />
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
            <Ionicons name="chatbubble-ellipses-outline" size={20} color="#8A4A20" style={styles.chatHintIcon} />
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
  container: { flex: 1, backgroundColor: '#F6F5F2' },
  header: {
    backgroundColor: '#F6F5F2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogo: {
    width: 40,
    height: 40,
  },
  headerRightSpacer: {
    width: 40,
    height: 40,
  },
  scrollBody: { flex: 1 },
  heroCard: {
    backgroundColor: '#FFCCAA',
    borderRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 20,
    marginHorizontal: 16,
    marginTop: 38,
    marginBottom: 16,
  },
  heroTopRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  heroAvatarWrapper: {
    marginTop: -42,
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3.5,
    borderColor: '#FFCCAA',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatarImage: {
    width: '100%',
    height: '100%',
  },
  heroLogoImage: {
    width: 52,
    height: 52,
  },
  heroTopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  roleBadgePill: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 9999,
  },
  roleBadgePillText: {
    fontFamily: THEME.typography.fontFamily.mainBold,
    fontSize: 13,
    fontWeight: '700',
    color: '#0D0D11',
  },
  viewCvTopBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 9999,
  },
  viewCvTopBtnText: {
    fontFamily: THEME.typography.fontFamily.mainBold,
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    marginTop: 4,
  },
  name: {
    fontFamily: THEME.typography.fontFamily.mainExtraBold,
    fontSize: 22,
    fontWeight: '800',
    color: '#0D0D11',
  },
  heroInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 6,
  },
  heroInfoText: {
    fontFamily: THEME.typography.fontFamily.secondaryMedium,
    fontSize: 13,
    color: '#0D0D11',
    fontWeight: '600',
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
  detailIcon: {
    width: 22,
    marginTop: 2,
    marginRight: 12,
  },
  detailCopy: { flex: 1 },
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
    alignItems: 'flex-start',
    backgroundColor: '#FFF4ED',
  },
  chatHintIcon: {
    marginTop: 2,
    marginRight: 12,
  },
  chatHintCopy: { flex: 1 },
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

