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
  message_payload: string | null;
  message_type?: 'text' | 'image';
  image_url?: string | null;
  image_public_id?: string | null;
  reaction_summary?: Record<string, number>;
  my_reaction?: string | null;
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

/**
 * POST /api/v1/chat/send-image/
 * Sends an image file attachment to receiverId using multipart/form-data.
 * Supports JPEG, PNG, and WEBP up to 10MB.
 */
export async function sendChatImage(
  token: string,
  receiverId: string,
  imageUri: string,
  caption?: string,
  bookingId?: string | null
): Promise<SendMessageResponse> {
  const idempotencyKey = generateUUID();

  const ext = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  };
  const mimeType = mimeMap[ext] || 'image/jpeg';
  const filename = imageUri.split('/').pop() || `chat_${Date.now()}.${ext}`;

  const formData = new FormData();
  formData.append('receiver_id', receiverId);
  formData.append('image', {
    uri: imageUri,
    name: filename,
    type: mimeType,
  } as any);

  if (caption && caption.trim()) {
    formData.append('message_payload', caption.trim());
  }

  if (bookingId) {
    formData.append('booking_id', bookingId);
  }

  const res = await fetchWithTimeout(
    `${CHAT_BASE}/send-image/`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Idempotency-Key': idempotencyKey,
      },
      body: formData,
    },
    30000 // 30s timeout for Cloudinary upload
  );

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      data.image?.[0] ||
      data.message_payload?.[0] ||
      data.detail ||
      data.non_field_errors?.[0] ||
      `Failed to send image (${res.status})`;
    throw new Error(msg);
  }

  return data;
}

export interface ReactResponse {
  message: string;
  action: 'added' | 'removed' | 'changed';
  data: {
    message_id: string;
    my_reaction: string | null;
    reaction_counts: Record<string, number>;
  };
}

/**
 * POST /api/v1/chat/react/<message_id>/
 * Toggles an emoji reaction on a message.
 * Allowed emojis: ❤️ 👍 😂 😢 😮
 */
export async function reactToChatMessage(
  token: string,
  messageId: string,
  emoji: string
): Promise<ReactResponse> {
  const normalizedEmoji = emoji === '😭' ? '😢' : emoji;

  const res = await fetchWithTimeout(`${CHAT_BASE}/react/${messageId}/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ emoji: normalizedEmoji }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      data.emoji?.[0] ||
      data.detail ||
      `Failed to react to message (${res.status})`;
    throw new Error(msg);
  }

  return data;
}
