import { useCallback, useEffect, useRef, useState } from 'react';
import type { Role } from '../../../app/roleConfig';
import { loadExploreFeed } from '../feedCache';
import type { BookingFeedDto, FeedQuery } from '../types';

export function useExploreFeed<T>(role: Role, token: string | null | undefined, map: (item: BookingFeedDto) => T) {
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchedCount, setFetchedCount] = useState(0);
  const generation = useRef(0);

  useEffect(() => {
    setItems([]); setError(null); setFetchedCount(0);
    return () => { generation.current++; };
  }, [role, token]);

  const fetchItems = useCallback(async (forceRefresh: boolean, filters: FeedQuery): Promise<T[] | null> => {
    const request = ++generation.current;
    if (!token) { setItems([]); setIsLoading(false); return null; }
    setIsLoading(true); setError(null);
    try {
      const data = await loadExploreFeed(role, token, filters, forceRefresh);
      if (request !== generation.current) return null;
      const mapped = data.map(map);
      setItems(mapped);
      setFetchedCount(mapped.length);
      return mapped;
    } catch (failure) {
      if (request === generation.current) setError(failure instanceof Error ? failure.message : 'Could not load posts. Please try again.');
      return null;
    } finally {
      if (request === generation.current) setIsLoading(false);
    }
  }, [role, token, map]);

  return { items, setItems, isLoading, error, fetchItems, fetchedCount };
}
