import { API_BASE_URL, fetchWithTimeout } from '../config/api';

const CHAT_BASE = `${API_BASE_URL}/api/v1/chat`;

// RFC4122 v4 compliant UUID generator for React Native without native dependencies
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface ConversationPartner {
  partner_id: string;
  partner_name: string;
  partner_account_type: string;
  partner_profile_image: string | null;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

export interface ChatMessageItem {
  chat_message_id: string;
  sender_id: string;
  receiver_id: string;
  booking_id: string | null;
  message_payload: string;
  is_read: boolean;
  is_sender: boolean;
  createdAt: string;
}

export interface SendMessageResponse {
  message: string;
  data: ChatMessageItem;
}

/**
 * GET /api/v1/chat/inbox/
 * Retrieves the list of conversation partners with unread counts and last message.
 * Safely handles both { message, data: [] } and direct [] responses.
 */
export async function fetchChatInbox(token: string): Promise<ConversationPartner[]> {
  const res = await fetchWithTimeout(`${CHAT_BASE}/inbox/`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to fetch inbox (${res.status})`);
  }

  const json = await res.json();
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.results)) return json.results;
  return [];
}

/**
 * GET /api/v1/chat/thread/<partner_id>/
 * Retrieves conversation messages between authenticated user and partner.
 * Safely handles both direct [] and { results: [] } / { data: [] }.
 */
export async function fetchChatThread(token: string, partnerId: string): Promise<ChatMessageItem[]> {
  const res = await fetchWithTimeout(`${CHAT_BASE}/thread/${partnerId}/`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to load messages (${res.status})`);
  }

  const json = await res.json();
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.results)) return json.results;
  return [];
}

/**
 * POST /api/v1/chat/send/
 * Sends a message to receiver_id.
 * Includes Idempotency-Key to prevent duplicate sends on network retries.
 */
export async function sendChatMessage(
  token: string,
  receiverId: string,
  messagePayload: string,
  bookingId?: string | null
): Promise<SendMessageResponse> {
  const idempotencyKey = generateUUID();

  const res = await fetchWithTimeout(`${CHAT_BASE}/send/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({
      receiver_id: receiverId,
      message_payload: messagePayload.trim(),
      booking_id: bookingId || null,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      data.detail ||
      data.message_payload?.[0] ||
      data.receiver_id?.[0] ||
      `Failed to send message (${res.status})`;
    throw new Error(msg);
  }

  return data;
}

/**
 * PATCH /api/v1/chat/read/<message_id>/
 * Marks a specific message as read.
 */
export async function markChatMessageRead(token: string, messageId: string): Promise<void> {
  const res = await fetchWithTimeout(`${CHAT_BASE}/read/${messageId}/`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ is_read: true }),
  });

  if (!res.ok) {
    // Non-critical, ignore silent failures
    console.warn(`[chatApi] markChatMessageRead error: ${res.status}`);
  }
}
