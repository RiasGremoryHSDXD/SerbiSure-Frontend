import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Pressable,
  FlatList,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationItem,
} from '../api/notificationsApi';
import THEME from '../config/theme';

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
  token?: string | null;
  onUnreadCountChange?: (count: number) => void;
}

interface ParsedNotification {
  category: 'chat' | 'booking' | 'verification' | 'review' | 'system';
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  displayTitle: string;
  displayBody: string;
  tagLabel: string;
}

function parseNotification(item: NotificationItem): ParsedNotification {
  const rawMessage = item.notification_message || '';
  const sender = item.sender_name?.trim() || 'SerbiSure';

  // Check if it's a chat message
  const chatMatch =
    rawMessage.match(/^New message from [^:]+:\s*["“](.*)["”]$/s) ||
    rawMessage.match(/^New message from [^:]+:\s*(.*)$/s);

  if (chatMatch) {
    let cleanMsg = (chatMatch[1] ?? '').trim();
    if (cleanMsg.startsWith('"') && cleanMsg.endsWith('"')) {
      cleanMsg = cleanMsg.slice(1, -1).trim();
    }
    const quoteMatch = cleanMsg.match(/^> \[[^\]]+\]:\s*.*?\n\n([\s\S]*)$/);
    if (quoteMatch && quoteMatch[1]) {
      cleanMsg = quoteMatch[1].trim();
    }
    return {
      category: 'chat',
      icon: 'chatbubble-ellipses',
      iconColor: '#2563EB',
      iconBg: '#EFF6FF',
      displayTitle: sender,
      displayBody: cleanMsg,
      tagLabel: 'Chat',
    };
  }

  const lower = rawMessage.toLowerCase();

  // Booking / Hire
  if (
    lower.includes('booking') ||
    lower.includes('hired') ||
    lower.includes('applied') ||
    lower.includes('contract') ||
    lower.includes('reschedule')
  ) {
    return {
      category: 'booking',
      icon: 'calendar',
      iconColor: '#059669',
      iconBg: '#ECFDF5',
      displayTitle: sender !== 'Serbisure' && sender !== 'SerbiSure' ? sender : 'Booking Update',
      displayBody: rawMessage,
      tagLabel: 'Booking',
    };
  }

  // Verification
  if (
    lower.includes('verif') ||
    lower.includes('document') ||
    lower.includes('id status') ||
    lower.includes('badge')
  ) {
    return {
      category: 'verification',
      icon: 'shield-checkmark',
      iconColor: '#7C3AED',
      iconBg: '#F5F3FF',
      displayTitle: 'Verification',
      displayBody: rawMessage,
      tagLabel: 'Security',
    };
  }

  // Review / Rating
  if (lower.includes('review') || lower.includes('rating') || lower.includes('star')) {
    return {
      category: 'review',
      icon: 'star',
      iconColor: '#D97706',
      iconBg: '#FEF3C7',
      displayTitle: sender !== 'Serbisure' && sender !== 'SerbiSure' ? sender : 'Review & Rating',
      displayBody: rawMessage,
      tagLabel: 'Review',
    };
  }

  // Fallback: system / general notification
  return {
    category: 'system',
    icon: 'notifications',
    iconColor: THEME.colors.brandDark,
    iconBg: THEME.colors.brandLight,
    displayTitle: sender,
    displayBody: rawMessage,
    tagLabel: 'Notice',
  };
}

function formatRelativeTime(dateString: string): string {
  try {
    const now = new Date();
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSeconds < 60) return 'Just now';
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  } catch {
    return dateString;
  }
}

export function NotificationsModal({
  visible,
  onClose,
  token,
  onUnreadCountChange,
}: NotificationsModalProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = useCallback(
    async (isRefresh = false) => {
      if (!token) return;
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const res = await fetchNotifications(token);
        const fetchedList = res.notifications || [];
        const fetchedUnread = res.unread_count || 0;
        setNotifications(fetchedList);
        setUnreadCount(fetchedUnread);
        onUnreadCountChange?.(fetchedUnread);
      } catch (err) {
        console.warn('[NotificationsModal] load error:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token, onUnreadCountChange]
  );

  useEffect(() => {
    if (visible && token) {
      loadNotifications();
    }
  }, [visible, token, loadNotifications]);

  const handleMarkOneRead = async (item: NotificationItem) => {
    if (!token || item.notification_state === 'Read') return;

    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) =>
        n.notification_id === item.notification_id
          ? { ...n, notification_state: 'Read' }
          : n
      )
    );
    const newCount = Math.max(0, unreadCount - 1);
    setUnreadCount(newCount);
    onUnreadCountChange?.(newCount);

    try {
      await markNotificationRead(token, item.notification_id);
    } catch (err) {
      console.warn('[NotificationsModal] mark one error:', err);
    }
  };

  const handleMarkAllRead = async () => {
    if (!token || unreadCount === 0 || markingAll) return;

    try {
      setMarkingAll(true);
      // Optimistic UI update
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, notification_state: 'Read' }))
      );
      setUnreadCount(0);
      onUnreadCountChange?.(0);
      await markAllNotificationsRead(token);
    } catch (err) {
      console.warn('[NotificationsModal] mark all error:', err);
    } finally {
      setMarkingAll(false);
    }
  };

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const isUnread = item.notification_state === 'Unread';
    const meta = parseNotification(item);

    return (
      <Pressable
        style={({ pressed }) => [
          styles.notificationCard,
          isUnread ? styles.notificationCardUnread : styles.notificationCardRead,
          pressed && styles.cardPressed,
        ]}
        onPress={() => handleMarkOneRead(item)}
      >
        {/* Dynamic Category Icon */}
        <View style={[styles.iconBox, { backgroundColor: meta.iconBg }]}>
          <Ionicons name={meta.icon} size={19} color={meta.iconColor} />
        </View>

        {/* Content Column */}
        <View style={styles.contentCol}>
          <View style={styles.topRow}>
            <View style={styles.titleGroup}>
              <Text
                style={[styles.senderName, isUnread && styles.senderNameUnread]}
                numberOfLines={1}
              >
                {meta.displayTitle}
              </Text>
              <View style={[styles.categoryPill, { backgroundColor: meta.iconBg }]}>
                <Text style={[styles.categoryPillText, { color: meta.iconColor }]}>
                  {meta.tagLabel}
                </Text>
              </View>
            </View>

            <View style={styles.timeGroup}>
              <Text style={[styles.timeText, isUnread && styles.timeTextUnread]}>
                {formatRelativeTime(item.createdAt)}
              </Text>
              {isUnread && <View style={styles.unreadDot} />}
            </View>
          </View>

          <Text
            style={[styles.messageText, isUnread && styles.messageTextUnread]}
            numberOfLines={2}
          >
            {meta.displayBody}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Sheet Handle */}
          <View style={styles.sheetHandleContainer}>
            <View style={styles.sheetHandle} />
          </View>

          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleGroup}>
              <Text style={styles.modalTitle}>Notifications</Text>
              {unreadCount > 0 ? (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.headerActions}>
              {unreadCount > 0 ? (
                <Pressable
                  onPress={handleMarkAllRead}
                  disabled={markingAll}
                  style={({ pressed }) => [
                    styles.markAllBtn,
                    pressed && styles.btnPressed,
                  ]}
                  hitSlop={6}
                >
                  {markingAll ? (
                    <ActivityIndicator size="small" color={THEME.colors.brandDark} />
                  ) : (
                    <>
                      <Ionicons
                        name="checkmark-done"
                        size={15}
                        color={THEME.colors.brandDark}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={styles.markAllBtnText}>Mark all read</Text>
                    </>
                  )}
                </Pressable>
              ) : null}

              <Pressable
                onPress={onClose}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.closeBtn,
                  pressed && styles.btnPressed,
                ]}
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={19} color="#4B5563" />
              </Pressable>
            </View>
          </View>

          {/* Body */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={THEME.colors.brandDark} />
              <Text style={styles.loadingText}>Updating notifications...</Text>
            </View>
          ) : (
            <FlatList
              data={notifications}
              keyExtractor={(item) => item.notification_id}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => loadNotifications(true)}
                  colors={[THEME.colors.brandDark]}
                  tintColor={THEME.colors.brandDark}
                />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconCircle}>
                    <Ionicons name="notifications-off-outline" size={32} color="#9CA3AF" />
                  </View>
                  <Text style={styles.emptyTitle}>All caught up!</Text>
                  <Text style={styles.emptySubtitle}>
                    You have no notifications right now. Activity and updates will appear here.
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(13, 13, 17, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: THEME.colors.canvas,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: '84%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    overflow: 'hidden',
  },
  sheetHandleContainer: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: THEME.typography.fontFamily.display,
    color: THEME.colors.ink,
    letterSpacing: -0.4,
  },
  unreadBadge: {
    backgroundColor: THEME.colors.brandDark,
    borderRadius: THEME.roundness.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
    fontFamily: THEME.typography.fontFamily.mainBold,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.brandLight,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: THEME.roundness.pill,
  },
  markAllBtnText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: THEME.typography.fontFamily.mainBold,
    color: THEME.colors.brandDark,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EBEBE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: THEME.colors.textSecondary,
    fontFamily: THEME.typography.fontFamily.body,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 24,
    flexGrow: 1,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 22,
    padding: 14,
    marginBottom: 9,
  },
  notificationCardUnread: {
    backgroundColor: THEME.colors.white,
  },
  notificationCardRead: {
    backgroundColor: '#EAEAE5',
    opacity: 0.88,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contentCol: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  senderName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    fontFamily: THEME.typography.fontFamily.mainBold,
    maxWidth: '72%',
  },
  senderNameUnread: {
    color: THEME.colors.ink,
    fontWeight: '800',
  },
  categoryPill: {
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: THEME.roundness.pill,
    marginLeft: 6,
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: THEME.typography.fontFamily.mainBold,
  },
  timeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 11.5,
    color: '#9CA3AF',
    fontFamily: THEME.typography.fontFamily.body,
  },
  timeTextUnread: {
    color: '#6B7280',
    fontWeight: '600',
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: THEME.colors.brandDark,
    marginLeft: 5,
  },
  messageText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    lineHeight: 18.5,
    fontFamily: THEME.typography.fontFamily.body,
  },
  messageTextUnread: {
    color: '#1F2937',
    fontFamily: THEME.typography.fontFamily.bodyMedium,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: THEME.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: THEME.typography.fontFamily.display,
    color: THEME.colors.ink,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    fontFamily: THEME.typography.fontFamily.body,
    textAlign: 'center',
    lineHeight: 19,
  },
});
