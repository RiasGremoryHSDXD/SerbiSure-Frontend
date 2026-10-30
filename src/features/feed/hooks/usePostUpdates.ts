import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { realtime } from '../../../shared/realtime';
import { clearExploreFeedCache } from '../feedCache';
import { isPostAvailable, type PostState } from '../../bookings/postAvailability';

/** One subscription and one expiry timer per visible screen, rather than polling every card. */
export function usePostUpdates(posts: PostState[], refresh: () => unknown, enabled = true) {
  const latestRefresh = useRef(refresh);
  latestRefresh.current = refresh;
  const [now, setNow] = useState(Date.now);
  const [closedIds, setClosedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const invalidate = () => {
      clearExploreFeedCache();
      setNow(Date.now());
      clearTimeout(timer);
      timer = setTimeout(() => { void latestRefresh.current(); }, 150);
    };
    const unsubscribe = realtime.subscribe(event => {
      if (!['feed.changed', 'booking.changed', 'sync'].includes(event.type)) return;
      if (event.type === 'feed.changed' && event.booking_id && typeof event.available === 'boolean') {
        setClosedIds(previous => {
          const next = new Set(previous);
          if (event.available) next.delete(event.booking_id!); else next.add(event.booking_id!);
          return next;
        });
      }
      invalidate();
    });
    const state = AppState.addEventListener('change', value => { if (value === 'active') invalidate(); });
    setNow(Date.now());
    return () => { unsubscribe(); state.remove(); clearTimeout(timer); };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const current = Date.now();
    // Midnight changes the badge only. A passed schedule never hides a post.
    if (!posts.length) return;
    const next = Math.floor((current + 8 * 3600000) / 86400000) * 86400000 + 86400000 - 8 * 3600000;
    const timer = setTimeout(() => {
      setNow(Date.now());
      clearExploreFeedCache();
      void latestRefresh.current();
    }, Math.min(next - current + 10, 2147483647));
    return () => clearTimeout(timer);
  }, [posts, enabled, now]);

  return { now, canUsePost: (post: PostState) => isPostAvailable(post, now) && !closedIds.has(String(post.id)) };
}
