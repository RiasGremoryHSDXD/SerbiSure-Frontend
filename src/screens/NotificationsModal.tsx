import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationItem,
} from '../api/notificationsApi';
import THEME from '../config/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const EXPANDED_HEIGHT = Math.round(SCREEN_HEIGHT * 0.90);
const COLLAPSED_HEIGHT = Math.round(SCREEN_HEIGHT * 0.52);

// Snap points in terms of translateY
const SNAP_EXPANDED = 0;
const SNAP_COLLAPSED = EXPANDED_HEIGHT - COLLAPSED_HEIGHT;
const SNAP_DISMISSED = SCREEN_HEIGHT;

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

  const panY = useRef(new Animated.Value(SNAP_EXPANDED)).current;
  const currentSnapRef = useRef<'collapsed' | 'expanded'>('expanded');
  const [currentSnap, setCurrentSnap] = useState<'collapsed' | 'expanded'>('expanded');
  const currentTranslateY = useRef(SNAP_EXPANDED);
  const gestureStartY = useRef(SNAP_EXPANDED);
  const isClosingRef = useRef(false);
  const scrollOffset = useRef(0);
  const contentHeight = useRef(0);
  const layoutHeight = useRef(0);
  const canScrollRef = useRef(false);

  // Sync currentTranslateY with panY for precise gesture tracking
  useEffect(() => {
    const id = panY.addListener(({ value }) => {
      currentTranslateY.current = value;
    });
    return () => {
      panY.removeListener(id);
    };
  }, [panY]);

  // Smooth physics-based snap transition
  const snapTo = useCallback(
    (toValue: number, snapName: 'collapsed' | 'expanded', onComplete?: () => void) => {
      currentSnapRef.current = snapName;
      setCurrentSnap(snapName);
      currentTranslateY.current = toValue;
      Animated.spring(panY, {
        toValue,
        damping: 24,
        stiffness: 260,
        mass: 0.8,
        overshootClamping: true,
        useNativeDriver: true,
      }).start(onComplete);
    },
    [panY]
  );

  const handleClose = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    Animated.timing(panY, {
      toValue: SNAP_DISMISSED,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      onClose();
      isClosingRef.current = false;
      currentSnapRef.current = 'expanded';
      setCurrentSnap('expanded');
      currentTranslateY.current = SNAP_EXPANDED;
    });
  }, [onClose, panY]);

  // On open, smoothly spring up from bottom to default top expanded height
  useEffect(() => {
    if (visible) {
      isClosingRef.current = false;
      currentSnapRef.current = 'expanded';
      setCurrentSnap('expanded');
      currentTranslateY.current = SNAP_EXPANDED;
      panY.setValue(SNAP_DISMISSED);
      Animated.spring(panY, {
        toValue: SNAP_EXPANDED,
        damping: 24,
        stiffness: 260,
        mass: 0.8,
        overshootClamping: true,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, panY]);

  // Unified release physics for snap points
  const handleRelease = useCallback(
    (gestureState: { dy: number; vy: number }) => {
      const { dy, vy } = gestureState;
      const currentY = currentTranslateY.current;

      if (currentSnapRef.current === 'collapsed') {
        // 1. Swipe up to expand to full-screen view
        if (dy < -35 || vy < -0.25) {
          snapTo(SNAP_EXPANDED, 'expanded');
        }
        // 2. Swipe down to dismiss completely
        else if (dy > 55 || vy > 0.35) {
          handleClose();
        }
        // Return to resting collapsed height
        else {
          snapTo(SNAP_COLLAPSED, 'collapsed');
        }
      } else {
        // Currently expanded:
        // 2. Swipe down to collapse back to original height or dismiss
        if (dy > 0) {
          // Deep drag down or rapid downward flick -> dismiss completely
          if (dy > SNAP_COLLAPSED + 50 || vy > 0.95 || currentY > SNAP_COLLAPSED + 60) {
            handleClose();
          }
          // Responsive swipe down -> collapse back to mid height
          else if (dy > 45 || vy > 0.25 || currentY > SNAP_COLLAPSED * 0.25) {
            snapTo(SNAP_COLLAPSED, 'collapsed');
          }
          // Small nudge -> stay expanded
          else {
            snapTo(SNAP_EXPANDED, 'expanded');
          }
        } else {
          // Swiped up while already expanded -> stay expanded
          snapTo(SNAP_EXPANDED, 'expanded');
        }
      }
    },
    [snapTo, handleClose]
  );

  // Dedicated PanResponder for the top handle & header (always moves sheet)
  const headerPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 3 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 3 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderGrant: () => {
        gestureStartY.current = currentTranslateY.current;
      },
      onPanResponderMove: (_, gestureState) => {
        const rawY = gestureStartY.current + gestureState.dy;
        const targetY = Math.max(SNAP_EXPANDED, rawY);
        panY.setValue(targetY);
      },
      onPanResponderRelease: (_, gestureState) => {
        handleRelease(gestureState);
      },
      onPanResponderTerminate: (_, gestureState) => {
        handleRelease(gestureState);
      },
    })
  ).current;

  // Main PanResponder across the sheet body (coordinates with list scrolling)
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const isVertical = Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
        return isVertical && Math.abs(gestureState.dy) > 3;
      },
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        const isVertical = Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
        if (!isVertical || Math.abs(gestureState.dy) < 3) return false;

        // When collapsed: any vertical drag moves sheet (swipe up expands, swipe down dismisses)
        if (currentSnapRef.current === 'collapsed') {
          return true;
        }

        // When expanded: if pulling down at top of scroll list, capture to collapse sheet!
        if (gestureState.dy > 0 && scrollOffset.current <= 6) {
          return true;
        }

        // If list does not have overflow, capture all vertical gestures
        if (!canScrollRef.current) {
          return true;
        }

        return false;
      },
      onPanResponderGrant: () => {
        gestureStartY.current = currentTranslateY.current;
      },
      onPanResponderMove: (_, gestureState) => {
        const rawY = gestureStartY.current + gestureState.dy;
        const targetY = Math.max(SNAP_EXPANDED, rawY);
        panY.setValue(targetY);
      },
      onPanResponderRelease: (_, gestureState) => {
        handleRelease(gestureState);
      },
      onPanResponderTerminate: (_, gestureState) => {
        handleRelease(gestureState);
      },
    })
  ).current;

  const backdropOpacity = panY.interpolate({
    inputRange: [SNAP_EXPANDED, SNAP_COLLAPSED, SNAP_DISMISSED],
    outputRange: [1, 0.75, 0],
    extrapolate: 'clamp',
  });

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
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Animated.View style={[styles.modalOverlay, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ translateY: panY }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          {/* Swipable Handle & Header Area */}
          <View style={styles.swipableHeaderArea} {...headerPanResponder.panHandlers}>
            {/* Sheet Handle */}
            <Pressable
              style={styles.sheetHandleContainer}
              onPress={() => {
                if (currentSnapRef.current === 'collapsed') {
                  snapTo(SNAP_EXPANDED, 'expanded');
                } else {
                  snapTo(SNAP_COLLAPSED, 'collapsed');
                }
              }}
              hitSlop={12}
            >
              <View style={styles.sheetHandle} />
            </Pressable>

            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.headerTitleGroup}>
                <Text style={styles.modalTitle}>Notifications</Text>
                {unreadCount > 0 ? (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Text>
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
              </View>
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
              bounces={false}
              overScrollMode="never"
              scrollEnabled={currentSnap === 'expanded'}
              scrollEventThrottle={16}
              onScroll={(e) => {
                scrollOffset.current = e.nativeEvent.contentOffset.y;
              }}
              onContentSizeChange={(_, h) => {
                contentHeight.current = h;
                canScrollRef.current = layoutHeight.current > 0 && h > layoutHeight.current + 5;
              }}
              onLayout={(e) => {
                const h = e.nativeEvent.layout.height;
                layoutHeight.current = h;
                canScrollRef.current = contentHeight.current > 0 && contentHeight.current > h + 5;
              }}
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
        </Animated.View>
      </Animated.View>
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
    height: EXPANDED_HEIGHT + 80,
    paddingBottom: (Platform.OS === 'ios' ? 34 : 16) + 80,
    marginBottom: -80,
    overflow: 'hidden',
  },
  swipableHeaderArea: {
    width: '100%',
    backgroundColor: THEME.colors.canvas,
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
    backgroundColor: '#EF4444',
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    marginLeft: 8,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    fontFamily: THEME.typography.fontFamily.mainBold,
    includeFontPadding: false,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
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
