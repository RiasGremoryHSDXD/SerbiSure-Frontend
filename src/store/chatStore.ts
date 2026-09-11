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
  const match = text.match(/^> \[[^\]]+\]:\s*.*?\n\n([\s\S]*)$/);
  if (match && match[1]) {
    return match[1].trim();
  }
  return text;
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
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
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

  async loadInbox(token?: string | null): Promise<ChatConversation[]> {
    if (!token) {
      return this.chats;
    }

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
