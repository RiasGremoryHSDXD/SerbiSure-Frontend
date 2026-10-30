import { useLanguage as useUiLanguage } from '../../../shared/localization/LanguageContext';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MapPinIcon } from '../../../shared/components/icons/LucideIcons';
import THEME from '../../../shared/theme/theme';
import type { FeedPost } from '../types';
import { ScheduleBadge } from '../../bookings/components/ScheduleBadge';

export interface FeedPostCardProps {
  post: FeedPost;
  saved: boolean;
  applied?: boolean;
  onViewProfile?: () => void;
  onDetails?: () => void;
  onToggleSave?: () => void;
  leftActionButton?: React.ReactNode;
  rightActionButton?: React.ReactNode;
}

export function FeedPostCard({
  post,
  saved,
  applied = false,
  onViewProfile,
  onDetails,
  onToggleSave,
  leftActionButton,
  rightActionButton,
}: FeedPostCardProps) {
  const { tr: uiText } = useUiLanguage();
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
                <Text style={styles.roleBadgeText}>{uiText(post.roleTag)}</Text>
              </View>
              <Text style={styles.workerTime}>{uiText(post.time)}</Text>
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
            size={24}
            color={saved ? "#FFAA77" : THEME.colors.ink}
          />
        </Pressable>
      </View>

      <ScheduleBadge post={post} />
      {/* Details: Location on row 1, Term & Green Rate Pill on row 2 */}
      <View style={styles.metaColumn}>
        <View style={styles.locationBadge}>
          <MapPinIcon size={14} color="#6B7280" style={{ marginRight: 4 }} />
          <Text style={styles.metaBadgeText} numberOfLines={1}>{post.location}</Text>
        </View>
        <View style={styles.termRateRow}>
          <View style={styles.metaBadge}>
            <Ionicons name="briefcase-outline" size={13} color="#6B7280" style={{ marginRight: 4 }} />
            <Text style={styles.metaBadgeText}>{uiText(post.termTag)}</Text>
          </View>
          <View style={styles.rateBadge}>
            <Text style={styles.rateBadgeAmount}>{post.price}</Text>
            <Text style={styles.rateBadgeUnit}> / {uiText(post.unit || 'month').replace(/^\//, '').trim()}</Text>
          </View>
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
        {leftActionButton !== undefined ? (
          leftActionButton
        ) : (
          <Pressable
            style={styles.viewProfileBtn}
            onPress={onViewProfile}
          >
            <Text style={styles.viewProfileText}>{uiText("View Profile")}</Text>
          </Pressable>
        )}
        {rightActionButton !== undefined ? (
          rightActionButton
        ) : (
          <Pressable
            style={styles.seeDetailsBtn}
            onPress={onDetails}
          >
            <Text style={styles.seeDetailsBtnText}>{uiText(applied ? 'Applied' : 'See Details')}</Text>
          </Pressable>
        )}
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
    backgroundColor: '#FFAA77',
    paddingHorizontal: 9,
    paddingVertical: 2.5,
    borderRadius: 8,
  },
  roleBadgeText: {
    fontSize: 11,
    fontFamily: THEME.typography.fontFamily.secondaryBold,
    color: '#FFFFFF',
  },
  workerTime: {
    fontSize: 11,
    fontFamily: THEME.typography.fontFamily.secondaryRegular,
    color: THEME.colors.textMuted,
  },
  metaColumn: {
    gap: 7,
    marginBottom: 12,
  },
  locationBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAEAEA',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  termRateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAEAEA',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  metaBadgeText: {
    fontSize: 11.5,
    fontFamily: THEME.typography.fontFamily.secondaryMedium,
    color: '#0D0D11',
  },
  rateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  rateBadgeAmount: {
    fontSize: 12,
    fontFamily: THEME.typography.fontFamily.secondaryBold,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  rateBadgeUnit: {
    fontSize: 11,
    fontFamily: THEME.typography.fontFamily.secondaryMedium,
    color: '#FFFFFF',
  },
  descriptionText: {
    fontSize: 12.5,
    fontFamily: THEME.typography.fontFamily.body,
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
    backgroundColor: '#ECECEC',
    borderRadius: THEME.roundness.pill,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewProfileText: {
    color: '#0D0D11',
    fontFamily: THEME.typography.fontFamily.secondaryBold,
    fontSize: 13,
  },
  seeDetailsBtn: {
    flex: 1,
    backgroundColor: '#FFAA77',
    borderRadius: THEME.roundness.pill,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seeDetailsBtnText: {
    color: '#FFFFFF',
    fontFamily: THEME.typography.fontFamily.secondaryBold,
    fontSize: 13,
  },
});

export const feedPostStyles = styles;
