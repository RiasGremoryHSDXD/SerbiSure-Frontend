import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLanguage } from '../../../shared/localization/LanguageContext';
import { type BookingItem, formatBookingAddress, cancelBooking } from '../../bookings/api/bookingApi';
import { isScheduleExpired, postDisplayStatus } from '../../bookings/postAvailability';
import { RepostModal } from '../../bookings/components/RepostModal';
import { ScheduleBadge } from '../../bookings/components/ScheduleBadge';

export function OwnPostsSection({
  posts,
  loading,
  error,
  token,
  now,
  onRefresh,
}: {
  posts: BookingItem[];
  loading: boolean;
  error: string | null;
  token?: string | null;
  now: number;
  onRefresh: () => void;
}) {
  const { tr, formatDate } = useLanguage();
  const [repost, setRepost] = useState<BookingItem | null>(null);
  const busy = useRef(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState<Set<string>>(new Set());

  const cancel = async (post: BookingItem) => {
    if (!token || busy.current) return;
    busy.current = true;
    setCancelling(true);
    try {
      const result = await cancelBooking(token, post.booking_id, {
        reason: 'Other',
        expected_points: 0,
        pending_only: true,
      });
      if (!result.success) throw new Error(result.error || 'Please try again.');
      setCancelled(previous => new Set(previous).add(post.booking_id));
      onRefresh();
    } catch (err) {
      Alert.alert(tr('Could not cancel post'), err instanceof Error ? err.message : tr('Please try again.'));
      onRefresh();
    } finally {
      busy.current = false;
      setCancelling(false);
    }
  };

  const statusColors: Record<string, { bg: string; text: string }> = {
    Available: { bg: '#DCFCE7', text: '#166534' },
    Cancelled: { bg: '#FEE2E2', text: '#991B1B' },
    Booked: { bg: '#DBEAFE', text: '#1E40AF' },
    Ongoing: { bg: '#E0E7FF', text: '#3730A3' },
    Completed: { bg: '#F3F4F6', text: '#374151' },
    Expired: { bg: '#FEF3C7', text: '#92400E' },
  };

  return (
    <View style={styles.container}>
      {loading && <ActivityIndicator style={styles.loader} color="#FFA135" />}
      {error && (
        <Pressable onPress={onRefresh} style={styles.errorBox}>
          <Text style={styles.errorText}>{error} · {tr('Retry')}</Text>
        </Pressable>
      )}
      {!loading && !error && posts.length === 0 && (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>{tr('Your posts will appear here.')}</Text>
        </View>
      )}
      {posts.map(post => {
        const status = cancelled.has(post.booking_id) ? 'Cancelled' : postDisplayStatus(post, now);
        const badgeColors = statusColors[status] || { bg: '#F3F4F6', text: '#374151' };
        const address = formatBookingAddress(post);
        const hasInstructions = !!post.special_instruction?.trim();

        return (
          <View key={post.booking_id} style={styles.card}>
            {/* Header: Service + Date on left, Rate + Status on right */}
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <Text style={styles.serviceTitle} numberOfLines={1}>
                  {post.service_category.join(', ')}
                </Text>
                <Text style={styles.dateText}>
                  {formatDate(post.start_time, 'compact')}
                </Text>
              </View>

              <View style={styles.headerRight}>
                <Text style={styles.rateAmount}>
                  ₱{post.rate_amount}
                  <Text style={styles.rateUnit}> / {post.rate_period || 'day'}</Text>
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: badgeColors.bg }]}>
                  <Text style={[styles.statusBadgeText, { color: badgeColors.text }]}>
                    {tr(status)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Location row */}
            {address ? (
              <View style={styles.locationRow}>
                <Text style={styles.locationPin}>📍</Text>
                <Text style={styles.locationText} numberOfLines={1}>
                  {address}
                </Text>
              </View>
            ) : null}

            {/* Special Instructions / Notes (only if present, removing redundancy) */}
            {hasInstructions ? (
              <Text style={styles.instructionText} numberOfLines={2} ellipsizeMode="tail">
                {post.special_instruction}
              </Text>
            ) : null}

            {/* Bottom Actions Row */}
            <View style={styles.actionsRow}>
              <View style={styles.actionsLeft}>
                {status === 'Available' && <ScheduleBadge post={post} now={now} />}
              </View>

              <View style={styles.actionsRight}>
                {status === 'Available' && token && (
                  <Pressable
                    accessibilityRole="button"
                    disabled={cancelling}
                    onPress={() =>
                      Alert.alert(tr('Cancel Post'), tr('Remove this post from the public feed?'), [
                        { text: tr('Keep Post'), style: 'cancel' },
                        {
                          text: tr('Cancel Post'),
                          style: 'destructive',
                          onPress: () => { void cancel(post); },
                        },
                      ])
                    }
                    style={styles.cancelBtn}
                  >
                    <Text style={styles.cancelBtnText}>{tr('Cancel Post')}</Text>
                  </Pressable>
                )}

                {status === 'Available' && isScheduleExpired(post, now) && token && (
                  <Pressable
                    disabled={cancelling}
                    accessibilityRole="button"
                    onPress={() => setRepost(post)}
                    style={styles.repostBtn}
                  >
                    <Text style={styles.repostBtnText}>{tr('Reschedule')}</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        );
      })}
      {repost && token && (
        <RepostModal
          post={repost}
          token={token}
          onClose={() => setRepost(null)}
          onSuccess={onRefresh}
        />
      )}
    </View>
  );
}

const safeStyleSheet = (StyleSheet && typeof StyleSheet.create === 'function')
  ? StyleSheet.create
  : (s: any) => s;

const styles = safeStyleSheet({
  container: {
    gap: 14,
    paddingVertical: 12,
  },
  loader: {
    marginVertical: 16,
  },
  errorBox: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
  },
  errorText: {
    color: '#991B1B',
    fontSize: 13,
  },
  emptyBox: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 18,
    marginBottom: 2,
    shadowColor: '#2D241D',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 8,
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
  },
  serviceTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  dateText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#6B7280',
  },
  headerRight: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  rateAmount: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700',
    color: '#176B3A',
    marginBottom: 3,
  },
  rateUnit: {
    fontSize: 12,
    fontWeight: '500',
    color: '#176B3A',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  locationPin: {
    fontSize: 11,
  },
  locationText: {
    flexShrink: 1,
    fontSize: 11.5,
    lineHeight: 16,
    color: '#6B7280',
  },
  instructionText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#4B5563',
    marginBottom: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    minHeight: 36,
    marginTop: 6,
  },
  actionsLeft: {
    justifyContent: 'center',
    flexShrink: 0,
    marginRight: 8,
  },
  actionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
    marginLeft: 'auto',
  },
  cancelBtn: {
    minHeight: 36,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  cancelBtnText: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '600',
  },
  repostBtn: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#FFA135',
    justifyContent: 'center',
    alignItems: 'center',
  },
  repostBtnText: {
    fontSize: 13,
    color: '#35220D',
    fontWeight: '700',
  },
});
