import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import THEME from '../../../shared/theme/theme';
import type { FeedPost } from '../types';

export function JobPostCard({ post: job, saved, applied, onViewProfile, onDetails, onToggleSave }: { post: FeedPost; saved: boolean; applied: boolean; onViewProfile: () => void; onDetails: () => void; onToggleSave: () => void }) {
  return (
    <Pressable style={styles.jobCard} onPress={onDetails}>
      <View style={styles.jobHeader}>
        <Pressable onPress={onViewProfile} hitSlop={6}>
          <Image source={{ uri: job.avatar }} style={styles.employerAvatar} />
        </Pressable>
        <View style={styles.jobEmployerInfo}>
          <Pressable style={styles.nameRow} onPress={onViewProfile} hitSlop={6}>
            <Text style={styles.employerName}>{job.employerName}</Text>
          </Pressable>
          <Text style={styles.postTime}>{job.time}</Text>

          <View style={styles.tagsRow}>
            <View style={[styles.tagBadge, styles.tagRole]}>
              <Text style={styles.tagRoleText}>{job.roleTag}</Text>
            </View>
            <View style={[styles.tagBadge, styles.tagTerm]}>
              <Text style={styles.tagTermText}>{job.termTag}</Text>
            </View>
          </View>
        </View>

        {/* Bookmark Icon in Top Right Corner */}
        <Pressable
          style={styles.bookmarkBtn}
          onPress={onToggleSave}
          hitSlop={10}
        >
          <Ionicons
            name={saved ? "bookmark" : "bookmark-outline"}
            size={22}
            color={THEME.colors.ink}
          />
        </Pressable>
      </View>

      <View style={styles.divider} />

      <View style={styles.jobFooter}>
        <Text style={styles.priceText}>
          {job.price} <Text style={styles.unitText}>{job.unit}</Text>
        </Text>

        <Pressable
          style={[styles.seeDetailsBtn, applied && styles.seeDetailsBtnApplied]}
          onPress={onDetails}
        >
          <Text style={[styles.seeDetailsText, applied && styles.seeDetailsTextApplied]}>
            {applied ? 'Applied' : 'See Details'}
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  jobCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.roundness.card,
    padding: 18,
    marginBottom: 14,
  },
  jobHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  employerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 14,
  },
  jobEmployerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  employerName: {
    fontSize: 16,
    fontFamily: THEME.typography.fontFamily.display,
    color: THEME.colors.ink,
  },
  postTime: {
    fontSize: 11,
    fontFamily: THEME.typography.fontFamily.secondaryRegular,
    color: THEME.colors.textMuted,
    marginTop: 2,
    marginBottom: 6,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tagBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: THEME.roundness.pill,
  },
  tagRole: {
    backgroundColor: THEME.colors.ink,
  },
  tagRoleText: {
    color: THEME.colors.white,
    fontSize: 11,
    fontFamily: THEME.typography.fontFamily.secondaryMedium,
  },
  tagTerm: {
    backgroundColor: THEME.colors.brandLight,
  },
  tagTermText: {
    color: THEME.colors.brandDark,
    fontSize: 11,
    fontFamily: THEME.typography.fontFamily.secondarySemiBold,
  },
  divider: {
    height: 1,
    backgroundColor: THEME.colors.divider,
    marginVertical: 14,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 20,
    fontFamily: THEME.typography.fontFamily.display,
    color: THEME.colors.ink,
  },
  unitText: {
    fontSize: 12,
    fontFamily: THEME.typography.fontFamily.secondaryRegular,
    color: THEME.colors.textSecondary,
  },
  bookmarkBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seeDetailsBtn: {
    backgroundColor: THEME.colors.brand,
    borderRadius: THEME.roundness.pill,
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seeDetailsBtnApplied: {
    backgroundColor: '#E8F8EE',
  },
  seeDetailsText: {
    color: THEME.colors.white,
    fontSize: 13,
    fontFamily: THEME.typography.fontFamily.display,
  },
  seeDetailsTextApplied: {
    color: '#10B981',
  },
});
