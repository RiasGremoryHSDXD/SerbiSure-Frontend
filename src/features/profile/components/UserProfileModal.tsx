import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Image, ScrollView, Pressable, Modal, ActivityIndicator, Linking, Alert, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePublicProfile } from '../hooks/usePublicProfile';
import { profileStyles } from '../styles';
import { ProfileTabs } from './ProfileTabs';
import { PublicPostsSection } from './PublicPostsSection';
import { ProfileAvatar } from '../../../shared/ui/ProfileAvatar';
import { useUser } from '../../auth/session/UserContext';
import { ChatDetailScreen } from '../../chat/components/ChatDetailScreen';
import { NotificationBell } from '../../notifications/NotificationContext';
import { useLanguage } from '../../../shared/localization/LanguageContext';
import { PROFILE_COPY } from '../profileConfig';
import { ReviewsSection } from './ReviewsSection';

import { formatRegisteredLocation } from '../../../shared/services/locationService';
import THEME from '../../../shared/theme/theme';

export interface UserProfileModalProps {
  visible: boolean;
  onClose: () => void;
  userId?: string;
  token?: string | null;
  prefilledName?: string;
  prefilledAvatar?: string;
  prefilledRole?: string;
  onMessage?: () => void;
}

export function UserProfileModal({
  visible,
  onClose,
  userId,
  token,
  prefilledName = 'User',
  prefilledAvatar,
  prefilledRole = 'Member',
  onMessage,
}: UserProfileModalProps) {
  const insets = useSafeAreaInsets();

  const { user } = useUser();
  const { t } = useLanguage();
  const effectiveToken = token || user.token;
  const { profile, reviews, summary, posts, loading, postsLoading, profileError, postsError, refreshPosts, markSubmitted } = usePublicProfile(visible, userId, effectiveToken);
  const [activeTab, setActiveTab] = useState<'posts' | 'reviews'>('posts');
  const [chatVisible, setChatVisible] = useState(false);
  const [isReviewsExpanded, setIsReviewsExpanded] = useState(false);
  const activeAvatar = profile?.profile_link || prefilledAvatar;
  const displayName = profile?.full_name || prefilledName;
  const displayRole = profile?.account_type || prefilledRole;
  const isWorker = displayRole === 'Kasambahay';
  useEffect(() => { setActiveTab('posts'); setChatVisible(false); setIsReviewsExpanded(false); }, [visible, userId]);

  const locationText = formatRegisteredLocation(profile?.street, profile?.city, profile?.province);
  const isVerified = profile?.verification_status === 'Verified';

  // Sentiment calculations
  const totalReviews = summary?.total_reviews ?? reviews.length;
  const positiveSentiment = summary?.sentiment_breakdown?.Positive ?? reviews.filter(r => r.nlp_sentiment === 'Positive').length;
  const positivePercentage = totalReviews > 0 ? Math.round((positiveSentiment / totalReviews) * 100) : 0;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={profileStyles.container}>
        {/* Top Header */}
        <View style={[profileStyles.headerTop, { paddingTop: insets.top + 8 }]}>
          <View style={profileStyles.headerSide}><Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onClose} style={profileStyles.backCircleButton} hitSlop={12}>
            <Ionicons name="arrow-back" size={20} color="#0D0D11" />
          </Pressable></View>
          <Image source={require('../../../../assets/serbisure-logo.png')} style={profileStyles.logo} resizeMode="contain" />
          <View style={[profileStyles.headerSide, profileStyles.headerSideRight]}><NotificationBell /></View>
        </View>

        <ScrollView
          style={styles.scrollBody}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 24 }}
          refreshControl={<RefreshControl refreshing={postsLoading} onRefresh={refreshPosts} tintColor="#FFB380" colors={['#FFB380']} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Hero Card (Clean Rounded Peach Neo-Pop Card) */}
          <View style={profileStyles.personalHeroCard}>
            <View style={profileStyles.personalAvatarWrapper}>
              <ProfileAvatar uri={activeAvatar} name={displayName} size={90} />
              {isVerified ? <View style={[profileStyles.cameraIconBadge, { backgroundColor: '#10B981' }]}><Ionicons name="shield-checkmark" size={13} color="#FFFFFF" /></View> : null}
            </View>

            <View style={profileStyles.personalNameRow}>
              <Text style={[profileStyles.personalName, { flexShrink: 1 }]}>{displayName}</Text>
              {isVerified && (
                <Ionicons name="checkmark-circle" size={20} color="#10B981" style={{ marginLeft: 6 }} />
              )}
            </View>

            <Text style={profileStyles.heroSubRoleText}>{displayRole}</Text>

            <View style={profileStyles.locationRow}>
              <Ionicons name="location-outline" size={14} color="#6B7280" />
              <Text style={profileStyles.locationText}>{locationText}</Text>
            </View>

            {profile?.show_contact_number && profile.contact_number ? (
              <View style={profileStyles.contactDetailsContainer}>
              <Pressable
                style={profileStyles.contactItemRow}
                onPress={() => profile.contact_number && Linking.openURL(`tel:${profile.contact_number}`)}
              >
                <Ionicons name="call" size={13} color="#9CA3AF" />
                <Text style={profileStyles.contactItemText}>{profile.contact_number}</Text>
              </Pressable>
              </View>
            ) : null}

            {/* Separator Line */}
            <View style={profileStyles.heroDividerLine} />

            {/* Worker / Client Sentiment Track */}
            <View style={profileStyles.sentimentCard}>
              <Text style={profileStyles.sentimentCardLabel}>
                {displayRole.toLowerCase().includes('kasambahay') ? 'Client Sentiment' : 'Worker Sentiment'}
              </Text>
              <View style={profileStyles.sentimentTrack}>
                <View
                  style={[
                    profileStyles.sentimentFill,
                    {
                      width: `${totalReviews > 0 ? Math.min(100, Math.max(10, positivePercentage)) : 0}%`,
                      backgroundColor: totalReviews > 0 ? '#22C55E' : '#E5E7EB',
                    },
                  ]}
                />
              </View>
              <Text style={[profileStyles.sentimentCardScore, totalReviews === 0 && { color: '#9CA3AF' }]}>
                {totalReviews > 0 ? `${positivePercentage}% Positive` : 'No reviews yet'}
              </Text>
            </View>

            {/* Tags Pill Row */}
            {profile?.user_tags && profile.user_tags.length > 0 ? (
              <View style={profileStyles.heroTagsWrap}>
                {profile.user_tags.map((tag, idx) => (
                  <View key={`${tag}-${idx}`} style={profileStyles.heroTagPill}>
                    <Text style={profileStyles.heroTagPillText}>{tag}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          {profileError ? <View style={profileStyles.sectionCard}><Text style={profileStyles.postsErrorSubtitle}>{profileError}</Text></View> : null}
          {/* About / Bio Section */}
          <View style={profileStyles.sectionCard}>
            <View style={profileStyles.sectionCardHeader}><View>
              <Text style={profileStyles.sectionCardTitle}>About {displayRole}</Text>
              <Text style={profileStyles.sectionCardSubtitle}>{isWorker ? 'Experience and background' : 'Household and expectations'}</Text>
            </View></View>
            {loading && !profile ? (
              <ActivityIndicator size="small" color="#FFB43B" style={{ alignSelf: 'flex-start', marginVertical: 8 }} />
            ) : profile?.user_about && profile.user_about !== 'No Bio' && profile.user_about.trim() !== '' ? (
              <View style={profileStyles.bioTextContainer}><Text style={profileStyles.bioBodyText}>{profile.user_about}</Text></View>
            ) : (
              <View style={styles.emptyBioRow}>
                <Ionicons name="information-circle-outline" size={18} color="#9E9E9E" />
                <Text style={styles.emptyBioText}>No bio provided yet.</Text>
              </View>
            )}
          </View>

          {/* Resume / CV Section (for Kasambahay) */}
          {profile?.resume_url ? (
            <View style={profileStyles.sectionCard}>
              <View style={styles.resumeHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="document-text" size={17} color="#FFB43B" style={{ marginRight: 6 }} />
                  <Text style={[styles.sectionHeading, { marginBottom: 0 }]}>Resume / CV</Text>
                </View>
                <Pressable
                  style={styles.viewResumeBtn}
                  onPress={() => profile.resume_url && Linking.openURL(profile.resume_url)}
                >
                  <Ionicons name="eye-outline" size={13} color="#333" style={{ marginRight: 4 }} />
                  <Text style={styles.viewResumeBtnText}>View PDF</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {/* Social Links & Alternative Contacts Section */}
          {profile?.social_links && profile.social_links.length > 0 ? (
            <View style={profileStyles.sectionCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Ionicons name="share-social-outline" size={17} color="#FFB43B" style={{ marginRight: 6 }} />
                <Text style={[styles.sectionHeading, { marginBottom: 0 }]}>Social Links & Contacts</Text>
              </View>
              <View style={styles.socialLinksList}>
                {profile.social_links.map((link, idx) => {
                  let iconName = 'globe-outline';
                  let iconColor = '#4B5563';
                  const p = (link.platform || '').toLowerCase();
                  if (p.includes('facebook')) { iconName = 'logo-facebook'; iconColor = '#1877F2'; }
                  else if (p.includes('instagram')) { iconName = 'logo-instagram'; iconColor = '#E1306C'; }
                  else if (p.includes('tiktok')) { iconName = 'logo-tiktok'; iconColor = '#000000'; }
                  else if (p.includes('twitter') || p === 'x') { iconName = 'logo-twitter'; iconColor = '#1DA1F2'; }
                  else if (p.includes('linkedin')) { iconName = 'logo-linkedin'; iconColor = '#0A66C2'; }
                  else if (p.includes('telegram')) { iconName = 'paper-plane'; iconColor = '#0088CC'; }
                  else if (p.includes('whatsapp')) { iconName = 'logo-whatsapp'; iconColor = '#25D366'; }
                  else if (p.includes('viber')) { iconName = 'chatbubble-ellipses'; iconColor = '#7360F2'; }
                  else if (p.includes('youtube')) { iconName = 'logo-youtube'; iconColor = '#FF0000'; }

                  return (
                    <Pressable
                      key={`${link.platform}-${idx}`}
                      style={styles.socialLinkItem}
                      onPress={() => {
                        if (link.url) {
                          Linking.openURL(link.url).catch(() => {
                            Alert.alert('Link Error', 'Could not open this external link.');
                          });
                        }
                      }}
                    >
                      <View style={[styles.socialIconWrap, { backgroundColor: `${iconColor}15` }]}>
                        <Ionicons name={iconName as any} size={18} color={iconColor} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.socialPlatformName}>
                          {link.platform_name || link.platform}
                        </Text>
                        <Text style={styles.socialHandleText} numberOfLines={1}>
                          {link.handle ? `@${link.handle}` : link.url}
                        </Text>
                      </View>
                      <Ionicons name="open-outline" size={15} color="#9CA3AF" />
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          <ProfileTabs activeTab={activeTab} onChange={setActiveTab} postsCount={posts.length} reviewsCount={totalReviews} />
          {activeTab === 'posts' ? <PublicPostsSection key={userId} posts={posts} loading={postsLoading} error={postsError} token={effectiveToken} ownerId={userId} ownerRole={displayRole} onRefresh={refreshPosts} onSubmitted={markSubmitted} /> : (
            <ReviewsSection profile={{ t, copy: PROFILE_COPY[isWorker ? 'kasambahay' : 'homeowner'], reviews, totalReviews, isReviewsExpanded, setIsReviewsExpanded }} />
          )}

          {/* Open a conversation with this profile. */}
          <View style={[styles.actionBtnContainer, { marginHorizontal: 16 }]}>
            <Pressable style={styles.messageBtn} disabled={!userId || !effectiveToken || user.id === userId} onPress={() => onMessage ? onMessage() : setChatVisible(true)}>
              <Ionicons name="chatbubble-ellipses" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.messageBtnText}>Message {displayName.split(' ')[0]}</Text>
            </Pressable>
          </View>
        </ScrollView>
        {chatVisible && <ChatDetailScreen visible={chatVisible} onClose={() => setChatVisible(false)} partnerId={userId} token={effectiveToken} contactName={displayName} contactRole={displayRole} contactAvatar={activeAvatar} userRole={user.accountType === 'Kasambahay' ? 'kasambahay' : 'homeowner'} />}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrollBody: {
    flex: 1,
  },
  sectionHeading: {
    fontFamily: THEME.typography.fontFamily.mainBold,
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 10,
  },
  emptyBioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  emptyBioText: {
    fontFamily: THEME.typography.fontFamily.secondary,
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  actionBtnContainer: {
    marginTop: 8,
  },
  messageBtn: {
    backgroundColor: '#FFB380',
    borderRadius: 14,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFB380',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  messageBtnText: {
    fontFamily: THEME.typography.fontFamily.mainBold,
    fontSize: 15,
    fontWeight: '700',
    color: '#0D0D11',
  },
  resumeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewResumeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF4E5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFE2B8',
  },
  viewResumeBtnText: {
    fontFamily: THEME.typography.fontFamily.mainBold,
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
  },
  socialLinksList: {
    gap: 8,
  },
  socialLinkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  socialIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialPlatformName: {
    fontFamily: THEME.typography.fontFamily.mainBold,
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  socialHandleText: {
    fontFamily: THEME.typography.fontFamily.secondary,
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
});
