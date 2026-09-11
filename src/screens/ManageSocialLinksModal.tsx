import React, { useState, useEffect } from 'react';
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
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  fetchUserSocialLinks,
  updateUserSocialLinks,
  SocialLinkItem,
} from '../api/accountApi';

export interface ManageSocialLinksModalProps {
  visible: boolean;
  onClose: () => void;
  token?: string | null;
  onSaved?: () => void;
}

export interface PlatformConfig {
  key: string;
  name: string;
  icon: string;
  color: string;
  placeholder: string;
}

const PLATFORMS: PlatformConfig[] = [
  { key: 'facebook', name: 'Facebook', icon: 'logo-facebook', color: '#1877F2', placeholder: 'https://facebook.com/username or @handle' },
  { key: 'instagram', name: 'Instagram', icon: 'logo-instagram', color: '#E1306C', placeholder: 'https://instagram.com/username or @handle' },
  { key: 'tiktok', name: 'TikTok', icon: 'logo-tiktok', color: '#000000', placeholder: 'https://tiktok.com/@username or @handle' },
  { key: 'twitter', name: 'Twitter / X', icon: 'logo-twitter', color: '#1DA1F2', placeholder: 'https://x.com/username or @handle' },
  { key: 'linkedin', name: 'LinkedIn', icon: 'logo-linkedin', color: '#0A66C2', placeholder: 'https://linkedin.com/in/username' },
  { key: 'telegram', name: 'Telegram', icon: 'paper-plane', color: '#0088CC', placeholder: 'https://t.me/username or @handle' },
  { key: 'whatsapp', name: 'WhatsApp', icon: 'logo-whatsapp', color: '#25D366', placeholder: 'https://wa.me/639123456789' },
  { key: 'viber', name: 'Viber', icon: 'chatbubble-ellipses', color: '#7360F2', placeholder: 'viber://chat?number=...' },
  { key: 'website', name: 'Personal Website', icon: 'globe-outline', color: '#4B5563', placeholder: 'https://yourwebsite.com' },
];

export function ManageSocialLinksModal({
  visible,
  onClose,
  token,
  onSaved,
}: ManageSocialLinksModalProps) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [links, setLinks] = useState<SocialLinkItem[]>([]);
  const [showPublic, setShowPublic] = useState(true);

  const [selectedPlatform, setSelectedPlatform] = useState<PlatformConfig>(PLATFORMS[0]!);
  const [inputUrl, setInputUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (visible && token) {
      setLoading(true);
      setErrorMessage(null);
      fetchUserSocialLinks(token)
        .then((res) => {
          setLinks(res.social_links || []);
          setShowPublic(res.show_social_links !== false);
        })
        .catch((err) => {
          console.warn('[ManageSocialLinksModal] fetch error:', err);
          setErrorMessage('Could not load existing links.');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [visible, token]);

  const handleAddLink = () => {
    setErrorMessage(null);
    const trimmed = inputUrl.trim();
    if (!trimmed) {
      setErrorMessage('Please enter a profile link or username handle.');
      return;
    }

    if (links.length >= 5) {
      setErrorMessage('You can add a maximum of 5 social accounts.');
      return;
    }

    // Check duplicate platform (except personal website)
    if (selectedPlatform.key !== 'website') {
      const alreadyHasPlatform = links.some(
        (l) => l.platform?.toLowerCase() === selectedPlatform.key
      );
      if (alreadyHasPlatform) {
        setErrorMessage(`You have already added a ${selectedPlatform.name} account.`);
        return;
      }
    }

    const newLinkItem: SocialLinkItem = {
      platform: selectedPlatform.key,
      platform_name: selectedPlatform.name,
      url: trimmed,
      handle: trimmed.startsWith('@') ? trimmed.slice(1) : undefined,
    };

    setLinks((prev) => [...prev, newLinkItem]);
    setInputUrl('');
  };

  const handleRemoveLink = (idxToRemove: number) => {
    setErrorMessage(null);
    setLinks((prev) => prev.filter((_, idx) => idx !== idxToRemove));
  };

  const handleSave = async () => {
    if (!token) {
      Alert.alert('Error', 'You must be logged in.');
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      await updateUserSocialLinks(token, {
        social_links: links.map((l) => ({ platform: l.platform, url: l.url })),
        show_social_links: showPublic,
      });

      Alert.alert('Success', 'Social links updated successfully!');
      onSaved?.();
      onClose();
    } catch (err: any) {
      const msg = err?.message || 'Failed to update social links.';
      setErrorMessage(msg);
    } finally {
      setSaving(false);
    }
  };

  const getPlatformMeta = (platformKey: string) => {
    const found = PLATFORMS.find((p) => p.key === platformKey.toLowerCase());
    return (
      found || {
        key: platformKey,
        name: platformKey.charAt(0).toUpperCase() + platformKey.slice(1),
        icon: 'globe-outline',
        color: '#4B5563',
      }
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={() => {
        if (!saving) onClose();
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => {
            if (!saving) onClose();
          }}
        />

        <View
          style={[
            styles.modalSheet,
            { paddingBottom: Math.max(insets.bottom, 20) },
          ]}
        >
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Social Links & Contacts</Text>
              <Text style={styles.sheetSubtitle}>
                Add external accounts so clients can connect ({links.length}/5)
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={styles.closeBtn}
              disabled={saving}
            >
              <Ionicons name="close" size={22} color="#666" />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FFB43B" />
              <Text style={styles.loadingText}>Loading social accounts...</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.sheetBody}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Error Banner */}
              {errorMessage && (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={16} color="#C0392B" />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              {/* Public Visibility Toggle */}
              <View style={styles.toggleRow}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={styles.toggleLabel}>Display on Public Profile</Text>
                  <Text style={styles.toggleSubtext}>
                    When enabled, clients viewing your profile can see these links.
                  </Text>
                </View>
                <Switch
                  value={showPublic}
                  onValueChange={setShowPublic}
                  trackColor={{ false: '#E0E0E0', true: '#FFB43B' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Existing Links List */}
              <Text style={styles.sectionLabel}>YOUR LINKED ACCOUNTS</Text>
              {links.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="link-outline" size={26} color="#BDBDBD" />
                  <Text style={styles.emptyText}>No social accounts added yet.</Text>
                  <Text style={styles.emptySubtext}>
                    Add your Facebook, WhatsApp, or Instagram below.
                  </Text>
                </View>
              ) : (
                <View style={styles.linksList}>
                  {links.map((item, idx) => {
                    const meta = getPlatformMeta(item.platform);
                    return (
                      <View key={`${item.platform}-${idx}`} style={styles.linkCard}>
                        <View
                          style={[
                            styles.platformIconWrap,
                            { backgroundColor: `${meta.color}15` },
                          ]}
                        >
                          <Ionicons
                            name={meta.icon as any}
                            size={20}
                            color={meta.color}
                          />
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.linkPlatformTitle}>
                            {item.platform_name || meta.name}
                          </Text>
                          <Text style={styles.linkUrlText} numberOfLines={1}>
                            {item.handle ? `@${item.handle}` : item.url}
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => handleRemoveLink(idx)}
                          hitSlop={8}
                          style={styles.deleteLinkBtn}
                        >
                          <Ionicons name="trash-outline" size={18} color="#E74C3C" />
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Add New Link Section */}
              {links.length < 5 && (
                <View style={styles.addSection}>
                  <Text style={styles.sectionLabel}>ADD A NEW ACCOUNT</Text>

                  {/* Horizontal Platform Picker */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.platformsScroll}
                    contentContainerStyle={styles.platformsContent}
                  >
                    {PLATFORMS.map((p) => {
                      const isSelected = selectedPlatform.key === p.key;
                      return (
                        <Pressable
                          key={p.key}
                          style={[
                            styles.platformChip,
                            isSelected && {
                              borderColor: p.color,
                              backgroundColor: `${p.color}15`,
                            },
                          ]}
                          onPress={() => {
                            setSelectedPlatform(p);
                            setErrorMessage(null);
                          }}
                        >
                          <Ionicons
                            name={p.icon as any}
                            size={16}
                            color={isSelected ? p.color : '#666'}
                            style={{ marginRight: 6 }}
                          />
                          <Text
                            style={[
                              styles.platformChipText,
                              isSelected && { color: p.color, fontWeight: '700' },
                            ]}
                          >
                            {p.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>

                  {/* Input Box */}
                  <View style={styles.inputRow}>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.textInput}
                        placeholder={selectedPlatform.placeholder}
                        placeholderTextColor="#999"
                        value={inputUrl}
                        onChangeText={(val) => {
                          setInputUrl(val);
                          if (errorMessage) setErrorMessage(null);
                        }}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="url"
                      />
                    </View>
                    <Pressable
                      style={[
                        styles.addBtn,
                        !inputUrl.trim() && styles.addBtnDisabled,
                      ]}
                      onPress={handleAddLink}
                      disabled={!inputUrl.trim()}
                    >
                      <Ionicons name="add" size={20} color="#FFFFFF" />
                      <Text style={styles.addBtnText}>Add</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.footerBtns}>
                <Pressable
                  style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={18}
                        color="#FFFFFF"
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.saveBtnText}>Save Changes</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    paddingTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  sheetSubtitle: {
    fontSize: 12,
    color: '#777777',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  sheetBody: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDEDEC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FADBD8',
  },
  errorText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#C0392B',
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  toggleSubtext: {
    fontSize: 11,
    color: '#777777',
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  emptyText: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '600',
    color: '#757575',
  },
  emptySubtext: {
    fontSize: 11,
    color: '#9E9E9E',
    marginTop: 2,
  },
  linksList: {
    gap: 8,
    marginBottom: 16,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  platformIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkPlatformTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  linkUrlText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  deleteLinkBtn: {
    padding: 6,
  },
  addSection: {
    marginTop: 6,
    marginBottom: 20,
  },
  platformsScroll: {
    marginBottom: 10,
  },
  platformsContent: {
    gap: 8,
    paddingVertical: 2,
  },
  platformChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  platformChipText: {
    fontSize: 12,
    color: '#555555',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 12,
    height: 44,
    justifyContent: 'center',
  },
  textInput: {
    fontSize: 13,
    color: '#1A1A1A',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFB43B',
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
  },
  addBtnDisabled: {
    backgroundColor: '#FFD99B',
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 2,
  },
  footerBtns: {
    marginTop: 4,
    marginBottom: 14,
  },
  saveBtn: {
    backgroundColor: '#FFB43B',
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#FFB43B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
