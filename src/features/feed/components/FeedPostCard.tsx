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
  post, saved, applied = false, onViewProfile, onDetails, onToggleSave,
  leftActionButton, rightActionButton,
}: FeedPostCardProps) {
  const { tr: uiText } = useUiLanguage();
  const unit = (post.unit || '').replace(/^(?:\/|per\s+)\s*/i, '').trim();
  const hasPrice = /^(?:₱|PHP?\s*)\d/i.test(post.price || '');
  return (
    <View style={styles.workerCard}>
      <View style={styles.statusRow}><ScheduleBadge post={post} /></View>
      <View style={styles.workerHeader}>
        <Pressable onPress={onViewProfile} disabled={!onViewProfile}
          accessibilityRole="button" accessibilityLabel={uiText('Profile')} hitSlop={4}>
          <ProfileAvatar uri={post.avatar} name={post.employerName} size={56} />
        </Pressable>
        <View style={styles.workerInfo}>
          <View style={styles.workerNameRow}>
            <Text style={styles.workerName} numberOfLines={2}>{post.employerName}</Text>
            <Text style={styles.rateAmount} numberOfLines={unit === 'month' ? 2 : 1} adjustsFontSizeToFit minimumFontScale={0.75}>
              {post.price}{unit && hasPrice ? <Text style={styles.rateUnit}>{unit === 'month' ? '\n/' : '/'}{uiText(unit)}</Text> : null}
            </Text>
          </View>
          <View style={styles.roleBadge}><Text style={styles.roleBadgeText}>{uiText(post.roleTag)}</Text></View>
          <View style={styles.locationRow}>
            <MapPinIcon size={13} color="#6B7280" />
            <Text style={styles.locationText} numberOfLines={1}>{post.location}</Text>
            {post.time ? <Text style={styles.workerTime}>· {uiText(post.time)}</Text> : null}
          </View>
        </View>
      </View>
      {post.aboutText ? <Text style={styles.descriptionText} numberOfLines={2} ellipsizeMode="tail">{post.aboutText}</Text> : null}
      <View style={styles.cardActionsRow}>
        <Pressable accessibilityRole="button" accessibilityLabel={uiText(saved ? 'Unsave post' : 'Save post')}
          accessibilityState={{ selected: saved, disabled: !onToggleSave }} disabled={!onToggleSave}
          onPress={onToggleSave} hitSlop={4}
          style={({ pressed }) => [styles.bookmarkBtn, pressed && styles.actionPressed]}>
          <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={22} color={saved ? '#FFA135' : '#4B5563'} />
        </Pressable>
        {leftActionButton !== undefined ? leftActionButton : (
          <Pressable accessibilityRole="button" disabled={!onViewProfile} onPress={onViewProfile}
            style={({ pressed }) => [styles.viewProfileBtn, pressed && styles.actionPressed]}>
            <Text style={styles.viewProfileText}>{uiText('Profile')}</Text>
          </Pressable>
        )}
        {rightActionButton !== undefined ? rightActionButton : (
          <Pressable accessibilityRole="button" disabled={!onDetails} onPress={onDetails}
            style={({ pressed }) => [styles.seeDetailsBtn, pressed && styles.actionPressed]}>
            <Text style={styles.seeDetailsBtnText}>{uiText(applied ? 'Applied' : 'Details')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  workerCard: {
    backgroundColor: THEME.colors.white, borderRadius: 20, padding: 16, marginBottom: 16,
    shadowColor: '#2D241D', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  statusRow: { alignSelf: 'flex-end' },
  workerHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  workerInfo: { flex: 1, minWidth: 0 },
  workerNameRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 5 },
  workerName: {
    flex: 1, minWidth: 0, fontSize: 16, lineHeight: 21,
    fontFamily: THEME.typography.fontFamily.display, color: THEME.colors.ink,
  },
  rateAmount: {
    flexShrink: 1, maxWidth: '48%', fontSize: 17, lineHeight: 22, textAlign: 'right',
    fontFamily: THEME.typography.fontFamily.secondaryBold, color: '#176B3A',
  },
  rateUnit: { fontSize: 12, fontFamily: THEME.typography.fontFamily.secondaryMedium },
  roleBadge: {
    alignSelf: 'flex-start', backgroundColor: '#FFF0DB', paddingHorizontal: 9,
    paddingVertical: 3, borderRadius: 8, marginBottom: 6,
  },
  roleBadgeText: { fontSize: 11, color: '#8B511F', fontFamily: THEME.typography.fontFamily.secondaryBold },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 0 },
  locationText: {
    flexShrink: 1, fontSize: 11.5, lineHeight: 16, color: '#6B7280',
    fontFamily: THEME.typography.fontFamily.secondaryRegular,
  },
  workerTime: {
    flexShrink: 0, fontSize: 11.5, lineHeight: 16, color: '#6B7280',
    fontFamily: THEME.typography.fontFamily.secondaryRegular,
  },
  descriptionText: {
    fontSize: 13, lineHeight: 20, color: '#4B5563', marginBottom: 12,
    fontFamily: THEME.typography.fontFamily.body,
  },
  cardActionsRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8 },
  viewProfileBtn: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', borderRadius: 22 },
  viewProfileText: { fontSize: 13, color: '#4B5563', fontFamily: THEME.typography.fontFamily.secondaryMedium },
  bookmarkBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  seeDetailsBtn: {
    minHeight: 44, minWidth: 88, paddingHorizontal: 20, borderRadius: 22,
    backgroundColor: '#FFA135', alignItems: 'center', justifyContent: 'center',
  },
  seeDetailsBtnText: { fontSize: 13, color: '#35220D', fontFamily: THEME.typography.fontFamily.secondaryBold },
  actionPressed: { opacity: 0.75 },
});

export const feedPostStyles = styles;
