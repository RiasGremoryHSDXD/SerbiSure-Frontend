import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { useLanguage } from '../../../shared/localization/LanguageContext';
import { type BookingItem, formatBookingAddress, cancelBooking } from '../../bookings/api/bookingApi';
import { isScheduleExpired, postDisplayStatus } from '../../bookings/postAvailability';
import { RepostModal } from '../../bookings/components/RepostModal';
import { ScheduleBadge } from '../../bookings/components/ScheduleBadge';

export function OwnPostsSection({ posts, loading, error, token, now, onRefresh }: {
  posts: BookingItem[]; loading: boolean; error: string | null; token?: string | null; now: number; onRefresh: () => void;
}) {
  const { tr, formatDate } = useLanguage();
  const [repost, setRepost] = useState<BookingItem | null>(null);
  const busy = useRef(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState<Set<string>>(new Set());
  const cancel = async (post: BookingItem) => {
    if (!token || busy.current) return;
    busy.current = true; setCancelling(true);
    try {
      const result = await cancelBooking(token, post.booking_id, { reason: 'Other', expected_points: 0, pending_only: true });
      if (!result.success) throw new Error(result.error || 'Please try again.');
      setCancelled(previous => new Set(previous).add(post.booking_id));
      onRefresh();
    } catch (error) {
      Alert.alert(tr('Could not cancel post'), error instanceof Error ? error.message : tr('Please try again.'));
      onRefresh();
    } finally { busy.current = false; setCancelling(false); }
  };
  return <View style={{ gap: 12, paddingVertical: 12 }}>
    {loading && <ActivityIndicator />}
    {error && <Pressable onPress={onRefresh}><Text>{error} · {tr('Retry')}</Text></Pressable>}
    {!loading && !error && posts.length === 0 && <Text>{tr('Your posts will appear here.')}</Text>}
    {posts.map(post => {
      const status = cancelled.has(post.booking_id) ? 'Cancelled' : postDisplayStatus(post, now);
      return <View key={post.booking_id} style={{ padding: 18, borderRadius: 20, backgroundColor: '#FFFFFF', gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          <Text style={{ fontWeight: '700', flex: 1 }}>{post.service_category.join(', ')}</Text>
          <Text style={{ color: status === 'Expired' ? '#B45309' : '#166534', fontWeight: '700' }}>{tr(status)}</Text>
        </View>
        <Text>{formatDate(post.start_time, 'compact')}</Text>
        {status === 'Available' && <ScheduleBadge post={post} now={now} />}
        <Text>{formatBookingAddress(post)}</Text>
        {!!post.special_instruction && <Text>{post.special_instruction}</Text>}
        <Text>₱{post.rate_amount} / {post.rate_period}</Text>
        {status === 'Available' && token && <Pressable accessibilityRole="button" disabled={cancelling}
          onPress={() => Alert.alert(tr('Cancel Post'), tr('Remove this post from the public feed?'), [
            { text: tr('Keep Post'), style: 'cancel' },
            { text: tr('Cancel Post'), style: 'destructive', onPress: () => { void cancel(post); } },
          ])} style={{ padding: 12, alignItems: 'center' }}><Text>{tr('Cancel Post')}</Text></Pressable>}
        {status === 'Available' && isScheduleExpired(post, now) && token && <Pressable disabled={cancelling} accessibilityRole="button" onPress={() => setRepost(post)}
          style={{ padding: 12, borderRadius: 20, backgroundColor: '#FFB380', alignItems: 'center' }}>
          <Text style={{ fontWeight: '700' }}>{tr('Repost / Reschedule')}</Text>
        </Pressable>}
      </View>;
    })}
    {repost && token && <RepostModal post={repost} token={token} onClose={() => setRepost(null)} onSuccess={onRefresh} />}
  </View>;
}
