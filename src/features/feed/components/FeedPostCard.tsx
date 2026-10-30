import { useLanguage as useUiLanguage } from '../../../shared/localization/LanguageContext';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MapPinIcon } from '../../../shared/components/icons/LucideIcons';
import { ProfileAvatar } from '../../../shared/ui/ProfileAvatar';
import THEME from '../../../shared/theme/theme';
import type { FeedPost } from '../types';
import { ScheduleBadge } from '../../bookings/components/ScheduleBadge';

export interface FeedPostCardProps {
  readonly post: FeedPost;
  readonly saved: boolean;
  readonly applied?: boolean;
  readonly onViewProfile?: () => void;
  readonly onDetails?: () => void;
  readonly onToggleSave?: () => void;
  readonly leftActionButton?: React.ReactNode;
  readonly rightActionButton?: React.ReactNode;
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
}: Readonly<FeedPostCardProps>): React.JSX.Element {
  const { tr: uiText } = useUiLanguage();
  const unit = (post.unit || '').replace(/^(?:\/|per\s+)\s*/i, '').trim();
  const hasPrice = /^(?:₱|PHP?\s*)\d/i.test(post.price || '');

  return (
    <View style={styles.workerCard}>
      <View style={styles.workerHeader}>
        <Pressable
          onPress={onViewProfile}
          disabled={!onViewProfile}
          accessibilityRole="button"
          accessibilityLabel={uiText('Profile')}
          hitSlop={4}
        >
          <ProfileAvatar uri={post.avatar} name={post.employerName} size={50} />
        </Pressable>
        <View style={styles.workerInfo}>
          <View style={styles.workerNameRow}>
            <Text style={styles.workerName} numberOfLines={1} ellipsizeMode="tail">
              {post.employerName}
            </Text>
            <Text
              style={styles.rateAmount}
              numberOfLines={unit === 'month' ? 2 : 1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {post.price}
              {unit && hasPrice ? (
                <Text style={styles.rateUnit}>
                  {unit === 'month' ? '\n/' : '/'}
                  {uiText(unit)}
                </Text>
              ) : null}
            </Text>
          </View>
          <View style={styles.roleRow}>
            <Text style={styles.serviceText}>{uiText(post.roleTag)}</Text>
            {post.time ? (
              <Text style={styles.serviceTimeText}>· {uiText(post.time)}</Text>
            ) : null}
          </View>
        </View>
      </View>

      {post.location ? (
        <View style={styles.locationRow}>
          <MapPinIcon size={13} color="#6B7280" />
          <Text style={styles.locationText} numberOfLines={1}>
            {post.location}
          </Text>
        </View>
      ) : null}

      {post.aboutText ? (
        <Text style={styles.descriptionText} numberOfLines={2} ellipsizeMode="tail">
          {post.aboutText}
        </Text>
      ) : null}

      <View style={styles.cardActionsRow}>
        <View style={styles.cardActionsLeft}>
          <ScheduleBadge post={post} />
        </View>
        <View style={styles.cardActionsRight}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={uiText(saved ? 'Unsave post' : 'Save post')}
            accessibilityState={{ selected: saved, disabled: !onToggleSave }}
            disabled={!onToggleSave}
            onPress={onToggleSave}
            hitSlop={4}
            style={({ pressed }) => [styles.bookmarkBtn, pressed && styles.actionPressed]}
          >
            <Ionicons
              name={saved ? 'bookmark' : 'bookmark-outline'}
              size={22}
              color={saved ? '#FFA135' : '#4B5563'}
            />
          </Pressable>
          {leftActionButton !== undefined ? (
            leftActionButton
          ) : (
            <Pressable
              accessibilityRole="button"
              disabled={!onViewProfile}
              onPress={onViewProfile}
              style={({ pressed }) => [styles.viewProfileBtn, pressed && styles.actionPressed]}
            >
              <Text style={styles.viewProfileText}>{uiText('Profile')}</Text>
            </Pressable>
          )}
          {rightActionButton !== undefined ? (
            rightActionButton
          ) : (
            <Pressable
              accessibilityRole="button"
              disabled={!onDetails}
              onPress={onDetails}
              style={({ pressed }) => [styles.seeDetailsBtn, pressed && styles.actionPressed]}
            >
              <Text style={styles.seeDetailsBtnText}>
                {uiText(applied ? 'Applied' : 'Details')}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  workerCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 22,
    marginBottom: 16,
    shadowColor: '#2D241D',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  workerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  workerInfo: {
    flex: 1,
    minWidth: 0,
  },
  workerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  workerName: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    lineHeight: 21,
    fontFamily: THEME.typography.fontFamily.display,
    color: THEME.colors.ink,
  },
  rateAmount: {
    flexShrink: 1,
    maxWidth: '48%',
    fontSize: 17,
    lineHeight: 22,
    textAlign: 'right',
    fontFamily: THEME.typography.fontFamily.secondaryBold,
    color: '#176B3A',
  },
  rateUnit: {
    fontSize: 12,
    fontFamily: THEME.typography.fontFamily.secondaryMedium,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  serviceText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#8B511F',
    fontFamily: THEME.typography.fontFamily.secondaryBold,
  },
  serviceTimeText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#6B7280',
    fontFamily: THEME.typography.fontFamily.secondaryRegular,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
    marginBottom: 12,
  },
  locationText: {
    flexShrink: 1,
    fontSize: 11.5,
    lineHeight: 16,
    color: '#6B7280',
    fontFamily: THEME.typography.fontFamily.secondaryRegular,
  },
  descriptionText: {
    fontSize: 13,
    lineHeight: 22,
    color: '#4B5563',
    marginBottom: 16,
    fontFamily: THEME.typography.fontFamily.body,
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 38,
    marginTop: 4,
  },
  cardActionsLeft: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 8,
  },
  cardActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bookmarkBtn: {
    width: 34,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewProfileBtn: {
    minHeight: 36,
    paddingHorizontal: 10,
    justifyContent: 'center',
    borderRadius: 8,
  },
  viewProfileText: {
    fontSize: 13,
    color: '#4B5563',
    fontFamily: THEME.typography.fontFamily.secondaryMedium,
  },
  seeDetailsBtn: {
    minHeight: 36,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#FFA135',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seeDetailsBtnText: {
    fontSize: 13,
    color: '#35220D',
    fontFamily: THEME.typography.fontFamily.secondaryBold,
  },
  actionPressed: {
    opacity: 0.75,
  },
});

export const feedPostStyles = styles;
