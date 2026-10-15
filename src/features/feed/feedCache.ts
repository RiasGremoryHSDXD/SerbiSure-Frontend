import type { Role } from '../../app/roleConfig';
import { buildFeedPath, fetchFeed } from './api/feedApi';
import type { BookingFeedDto, FeedQuery } from './types';

const entries = new Map<string, { items: BookingFeedDto[]; expiresAt: number }>();
const pending = new Map<string, Promise<BookingFeedDto[]>>();
let generation = 0;

export function hasActiveFeedFilters(filters: FeedQuery) {
  return filters.categories.length > 0 || filters.bookingType !== null || filters.maxRate !== null || !!filters.location.trim() || filters.sortBy !== 'newest';
}

export function clearExploreFeedCache() {
  generation++;
  entries.clear();
  pending.clear();
}

export async function loadExploreFeed(role: Role, token: string, filters: FeedQuery, forceRefresh = false): Promise<BookingFeedDto[]> {
  // A token identifies one authenticated session. Never reuse a different session's feed.
  const key = `${role}:${token}:${buildFeedPath(filters)}`;
  const cached = entries.get(key);
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) return cached.items;
  if (!forceRefresh && pending.has(key)) return pending.get(key)!;
  const version = generation;
  const request = fetchFeed(token, filters).then((items) => {
    if (version === generation && pending.get(key) === request) entries.set(key, { items, expiresAt: Date.now() + 30000 });
    return items;
  });
  pending.set(key, request);
  try { return await request; }
  finally { if (pending.get(key) === request) pending.delete(key); }
}
