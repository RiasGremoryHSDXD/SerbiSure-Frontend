import { requestResponse } from '../../../shared/api/httpClient';
import { clearExploreFeedCache } from '../../feed/feedCache';

export interface PostingPayload {
  booking_type: 'short_term' | 'long_term';
  service_category: string[];
  start_time: string;
  end_time: string;
  region?: string;
  province?: string;
  city?: string;
  barangay?: string;
  street: string;
  floor_number?: string;
  zip_code: string;
  special_instruction: string;
  daily_rate: string;
}

export async function submitPost(token: string | null, payload: PostingPayload, idempotencyKey: string) {
  const response = await requestResponse('/api/v1/booking/post/', {
    token, method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(payload),
  });
  if (response.ok) clearExploreFeedCache();
  return response;
}
