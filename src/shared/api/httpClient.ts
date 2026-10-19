import { buildApiUrl, DEFAULT_TIMEOUT_MS } from './config';
import { getSession, refreshSession, SessionError } from '../auth/session';

export type AccountSuspensionListener = (message: string) => void;

const suspensionListeners = new Set<AccountSuspensionListener>();
const inspectedResponses = new WeakSet<object>();

export function subscribeAccountSuspension(listener: AccountSuspensionListener): () => void {
  suspensionListeners.add(listener);
  return () => suspensionListeners.delete(listener);
}

function suspensionCode(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const payload = data as Record<string, unknown>;
  if (payload.code === 'account_suspended') return 'account_suspended';
  if (payload.detail && typeof payload.detail === 'object') {
    const nested = payload.detail as Record<string, unknown>;
    if (nested.code === 'account_suspended') return 'account_suspended';
  }
  return null;
}

function suspensionMessage(data: unknown): string {
  if (data && typeof data === 'object') {
    const payload = data as Record<string, unknown>;
    if (typeof payload.detail === 'string') return payload.detail;
    if (payload.detail && typeof payload.detail === 'object') {
      const nested = payload.detail as Record<string, unknown>;
      if (typeof nested.detail === 'string') return nested.detail;
    }
  }
  return 'Your account is suspended. Contact SerbiSure Support for assistance.';
}

/**
 * Notifies the app shell when the API says this account was suspended.
 * The response body can be either a direct error object or DRF's nested
 * `{ detail: { code, detail } }` representation.
 */
export function notifyAccountSuspension(status: number, data: unknown, response?: Response): boolean {
  if (status < 400 || suspensionCode(data) !== 'account_suspended') return false;
  if (response && inspectedResponses.has(response)) return true;
  if (response) inspectedResponses.add(response);
  const message = suspensionMessage(data);
  suspensionListeners.forEach(listener => {
    try { listener(message); } catch { /* A security notification must not break the request. */ }
  });
  return true;
}

function inspectAccountSuspensionResponse(response: Response): void {
  if (response.ok || response.status < 400 || !response.headers.get('content-type')?.includes('application/json')) return;
  response.clone().json().then(data => notifyAccountSuspension(response.status, data, response)).catch(() => { /* The caller still handles the original response. */ });
}

export interface RequestOptions extends RequestInit {
  token?: string | null;
}

export async function requestResponse(path: string, { token, ...options }: RequestOptions = {}, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<Response> {
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return fetchWithTimeout(buildApiUrl(path), { ...options, headers }, timeoutMs);
}

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly details: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await requestResponse(path, options);
  let data: unknown;
  try {
    data = response.status === 204 ? null : await response.json();
  } catch {
    throw new ApiError(response.ok ? 'Unexpected server response. Please try again.' : `Request failed (${response.status}). Please try again.`, response.status, null);
  }
  if (!response.ok) {
    notifyAccountSuspension(response.status, data, response);
    const message = typeof data === 'object' && data !== null && 'detail' in data && typeof data.detail === 'string'
      ? data.detail : `Request failed (${response.status}). Please try again.`;
    throw new ApiError(message, response.status, data);
  }
  return data as T;
}

export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  let controller = new AbortController();
  let id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const session = getSession();
    const headers = new Headers(options.headers);
    const sessionRequest = session && headers.get('Authorization') === `Bearer ${session.access}`
      && url.startsWith(buildApiUrl('/'));
    const requestedToken = session?.access;
    let response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    if (response.status === 401 && sessionRequest && getSession() === session) {
      try {
        const renewed = session.access !== requestedToken ? session : await refreshSession();
        if (renewed && getSession() === session) {
          headers.set('Authorization', `Bearer ${renewed.access}`);
          clearTimeout(id);
          controller = new AbortController();
          id = setTimeout(() => controller.abort(), timeoutMs);
          response = await fetch(url, { ...options, headers, signal: controller.signal });
        }
      } catch (error) {
        if (!(error instanceof SessionError) || error.kind !== 'ended') throw error;
      }
    }
    inspectAccountSuspensionResponse(response);
    return response;
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      console.warn(`[API] Request timed out after ${timeoutMs}ms: ${url}`);
      throw new Error(`Request timed out (${Math.round(timeoutMs / 1000)}s). Could not reach server at ${url}.`);
    }
    console.warn(`[API] Request failed for ${url}:`, error?.message || error);
    throw error;
  } finally {
    clearTimeout(id);
  }
}
