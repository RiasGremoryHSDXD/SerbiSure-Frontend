import { requestResponse } from '../../../shared/api/httpClient';

export type SelfieUploadState = {
  status: 'uploading' | 'saved' | 'failed';
  error: string | null;
};

export async function uploadSelfie(token: string, selfiePath: string): Promise<void> {
  if (!token) throw new Error('Please sign in again before saving your selfie.');
  const uri = selfiePath.startsWith('file:') ? selfiePath : `file://${selfiePath}`;
  const body = new FormData();
  body.append('profile_image', { uri, name: 'verification-selfie.jpg', type: 'image/jpeg' } as any);
  const startedAt = Date.now();
  const response = await requestResponse('/api/v1/accounts/profile-image/', {
    method: 'PUT', token, body,
    // Let React Native supply the multipart boundary.
  }, 60000);
  console.info('[Liveness timing]', {
    stage: 'selfie_upload_response', durationMs: Date.now() - startedAt,
    status: response.status, serverTiming: response.headers.get('Server-Timing'),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = data?.detail || data?.error || data?.profile_image;
    throw new Error(typeof detail === 'string' ? detail : Array.isArray(detail) ? detail.join(' ') : 'Could not save your selfie. Please retry.');
  }
  if (!data?.profile_link || typeof data.profile_link !== 'string') {
    throw new Error('The server did not confirm that your selfie was saved. Please retry.');
  }
}

/** Owned by registration, so changing from the camera to documents cannot lose
 * an in-flight save. A failure is retained until an explicit retry/finish tap. */
export function createSelfieUploadTask(upload: () => Promise<void>) {
  let state: SelfieUploadState = { status: 'uploading', error: null };
  let pending: Promise<void> | null = null;
  const listeners = new Set<() => void>();
  const publish = (next: SelfieUploadState) => {
    state = next;
    listeners.forEach(listener => listener());
  };
  const ensureSaved = (): Promise<void> => {
    if (pending) return pending;
    if (state.status === 'saved') return Promise.resolve();
    publish({ status: 'uploading', error: null });
    pending = Promise.resolve().then(upload).then(() => {
      publish({ status: 'saved', error: null });
    }, (error: unknown) => {
      publish({ status: 'failed', error: error instanceof Error ? error.message : 'Could not save your selfie. Please retry.' });
    }).then(() => { pending = null; });
    return pending;
  };
  void ensureSaved(); // Failures become state; they never become unhandled rejections.
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    async ensureSaved() {
      await ensureSaved();
      if (state.status !== 'saved') throw new Error(state.error || 'Your selfie has not been saved. Please retry.');
    },
  };
}

export type SelfieUploadTask = ReturnType<typeof createSelfieUploadTask>;
