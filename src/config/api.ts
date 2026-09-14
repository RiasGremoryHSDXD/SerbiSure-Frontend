import { Platform } from 'react-native';
import Constants from 'expo-constants';

export const VERCEL_API_URL = 'https://serbisure-backend-rho.vercel.app';

/**
 * Automatically determines the Primary Local API Base URL:
 * 1. Checks process.env.EXPO_PUBLIC_API_URL (if defined in .env)
 * 2. Dynamically extracts host PC IP address from Expo Metro bundler
 * 3. Uses http://127.0.0.1:8000 on Android (works via ADB reverse tcp:8000 tcp:8000 over USB)
 * 4. Falls back to default local network IP
 */
function getLocalApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  // Step 1: Try to dynamically grab the real WiFi IP from Expo's Metro bundler.
  // This works on physical phones connected over WiFi — it extracts the PC's IP automatically.
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return `http://${ip}:8000`;
    }
  }

  // Step 2: If no real IP was found, we're likely on an Android emulator or USB with ADB reverse.
  // In that case, 127.0.0.1 routes straight to the PC's localhost.
  if (Platform.OS === 'android') {
    return 'http://127.0.0.1:8000';
  }

  // Step 3: Default local network IP fallback
  return 'http://192.168.1.12:8000';
}

export const API_BASE_URL = getLocalApiBaseUrl();
export const DEFAULT_TIMEOUT_MS = 15000; // 15 seconds

let localBackendOfflineUntil = 0;

/**
 * Smart Fetch wrapper with automatic fallback:
 * 1. Tries the local backend first (fastest for local dev).
 * 2. If local server is off/unreachable (network error), automatically falls back to deployed Vercel backend.
 * 3. Remembers if local server is unreachable for 60s to prevent stalling future requests.
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const createTimer = (ms: number) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    return { controller, clear: () => clearTimeout(id) };
  };

  const isLocalUrl = url.startsWith(API_BASE_URL) && API_BASE_URL !== VERCEL_API_URL;

  // If local backend was recently unreachable, skip straight to Vercel
  if (isLocalUrl && Date.now() < localBackendOfflineUntil) {
    const fallbackUrl = url.replace(API_BASE_URL, VERCEL_API_URL);
    const timer = createTimer(timeoutMs);
    try {
      return await fetch(fallbackUrl, {
        ...options,
        signal: timer.controller.signal,
      });
    } finally {
      timer.clear();
    }
  }

  // Use a 5s timeout when probing local backend.
  // Django's dev runserver is single-threaded: on app load it queues many parallel requests,
  // each waiting behind the previous one. 2s was too tight and caused healthy local servers
  // to be falsely declared unreachable, triggering the Vercel fallback.
  const effectiveTimeout = isLocalUrl ? Math.min(timeoutMs, 5000) : timeoutMs;
  const primaryTimer = createTimer(effectiveTimeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: primaryTimer.controller.signal,
    });
    // If local request succeeded, ensure offline flag is cleared
    if (isLocalUrl) {
      localBackendOfflineUntil = 0;
    }
    return response;
  } catch (primaryError) {
    if (isLocalUrl) {
      localBackendOfflineUntil = Date.now() + 20000; // 20-second cooldown (down from 60s for faster recovery)
      const fallbackUrl = url.replace(API_BASE_URL, VERCEL_API_URL);
      console.log(`[API] Local backend unreachable (${url}). Automatically falling back to Vercel: ${fallbackUrl}`);
      
      const fallbackTimer = createTimer(timeoutMs);
      try {
        const fallbackResponse = await fetch(fallbackUrl, {
          ...options,
          signal: fallbackTimer.controller.signal,
        });
        return fallbackResponse;
      } finally {
        fallbackTimer.clear();
      }
    }
    throw primaryError;
  } finally {
    primaryTimer.clear();
  }
}
