import { API_BASE_URL, fetchWithTimeout } from '../config/api';

const ACCOUNTS_BASE = `${API_BASE_URL}/api/v1/accounts`;

export interface UserAboutResponse {
  user_about: string;
}

/**
 * Fetch the authenticated user's about/bio string from the backend.
 * GET /api/v1/accounts/user-about/
 */
export async function fetchUserAbout(token: string): Promise<string> {
  try {
    const res = await fetchWithTimeout(`${ACCOUNTS_BASE}/user-about/`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson?.detail || `Failed to fetch bio (${res.status})`);
    }

    const data: UserAboutResponse = await res.json();
    return data.user_about ?? 'No Bio';
  } catch (error: any) {
    console.warn('[accountApi] fetchUserAbout error:', error?.message || error);
    throw error;
  }
}

/**
 * Update the authenticated user's about/bio text.
 * PATCH /api/v1/accounts/user-about/
 * Note: Rate limited to 3 requests/hour by backend.
 */
export async function updateUserAbout(token: string, bio: string): Promise<string> {
  try {
    const res = await fetchWithTimeout(`${ACCOUNTS_BASE}/user-about/`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_about: bio }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      if (res.status === 429) {
        throw new Error(errJson?.detail || 'Too many attempts. Please try again later.');
      }
      if (errJson?.user_about) {
        const fieldError = Array.isArray(errJson.user_about)
          ? errJson.user_about.join(' ')
          : errJson.user_about;
        throw new Error(fieldError);
      }
      throw new Error(errJson?.detail || `Failed to update bio (${res.status})`);
    }

    const data: UserAboutResponse = await res.json();
    return data.user_about;
  } catch (error: any) {
    console.warn('[accountApi] updateUserAbout error:', error?.message || error);
    throw error;
  }
}
