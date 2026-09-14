import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

export const VERCEL_API_URL = 'https://serbisure-backend-rho.vercel.app';

/**
 * Checks whether the application is running as an installed standalone APK / production binary.
 * In a standalone APK:
 * 1. Constants.appOwnership is null or 'standalone' (NOT 'expo')
 * 2. Constants.executionEnvironment is 'standalone' or 'bare' (NOT StoreClient)
 * 3. Metro bundler hostUri is absent / undefined
 * 4. In release builds, __DEV__ is false
 */
export function isRunningInApk(): boolean {
  if (!__DEV__) {
    // Release builds are ALWAYS standalone APKs
    return true;
  }
  if (Constants.appOwnership !== 'expo') {
    // Standalone or bare React Native build (not Expo Go)
    return true;
  }
  if (
    Constants.executionEnvironment === ExecutionEnvironment.Standalone ||
    Constants.executionEnvironment === ExecutionEnvironment.Bare
  ) {
    return true;
  }
  // Check if Metro host is absent (not connected to Expo dev server)
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;
  if (!hostUri) {
    return true;
  }
  return false;
}

/**
 * Automatically determines the Primary API Base URL:
 * 1. If process.env.EXPO_PUBLIC_API_URL is explicitly set, use it.
 * 2. If running as an APK / standalone build:
 *    Go DIRECTLY to VERCEL_API_URL! Does NOT wait for or probe local 127.0.0.1 or PC IP.
 * 3. If running inside local Expo development with Metro connected:
 *    Dynamically extracts host PC IP address from Expo Metro bundler.
 * 4. Fallback to VERCEL_API_URL if no active local server can be resolved.
 */
function getApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Standalone APK: Skip local probing completely, target Vercel cloud backend directly
  if (isRunningInApk()) {
    console.log('[API] Running in APK / standalone mode. Targeting Vercel backend directly:', VERCEL_API_URL);
    return VERCEL_API_URL;
  }

  // Step 1: In local Expo Go development, try to dynamically grab the real WiFi IP from Expo's Metro bundler.
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return `http://${ip}:8000`;
    }
  }

  // Step 2: Emulator or ADB reverse USB connection during local dev
  if (Platform.OS === 'android' && __DEV__) {
    return 'http://127.0.0.1:8000';
  }

  // Step 3: Default fallback is Vercel cloud backend
  return VERCEL_API_URL;
}

export const API_BASE_URL = getApiBaseUrl();
export const DEFAULT_TIMEOUT_MS = 15000; // 15 seconds

let localBackendOfflineUntil = 0;

/**
 * Smart Fetch wrapper with automatic fallback:
 * 1. In APK mode: API_BASE_URL is VERCEL_API_URL. Requests go directly to Vercel with ZERO local waiting.
 * 2. In local dev mode: Tries the local backend first (fastest for local dev).
 * 3. If local server is unreachable during dev, falls back to Vercel and suppresses local probing
 *    for 5 minutes so subsequent screen transitions and queries do not stall.
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

  // Use a 3s timeout when probing local backend for quick JSON requests in dev.
  // Do NOT clamp for file uploads (FormData) or explicit long-running requests (e.g. OCR).
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const isLongOperation = isFormData || timeoutMs > DEFAULT_TIMEOUT_MS;
  const effectiveTimeout = (isLocalUrl && !isLongOperation) ? Math.min(timeoutMs, 3000) : timeoutMs;
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
      localBackendOfflineUntil = Date.now() + 300000; // 5-minute cooldown to prevent repetitive stalling
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
