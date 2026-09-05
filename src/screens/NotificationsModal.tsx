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

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
  token?: string | null;
}

function formatRelativeTime(dateString: string): string {
  try {
    const now = new Date();
    const date = new Date(dateString);
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSeconds < 60) return 'Just now';
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
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
        setNotifications(res.notifications || []);
        setUnreadCount(res.unread_count || 0);
      } catch (err) {
        console.warn('[NotificationsModal] load error:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
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
    setUnreadCount((prev) => Math.max(0, prev - 1));

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
      await markAllNotificationsRead(token);
    } catch (err) {
      console.warn('[NotificationsModal] mark all error:', err);
    } finally {
      setMarkingAll(false);
    }
  };

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const isUnread = item.notification_state === 'Unread';

    return (
      <Pressable
        style={[styles.notificationCard, isUnread && styles.notificationCardUnread]}
        onPress={() => handleMarkOneRead(item)}
      >
        <View style={[styles.iconBox, isUnread ? styles.iconBoxUnread : styles.iconBoxRead]}>
          <Ionicons
            name={isUnread ? 'notifications' : 'notifications-outline'}
            size={18}
            color={isUnread ? '#FFB43B' : '#999'}
          />
        </View>

        <View style={styles.contentCol}>
          <View style={styles.topRow}>
            <Text style={[styles.senderName, isUnread && styles.senderNameUnread]} numberOfLines={1}>
              {item.sender_name || 'Serbisure System'}
            </Text>
            <Text style={styles.timeText}>{formatRelativeTime(item.createdAt)}</Text>
          </View>
          <Text style={[styles.messageText, isUnread && styles.messageTextUnread]}>
            {item.notification_message}
          </Text>
        </View>

        {isUnread ? <View style={styles.unreadDot} /> : null}
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
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconCircle}>
                <Ionicons name="notifications" size={20} color="#FFB43B" />
              </View>
              <View style={{ marginLeft: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.modalTitle}>Notifications</Text>
                  {unreadCount > 0 ? (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.modalSubtitle}>Activity updates & alerts</Text>
              </View>
            </View>

            <View style={styles.headerRight}>
              {unreadCount > 0 ? (
                <Pressable
                  onPress={handleMarkAllRead}
                  disabled={markingAll}
                  style={styles.markAllBtn}
                  hitSlop={8}
                >
                  {markingAll ? (
                    <ActivityIndicator size="small" color="#FFB43B" />
                  ) : (
                    <Text style={styles.markAllBtnText}>Mark all read</Text>
                  )}
                </Pressable>
              ) : null}
              <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color="#777" />
              </Pressable>
            </View>
          </View>

          {/* Body */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FFB43B" />
              <Text style={styles.loadingText}>Loading notifications...</Text>
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
                  colors={['#FFB43B']}
                  tintColor="#FFB43B"
                />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconCircle}>
                    <Ionicons name="chatbubbles-outline" size={38} color="#D1D5DB" />
                  </View>
                  <Text style={styles.emptyTitle}>No notifications yet</Text>
                  <Text style={styles.emptySubtitle}>
                    You're all caught up! Updates regarding bookings, verification status, and inquiries will appear right here.
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
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: '85%',
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EAE1',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF4E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  unreadBadge: {
    backgroundColor: '#FFB43B',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 1,
    marginLeft: 8,
  },
  unreadBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  markAllBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  markAllBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#FFB43B',
  },
  closeBtn: {
    padding: 6,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13.5,
    color: '#888',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexGrow: 1,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EFECE6',
  },
  notificationCardUnread: {
    backgroundColor: '#FFFBF5',
    borderColor: '#FDEBD0',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconBoxUnread: {
    backgroundColor: '#FFF3E0',
  },
  iconBoxRead: {
    backgroundColor: '#F5F5F3',
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
  senderName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    flex: 1,
    marginRight: 8,
  },
  senderNameUnread: {
    color: '#1A1A1A',
    fontWeight: '700',
  },
  timeText: {
    fontSize: 11,
    color: '#999',
  },
  messageText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  messageTextUnread: {
    color: '#2A2A2A',
    fontWeight: '500',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFB43B',
    alignSelf: 'center',
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F8F7F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    lineHeight: 19,
  },
});
