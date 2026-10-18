import { fetchSupportContacts, type SupportContacts } from './api/chatApi';

const FRESH_FOR_MS = 5 * 60 * 1000;
type Entry = { key: string; data: SupportContacts | null; expiresAt: number; pending: Promise<SupportContacts> | null };
let cached: Entry | null = null;

export function getCachedSupportContacts(key: string): SupportContacts | null {
  return cached?.key === key ? cached.data : null;
}

export function clearSupportContactsCache(): void {
  cached = null;
}

export function loadSupportContacts(key: string, token: string, forceRefresh = false): Promise<SupportContacts> {
  // Keep only the current account/location. Never persist contact data to disk.
  if (cached?.key !== key) cached = { key, data: null, expiresAt: 0, pending: null };
  const entry = cached;
  if (!forceRefresh && entry.data && entry.expiresAt > Date.now()) return Promise.resolve(entry.data);
  if (entry.pending) return entry.pending;
  const request = fetchSupportContacts(token).then(data => {
    // Logout or a different account/location invalidates any older request.
    if (cached === entry) {
      entry.data = data;
      entry.expiresAt = Date.now() + FRESH_FOR_MS;
    }
    return data;
  }).finally(() => {
    if (entry.pending === request) entry.pending = null;
  });
  entry.pending = request;
  return request;
}
