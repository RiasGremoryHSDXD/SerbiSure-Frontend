// Release builds always use the production Railway backend for API and WebSockets.
// EXPO_PUBLIC_API_URL is an optional development-only override. Restart Metro after edits.
export const RAILWAY_API_URL = 'https://serbisure-production-backend.up.railway.app';

export function resolveBaseUrl(): string {
  const configured = __DEV__ && process.env.EXPO_PUBLIC_API_URL;
  if (configured && /^https?:\/\//.test(configured)) return configured.replace(/\/+$/, '');
  return RAILWAY_API_URL;
}

export const API_BASE_URL = resolveBaseUrl();
export const DEFAULT_TIMEOUT_MS = 15000; // 15 seconds

/**
 * Normalizes and sanitizes endpoints to prevent malformed double slashes or missing leading slashes.
 */
export function buildApiUrl(endpoint: string): string {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  const cleanBase = API_BASE_URL.replace(/\/+$/, '');
  const cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${cleanBase}${cleanPath}`.replace(/([^:]\/)\/+/g, '$1');
}

/**
 * Fetch wrapper with strict endpoint targeting (NO automatic fallback).
 * If the chosen server is unreachable or times out, an explicit error is thrown,
 * preventing silent data loss or unexpected cross-database contamination.
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
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
