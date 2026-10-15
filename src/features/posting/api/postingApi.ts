import type { WorkSetup } from '../../bookings/workSetup';
import { requestResponse } from '../../../shared/api/httpClient';
import { clearExploreFeedCache } from '../../feed/feedCache';

export interface PostingPayload {
  booking_type: 'short_term' | 'long_term';
  work_setup: WorkSetup;
  service_category: string[];
  start_time: string;
  end_time: string;
  work_days?: string[];
  daily_start_time?: string;
  daily_end_time?: string;
  region?: string;
  province?: string;
  city?: string;
  barangay?: string;
  street: string;
  floor_number?: string;
  zip_code: string;
  special_instruction: string;
  rate_amount: string;
  rate_period: 'day' | 'month';
}

export async function submitPost(token: string | null, payload: PostingPayload, idempotencyKey: string) {
  const response = await requestResponse('/api/v1/booking/post/', {
    token, method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(payload),
  });
  if (response.ok) clearExploreFeedCache();
  return response;
}
