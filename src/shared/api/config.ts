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

