import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  ScrollView,
  Pressable,
  Modal,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fetchPublicProfile, PublicProfile } from '../api/accountApi';
import { fetchReviewSummary, fetchUserReviews, ReviewItem, ReviewSummaryData } from '../api/reviewApi';
import { formatRegisteredLocation } from '../services/locationService';
import THEME from '../config/theme';

export interface UserProfileModalProps {
  visible: boolean;
  onClose: () => void;
  userId?: string;
  token?: string | null;
  prefilledName?: string;
  prefilledAvatar?: string;
  prefilledRole?: string;
}

function formatMemberSince(isoDate?: string): string {
  if (!isoDate) return '';
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return '';
    return `Member since ${d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
  } catch {
    return '';
  }
}

function getSentimentBadgeStyle(sentiment?: string) {
  const s = String(sentiment || '').trim().toLowerCase();
  if (s.includes('neg')) {
    return {
      bg: '#FFF1F2',
      border: '#FECDD3',
      text: '#BE123C',
    };
  }
  if (s.includes('neu')) {
    return {
      bg: '#F1F5F9',
      border: '#E2E8F0',
      text: '#475569',
    };
  }
  return {
    bg: '#ECFDF5',
    border: '#A7F3D0',
    text: '#065F46',
  };
}

export function UserProfileModal({
  visible,
  onClose,
  userId,
  token,
  prefilledName = 'User',
  prefilledAvatar,
  prefilledRole = 'Member',
}: UserProfileModalProps) {
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [summary, setSummary] = useState<ReviewSummaryData | null>(null);
  const [loading, setLoading] = useState(false);

  const fallbackAvatar =
    prefilledAvatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(prefilledName || 'User')}&background=FFB43B&color=fff&size=200`;

  const activeAvatar = profile?.profile_link || fallbackAvatar;
  const displayName = profile?.full_name || prefilledName;
  const displayRole = profile?.account_type || prefilledRole;

  useEffect(() => {
    if (!visible || !userId || !token) return;

    let isMounted = true;
    setLoading(true);

    // 1. Fetch public profile
    fetchPublicProfile(token, userId)
      .then((data) => {
        if (isMounted) setProfile(data);
      })
      .catch((err) => {
        console.warn('[UserProfileModal] fetchPublicProfile failed:', err);
      });

    // 2. Fetch review summary
    fetchReviewSummary(token, userId)
      .then((data) => {
        if (isMounted && data) setSummary(data);
      })
      .catch((err) => {
        console.warn('[UserProfileModal] fetchReviewSummary failed:', err);
      });

    // 3. Fetch user reviews
    fetchUserReviews(token, userId)
      .then((data) => {
        if (isMounted && data) setReviews(data);
      })
      .catch((err) => {
        console.warn('[UserProfileModal] fetchUserReviews failed:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [visible, userId, token]);

  const locationText = formatRegisteredLocation(profile?.street, profile?.city, profile?.province);
  const memberSince = formatMemberSince(profile?.date_joined);
  const isVerified = profile?.verification_status === 'Verified';

  // Sentiment calculations
  const totalReviews = summary?.total_reviews ?? reviews.length;
  const averageRating = summary?.average_rating ?? (reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : '5.0');
  const positiveSentiment = summary?.sentiment_breakdown?.Positive ?? (reviews.filter((r) => r.nlp_sentiment === 'Positive').length || (totalReviews > 0 ? totalReviews : 1));
  const positivePercentage = totalReviews > 0 ? Math.round((positiveSentiment / totalReviews) * 100) : 100;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
          <Pressable onPress={onClose} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </Pressable>
          <Text style={styles.headerTitle}>User Profile</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.scrollBody}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Hero Card (Clean Rounded Peach Neo-Pop Card) */}
          <View style={styles.heroCard}>
            <View style={styles.avatarContainer}>
              <Image source={{ uri: activeAvatar }} style={styles.avatarImage} />
            </View>

            <View style={styles.nameRow}>
              <Text style={styles.profileName}>{displayName}</Text>
              {isVerified && (
                <Ionicons name="checkmark-circle" size={20} color="#10B981" style={{ marginLeft: 6 }} />
              )}
            </View>

            <Text style={styles.heroSubRoleText}>{displayRole}</Text>

            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color="#6B7280" />
              <Text style={styles.locationText}>{locationText}</Text>
            </View>

            {profile?.contact_number ? (
              <Pressable
                style={styles.contactRow}
                onPress={() => profile.contact_number && Linking.openURL(`tel:${profile.contact_number}`)}
              >
                <Ionicons name="call" size={13} color="#9CA3AF" />
                <Text style={styles.contactText}>{profile.contact_number}</Text>
              </Pressable>
            ) : null}

            {/* Separator Line */}
            <View style={styles.heroDividerLine} />

            {/* Worker / Client Sentiment Track */}
            <View style={styles.sentimentCard}>
              <Text style={styles.sentimentLabel}>
                {displayRole.toLowerCase().includes('kasambahay') ? 'Client Sentiment' : 'Worker Sentiment'}
              </Text>
              <View style={styles.sentimentTrack}>
                <View
                  style={[
                    styles.sentimentFill,
                    {
                      width: `${totalReviews > 0 ? Math.min(100, Math.max(10, positivePercentage)) : 0}%`,
                      backgroundColor: totalReviews > 0 ? '#22C55E' : '#E5E7EB',
                    },
                  ]}
                />
              </View>
              <Text style={[styles.sentimentScore, totalReviews === 0 && { color: '#9CA3AF' }]}>
                {totalReviews > 0 ? `${positivePercentage}% Positive` : 'No reviews yet'}
              </Text>
            </View>

            {/* Tags Pill Row */}
            {profile?.user_tags && profile.user_tags.length > 0 ? (
              <View style={styles.heroTagsWrap}>
                {profile.user_tags.map((tag, idx) => (
                  <View key={`${tag}-${idx}`} style={styles.heroTagPill}>
                    <Text style={styles.heroTagPillText}>{tag}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          {/* About / Bio Section */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeading}>About</Text>
            {loading && !profile ? (
              <ActivityIndicator size="small" color="#FFB43B" style={{ alignSelf: 'flex-start', marginVertical: 8 }} />
            ) : profile?.user_about && profile.user_about !== 'No Bio' && profile.user_about.trim() !== '' ? (
              <Text style={styles.bioText}>{profile.user_about}</Text>
            ) : (
              <View style={styles.emptyBioRow}>
                <Ionicons name="information-circle-outline" size={18} color="#9E9E9E" />
                <Text style={styles.emptyBioText}>No bio provided yet.</Text>
              </View>
            )}
          </View>

          {/* Resume / CV Section (for Kasambahay) */}
          {profile?.resume_url ? (
            <View style={styles.sectionContainer}>
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
            <View style={styles.sectionContainer}>
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

          {/* Reviews Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.reviewsHeaderRow}>
              <Text style={styles.sectionHeading}>Reviews & Feedback</Text>
              <Text style={styles.reviewCountBadge}>{totalReviews}</Text>
            </View>

            {loading ? (
              <ActivityIndicator size="small" color="#FFB43B" style={{ marginVertical: 16 }} />
            ) : reviews.length > 0 ? (
              reviews.map((item) => {
                const badgeStyle = getSentimentBadgeStyle(item.nlp_sentiment);
                return (
                  <View key={item.review_id} style={styles.reviewCard}>
                    <View style={styles.reviewCardHeader}>
                      <View style={styles.starsGroup}>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Ionicons
                            key={i}
                            name={i <= item.rating ? 'star' : 'star-outline'}
                            size={13}
                            color="#FFB43B"
                            style={{ marginRight: 2 }}
                          />
                        ))}
                      </View>
                      <View
                        style={[
                          styles.sentimentChip,
                          {
                            backgroundColor: badgeStyle.bg,
                            borderColor: badgeStyle.border,
                            borderWidth: 1,
                          },
                        ]}
                      >
                        <Text style={[styles.sentimentChipText, { color: badgeStyle.text }]}>
                          {item.nlp_sentiment || 'Positive'}
                        </Text>
                      </View>
                    </View>

                  <Text style={styles.reviewFeedback}>"{item.unstructured_feedback}"</Text>

                  <View style={styles.reviewFooter}>
                    <Text style={styles.reviewerName}>— {item.reviewer_name || 'Verified Client'}</Text>
                    {item.createdAt ? (
                      <Text style={styles.reviewDate}>
                        {new Date(item.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })
            ) : (
              <View style={styles.emptyReviewsCard}>
                <Ionicons name="chatbubbles-outline" size={32} color="#D1D5DB" />
                <Text style={styles.emptyReviewsTitle}>No reviews yet</Text>
                <Text style={styles.emptyReviewsSubtitle}>
                  Reviews from completed bookings will appear here.
                </Text>
              </View>
            )}
          </View>

          {/* Action Button: Return to Conversation */}
          <View style={styles.actionBtnContainer}>
            <Pressable style={styles.messageBtn} onPress={onClose}>
              <Ionicons name="chatbubble-ellipses" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.messageBtnText}>Message {displayName.split(' ')[0]}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: THEME.typography.fontFamily.mainBold,
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: '#FFE9D5',
    borderRadius: 32,
    paddingHorizontal: 22,
    paddingBottom: 22,
    paddingTop: 18,
    marginTop: 38,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  avatarContainer: {
    position: 'relative',
    alignSelf: 'flex-start',
    marginTop: -48,
    marginLeft: 2,
    marginBottom: 12,
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 4,
    borderColor: '#FFE9D5',
    backgroundColor: '#F3F4F6',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    alignSelf: 'flex-start',
    marginBottom: 2,
  },
  profileName: {
    fontFamily: THEME.typography.fontFamily.mainExtraBold,
    fontSize: 22,
    fontWeight: '800',
    color: '#0D0D11',
    textAlign: 'left',
  },
  heroSubRoleText: {
    fontFamily: THEME.typography.fontFamily.secondaryMedium,
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
    textAlign: 'left',
    alignSelf: 'flex-start',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginBottom: 10,
  },
  locationText: {
    fontFamily: THEME.typography.fontFamily.secondary,
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
    textAlign: 'left',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  contactText: {
    fontFamily: THEME.typography.fontFamily.secondaryMedium,
    fontSize: 12.5,
    color: '#374151',
    fontWeight: '600',
  },
  heroDividerLine: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(217, 119, 6, 0.25)',
    marginVertical: 12,
  },
  sentimentCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sentimentLabel: {
    fontFamily: THEME.typography.fontFamily.mainBold,
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0D0D11',
    marginRight: 8,
  },
  sentimentTrack: {
    flex: 1,
    height: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderRadius: 9999,
    overflow: 'hidden',
  },
  sentimentFill: {
    height: '100%',
    borderRadius: 9999,
  },
  sentimentScore: {
    fontFamily: THEME.typography.fontFamily.secondaryBold,
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
    marginLeft: 8,
  },
  heroTagsWrap: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 4,
  },
  heroTagPill: {
    backgroundColor: '#FFAC59',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  heroTagPillText: {
    fontFamily: THEME.typography.fontFamily.mainExtraBold,
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  sectionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  sectionHeading: {
    fontFamily: THEME.typography.fontFamily.mainBold,
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 10,
  },
  bioText: {
    fontFamily: THEME.typography.fontFamily.secondary,
    fontSize: 14,
    lineHeight: 21,
    color: '#4B5563',
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
  reviewsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewCountBadge: {
    fontFamily: THEME.typography.fontFamily.secondaryBold,
    fontSize: 12,
    fontWeight: '600',
    color: '#FFB43B',
    backgroundColor: '#FFF8EC',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  reviewCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  reviewCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  starsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sentimentChip: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  sentimentChipText: {
    fontFamily: THEME.typography.fontFamily.secondaryBold,
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  reviewFeedback: {
    fontFamily: THEME.typography.fontFamily.secondary,
    fontSize: 13,
    lineHeight: 18,
    color: '#374151',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  reviewFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewerName: {
    fontFamily: THEME.typography.fontFamily.secondaryMedium,
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  reviewDate: {
    fontFamily: THEME.typography.fontFamily.secondary,
    fontSize: 11,
    color: '#9CA3AF',
  },
  emptyReviewsCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  emptyReviewsTitle: {
    fontFamily: THEME.typography.fontFamily.mainBold,
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 8,
  },
  emptyReviewsSubtitle: {
    fontFamily: THEME.typography.fontFamily.secondary,
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 240,
  },
  actionBtnContainer: {
    marginTop: 8,
  },
  messageBtn: {
    backgroundColor: '#FFB43B',
    borderRadius: 14,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFB43B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  messageBtnText: {
    fontFamily: THEME.typography.fontFamily.mainBold,
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
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
