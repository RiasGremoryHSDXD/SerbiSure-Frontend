import { useLanguage as useUiLanguage } from '../../../shared/localization/LanguageContext';
import React from 'react';
import { Text, View, Pressable } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { profileStyles as styles } from '../styles';
import type { ProfileController } from '../hooks/useProfile';
import { ProfileAvatar } from '../../../shared/ui/ProfileAvatar';
import { validRating } from '../../reviews/ratings';

export function ReviewsSection({
  profile,
  showHeader = false,
}: {
  profile: Pick<ProfileController, 't' | 'copy' | 'reviews' | 'isReviewsExpanded' | 'setIsReviewsExpanded'>;
  showHeader?: boolean;
}) {
  const { tr: uiText, formatDate } = useUiLanguage();
  const {
    t,
    reviews,
    isReviewsExpanded,
    setIsReviewsExpanded,
  } = profile;
  const hasMoreReviews = reviews.length > 3;
  const visibleReviews = isReviewsExpanded ? reviews : reviews.slice(0, 3);
  return (<>
    <View style={styles.reviewsSection}>
      {showHeader ? (
        <View style={styles.tabSectionHeader}>
          <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
            <Text style={styles.tabSectionTitle}>{uiText("Reviews & Feedback")}</Text>
          </View>
          {hasMoreReviews ? (
            <Pressable
              onPress={() => setIsReviewsExpanded((prev) => !prev)}
              hitSlop={15}
              style={({ pressed }) => [styles.viewAllBtnWrap, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.viewAllPill}>
                {isReviewsExpanded ? uiText("Show Less") : t.viewAll}
              </Text>
              <Ionicons
                name={isReviewsExpanded ? 'chevron-up' : 'chevron-down'}
                size={13}
                color="#F97316"
                style={{ marginLeft: 3 }}
              />
            </Pressable>
          ) : null}
        </View>
      ) : hasMoreReviews ? (
        <View style={styles.reviewsHeader}>
          <Pressable
            onPress={() => setIsReviewsExpanded((prev) => !prev)}
            hitSlop={15}
            style={({ pressed }) => [styles.viewAllBtnWrap, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.viewAllPill}>
              {isReviewsExpanded ? uiText("Show Less") : t.viewAll}
            </Text>
            <Ionicons
              name={isReviewsExpanded ? 'chevron-up' : 'chevron-down'}
              size={13}
              color="#F97316"
              style={{ marginLeft: 3 }}
            />
          </Pressable>
        </View>
      ) : null}

      {reviews.length > 0 ? (
        <View style={styles.reviewsList}>
          {visibleReviews.map((r, index) => {
            const rating = validRating(r.rating);
            const reviewerName = r.reviewer_name || uiText('Reviewer');
            const sentimentColor = r.nlp_sentiment === 'Negative'
              ? '#BE123C'
              : r.nlp_sentiment === 'Neutral'
                ? '#64748B'
                : r.nlp_sentiment === 'Positive' ? '#059669' : '#64748B';

            return (
              <View
                key={r.review_id}
                style={[styles.reviewCard, index < visibleReviews.length - 1 && styles.reviewCardDivider]}
              >
                <View style={styles.reviewCardHeader}>
                  <View style={styles.reviewerIdentity}>
                    <ProfileAvatar uri={r.reviewer_profile_link} name={reviewerName} size={40} />
                    <View style={styles.reviewerDetails}>
                      <Text style={styles.reviewerName} numberOfLines={1}>{reviewerName}</Text>
                      <View style={styles.reviewerMetaRow}>
                        <Text style={styles.reviewerDate}>
                          {r.createdAt
                            ? formatDate(r.createdAt, 'monthYear')
                            : uiText("Verified review")}
                        </Text>
                        <View style={styles.sentimentInline}>
                          <View style={[styles.sentimentDot, { backgroundColor: sentimentColor }]} />
                          <Text style={[styles.sentimentInlineText, { color: sentimentColor }]}>
                          {uiText(r.nlp_sentiment || 'Not analyzed')}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <View style={styles.reviewRatingTop}>
                    {rating !== null && <Ionicons name="star" size={16} color="#F2A66F" />}
                    <Text style={styles.reviewRatingValue}>{rating === null ? uiText('No rating provided') : rating.toFixed(1)}</Text>
                  </View>
                </View>
                <Text style={styles.reviewText}>{r.unstructured_feedback}</Text>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyReviewsCard}>
          <Ionicons name="chatbubbles-outline" size={32} color="#D1D5DB" />
          <Text style={styles.emptyReviewsTitle}>{t.noReviewsYet}</Text>
          <Text style={styles.emptyReviewsSubtitle}>
            {t.noReviewsSubtitle}
          </Text>
        </View>
      )}
    </View>
  </>);
}
