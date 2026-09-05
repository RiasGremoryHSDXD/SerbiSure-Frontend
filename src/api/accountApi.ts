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

export interface PublicProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  full_name: string;
  account_type: string;
  verification_status: string;
  profile_link: string | null;
  resume_url?: string | null;
  user_about: string;
  user_tags: string[];
  city: string | null;
  province: string | null;
  date_joined: string;
}

/**
 * Fetch the public profile of any user by their UUID.
 * GET /api/v1/accounts/public-profile/<userId>/
 */
export async function fetchPublicProfile(token: string, userId: string): Promise<PublicProfile> {
  try {
    const res = await fetchWithTimeout(`${ACCOUNTS_BASE}/public-profile/${userId}/`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson?.detail || `Failed to fetch profile (${res.status})`);
    }

    const data: PublicProfile = await res.json();
    return data;
  } catch (error: any) {
    console.warn('[accountApi] fetchPublicProfile error:', error?.message || error);
    throw error;
  }
}

export interface ResumeResponse {
  resume_url: string | null;
  resume_uploaded_at: string | null;
}

/**
 * Fetch the authenticated Kasambahay's resume info.
 * GET /api/v1/accounts/resume/
 */
export async function fetchKasambahayResume(token: string): Promise<ResumeResponse> {
  try {
    const res = await fetchWithTimeout(`${ACCOUNTS_BASE}/resume/`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson?.detail || `Failed to fetch resume (${res.status})`);
    }

    const data: ResumeResponse = await res.json();
    return data;
  } catch (error: any) {
    console.warn('[accountApi] fetchKasambahayResume error:', error?.message || error);
    throw error;
  }
}

/**
 * Upload or update the authenticated Kasambahay's PDF resume.
 * PATCH /api/v1/accounts/resume/
 */
export async function uploadKasambahayResume(
  token: string,
  fileUri: string,
  fileName?: string,
  idempotencyKey?: string
): Promise<ResumeResponse> {
  try {
    const formData = new FormData();
    const name = fileName || fileUri.split('/').pop() || 'resume.pdf';

    formData.append('resume_pdf', {
      uri: fileUri,
      name,
      type: 'application/pdf',
    } as any);

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };

    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    const res = await fetchWithTimeout(`${ACCOUNTS_BASE}/resume/`, {
      method: 'PATCH',
      headers,
      body: formData,
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      if (res.status === 429) {
        throw new Error(errJson?.detail || 'Daily upload limit reached (5 uploads/day). Please try again later.');
      }
      if (errJson?.resume_pdf) {
        const fieldError = Array.isArray(errJson.resume_pdf)
          ? errJson.resume_pdf.join(' ')
          : errJson.resume_pdf;
        throw new Error(fieldError);
      }
      throw new Error(errJson?.detail || errJson?.error || `Failed to upload resume (${res.status})`);
    }

    const data: ResumeResponse = await res.json();
    return data;
  } catch (error: any) {
    console.warn('[accountApi] uploadKasambahayResume error:', error?.message || error);
    throw error;
  }
}

/**
 * Change the authenticated user's password.
 * POST /api/v1/accounts/change-password/
 */
export async function changePassword(
  token: string,
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): Promise<{ message: string }> {
  try {
    const res = await fetchWithTimeout(`${ACCOUNTS_BASE}/change-password/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson?.error || errJson?.detail || `Failed to change password (${res.status})`);
    }

    const data = await res.json();
    return data;
  } catch (error: any) {
    console.warn('[accountApi] changePassword error:', error?.message || error);
    throw error;
  }
}



