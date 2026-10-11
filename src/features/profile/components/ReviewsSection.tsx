import React from 'react';
import { Text, View, Pressable } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { profileStyles as styles } from '../styles';
import type { ProfileController } from '../hooks/useProfile';

export function ReviewsSection({ profile }: { profile: ProfileController }) {
  const {
    t,
    copy,
    reviews,
    isReviewsExpanded,
    setIsReviewsExpanded,
    totalReviews,
  } = profile;
  return (<>
    <View style={styles.reviewsSection}>
      <View style={styles.reviewsHeader}>
        <Text style={styles.reviewsSectionTitle}>{t.recentReviews}</Text>
        {totalReviews >= 2 ? (
          <Pressable
            onPress={() => setIsReviewsExpanded((prev) => !prev)}
            hitSlop={15}
            style={({ pressed }) => [styles.viewAllBtnWrap, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.viewAllPill}>
              {isReviewsExpanded ? 'Show Less' : `${t.viewAll} (${totalReviews})`}
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

      {reviews.length > 0 ? (
        <>
          {(isReviewsExpanded ? reviews : reviews.slice(0, 3)).map((r) => {
            const badgeBg = r.nlp_sentiment === 'Negative'
              ? '#FFF1F2'
              : r.nlp_sentiment === 'Neutral'
                ? '#F1F5F9'
                : '#ECFDF5';
            const badgeColor = r.nlp_sentiment === 'Negative'
              ? '#BE123C'
              : r.nlp_sentiment === 'Neutral'
                ? '#475569'
                : '#065F46';

            return (
              <View key={r.review_id} style={styles.reviewCard}>
                <View style={styles.reviewCardHeader}>
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Ionicons
                        key={i}
                        name={i <= (Number(r.rating) || 5) ? 'star' : 'star-outline'}
                        size={14}
                        color="#FFB380"
                        style={{ marginRight: 2 }}
                      />
                    ))}
                  </View>
                  <View style={[styles.positiveBadge, { backgroundColor: badgeBg }]}>
                    <Text style={[styles.positiveBadgeText, { color: badgeColor }]}>{r.nlp_sentiment || 'Positive'}</Text>
                  </View>
                </View>
                <Text style={styles.reviewText}>"{r.unstructured_feedback}"</Text>
                <Text style={styles.reviewAuthor}>
                  — {r.reviewer_name || copy.reviewer}
                  {r.createdAt ? `, ${new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : ''}
                </Text>
              </View>
            );
          })}
        </>
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
