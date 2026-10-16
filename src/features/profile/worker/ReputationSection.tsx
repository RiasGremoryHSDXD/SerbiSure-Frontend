import { useLanguage as useUiLanguage } from '../../../shared/localization/LanguageContext';
import React from 'react';
import { Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { profileStyles as styles } from '../styles';
import type { ProfileController } from '../hooks/useProfile';

export function ReputationSection({ profile }: { profile: ProfileController }) {
  const { tr: uiText } = useUiLanguage();
  const {
    analyticsData,
    summary,
    positivePercentage,
  } = profile;
  return (<>
    {/* Reputation & Performance Section */}
    <View style={styles.sectionCard}>
      <View style={styles.sectionCardHeader}>
        <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
          <Text style={styles.sectionCardTitle}>{uiText("Reputation & Stats")}</Text>
          <Text style={styles.sectionCardSubtitle}>{uiText("Verified client history")}</Text>
        </View>
        <View style={profile.isVerified ? styles.statusBadgeSuccess : styles.statusBadgeNeutral}>
          <Ionicons name={profile.isVerified ? "shield-checkmark" : "information-circle-outline"} size={13} color={profile.isVerified ? "#10B981" : "#6B7280"} />
          <Text style={profile.isVerified ? styles.statusBadgeSuccessText : styles.statusBadgeNeutralText}>{uiText(profile.effectiveVerificationStatus)}</Text>
        </View>
      </View>

      <View style={styles.metricsGrid}>
        <View style={styles.metricTile}>
          <Text style={styles.metricVal}>
            {analyticsData?.total_reviews ? analyticsData.average_rating.toFixed(1) : (summary?.total_reviews ? summary.average_rating.toFixed(1) : '—')}
          </Text>
          <View style={styles.metricLabelRow}>
            <Ionicons name="star" size={12} color="#F59E0B" style={{ marginRight: 3 }} />
            <Text style={styles.metricLabel}>{uiText("Rating")}</Text>
          </View>
        </View>

        <View style={styles.metricTile}>
          <Text style={styles.metricVal}>
            {analyticsData ? analyticsData.total_jobs_completed : '—'}
          </Text>
          <View style={styles.metricLabelRow}>
            <Text style={styles.metricLabel}>{uiText("Jobs Done")}</Text>
          </View>
        </View>

        <View style={styles.metricTile}>
          <Text style={styles.metricVal}>
            {analyticsData?.total_reviews ? `${analyticsData.positive_percentage}%` : (positivePercentage !== null ? `${positivePercentage}%` : '—')}
          </Text>
          <View style={styles.metricLabelRow}>
            <Text style={styles.metricLabel}>{uiText("Positive")}</Text>
          </View>
        </View>
      </View>
    </View>
  </>);
}
