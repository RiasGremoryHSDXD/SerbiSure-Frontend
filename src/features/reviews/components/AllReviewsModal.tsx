import { useLanguage as useUiLanguage } from '../../../shared/localization/LanguageContext';
import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, View, Modal, ScrollView, Pressable, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ReviewItem, SentimentType } from '../api/reviewApi';
import { averageReviewRating, validRating } from '../ratings';
import THEME from '../../../shared/theme/theme';

export interface AllReviewsModalProps {
  visible: boolean;
  onClose: () => void;
  reviews: ReviewItem[];
  averageRating?: number;
  positivePercentage?: number | null;
  title?: string;
}

type FilterTab = 'All' | 'Positive' | 'Neutral' | 'Negative';

export function AllReviewsModal({
  visible,
  onClose,
  reviews,
  averageRating,
  positivePercentage,
  title = 'Reviews & Feedback',
}: AllReviewsModalProps) {
  const { tr: uiText, formatDate } = useUiLanguage();
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All');

  const counts = useMemo(() => {
    if (!reviews) return { All: 0, Positive: 0, Neutral: 0, Negative: 0 };
    const pos = reviews.filter((r) => String(r.nlp_sentiment || '').toLowerCase().includes('pos')).length;
    const neu = reviews.filter((r) => String(r.nlp_sentiment || '').toLowerCase().includes('neu')).length;
    const neg = reviews.filter((r) => String(r.nlp_sentiment || '').toLowerCase().includes('neg')).length;
    return {
      All: reviews.length,
      Positive: pos,
      Neutral: neu,
      Negative: neg,
    };
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    if (!reviews) return [];
    if (activeFilter === 'All') return reviews;
    return reviews.filter((r) => String(r.nlp_sentiment || '').toLowerCase().includes(activeFilter.toLowerCase()));
  }, [reviews, activeFilter]);

  const computedAvg = useMemo(() => {
    if (!reviews?.length) return null;
    return validRating(averageRating) ?? averageReviewRating(reviews);
  }, [averageRating, reviews]);

  const getSentimentStyle = (sentiment?: SentimentType | string) => {
    switch (sentiment) {
      case 'Negative':
        return {
          bg: '#FFF1F2',
          text: '#BE123C',
          border: '#FECDD3',
          icon: 'alert-circle',
        };
      case 'Neutral':
        return {
          bg: '#F1F5F9',
          text: '#475569',
          border: '#E2E8F0',
          icon: 'remove-circle-outline',
        };
      case 'Positive':
        return {
          bg: '#ECFDF5',
          text: '#065F46',
          border: '#A7F3D0',
          icon: 'sparkles',
        };
      default:
        return { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0', icon: 'help-circle-outline' };
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header Bar */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{uiText(title)}</Text>
            <Text style={styles.headerSubtitle}>{uiText('{count} total reviews', { count: reviews.length })}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.body}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 24) + 20 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Summary Card */}
          <View style={styles.summaryCard}>
            <View style={styles.ratingBigWrap}>
              <Text style={styles.ratingBigText}>{computedAvg === null ? uiText('No ratings yet') : computedAvg.toFixed(1)}</Text>
              {computedAvg !== null && <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Ionicons
                    key={i}
                    name={i <= Math.round(computedAvg) ? 'star' : 'star-outline'}
                    size={16}
                    color="#FFB43B"
                    style={{ marginRight: 2 }}
                  />
                ))}
              </View>}
              <Text style={styles.summarySubText}>{uiText('Based on {count} reviews', { count: reviews.length })}</Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.sentimentOverview}>
              <View style={styles.sentimentPill}>
                <Ionicons name="sparkles" size={13} color="#059669" style={{ marginRight: 4 }} />
                <Text style={styles.sentimentPillText}>
                  {positivePercentage !== null && positivePercentage !== undefined
                    ? uiText('{count}% Positive', { count: positivePercentage })
                    : uiText('{count} Positive', { count: counts.Positive })}
                </Text>
              </View>
              <Text style={styles.sentimentHelperText}>
                {uiText('{neutral} Neutral · {negative} Negative', { neutral: counts.Neutral, negative: counts.Negative })}</Text>
            </View>
          </View>

          {/* Filter Chips Row */}
          <View style={styles.filterRow}>
            {(['All', 'Positive', 'Neutral', 'Negative'] as FilterTab[]).map((tab) => {
              const isActive = activeFilter === tab;
              const count = counts[tab];
              return (
                <Pressable
                  key={tab}
                  onPress={() => setActiveFilter(tab)}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                >
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                    {uiText(tab)} ({count})
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Review Cards List */}
          {filteredReviews.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbox-ellipses-outline" size={38} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>{activeFilter === 'All' ? uiText('No reviews yet') : uiText('No {sentiment} reviews', { sentiment: uiText(activeFilter) })}</Text>
              <Text style={styles.emptySubtitle}>{uiText("There are currently no reviews in this category.")}</Text>
            </View>
          ) : (
            filteredReviews.map((r) => {
              const badgeStyle = getSentimentStyle(r.nlp_sentiment);
              const rating = validRating(r.rating);
              const rawName = (r.reviewer_name || 'Reviewer').trim();
              const nameParts = rawName.split(/\s+/).filter(Boolean);
              const firstChar = nameParts[0]?.charAt(0) || '';
              const secondChar = nameParts[1]?.charAt(0) || '';
              const initials = (nameParts.length > 1 && firstChar && secondChar)
                ? `${firstChar}${secondChar}`.toUpperCase()
                : (firstChar ? nameParts[0]?.slice(0, 2).toUpperCase() || 'VC' : 'VC');

              return (
                <View key={r.review_id} style={styles.reviewCard}>
                  {/* Review Card Header */}
                  <View style={styles.cardHeader}>
                    <View style={styles.reviewerInfo}>
                      {r.reviewer_profile_link ? (
                        <Image source={{ uri: r.reviewer_profile_link }} style={styles.reviewerAvatar} />
                      ) : (
                        <View style={styles.initialsAvatar}>
                          <Text style={styles.initialsText}>{initials}</Text>
                        </View>
                      )}
                      <View style={{ marginLeft: 10, flex: 1 }}>
                        <Text style={styles.reviewerName} numberOfLines={1}>
                          {r.reviewer_name || uiText('Reviewer')}
                        </Text>
                        <Text style={styles.reviewDate}>
                          {r.createdAt
                            ? formatDate(r.createdAt)
                            : uiText('Date not provided')}
                        </Text>
                      </View>
                    </View>

                    {/* NLP Sentiment Badge */}
                    <View
                      style={[
                        styles.sentimentBadge,
                        { backgroundColor: badgeStyle.bg, borderColor: badgeStyle.border },
                      ]}
                    >
                      <Ionicons
                        name={badgeStyle.icon as any}
                        size={11}
                        color={badgeStyle.text}
                        style={{ marginRight: 3 }}
                      />
                      <Text style={[styles.sentimentBadgeText, { color: badgeStyle.text }]}>
                        {uiText(r.nlp_sentiment || 'Not analyzed')}
                      </Text>
                    </View>
                  </View>

                  {/* Stars Row */}
                  <View style={styles.ratingRow}>
                    {rating !== null && <View style={styles.starsWrap}>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Ionicons
                          key={i}
                          name={i <= rating ? 'star' : 'star-outline'}
                          size={15}
                          color="#FFB43B"
                          style={{ marginRight: 2 }}
                        />
                      ))}
                    </View>}
                    <Text style={styles.ratingNumberText}>{rating === null ? uiText('No rating provided') : rating.toFixed(1)}</Text>
                  </View>

                  {/* Feedback Text */}
                  <Text style={styles.feedbackText}>"{r.unstructured_feedback}"</Text>
                </View>
              );
            })
          )}
        </ScrollView>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EBE8E1',
  },
  backBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: THEME.typography.fontFamily.mainBold,
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  headerSubtitle: {
    fontFamily: THEME.typography.fontFamily.secondary,
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  body: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ECEAE4',
  },
  ratingBigWrap: {
    alignItems: 'center',
    paddingRight: 16,
  },
  ratingBigText: {
    fontFamily: THEME.typography.fontFamily.mainBold,
    fontSize: 34,
    fontWeight: '800',
    color: '#1A1A1A',
    lineHeight: 38,
  },
  starsRow: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  summarySubText: {
    fontFamily: THEME.typography.fontFamily.secondary,
    fontSize: 11,
    color: '#9CA3AF',
  },
  summaryDivider: {
    width: 1,
    height: 54,
    backgroundColor: '#E5E7EB',
    marginRight: 16,
  },
  sentimentOverview: {
    flex: 1,
    justifyContent: 'center',
  },
  sentimentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  sentimentPillText: {
    fontFamily: THEME.typography.fontFamily.secondaryBold,
    fontSize: 12.5,
    fontWeight: '700',
    color: '#065F46',
  },
  sentimentHelperText: {
    fontFamily: THEME.typography.fontFamily.secondary,
    fontSize: 11.5,
    color: '#6B7280',
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 14,
    gap: 8,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#1A1A1A',
    borderColor: '#1A1A1A',
  },
  filterChipText: {
    fontFamily: THEME.typography.fontFamily.secondaryBold,
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ECEAE4',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reviewerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  initialsAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontFamily: THEME.typography.fontFamily.mainBold,
    fontSize: 13,
    fontWeight: '700',
    color: '#EA580C',
  },
  reviewerName: {
    fontFamily: THEME.typography.fontFamily.mainBold,
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  reviewDate: {
    fontFamily: THEME.typography.fontFamily.secondary,
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 1,
  },
  sentimentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    borderWidth: 1,
  },
  sentimentBadgeText: {
    fontFamily: THEME.typography.fontFamily.secondaryBold,
    fontSize: 10.5,
    fontWeight: '700',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  starsWrap: {
    flexDirection: 'row',
    marginRight: 6,
  },
  ratingNumberText: {
    fontFamily: THEME.typography.fontFamily.secondaryBold,
    fontSize: 12,
    fontWeight: '700',
    color: '#854D0E',
  },
  feedbackText: {
    fontFamily: THEME.typography.fontFamily.secondary,
    fontSize: 13,
    color: '#374151',
    lineHeight: 19,
    fontStyle: 'italic',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginTop: 12,
  },
  emptyTitle: {
    fontFamily: THEME.typography.fontFamily.mainBold,
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginTop: 8,
  },
  emptySubtitle: {
    fontFamily: THEME.typography.fontFamily.secondary,
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
    textAlign: 'center',
  },
});
