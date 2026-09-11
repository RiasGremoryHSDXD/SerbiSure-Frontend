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
  sent_count?: number;
}

export interface ChatMessageItem {
  chat_message_id: string;
  sender_id: string;
  receiver_id: string;
  booking_id: string | null;
  message_payload: string;
  is_read: boolean;
  is_sender: boolean;
  message_type?: 'text' | 'image';
  image_public_id?: string | null;
  image_url?: string | null;
  reaction_summary?: Record<string, number>;
  my_reaction?: string | null;
  createdAt: string;
}

export interface SendMessageResponse {
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

export interface FetchChatThreadResult {
  messages: ChatMessageItem[];
  partnerIsTyping: boolean;
}

/**
 * GET /api/v1/chat/thread/<partner_id>/
 * Retrieves conversation messages and typing status between authenticated user and partner.
 */
export async function fetchChatThreadDetails(token: string, partnerId: string): Promise<FetchChatThreadResult> {
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
  let messages: ChatMessageItem[] = [];
  let partnerIsTyping = false;

  if (Array.isArray(json)) {
    messages = json;
  } else if (Array.isArray(json?.data)) {
    messages = json.data;
    partnerIsTyping = Boolean(json.partner_is_typing);
  } else if (Array.isArray(json?.results)) {
    messages = json.results;
    partnerIsTyping = Boolean(json.partner_is_typing);
  }

  if (!partnerIsTyping && res.headers.get('x-partner-is-typing') === 'true') {
    partnerIsTyping = true;
  }

  return { messages, partnerIsTyping };
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
 * Uploads an image attachment and sends it as a chat message.
 */
export async function sendChatImage(
  token: string,
  receiverId: string,
  imageUri: string,
  caption?: string,
  bookingId?: string | null
): Promise<SendMessageResponse> {
  const idempotencyKey = generateUUID();
  const formData = new FormData();

  formData.append('receiver_id', receiverId);
  if (caption) {
    formData.append('message_payload', caption.trim());
  }
  if (bookingId) {
    formData.append('booking_id', bookingId);
  }

  const filename = imageUri.split('/').pop() || 'chat_image.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const ext = match && match[1] ? match[1].toLowerCase() : 'jpg';
  const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

  formData.append('image', {
    uri: imageUri,
    name: filename,
    type: mimeType,
  } as any);

  const res = await fetchWithTimeout(`${CHAT_BASE}/send-image/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Idempotency-Key': idempotencyKey,
    },
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      data.detail ||
      data.image?.[0] ||
      data.message_payload?.[0] ||
      data.receiver_id?.[0] ||
      `Failed to upload image (${res.status})`;
    throw new Error(msg);
  }

  return data;
}

/**
 * POST /api/v1/chat/react/<message_id>/
 * Toggles an emoji reaction on a message.
 */
export async function toggleChatReaction(
  token: string,
  messageId: string,
  emoji: string
): Promise<ToggleReactionResponse> {
  const res = await fetchWithTimeout(`${CHAT_BASE}/react/${messageId}/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ emoji }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.detail || data.emoji?.[0] || `Failed to react (${res.status})`;
    throw new Error(msg);
  }

  return data;
}

/**
 * DELETE /api/v1/chat/message/<message_id>/
 * Deletes or unsends a message in the conversation.
 */
export async function deleteChatMessage(
  token: string,
  messageId: string
): Promise<{ message: string; data: { message_id: string } }> {
  const cleanId = encodeURIComponent(messageId.trim());
  const res = await fetchWithTimeout(`${CHAT_BASE}/message/${cleanId}/`, {
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
    await fetchWithTimeout(
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
  } catch {}
}

