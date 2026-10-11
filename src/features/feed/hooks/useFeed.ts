import { useCallback, useEffect, useRef, useState } from 'react';
import type { Role } from '../../../app/roleConfig';
import { fetchFeed } from '../api/feedApi';
import { mapFeedPost } from '../feedMapper';
import type { FeedPost } from '../types';

export function useFeed(role: Role, token?: string | null, userId?: string | null) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);

  const load = useCallback(async (refresh = false) => {
    const request = ++generation.current;
    if (!token) { setPosts([]); setIsLoading(false); setIsRefreshing(false); return; }
    if (refresh) setIsRefreshing(true);
    else { setIsLoading(true); setPosts([]); }
    setError(null);
    try {
      const items = await fetchFeed(token);
      if (request === generation.current) setPosts(items.map((item) => mapFeedPost(item, role)));
    } catch (failure) {
      if (request === generation.current) setError(failure instanceof Error ? failure.message : 'Could not load posts. Please try again.');
    } finally {
      if (request === generation.current) { setIsLoading(false); setIsRefreshing(false); }
    }
  }, [role, token, userId]);

  useEffect(() => { void load(); return () => { generation.current++; }; }, [load]);
  return { posts, isLoading, isRefreshing, error, refresh: useCallback(() => load(true), [load]) };
}
