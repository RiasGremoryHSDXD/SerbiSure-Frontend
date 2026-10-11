import React from 'react';
import { Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { profileStyles as styles } from '../styles';
import type { ProfileController } from '../hooks/useProfile';

export function ReputationSection({ profile }: { profile: ProfileController }) {
  const {
    analyticsData,
    summary,
    positivePercentage,
  } = profile;
  return (<>
    {/* Reputation & Performance Section */}
    <View style={styles.sectionCard}>
      <View style={styles.sectionCardHeader}>
        <View>
          <Text style={styles.sectionCardTitle}>Reputation & Stats</Text>
          <Text style={styles.sectionCardSubtitle}>Verified client history</Text>
        </View>
        <View style={styles.statusBadgeSuccess}>
          <Ionicons name="shield-checkmark" size={13} color="#10B981" />
          <Text style={styles.statusBadgeSuccessText}>Trusted</Text>
        </View>
      </View>

      <View style={styles.metricsGrid}>
        <View style={styles.metricTile}>
          <Text style={styles.metricVal}>
            {analyticsData ? analyticsData.average_rating.toFixed(1) : (summary?.average_rating ? summary.average_rating.toFixed(1) : '5.0')}
          </Text>
          <View style={styles.metricLabelRow}>
            <Ionicons name="star" size={12} color="#F59E0B" style={{ marginRight: 3 }} />
            <Text style={styles.metricLabel}>Rating</Text>
          </View>
        </View>

        <View style={styles.metricTile}>
          <Text style={styles.metricVal}>
            {analyticsData ? analyticsData.total_jobs_completed : '0'}
          </Text>
          <View style={styles.metricLabelRow}>
            <Text style={styles.metricLabel}>Jobs Done</Text>
          </View>
        </View>

        <View style={styles.metricTile}>
          <Text style={styles.metricVal}>
            {analyticsData ? `${analyticsData.positive_percentage}%` : (positivePercentage !== null ? `${positivePercentage}%` : '100%')}
          </Text>
          <View style={styles.metricLabelRow}>
            <Text style={styles.metricLabel}>Positive</Text>
          </View>
        </View>
      </View>
    </View>
  </>);
}
