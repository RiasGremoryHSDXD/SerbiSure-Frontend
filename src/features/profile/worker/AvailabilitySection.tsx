import React from 'react';
import { ActivityIndicator, Text, View, Pressable } from 'react-native';
import { useLanguage } from '../../../shared/localization/LanguageContext';

import { Ionicons } from '@expo/vector-icons';

import { profileStyles as styles } from '../styles';
import type { ProfileController } from '../hooks/useProfile';

export function AvailabilitySection({ profile }: { profile: ProfileController }) {
  const { tr } = useLanguage();
  const {
    t,
    isOnJob,
    jobStatusError,
    isUpdatingJobStatus,
    refreshWorkerProfile,
    handleToggleJobStatus,
  } = profile;
  return (<>
    {/* Kasambahay Availability Status Pill Track */}
    <View style={styles.heroAvailabilityContainer}>
      <View style={styles.availabilityLabelRow}>
        <Ionicons name="radio-button-on" size={13} color={isOnJob === null ? '#9CA3AF' : isOnJob ? "#F59E0B" : "#10B981"} />
        <Text style={styles.availabilityLabel}>{t.setStatus}</Text>
      </View>
      <Pressable
        style={[styles.pillTrack, isOnJob === null && { paddingHorizontal: 12, minHeight: 30 }]}
        accessibilityRole="button"
        accessibilityLabel={isOnJob === null ? tr(jobStatusError ? 'Retry status' : 'Loading status') : undefined}
        disabled={isUpdatingJobStatus || (isOnJob === null && !jobStatusError)}
        accessibilityState={{ disabled: isUpdatingJobStatus || (isOnJob === null && !jobStatusError), busy: isUpdatingJobStatus || (isOnJob === null && !jobStatusError) }}
        onPress={() => isOnJob === null ? void refreshWorkerProfile() : void handleToggleJobStatus(!isOnJob)}
      >
        {isOnJob === null ? (
          jobStatusError ? <Text style={styles.pillSegmentText}>{tr('Retry status')}</Text>
            : <ActivityIndicator size="small" color="#9CA3AF" />
        ) : (
          <>
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
          </>
        )}
      </Pressable>
    </View>
  </>);
}
