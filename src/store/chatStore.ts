import { Image } from 'react-native';
import { fetchChatInbox, ConversationPartner } from '../api/chatApi';

export interface ChatConversation {
  id: string | number;
  partnerId?: string;
  name: string;
  badge: string;
  avatar: string;
  time: string;
  message: string;
  online: boolean;
  unreadCount?: number;
  sentCount?: number;
}

type ChatListener = () => void;

export function cleanMessagePreview(text?: string | null): string {
  if (!text) return '';

  let cleanText = text;
  const replyMatch = text.match(/^> \[[^\]]+\]:\s*.*?\n\n([\s\S]*)$/);
  if (replyMatch && replyMatch[1]) {
    cleanText = replyMatch[1].trim();
  }

  const cleanLower = cleanText.toLowerCase();

  if (
    cleanText.startsWith('[JOB_ACQUIRED]') ||
    cleanText.startsWith('[LISTING_CLOSED]') ||
    cleanText.startsWith('[LISTING CLOSED]') ||
    cleanLower.includes('already been acquired') ||
    cleanLower.includes('position has already been acquired')
  ) {
    return '🔒 Job Position Acquired';
  }

  if (
    cleanText.startsWith('[CANCELLATION_REQUESTED]') ||
    cleanLower.includes('cancellation requested')
  ) {
    return '⚠️ Cancellation Requested';
  }

  if (
    cleanText.startsWith('[CANCELLATION_CONFIRMED]') ||
    cleanLower.includes('booking cancelled') ||
    cleanLower.includes('booking has been cancelled')
  ) {
    return '✕ Booking Cancelled';
  }

  if (
    cleanText.startsWith('[BOOKING') ||
    cleanLower.includes('booking offer') ||
    cleanLower.includes('booking ready') ||
    cleanText.includes('📋 Booking')
  ) {
    return '📋 Booking Offer';
  }

  return cleanText;
}

function formatTimestamp(isoString?: string | null): string {
  if (!isoString) return 'Just now';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Recently';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return '1d';
    if (diffDays < 7) {
      return `${diffDays}d`;
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

class ChatStore {
  private chats: ChatConversation[] = [];
  private isLoaded: boolean = false;
  private listeners: ChatListener[] = [];
  private deletedMessageIds: Set<string> = new Set();

  markMessageDeleted(messageId: string): void {
    if (messageId) {
      this.deletedMessageIds.add(String(messageId));
    }
  }

  isMessageDeleted(messageId: string): boolean {
    return this.deletedMessageIds.has(String(messageId));
  }

  getChats(): ChatConversation[] {
    return this.chats;
  }

  getIsLoaded(): boolean {
    return this.isLoaded;
  }

  getTotalUnreadCount(): number {
    return this.chats.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  }

  private prefetchedAvatars = new Set<string>();
  private loadInboxPromise: Promise<ChatConversation[]> | null = null;

  async loadInbox(token?: string | null): Promise<ChatConversation[]> {
    if (!token) {
      return this.chats;
    }
    if (this.loadInboxPromise) {
      return this.loadInboxPromise;
    }
    this.loadInboxPromise = this._doLoadInbox(token).finally(() => {
      this.loadInboxPromise = null;
    });
    return this.loadInboxPromise;
  }

  private async _doLoadInbox(token: string): Promise<ChatConversation[]> {
    try {
      const partners = await fetchChatInbox(token);
      const partnerList: ConversationPartner[] = Array.isArray(partners) ? partners : [];

      this.chats = partnerList.map((p) => ({
        id: p.partner_id,
        partnerId: p.partner_id,
        name: p.partner_name || 'User',
        badge: p.partner_account_type || 'Member',
        avatar:
          p.partner_profile_image ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(p.partner_name || 'User')}&background=FFB43B&color=fff`,
        time: formatTimestamp(p.last_message_time),
        message: cleanMessagePreview(p.last_message) || 'Start a conversation',
        online: true,
        unreadCount: p.unread_count || 0,
        sentCount: p.sent_count || 0,
      }));

      // Prefetch any newly discovered partner avatars into memory cache (deduplicated)
      this.chats.forEach((c) => {
        if (
          c.avatar &&
          typeof c.avatar === 'string' &&
          c.avatar.startsWith('http') &&
          !this.prefetchedAvatars.has(c.avatar)
        ) {
          this.prefetchedAvatars.add(c.avatar);
          Image.prefetch(c.avatar).catch(() => {
            this.prefetchedAvatars.delete(c.avatar);
          });
        }
      });

      this.isLoaded = true;
      this.notify();
      return this.chats;
    } catch (err: any) {
      if (err?.message?.includes('Given token not valid') || err?.message?.includes('401')) {
        console.log('[ChatStore] Session token expired or invalid');
      } else {
        console.log('[ChatStore] Error loading inbox from backend:', err?.message || err);
      }
      return this.chats;
    }
  }

  addOrUpdateChat(chat: Partial<ChatConversation> & { id?: string | number; partnerId?: string }) {
    const idKey = String(chat.partnerId || chat.id || Date.now());
    const existingIndex = this.chats.findIndex(
      (c) =>
        String(c.partnerId || c.id) === idKey ||
        (chat.name && c.name.toLowerCase() === chat.name.toLowerCase())
    );

    const updatedItem: ChatConversation = {
      id: chat.id ?? (chat.partnerId || idKey),
      partnerId: chat.partnerId ? String(chat.partnerId) : undefined,
      name: chat.name || 'User',
      badge: chat.badge || 'Member',
      avatar:
        chat.avatar ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.name || 'User')}&background=FFB43B&color=fff`,
      time: chat.time || 'Just now',
      message: cleanMessagePreview(chat.message) || '',
      online: chat.online ?? true,
      unreadCount: chat.unreadCount ?? 0,
      sentCount: chat.sentCount ?? (existingIndex >= 0 ? this.chats[existingIndex]?.sentCount : 0) ?? 0,
    };

    if (updatedItem.avatar && updatedItem.avatar.startsWith('http')) {
      Image.prefetch(updatedItem.avatar).catch(() => {});
    }

    if (existingIndex >= 0) {
      this.chats[existingIndex] = { ...this.chats[existingIndex], ...updatedItem, time: 'Just now' };
      const moved = this.chats.splice(existingIndex, 1)[0];
      if (moved) {
        this.chats.unshift(moved);
      }
    } else {
      this.chats.unshift(updatedItem);
    }

    this.notify();
  }

  markAsRead(partnerId: string | number): void {
    const idKey = String(partnerId);
    const chat = this.chats.find((c) => String(c.partnerId || c.id) === idKey);
    if (chat && (chat.unreadCount || 0) > 0) {
      chat.unreadCount = 0;
      this.notify();
    }
  }

  subscribe(listener: ChatListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  clearCache(): void {
    this.chats = [];
    this.isLoaded = false;
    this.notify();
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }
}

export const chatStore = new ChatStore();
