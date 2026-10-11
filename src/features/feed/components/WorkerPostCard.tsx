import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import THEME from '../../../shared/theme/theme';
import type { FeedPost } from '../types';

export function WorkerPostCard({ post, saved, onViewProfile, onDetails, onToggleSave }: { post: FeedPost; saved: boolean; onViewProfile: () => void; onDetails: () => void; onToggleSave: () => void }) {
  return (
    <View style={styles.workerCard}>
      {/* Header: Avatar, Name, Role Tag, Time & Bookmark */}
      <View style={styles.workerHeader}>
        <Pressable
          style={styles.workerHeaderLeft}
          onPress={onViewProfile}
          hitSlop={6}
        >
          <Image source={{ uri: post.avatar }} style={styles.workerAvatar} />
          <View style={styles.workerInfo}>
            <View style={styles.workerNameRow}>
              <Text style={styles.workerName}>{post.employerName}</Text>
            </View>
            <View style={styles.roleRow}>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{post.roleTag}</Text>
              </View>
              <Text style={styles.workerTime}>{post.time}</Text>
            </View>
          </View>
        </Pressable>

        {/* Bookmark Button in Top Right Corner */}
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

      {/* Details Pills: Location, Term, Rate */}
      <View style={styles.metaRow}>
        <View style={styles.metaBadge}>
          <Ionicons name="location-sharp" size={12} color="#6B7280" style={{ marginRight: 3 }} />
          <Text style={styles.metaBadgeText}>{post.location}</Text>
        </View>
        <View style={styles.metaBadge}>
          <Ionicons name="briefcase-outline" size={12} color="#6B7280" style={{ marginRight: 3 }} />
          <Text style={styles.metaBadgeText}>{post.termTag}</Text>
        </View>
        <View style={styles.rateBadge}>
          <Text style={styles.rateBadgeAmount}>{post.price}</Text>
          <Text style={styles.rateBadgeUnit}> {post.unit}</Text>
        </View>
      </View>

      {/* Description snippet */}
      {post.aboutText ? (
        <Text style={styles.descriptionText} numberOfLines={2}>
          {post.aboutText}
        </Text>
      ) : null}

      {/* Card Action Buttons: View Profile & See Details */}
      <View style={styles.cardActionsRow}>
        <Pressable
          style={styles.viewProfileBtn}
          onPress={onViewProfile}
        >
          <Text style={styles.viewProfileText}>View Profile</Text>
        </Pressable>
        <Pressable
          style={styles.seeDetailsBtn}
          onPress={onDetails}
        >
          <Text style={styles.seeDetailsBtnText}>See Details</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  workerCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.roundness.card,
    padding: 18,
    marginBottom: 14,
  },
  workerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  workerHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bookmarkBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  workerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: '#E5E7EB',
  },
  workerInfo: {
    flex: 1,
  },
  workerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  workerName: {
    fontSize: 16,
    fontFamily: THEME.typography.fontFamily.display,
    color: THEME.colors.ink,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleBadge: {
    backgroundColor: '#FFF4E5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  roleBadgeText: {
    fontSize: 11,
    fontFamily: THEME.typography.fontFamily.secondaryBold,
    color: '#D97706',
  },
  workerTime: {
    fontSize: 11,
    fontFamily: THEME.typography.fontFamily.secondaryRegular,
    color: THEME.colors.textMuted,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metaBadgeText: {
    fontSize: 11,
    fontFamily: THEME.typography.fontFamily.secondaryMedium,
    color: '#4B5563',
  },
  rateBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 'auto',
  },
  rateBadgeAmount: {
    fontSize: 12,
    fontFamily: THEME.typography.fontFamily.display,
    color: '#059669',
    fontWeight: '800',
  },
  rateBadgeUnit: {
    fontSize: 10,
    fontFamily: THEME.typography.fontFamily.secondaryRegular,
    color: '#059669',
  },
  descriptionText: {
    fontSize: 12.5,
    fontFamily: THEME.typography.fontFamily.secondaryRegular,
    color: '#4B5563',
    lineHeight: 18,
    marginBottom: 14,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  viewProfileBtn: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: THEME.roundness.pill,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewProfileText: {
    color: '#111827',
    fontFamily: THEME.typography.fontFamily.display,
    fontSize: 12.5,
  },
  seeDetailsBtn: {
    flex: 1,
    backgroundColor: '#FFB43B',
    borderRadius: THEME.roundness.pill,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seeDetailsBtnText: {
    color: '#FFFFFF',
    fontFamily: THEME.typography.fontFamily.display,
    fontSize: 12.5,
  },
});
