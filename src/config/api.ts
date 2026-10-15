import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

// ============================================================================
// BACKEND TARGET TOGGLE
// Set to true  (or 'local', 1)  -> Local backend  (resolved dynamically or via LOCAL_API_URL)
// Set to false (or 'vercel', 2) -> Vercel cloud   (https://serbisure-backend-rho.vercel.app) [DEFAULT]
// Or set directly to a custom URL string e.g. 'http://192.168.1.10:8000'
//
// For Render, set EXPO_PUBLIC_API_URL to the HTTPS Render backend URL.
// NOTE: Strictly NO automatic fallback between servers.
// ============================================================================
export const USE_LOCAL_BACKEND: boolean | string | number = false;

export const LOCAL_API_URL = 'http://localhost:8000';
export const VERCEL_API_URL = 'https://serbisure-backend-rho.vercel.app';

/**
 * Checks whether the application is running as an installed standalone APK / production binary.
 */
export function isRunningInApk(): boolean {
  if (!__DEV__) {
    return true;
  }
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;
  if (hostUri) {
    return false;
  }
  if (
    Constants.executionEnvironment === ExecutionEnvironment.Standalone ||
    Constants.executionEnvironment === ExecutionEnvironment.Bare
  ) {
    return true;
  }
  if (Constants.appOwnership !== 'expo') {
    return true;
  }
  return false;
}

/**
 * Resolves the active local backend URL:
 * 1. If process.env.EXPO_PUBLIC_API_URL is set, honor it.
 * 2. If connected to Expo Metro (physical device or emulator on LAN), uses the PC's Wi-Fi IP.
 * 3. Android emulator fallback (10.0.2.2 or 127.0.0.1 for adb reverse).
 * 4. Fallback to LOCAL_API_URL (http://localhost:8000).
 */
export function resolveLocalUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // If Metro bundler hostUri is present, grab the PC's actual local IP address
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return `http://${ip}:8000`;
    }
  }

  // Android emulator or USB adb reverse
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000';
  }

  return LOCAL_API_URL;
}

/**
 * Resolves the active API base URL based on USE_LOCAL_BACKEND:
 * - true  | 'local'  | 1  => Local backend (e.g. http://192.168.x.x:8000 or http://10.0.2.2:8000)
 * - false | 'vercel' | 2  => https://serbisure-backend-rho.vercel.app
 * - Direct URL string     => Used as-is
 * Strictly NO automatic runtime fallback between servers.
 */
export function resolveBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (configured && /^https?:\/\//.test(configured)) return configured.replace(/\/+$/, '');
  // If USE_LOCAL_BACKEND is a custom direct URL string
  if (typeof USE_LOCAL_BACKEND === 'string' && (USE_LOCAL_BACKEND.startsWith('http://') || USE_LOCAL_BACKEND.startsWith('https://'))) {
    return USE_LOCAL_BACKEND;
  }

  const isLocalChosen =
    USE_LOCAL_BACKEND === true ||
    USE_LOCAL_BACKEND === 'local' ||
    USE_LOCAL_BACKEND === 'LOCAL' ||
    USE_LOCAL_BACKEND === 1 ||
    USE_LOCAL_BACKEND === '1';

  if (isLocalChosen) {
    const local = resolveLocalUrl();
    console.log(`[API Config] Target: LOCAL BACKEND -> ${local}`);
    return local;
  }

  console.log(`[API Config] Target: VERCEL CLOUD BACKEND -> ${VERCEL_API_URL}`);
  return VERCEL_API_URL;
}

export const API_BASE_URL = resolveBaseUrl();
export const DEFAULT_TIMEOUT_MS = 15000; // 15 seconds

/**
 * Helper to check if the current configuration is targeting the Vercel cloud backend.
 */
export function isCloudBackend(): boolean {
  return API_BASE_URL.includes('vercel.app');
}

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
