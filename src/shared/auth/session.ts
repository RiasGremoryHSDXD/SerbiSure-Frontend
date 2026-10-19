import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, DEFAULT_TIMEOUT_MS } from '../api/config';

export interface SessionTokens { access: string; refresh: string }
export class SessionError extends Error {
  constructor(message: string, public readonly kind: 'ended' | 'connection' | 'storage') {
    super(message);
    this.name = 'SessionError';
  }
}

// Keep development and hosted accounts separate. Passwords are never stored.
const STORAGE_KEY = `serbisure.refresh.${API_BASE_URL.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
const listeners = new Set<(tokens: Readonly<SessionTokens> | null, message?: string) => void>();
let current: SessionTokens | null = null;
let refreshing: Promise<Readonly<SessionTokens> | null> | null = null;
let storageWrites: Promise<void> = Promise.resolve();

export const getSession = (): Readonly<SessionTokens> | null => current;
export function subscribeSession(listener: (tokens: Readonly<SessionTokens> | null, message?: string) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
function publish(message?: string): void {
  listeners.forEach(listener => listener(current, message));
}
function writeStoredToken(token: string | null): Promise<void> {
  // A sign-out queued during token rotation must delete the rotated token last.
  const write = storageWrites.then(() => token === null
    ? SecureStore.deleteItemAsync(STORAGE_KEY)
    : SecureStore.setItemAsync(STORAGE_KEY, token));
  storageWrites = write.catch(() => {});
  return write;
}
export function isSessionTokens(value: unknown): value is SessionTokens {
  const tokens = value as SessionTokens | null;
  return !!tokens && typeof tokens.access === 'string' && !!tokens.access.trim()
    && typeof tokens.refresh === 'string' && !!tokens.refresh.trim();
}

export async function startSession(tokens: SessionTokens): Promise<void> {
  if (!isSessionTokens(tokens)) throw new SessionError('Could not sign in. Please try again.', 'ended');
  try {
    // Remove a previous account's saved login before replacing it.
    await writeStoredToken(null);
    await writeStoredToken(tokens.refresh);
  } catch {
    throw new SessionError('Could not save your login. Please try again.', 'storage');
  }
  current = { access: tokens.access, refresh: tokens.refresh };
  publish();
}

export async function forgetSession(message?: string): Promise<void> {
  current = null;
  publish(message);
  try { await writeStoredToken(null); }
  catch { throw new SessionError('Could not clear your saved login. Please try again.', 'storage'); }
}

export async function restoreSession(): Promise<Readonly<SessionTokens> | null> {
  let refresh: string | null;
  try { refresh = await SecureStore.getItemAsync(STORAGE_KEY); }
  catch { throw new SessionError('Could not read your saved login. Please try again.', 'storage'); }
  if (!refresh) return null;
  current = { access: '', refresh };
  return refreshSession();
}

export function refreshSession(): Promise<Readonly<SessionTokens> | null> {
  if (refreshing) return refreshing;
  const session = current;
  if (!session) return Promise.resolve(null);
  const operation = async (): Promise<Readonly<SessionTokens> | null> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
    try {
      let response: Response;
      try {
        response = await fetch(`${API_BASE_URL}/api/v1/accounts/token/refresh/`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh: session.refresh }), signal: controller.signal,
        });
      } catch {
        throw new SessionError('Could not reconnect. Check your connection and try again.', 'connection');
      }
      const data = await response.json().catch(() => null);
      if (current !== session) return null;
      if (response.status === 401 || response.status === 403 || response.status === 400) {
        const suspended = data?.code === 'account_suspended' || data?.detail?.code === 'account_suspended';
        const message = suspended ? 'Your account is suspended. Contact SerbiSure Support.' : 'Your session has expired. Please sign in again.';
        await forgetSession(message);
        throw new SessionError(message, 'ended');
      }
      if (!response.ok || !isSessionTokens({ access: data?.access, refresh: data?.refresh ?? session.refresh })) {
        throw new SessionError('Could not reconnect. Please try again shortly.', 'connection');
      }
      const tokens = { access: data.access as string, refresh: (data.refresh ?? session.refresh) as string };
      try { await writeStoredToken(tokens.refresh); }
      catch { throw new SessionError('Could not update your saved login. Please try again.', 'storage'); }
      if (current !== session) return null;
      // Keep the session identity stable so old requests cannot retry as a different account.
      Object.assign(session, tokens);
      publish();
      return session;
    } finally { clearTimeout(timer); }
  };
  refreshing = operation().finally(() => { refreshing = null; });
  return refreshing;
}
