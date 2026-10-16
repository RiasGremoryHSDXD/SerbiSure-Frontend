type RegistrationResult =
  | { ok: true; access: string; refresh: string }
  | { ok: false; error: unknown };

/** Only a confirmed account creation may advance the registration flow. */
export async function readRegistrationResponse(response: Response): Promise<RegistrationResult> {
  const data = await response.json().catch(() => null);

  if (response.status === 429) {
    const seconds = Number(response.headers.get('Retry-After'));
    return {
      ok: false,
      error: {
        code: 'registration_throttled',
        retry_after: Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : 300,
      },
    };
  }

  if (!response.ok) {
    if (response.status >= 500) {
      return { ok: false, error: { code: 'registration_unconfirmed' } };
    }
    return { ok: false, error: data || { detail: 'Registration could not be completed. Please try again.' } };
  }

  if (response.status === 201 && typeof data?.access === 'string' && data.access.trim()
    && typeof data?.refresh === 'string' && data.refresh.trim()) {
    return { ok: true, access: data.access, refresh: data.refresh };
  }

  return {
    ok: false,
    error: { code: 'registration_unconfirmed' },
  };
}
