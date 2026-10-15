import React from 'react';
import { Text, View, Pressable } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { profileStyles as styles } from '../styles';
import type { ProfileController } from '../hooks/useProfile';

export function AvailabilitySection({ profile }: { profile: ProfileController }) {
  const {
    t,
    isOnJob,
    handleToggleJobStatus,
  } = profile;
  return (<>
    {/* Kasambahay Availability Status Pill Track */}
    <View style={styles.heroAvailabilityContainer}>
      <View style={styles.availabilityLabelRow}>
        <Ionicons name="radio-button-on" size={13} color={isOnJob ? "#F59E0B" : "#10B981"} />
        <Text style={styles.availabilityLabel}>{t.setStatus}</Text>
      </View>
      <Pressable
        style={styles.pillTrack}
        onPress={() => handleToggleJobStatus(!isOnJob)}
      >
        <View style={[styles.pillSegment, !isOnJob && styles.pillSegmentAvailable]}>
          <Text style={[styles.pillSegmentText, !isOnJob && styles.pillSegmentTextActive]}>
            {t.available}
          </Text>
        </View>
        <View style={[styles.pillSegment, isOnJob && styles.pillSegmentOnJob]}>
          <Text style={[styles.pillSegmentText, isOnJob && styles.pillSegmentTextActive]}>
            {t.onJob}
          </Text>
        </View>
      </Pressable>
    </View>
  </>);
}
