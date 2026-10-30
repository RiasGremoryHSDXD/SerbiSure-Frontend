import { requestResponse } from '../../../shared/api/httpClient';
import type { BookingItem } from '../../bookings/api/bookingApi';
import type { BookingCardInfo } from '../bookingCards';
import type { PostingPayload } from '../../posting/api/postingApi';
import type { ChatMessageItem } from './chatApi';
import { isAcceptanceExpired, PASSED_SCHEDULE_MESSAGE } from '../../bookings/postAvailability';

export interface ChatOfferPayload extends PostingPayload {
  recipient_id: string;
  work_days: string[];
  daily_start_time: string;
  daily_end_time: string;
}

function errorMessages(data: unknown): string[] {
  if (typeof data === 'string') return data.trim() ? [data.trim()] : [];
  if (Array.isArray(data)) return data.flatMap(errorMessages);
  if (data && typeof data === 'object') return Object.entries(data)
    .filter(([key]) => key !== 'code').flatMap(([, value]) => errorMessages(value));
  return [];
}

async function result<T>(path: string, token: string, method: string, body: unknown, key?: string): Promise<T> {
  const res = await requestResponse(path, { token, method, headers: key ? { 'Idempotency-Key': key } : undefined, body: JSON.stringify(body) });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const errors = errorMessages(data).join(' ');
    throw new Error(errors || 'Unable to save this booking. Please try again.');
  }
  if (!data) throw new Error('Unexpected booking response. Refresh the conversation before retrying.');
  return data as T;
}

export async function sendBookingOffer(token: string, payload: ChatOfferPayload, key: string): Promise<{ booking: BookingItem; chat_message: ChatMessageItem; language_warning?: string | null }> {
  return result('/api/v1/booking/chat-offers/', token, 'POST', payload, key);
}

export async function respondToBookingOffer(token: string, card: BookingCardInfo, action: 'accept' | 'reject'): Promise<void> {
  if (!card.bookingId || !card.canRespond) throw new Error('This offer is not available for you to confirm.');
  if (action === 'accept' && isAcceptanceExpired(card)) throw new Error(PASSED_SCHEDULE_MESSAGE);
  const path = card.proposalId ? '/api/v1/booking/proposals/' + card.proposalId + '/respond/'
    : '/api/v1/booking/' + card.bookingId + (action === 'accept' ? '/accept/' : '/cancel/');
  const data = await result<{ booking?: BookingItem; proposal?: { status: string } }>(path, token, 'PATCH', { action, ...(action === 'reject' && !card.proposalId ? { reason: 'Other', expected_points: 0 } : {}) });
  if (action === 'accept' && data.booking?.booking_status !== 'Accepted') throw new Error('The server did not confirm this booking. Refresh and check its status.');
}
