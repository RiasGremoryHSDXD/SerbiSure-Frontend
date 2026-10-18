import type { PersistedChatOffer } from '../bookingCards';
import { API_BASE_URL } from '../../../shared/api/config';
import { ApiError, requestResponse } from '../../../shared/api/httpClient';

const CHAT_BASE = `${API_BASE_URL}/api/v1/chat`;

export interface SupportContact {
  id: string;
  name: string;
  account_type: string;
  barangay: string | null;
  avatar: string | null;
}

export interface SupportContacts {
  superadmins: SupportContact[];
  barangay: { name: string; available: boolean; contacts: SupportContact[]; message: string };
}

export async function fetchSupportContacts(token: string): Promise<SupportContacts> {
  const response = await requestResponse(`${CHAT_BASE}/support-contacts/`, {
    method: 'GET', headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.detail || 'Support contacts could not be loaded. Please try again.');
  if (!Array.isArray(data?.superadmins) || !Array.isArray(data?.barangay?.contacts) ||
      typeof data.barangay.available !== 'boolean') {
    throw new Error('Support contacts could not be loaded. Please try again.');
  }
  return data;
}

// RFC4122 v4 compliant UUID generator for React Native without native dependencies
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
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
  sent_count?: number;
}

export interface ChatMessageItem {
  chat_message_id: string;
  sender_id: string;
  receiver_id: string;
  booking_id: string | null;
  booking_offer?: PersistedChatOffer | null;
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
  language_warning?: string | null;
  message: string;
  data: ChatMessageItem;
}

export interface ToggleReactionResponse {
  message: string;
  action: 'added' | 'removed' | 'changed';
  data: {
    message_id: string;
    my_reaction: string | null;
    reaction_counts: Record<string, number>;
  };
}

/**
 * GET /api/v1/chat/inbox/
 * Retrieves the list of conversation partners with unread counts and last message.
 * Safely handles both { message, data: [] } and direct [] responses.
 */
export async function fetchChatInbox(token: string): Promise<ConversationPartner[]> {
  const res = await requestResponse(`${CHAT_BASE}/inbox/`, {
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

export interface FetchChatThreadResult {
  messages: ChatMessageItem[];
  partnerIsTyping: boolean;
  partnerIsOnline?: boolean;
}

/**
 * GET /api/v1/chat/thread/<partner_id>/
 * Retrieves conversation messages and typing status between authenticated user and partner.
 */
export async function fetchChatThreadDetails(token: string, partnerId: string): Promise<FetchChatThreadResult> {
  const res = await requestResponse(`${CHAT_BASE}/thread/${partnerId}/`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new ApiError(errorData.detail || 'Could not load messages. Please retry.', res.status, errorData);
  }

  const json = await res.json();
  let messages: ChatMessageItem[] = [];
  let partnerIsTyping = false;
  let partnerIsOnline: boolean | undefined;

  if (Array.isArray(json)) {
    messages = json;
  } else if (Array.isArray(json?.data)) {
    messages = json.data;
    partnerIsTyping = Boolean(json.partner_is_typing);
  } else if (Array.isArray(json?.results)) {
    messages = json.results;
    partnerIsTyping = Boolean(json.partner_is_typing);
  } else {
    throw new Error('Could not load messages. Please retry.');
  }

  if (!partnerIsTyping && res.headers.get('x-partner-is-typing') === 'true') {
    partnerIsTyping = true;
  }
  if (typeof json?.partner_is_online === 'boolean') {
    partnerIsOnline = json.partner_is_online;
  } else {
    const onlineHeader = res.headers.get('x-partner-is-online');
    if (onlineHeader === 'true') partnerIsOnline = true;
    else if (onlineHeader === 'false') partnerIsOnline = false;
  }

  return { messages, partnerIsTyping, partnerIsOnline };
}

/**
 * GET /api/v1/chat/thread/<partner_id>/
 * Retrieves conversation messages between authenticated user and partner.
 */
export async function fetchChatThread(token: string, partnerId: string): Promise<ChatMessageItem[]> {
  const result = await fetchChatThreadDetails(token, partnerId);
  return result.messages;
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

  const res = await requestResponse(`${CHAT_BASE}/send/`, {
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
    throw new ApiError(msg, res.status, data);
  }

  return data;
}

/**
 * PATCH /api/v1/chat/read/<message_id>/
 * Marks a specific message as read.
 */
export async function markChatMessageRead(token: string, messageId: string): Promise<void> {
  const res = await requestResponse(`${CHAT_BASE}/read/${messageId}/`, {
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

  const res = await requestResponse(
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
    throw new ApiError(msg, res.status, data);
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

  const res = await requestResponse(`${CHAT_BASE}/react/${messageId}/`, {
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

export const toggleChatReaction = reactToChatMessage;

/**
 * DELETE /api/v1/chat/message/<message_id>/
 * Deletes or unsends a message in the conversation.
 */
export async function deleteChatMessage(
  token: string,
  messageId: string
): Promise<{ message: string; data: { message_id: string } }> {
  const cleanId = encodeURIComponent(messageId.trim());
  const res = await requestResponse(`${CHAT_BASE}/message/${cleanId}/`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.detail || `Failed to delete message (${res.status})`;
    throw new Error(msg);
  }

  return data;
}

/**
 * POST /api/v1/chat/typing/
 * Broadcasts typing status to the partner.
 */
export async function sendChatTyping(
  token: string,
  partnerId: string,
  isTyping: boolean = true
): Promise<void> {
  try {
    await requestResponse(
      `${CHAT_BASE}/typing/`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          partner_id: partnerId,
          is_typing: isTyping,
        }),
      },
      4000
    );
  } catch { }
}
