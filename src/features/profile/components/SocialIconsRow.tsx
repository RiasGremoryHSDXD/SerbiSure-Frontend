import { useLanguage as useUiLanguage } from '../../../shared/localization/LanguageContext';
import React from 'react';
import { View, Text, StyleSheet, Pressable, Linking, StyleProp, ViewStyle, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SocialLinkItem } from '../api/accountApi';

interface Props {
  links?: SocialLinkItem[];
  editable?: boolean;
  onEdit?: () => void;
  style?: StyleProp<ViewStyle>;
}

interface PlatformConfig {
  bgColor: string;
  renderIcon: () => React.ReactNode;
}

const getPlatformConfig = (platformName: string): PlatformConfig => {
  const p = (platformName || '').toLowerCase().trim();

  if (p === 'facebook' || p.includes('facebook') || p === 'fb') {
    return {
      bgColor: '#1877F2',
      renderIcon: () => <Ionicons name="logo-facebook" size={20} color="#FFFFFF" />,
    };
  }

  if (p === 'instagram' || p.includes('instagram') || p === 'ig') {
    return {
      bgColor: '#E1306C',
      renderIcon: () => <Ionicons name="logo-instagram" size={20} color="#FFFFFF" />,
    };
  }

  if (p === 'tiktok' || p.includes('tiktok')) {
    return {
      bgColor: '#000000',
      renderIcon: () => <Ionicons name="logo-tiktok" size={19} color="#FFFFFF" />,
    };
  }

  if (p === 'twitter' || p === 'x' || p.includes('twitter') || p === 'x.com') {
    return {
      bgColor: '#000000',
      renderIcon: () => (
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: 16,
            fontWeight: '900',
            fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
            includeFontPadding: false,
          }}
        >
          𝕏
        </Text>
      ),
    };
  }

  if (p === 'telegram' || p.includes('telegram') || p === 'tg') {
    return {
      bgColor: '#2AABEE',
      renderIcon: () => (
        <Ionicons name="paper-plane" size={17} color="#FFFFFF" style={{ marginLeft: -2 }} />
      ),
    };
  }

  if (p === 'whatsapp' || p.includes('whatsapp') || p === 'wa') {
    return {
      bgColor: '#25D366',
      renderIcon: () => <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" />,
    };
  }

  if (p === 'linkedin' || p.includes('linkedin')) {
    return {
      bgColor: '#0A66C2',
      renderIcon: () => <Ionicons name="logo-linkedin" size={19} color="#FFFFFF" />,
    };
  }

  if (p === 'viber' || p.includes('viber')) {
    return {
      bgColor: '#7360F2',
      renderIcon: () => <Ionicons name="chatbubble-ellipses" size={18} color="#FFFFFF" />,
    };
  }

  return {
    bgColor: '#4B5563',
    renderIcon: () => <Ionicons name="globe-outline" size={19} color="#FFFFFF" />,
  };
};

export function SocialIconsRow({ links, editable = false, onEdit, style }: Props) {
  const { tr: uiText } = useUiLanguage();
  const validLinks = Array.isArray(links)
    ? links.filter((l) => l && l.url && l.url.trim().length > 0)
    : [];

  const handleOpen = (url: string) => {
    if (!url) return;
    const target = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    Linking.openURL(target).catch((err) => {
      console.warn('[SocialIconsRow] Could not open URL:', target, err);
    });
  };

  if (validLinks.length === 0) {
    if (!editable || !onEdit) return null;
    return (
      <View style={[styles.container, style]}>
        <View style={styles.rowLayout}>
          <Text style={styles.noSocialText}>{uiText("No social links yet")}</Text>
          <Pressable style={styles.editBtn} onPress={onEdit} hitSlop={6}>
            <Ionicons name="pencil" size={12} color="#0D0D11" />
            <Text style={styles.editBtnText}>{uiText('Edit')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.rowLayout}>
        <View style={styles.iconsWrap}>
          {validLinks.map((item, index) => {
            const config = getPlatformConfig(item.platform || '');
            return (
              <Pressable
                key={`${item.platform || 'social'}-${index}`}
                style={[styles.iconCircle, { backgroundColor: config.bgColor }]}
                onPress={() => handleOpen(item.url)}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={item.platform || 'Social Link'}
              >
                {config.renderIcon()}
              </Pressable>
            );
          })}
        </View>

        {editable && onEdit && (
          <Pressable style={styles.editBtn} onPress={onEdit} hitSlop={6}>
            <Ionicons name="pencil" size={12} color="#0D0D11" />
            <Text style={styles.editBtnText}>{uiText('Edit')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    width: '100%',
  },
  rowLayout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    minHeight: 38,
  },
  iconsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    flex: 1,
  },
  noSocialText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.15,
    shadowRadius: 2.5,
    elevation: 2,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9999,
    marginLeft: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D0D11',
    marginLeft: 4,
  },
  addSocialPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9999,
  },
  addSocialPillText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0D0D11',
  },
});
