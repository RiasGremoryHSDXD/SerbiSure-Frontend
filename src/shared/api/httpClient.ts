import { buildApiUrl, DEFAULT_TIMEOUT_MS } from './config';

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
