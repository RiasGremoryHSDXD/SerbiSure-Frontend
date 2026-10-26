import { useLanguage as useUiLanguage } from '../../../shared/localization/LanguageContext';
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchUserSocialLinks, updateUserSocialLinks, SocialLinkItem } from '../api/accountApi';

const logoSource = require('../../../../assets/serbisure-logo.png');

export interface ManageSocialLinksModalProps {
  visible: boolean;
  onClose: () => void;
  token?: string | null;
  currentTags?: string[];
  onSaveTags?: (newTags: string[]) => Promise<void>;
  onSaved?: () => void;
  accountType?: string;
}

const SUGGESTED_TAGS = [
  'Non-Smoker',
  'Respectful',
  'Pet Friendly',
  'Family-Oriented',
  'Organized',
  'Punctual',
  'Child Friendly',
  'Trustworthy',
  'Experienced',
];

interface PlatformDefinition {
  key: string;
  name: string;
  placeholder: string;
  renderIcon: () => React.ReactNode;
}

import { MaterialCommunityIcons } from '@expo/vector-icons';

export function isValidSocialLink(platform: string, url: string): boolean {
  const trimmed = (url || '').trim();
  if (!trimmed) return true;

  switch (platform.toLowerCase()) {
    case 'facebook':
    case 'fb':
      return /^(?:https?:\/\/)?(?:[a-zA-Z0-9-]+\.)*(?:facebook\.com|fb\.com|fb\.watch|fb\.me)\/[^\s]+$/i.test(trimmed);

    case 'instagram':
    case 'ig':
      return /^(?:https?:\/\/)?(?:[a-zA-Z0-9-]+\.)*(?:instagram\.com|instagr\.am|ig\.me)\/[^\s]+$/i.test(trimmed);

    case 'tiktok':
      return /^(?:https?:\/\/)?(?:[a-zA-Z0-9-]+\.)*tiktok\.com\/[^\s]+$/i.test(trimmed);

    case 'telegram':
    case 'tg':
      return /^(?:https?:\/\/)?(?:[a-zA-Z0-9-]+\.)*(?:t\.me|telegram\.me|telegram\.org)\/[^\s]+$/i.test(trimmed);

    case 'twitter':
    case 'x':
      return /^(?:https?:\/\/)?(?:[a-zA-Z0-9-]+\.)*(?:twitter\.com|x\.com)\/[^\s]+$/i.test(trimmed);

    case 'website':
      return /^(?:https?:\/\/)?(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(?:\/[^\s]*)?$/i.test(trimmed);

    default:
      return true;
  }
}

const SOCIAL_PLATFORMS: PlatformDefinition[] = [
  {
    key: 'facebook',
    name: 'Facebook',
    placeholder: 'Your facebook profile link',
    renderIcon: () => <Ionicons name="logo-facebook" size={26} color="#0D0D11" />,
  },
  {
    key: 'instagram',
    name: 'Instagram',
    placeholder: 'Your instagram profile link',
    renderIcon: () => <Ionicons name="logo-instagram" size={26} color="#0D0D11" />,
  },
  {
    key: 'tiktok',
    name: 'TikTok',
    placeholder: 'Your tiktok profile link',
    renderIcon: () => (
      <View
        style={{
          width: 25,
          height: 25,
          backgroundColor: '#0D0D11',
          borderRadius: 6,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="logo-tiktok" size={17} color="#FFFFFF" />
      </View>
    ),
  },
  {
    key: 'telegram',
    name: 'Telegram',
    placeholder: 'Your telegram profile link',
    renderIcon: () => (
      <Ionicons
        name="paper-plane-outline"
        size={23}
        color="#0D0D11"
        style={{ transform: [{ rotate: '-10deg' }] }}
      />
    ),
  },
  {
    key: 'twitter',
    name: 'Twitter / X',
    placeholder: 'Your twitter profile link',
    renderIcon: () => (
      <View
        style={{
          width: 25,
          height: 25,
          backgroundColor: '#0D0D11',
          borderRadius: 6,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            fontSize: 14,
            fontWeight: '900',
            color: '#FFFFFF',
            fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
            lineHeight: 16,
          }}
        >
          𝕏
        </Text>
      </View>
    ),
  },
  {
    key: 'website',
    name: 'Website',
    placeholder: 'Your personal website link',
    renderIcon: () => (
      <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="globe-outline" size={25} color="#0D0D11" />
        <MaterialCommunityIcons
          name="cursor-default"
          size={14}
          color="#0D0D11"
          style={{ position: 'absolute', bottom: -2, left: -2 }}
        />
      </View>
    ),
  },
];

export function ManageSocialLinksModal({
  visible,
  onClose,
  token,
  currentTags = [],
  onSaveTags,
  onSaved,
}: ManageSocialLinksModalProps) {
  const { tr: uiText } = useUiLanguage();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Tags State
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Social Links Map: platformKey -> url string
  const [socialMap, setSocialMap] = useState<Record<string, string>>({
    facebook: '',
    instagram: '',
    tiktok: '',
    telegram: '',
    twitter: '',
    website: '',
  });

  const inputRefs = useRef<Record<string, TextInput | null>>({});

  useEffect(() => {
    if (visible) {
      setTags([...(currentTags || [])]);
      setTagInput('');

      if (token) {
        setLoading(true);
        fetchUserSocialLinks(token)
          .then((res) => {
            const initialMap: Record<string, string> = {
              facebook: '',
              instagram: '',
              tiktok: '',
              telegram: '',
              twitter: '',
              website: '',
            };

            const existingList: SocialLinkItem[] = res.social_links || [];
            for (const item of existingList) {
              const p = (item.platform || '').toLowerCase().trim();
              if (p === 'fb' || p === 'facebook' || p.includes('facebook')) {
                initialMap.facebook = item.url;
              } else if (p === 'ig' || p === 'instagram' || p.includes('instagram')) {
                initialMap.instagram = item.url;
              } else if (p === 'tiktok' || p.includes('tiktok')) {
                initialMap.tiktok = item.url;
              } else if (p === 'tg' || p === 'telegram' || p.includes('telegram')) {
                initialMap.telegram = item.url;
              } else if (p === 'twitter' || p === 'x' || p.includes('twitter') || p === 'x.com') {
                initialMap.twitter = item.url;
              } else if (p === 'website' || p.includes('website') || p.includes('http')) {
                initialMap.website = item.url;
              }
            }

            setSocialMap(initialMap);
          })
          .catch((err) => {
            console.log('[ManageSocialLinksModal] fetch error:', err?.message || err);
          })
          .finally(() => {
            setLoading(false);
          });
      }
    }
  }, [visible, token, currentTags]);

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  const handleAddTag = (textToAdd?: string) => {
    const rawTag = (textToAdd !== undefined ? textToAdd : tagInput).trim();
    if (!rawTag) return;

    if (tags.length >= 10) {
      Alert.alert(uiText('Limit Reached'), uiText('You can add up to 10 tags only.'));
      return;
    }

    if (rawTag.length > 20) {
      Alert.alert(uiText('Tag Too Long'), uiText('Each tag must be 20 characters or fewer.'));
      return;
    }

    const isDuplicate = tags.some((t) => t.toLowerCase() === rawTag.toLowerCase());
    if (isDuplicate) return;

    setTags((prev) => [...prev, rawTag]);
    if (textToAdd === undefined) {
      setTagInput('');
    }
  };

  const handleRemoveTag = (indexToRemove: number) => {
    setTags((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSave = async () => {
    if (!token) {
      Alert.alert(uiText('Error'), uiText('You must be logged in.'));
      return;
    }

    for (const platform of SOCIAL_PLATFORMS) {
      const val = (socialMap[platform.key] || '').trim();
      if (val && !isValidSocialLink(platform.key, val)) {
        Alert.alert(
          uiText('Invalid Link'),
          uiText(`Please enter a valid ${platform.name} profile link.`)
        );
        inputRefs.current[platform.key]?.focus();
        return;
      }
    }

    setSaving(true);
    try {
      if (onSaveTags) {
        await onSaveTags(tags);
      }

      const activeLinks = Object.entries(socialMap)
        .filter(([_, url]) => url && url.trim().length > 0)
        .map(([platform, url]) => {
          const trimmed = url.trim();
          const normalizedUrl = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
          return {
            platform,
            url: normalizedUrl,
          };
        });

      await updateUserSocialLinks(token, {
        social_links: activeLinks,
        show_social_links: true,
      });

      onSaved?.();
      handleClose();
    } catch (err: any) {
      Alert.alert(uiText('Unable to Save'), err?.message || uiText('Failed to update details.'));
    } finally {
      setSaving(false);
    }
  };

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
        {/* Top Header */}
        <View style={styles.header}>
          <Pressable onPress={handleClose} disabled={saving} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color="#0D0D11" />
          </Pressable>

          <View style={styles.headerTitleCenter}>
            <Text style={styles.headerTitle}>Tags & Socials</Text>
          </View>

          <View style={styles.headerRight}>
            <Image source={logoSource} style={styles.logo} resizeMode="contain" />
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFB380" />
            <Text style={styles.loadingText}>{uiText("Loading profile details...")}</Text>
          </View>
        ) : (
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              style={styles.scrollBody}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* 1. PROFILE TAGS SECTION */}
              <Text style={styles.sectionHeader}>{uiText("PROFILE TAGS")}</Text>

              {/* Active Tags Wrap */}
              {tags.length > 0 && (
                <View style={styles.tagsWrap}>
                  {tags.map((tagItem, idx) => (
                    <View key={`${tagItem}-${idx}`} style={styles.tagPill}>
                      <Text style={styles.tagPillText}>{tagItem}</Text>
                      <Pressable
                        onPress={() => handleRemoveTag(idx)}
                        hitSlop={8}
                        style={styles.tagCloseBtn}
                        accessibilityLabel={`Remove ${tagItem}`}
                      >
                        <Ionicons name="close-circle" size={17} color="#0D0D11" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              {/* Custom Tag Input Row */}
              <View style={styles.customTagRow}>
                <TextInput
                  style={styles.customTagInput}
                  placeholder={uiText("Custom tag (e.g. Non-Smoker)")}
                  placeholderTextColor="#9CA3AF"
                  value={tagInput}
                  onChangeText={setTagInput}
                  maxLength={20}
                  returnKeyType="done"
                  onSubmitEditing={() => handleAddTag()}
                />
                <Pressable
                  style={styles.addCustomTagBtn}
                  onPress={() => handleAddTag()}
                >
                  <Text style={styles.addCustomTagBtnText}>+ Add</Text>
                </Pressable>
              </View>

              {/* 2. QUICK SUGGESTIONS SECTION */}
              <Text style={[styles.sectionHeader, { marginTop: 18 }]}>{uiText("QUICK SUGGESTIONS")}</Text>
              <View style={styles.suggestionsWrap}>
                {SUGGESTED_TAGS.map((sug) => {
                  const isAdded = tags.some((t) => t.toLowerCase() === sug.toLowerCase());
                  return (
                    <Pressable
                      key={sug}
                      style={[styles.suggestionPill, isAdded && styles.suggestionPillAdded]}
                      onPress={() => handleAddTag(sug)}
                      disabled={isAdded}
                    >
                      <Text style={[styles.suggestionPillText, isAdded && styles.suggestionPillTextAdded]}>
                        + {sug}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* 3. SOCIAL MEDIA SECTION */}
              <Text style={[styles.sectionHeader, { marginTop: 22 }]}>{uiText("SOCIAL MEDIA")}</Text>

              <View style={styles.socialList}>
                {SOCIAL_PLATFORMS.map((platform) => {
                  const currentVal = socialMap[platform.key] || '';
                  const hasVal = currentVal.trim().length > 0;
                  const isInvalid = hasVal && !isValidSocialLink(platform.key, currentVal);

                  return (
                    <View key={platform.key} style={styles.socialRow}>
                      <View style={styles.socialIconBox}>
                        {platform.renderIcon()}
                      </View>

                      <TextInput
                        ref={(r) => {
                          inputRefs.current[platform.key] = r;
                        }}
                        style={[styles.socialInput, isInvalid && styles.socialInputError]}
                        placeholder={platform.placeholder}
                        placeholderTextColor="#9CA3AF"
                        value={currentVal}
                        onChangeText={(val) =>
                          setSocialMap((prev) => ({ ...prev, [platform.key]: val }))
                        }
                        autoCapitalize="none"
                        autoCorrect={false}
                      />

                      {hasVal ? (
                        <Pressable
                          style={styles.removeBtn}
                          onPress={() =>
                            setSocialMap((prev) => ({ ...prev, [platform.key]: '' }))
                          }
                          accessibilityRole="button"
                          accessibilityLabel={`Remove ${platform.name}`}
                        >
                          <Text style={styles.removeBtnText}>{uiText("Remove")}</Text>
                        </Pressable>
                      ) : (
                        <Pressable
                          style={styles.addBtn}
                          onPress={() => inputRefs.current[platform.key]?.focus()}
                          accessibilityRole="button"
                          accessibilityLabel={`Add ${platform.name}`}
                        >
                          <Text style={styles.addBtnText}>+ Add</Text>
                        </Pressable>
                      )}
                    </View>
                  );
                })}
              </View>
            </ScrollView>

            {/* Bottom Sticky Action Bar with Save Changes */}
            <View style={styles.bottomBar}>
              <View style={styles.dividerLine} />
              <Pressable
                style={[styles.saveChangesBtn, saving && { opacity: 0.7 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveChangesBtnText}>{uiText("Save Changes")}</Text>
                )}
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        )}
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
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    backgroundColor: '#F6F5F2',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerTitleCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0D0D11',
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  logo: {
    width: 30,
    height: 30,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
  },
  sectionHeader: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: 0.4,
    marginBottom: 10,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFAA7A',
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 7,
    borderRadius: 9999,
  },
  tagPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0D0D11',
    marginRight: 6,
  },
  tagCloseBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  customTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  customTagInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#EBEBED',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 13,
    color: '#0D0D11',
  },
  addCustomTagBtn: {
    backgroundColor: '#000000',
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCustomTagBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  suggestionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  suggestionPill: {
    backgroundColor: '#FFAA7A',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  suggestionPillAdded: {
    opacity: 0.45,
  },
  suggestionPillText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#0D0D11',
  },
  suggestionPillTextAdded: {
    color: '#374151',
  },
  socialList: {
    gap: 12,
  },
  socialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  socialIconBox: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialInput: {
    flex: 1,
    height: 42,
    backgroundColor: '#EBEBED',
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 12,
    color: '#0D0D11',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  socialInputError: {
    borderColor: '#EF4444',
  },
  removeBtn: {
    backgroundColor: '#FF3B30',
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
  },
  removeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  addBtn: {
    backgroundColor: '#000000',
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#F6F5F2',
  },
  dividerLine: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 14,
  },
  saveChangesBtn: {
    backgroundColor: '#0D0D11',
    height: 52,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveChangesBtnText: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
