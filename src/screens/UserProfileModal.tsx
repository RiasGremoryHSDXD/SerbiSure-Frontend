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

  const locationText = [profile?.city, profile?.province].filter(Boolean).join(', ') || 'Philippines';
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
          {/* Profile Hero Card */}
          <View style={styles.heroCard}>
            <View style={styles.avatarContainer}>
              <Image source={{ uri: activeAvatar }} style={styles.avatarImage} />
              {isVerified && (
                <View style={styles.verifiedCheckBadge}>
                  <Ionicons name="checkmark-circle" size={20} color="#2196F3" />
                </View>
              )}
            </View>

            <Text style={styles.profileName}>{displayName}</Text>

            <View style={styles.badgeRow}>
              <View style={styles.roleBadge}>
                <Ionicons
                  name={displayRole.toLowerCase().includes('kasambahay') ? 'briefcase-outline' : 'home-outline'}
                  size={13}
                  color="#FFB43B"
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.roleBadgeText}>{displayRole}</Text>
              </View>

              <View style={[styles.statusBadge, isVerified ? styles.statusBadgeVerified : styles.statusBadgePending]}>
                <Text style={[styles.statusBadgeText, isVerified ? styles.statusTextVerified : styles.statusTextPending]}>
                  {profile?.verification_status || 'Active Member'}
                </Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={14} color="#777" />
                <Text style={styles.metaText}>{locationText}</Text>
              </View>
              {memberSince ? (
                <View style={styles.metaItem}>
                  <Ionicons name="calendar-outline" size={14} color="#777" />
                  <Text style={styles.metaText}>{memberSince}</Text>
                </View>
              ) : null}
              {profile?.contact_number ? (
                <Pressable
                  style={styles.metaItem}
                  onPress={() => profile.contact_number && Linking.openURL(`tel:${profile.contact_number}`)}
                >
                  <Ionicons name="call-outline" size={14} color="#059669" />
                  <Text style={[styles.metaText, { color: '#059669', fontWeight: '600' }]}>
                    {profile.contact_number}
                  </Text>
                </Pressable>
              ) : (
                <View style={styles.metaItem}>
                  <Ionicons name="eye-off-outline" size={13} color="#9CA3AF" />
                  <Text style={[styles.metaText, { color: '#9CA3AF', fontStyle: 'italic' }]}>
                    Phone Private
                  </Text>
                </View>
              )}
            </View>

            {/* Client Sentiment Bar */}
            <View style={styles.sentimentCard}>
              <View style={styles.sentimentHeaderRow}>
                <Text style={styles.sentimentTitle}>Rating & Sentiment</Text>
                <View style={styles.starSummaryRow}>
                  <Ionicons name="star" size={15} color="#FFB43B" />
                  <Text style={styles.starSummaryScore}>{averageRating}</Text>
                  <Text style={styles.starSummaryCount}>({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})</Text>
                </View>
              </View>

              <View style={styles.sentimentBarRow}>
                <View style={styles.sentimentTrack}>
                  <View style={[styles.sentimentFill, { width: `${Math.min(100, Math.max(12, positivePercentage))}%` }]} />
                </View>
                <Text style={styles.sentimentPct}>{positivePercentage}% Positive</Text>
              </View>
            </View>

            {/* Tags Pill Row */}
            {profile?.user_tags && profile.user_tags.length > 0 ? (
              <View style={styles.tagsRow}>
                {profile.user_tags.map((tag, idx) => (
                  <View key={`${tag}-${idx}`} style={styles.tagPill}>
                    <Text style={styles.tagPillText}>{tag}</Text>
                  </View>
                ))}
              </View>
            ) : null}
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
              reviews.map((item) => (
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
                    <View style={styles.sentimentChip}>
                      <Text style={styles.sentimentChipText}>{item.nlp_sentiment || 'Positive'}</Text>
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
              ))
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
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarImage: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#F3F4F6',
    borderWidth: 3,
    borderColor: '#FFB43B',
  },
  verifiedCheckBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 6,
    textAlign: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8EC',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE2B3',
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeVerified: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  statusBadgePending: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextVerified: {
    color: '#2563EB',
  },
  statusTextPending: {
    color: '#6B7280',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 14,
    marginTop: 4,
    marginBottom: 14,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#6B7280',
  },
  sentimentCard: {
    width: '100%',
    backgroundColor: '#FBFBFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 4,
  },
  sentimentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sentimentTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  starSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  starSummaryScore: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  starSummaryCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  sentimentBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sentimentTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  sentimentFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  sentimentPct: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    marginTop: 14,
  },
  tagPill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  tagPillText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4B5563',
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
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 10,
  },
  bioText: {
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
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  reviewFeedback: {
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
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  reviewDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  emptyReviewsCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  emptyReviewsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 8,
  },
  emptyReviewsSubtitle: {
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
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  socialHandleText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
});
