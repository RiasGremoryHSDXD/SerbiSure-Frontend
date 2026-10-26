import { useLanguage as useUiLanguage } from '../../../shared/localization/LanguageContext';
import { realtime } from '../../../shared/realtime';
import { AppState } from 'react-native';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Pressable,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  type NotificationItem,
} from '../api/notificationsApi';
import {
  loadDeletedNotificationIds,
  markNotificationDeleted,
  markAllNotificationsDeleted,
  filterActiveNotifications,
} from '../deletedNotificationsStore';
import { chatStore } from '../../chat/store/chatStore';
import { BottomSheetHandle } from '../../../shared/components/BottomSheetHandle';
import THEME from '../../../shared/theme/theme';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const SNAP_EXPANDED = 0;
const SNAP_COLLAPSED = Math.round(SCREEN_HEIGHT * 0.45);
const SNAP_DISMISSED = SCREEN_HEIGHT;

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
  token?: string | null;
  onUnreadCountChange?: (count: number) => void;
  onOpenChat?: (target: {
    partnerId: string;
    contactName: string;
    contactAvatar?: string;
    contactRole?: string;
  }) => void;
}

interface NotificationSection {
  id: string;
  title: string;
  timeLabel: string;
  items: NotificationItem[];
}

const AVATAR_MAP: Record<string, string> = {
  'Shennie Mae Cabanes': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  'Isabel Angellica Yulo': 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
  'John Louise Gomez': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
};

// Default preview notifications matching reference design
const DEFAULT_PREVIEW_NOTIFICATIONS: NotificationItem[] = [
  {
    notification_id: 'sys-1',
    notification_message:
      'Your National ID (Back) was analyzed and is currently under review by Barangay Pagatpat. We will notify you once we..',
    notification_state: 'Unread',
    createdAt: new Date(Date.now() - 24 * 60 * 1000).toISOString(),
    sender_name: 'Daven Austhine Sumagang',
  },
  {
    notification_id: 'sys-2',
    notification_message:
      'Your National ID (Back) has been submitted and is queued for verification',
    notification_state: 'Unread',
    createdAt: new Date(Date.now() - 24 * 60 * 1000).toISOString(),
    sender_name: 'Verification',
  },
  {
    notification_id: 'sys-3',
    notification_message:
      'Your National ID (Front) was analyzed and is currently under review by Barangay Pagatpat. We will notify you once we..',
    notification_state: 'Unread',
    createdAt: new Date(Date.now() - 24 * 60 * 1000).toISOString(),
    sender_name: 'Daven Austhine Sumagang',
  },
  {
    notification_id: 'msg-1',
    notification_message:
      'Good morning po! Nakita ko po ang job posting ninyo at interesado po akong mag-apply. May experience po ako sa..',
    notification_state: 'Unread',
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    sender_name: 'Shennie Mae Cabanes',
  },
  {
    notification_id: 'msg-2',
    notification_message:
      'Hello po! Confirm ko lang po ang interview natin bukas ng 10 AM. Dadalhin ko po ang valid ID at iba pang requirements...',
    notification_state: 'Unread',
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    sender_name: 'Isabel Angellica Yulo',
  },
  {
    notification_id: 'msg-3',
    notification_message:
      'Hello po! Pasensya na po, medyo traffic lang po ngayon kaya baka ma-late ako nang mga 15 minutes. Papunta na po ako...',
    notification_state: 'Unread',
    createdAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    sender_name: 'John Louise Gomez',
  },
];

function formatShortTime(dateString: string): string {
  try {
    if (!dateString) return '';
    const now = new Date();
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const diffSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

    if (diffSeconds < 60) return 'Just now';
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return '1d';
    return `${diffDays}d`;
  } catch {
    return '';
  }
}

function formatRelativeTime(dateString: string): string {
  try {
    if (!dateString) return '';
    const now = new Date();
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const diffSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

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
    return '';
  }
}

function getItemCategory(item: NotificationItem): 'Messages' | 'System' | 'Bookings' {
  const rawMessage = item.notification_message || '';
  const sender = item.sender_name?.trim() || '';
  const lower = rawMessage.toLowerCase();

  if (
    rawMessage.startsWith('New message from') ||
    sender === 'Shennie Mae Cabanes' ||
    sender === 'Isabel Angellica Yulo' ||
    sender === 'John Louise Gomez' ||
    item.notification_id.startsWith('msg-')
  ) {
    return 'Messages';
  }

  if (
    lower.includes('booking') ||
    lower.includes('hired') ||
    lower.includes('applied') ||
    lower.includes('contract') ||
    lower.includes('reschedule')
  ) {
    return 'Bookings';
  }

  return 'System';
}

function getItemVisual(item: NotificationItem) {
  const rawMessage = item.notification_message || '';
  const sender = item.sender_name?.trim() || '';
  const lower = rawMessage.toLowerCase();

  if (
    sender === 'Shennie Mae Cabanes' ||
    sender === 'Isabel Angellica Yulo' ||
    sender === 'John Louise Gomez' ||
    rawMessage.startsWith('New message from') ||
    item.notification_id.startsWith('msg-')
  ) {
    const avatar =
      AVATAR_MAP[sender] ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(sender || 'User')}&background=FFAA77&color=0D0D11`;
    return { type: 'avatar' as const, avatar };
  }

  if (
    sender.toLowerCase() === 'verification' ||
    lower.includes('queued for verification') ||
    lower.includes('submitted and is queued')
  ) {
    return {
      type: 'icon' as const,
      icon: 'shield-checkmark-outline' as const,
      iconColor: '#9333EA',
    };
  }

  if (
    lower.includes('booking') ||
    lower.includes('hired') ||
    lower.includes('contract')
  ) {
    return {
      type: 'icon' as const,
      icon: 'calendar-outline' as const,
      iconColor: '#10B981',
    };
  }

  // ID Analysis / Review / General System
  return {
    type: 'icon' as const,
    icon: 'star-outline' as const,
    iconColor: '#F97316',
  };
}

function getItemDisplay(item: NotificationItem) {
  const rawMessage = item.notification_message || '';
  const sender = item.sender_name?.trim() || 'SerbiSure';

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
      title: sender,
      body: cleanMsg,
    };
  }

  return {
    title: sender,
    body: rawMessage,
  };
}

function groupNotificationsIntoSections(items: NotificationItem[]): NotificationSection[] {
  const groups: Record<'System' | 'Messages' | 'Bookings', NotificationItem[]> = {
    System: [],
    Messages: [],
    Bookings: [],
  };

  for (const item of items) {
    const cat = getItemCategory(item);
    groups[cat].push(item);
  }

  const result: NotificationSection[] = [];
  const categoryOrder: ('System' | 'Messages' | 'Bookings')[] = ['System', 'Messages', 'Bookings'];

  for (const cat of categoryOrder) {
    const list = groups[cat];
    if (list.length > 0) {
      // Sort items within each category: latest / newest first
      list.sort((a, b) => {
        const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tB - tA;
      });

      const latestTime = list.reduce((latest, it) => {
        const t = it.createdAt ? new Date(it.createdAt).getTime() : 0;
        return t > latest ? t : latest;
      }, 0);
      const timeLabel = latestTime > 0 ? formatShortTime(new Date(latestTime).toISOString()) : '';
      result.push({
        id: cat,
        title: cat,
        timeLabel,
        items: list,
      });
    }
  }

  // Always bump up the section with the latest notification to the top
  result.sort((a, b) => {
    const latestA = a.items.reduce((max, it) => {
      const t = it.createdAt ? new Date(it.createdAt).getTime() : 0;
      return t > max ? t : max;
    }, 0);
    const latestB = b.items.reduce((max, it) => {
      const t = it.createdAt ? new Date(it.createdAt).getTime() : 0;
      return t > max ? t : max;
    }, 0);
    return latestB - latestA;
  });

  return result;
}

interface SwipeableNotificationItemProps {
  item: NotificationItem;
  visual: ReturnType<typeof getItemVisual>;
  display: ReturnType<typeof getItemDisplay>;
  isExpanded: boolean;
  isUnread: boolean;
  isLast: boolean;
  isMessage?: boolean;
  onToggleExpand: () => void;
  onOpenChat?: () => void;
  onDelete: (id: string) => void;
  registerSwipeTrigger?: (id: string, trigger: (direction: 'left' | 'right', delay: number) => Promise<void>) => void;
  unregisterSwipeTrigger?: (id: string) => void;
}

function SwipeableNotificationItem({
  item,
  visual,
  display,
  isExpanded,
  isUnread,
  isLast,
  isMessage,
  onToggleExpand,
  onOpenChat,
  onDelete,
  registerSwipeTrigger,
  unregisterSwipeTrigger,
}: SwipeableNotificationItemProps) {
  const { tr: uiText } = useUiLanguage();
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const isDeletedRef = useRef(false);

  useEffect(() => {
    const trigger = (direction: 'left' | 'right', delay: number) => {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(translateX, {
              toValue: direction === 'left' ? -SCREEN_WIDTH : SCREEN_WIDTH,
              duration: 260,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 240,
              useNativeDriver: true,
            }),
          ]).start(() => resolve());
        }, delay);
      });
    };

    registerSwipeTrigger?.(item.notification_id, trigger);
    return () => {
      unregisterSwipeTrigger?.(item.notification_id);
    };
  }, [item.notification_id, registerSwipeTrigger, unregisterSwipeTrigger]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => {
        if (isDeletedRef.current) return false;
        // User request: swipable left to right to remove/delete notification
        return Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.3 && gesture.dx > 12;
      },
      onPanResponderMove: (_, gesture) => {
        if (isDeletedRef.current) return;
        if (gesture.dx > 0) {
          translateX.setValue(gesture.dx);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (isDeletedRef.current) return;
        if (gesture.dx > 110 || (gesture.dx > 40 && gesture.vx > 0.45)) {
          isDeletedRef.current = true;
          Animated.parallel([
            Animated.timing(translateX, {
              toValue: SCREEN_WIDTH,
              duration: 220,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(() => {
            onDelete(item.notification_id);
          });
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            damping: 20,
            stiffness: 240,
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        if (isDeletedRef.current) return;
        Animated.spring(translateX, {
          toValue: 0,
          damping: 20,
          stiffness: 240,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const deleteIconOpacity = translateX.interpolate({
    inputRange: [0, 25, 80],
    outputRange: [0, 0.6, 1],
    extrapolate: 'clamp',
  });

  const deleteIconScale = translateX.interpolate({
    inputRange: [0, 80, 140],
    outputRange: [0.85, 1, 1.15],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.swipeContainer}>
      <View style={styles.deleteBackground}>
        <Animated.View
          style={[
            styles.deleteActionContent,
            {
              opacity: deleteIconOpacity,
              transform: [{ scale: deleteIconScale }],
            },
          ]}
        >
          <Ionicons name="trash" size={20} color="#DC2626" />
          <Text style={styles.deleteActionText}>{uiText("Delete")}</Text>
        </Animated.View>
      </View>

      <Animated.View
        style={[
          styles.swipeForeground,
          {
            transform: [{ translateX }],
            opacity,
          },
        ]}
        {...panResponder.panHandlers}
      >
        <Pressable
          style={({ pressed }) => [
            styles.itemRow,
            pressed && styles.itemRowPressed,
          ]}
          onPress={() => {
            if (isMessage && onOpenChat) {
              onOpenChat();
            } else {
              onToggleExpand();
            }
          }}
        >
          <View style={styles.itemVisualCol}>
            {visual.type === 'avatar' ? (
              <Image source={{ uri: visual.avatar }} style={styles.avatarImg} />
            ) : (
              <Ionicons name={visual.icon} size={22} color={visual.iconColor} />
            )}
          </View>

          <View style={styles.itemContentCol}>
            <Text style={styles.itemTitleRow} numberOfLines={1}>
              <Text style={[styles.itemSender, isUnread && styles.itemSenderUnread]}>
                {display.title}
              </Text>
              {item.createdAt ? (
                <Text style={styles.itemTime}> · {formatRelativeTime(item.createdAt)}</Text>
              ) : null}
            </Text>
            <Text
              style={styles.itemBody}
              numberOfLines={isExpanded ? undefined : 2}
            >
              {display.body}
            </Text>
          </View>

          <Pressable
            style={styles.itemChevronCol}
            hitSlop={10}
            onPress={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
          >
            <Ionicons
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={18}
              color="#111827"
            />
          </Pressable>
        </Pressable>
        {!isLast && <View style={styles.itemDivider} />}
      </Animated.View>
    </View>
  );
}

export function NotificationsModal({
  visible,
  onClose,
  token,
  onUnreadCountChange,
  onOpenChat,
}: NotificationsModalProps) {
  const { tr: uiText } = useUiLanguage();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const swipeTriggersRef = useRef<Record<string, (direction: 'left' | 'right', delay: number) => Promise<void>>>({});

  const registerSwipeTrigger = useCallback((id: string, fn: (direction: 'left' | 'right', delay: number) => Promise<void>) => {
    swipeTriggersRef.current[id] = fn;
  }, []);

  const unregisterSwipeTrigger = useCallback((id: string) => {
    delete swipeTriggersRef.current[id];
  }, []);

  const loadNotifications = useCallback(
    async () => {
      if (!token) return;
      setLoading(true);

      try {
        await loadDeletedNotificationIds();
        const res = await fetchNotifications(token);
        const fetchedList = (res.notifications || []).slice().sort((a, b) => {
          const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tB - tA;
        });
        const activeList = filterActiveNotifications(fetchedList);
        const fetchedUnread = activeList.filter(n => n.notification_state === 'Unread').length;
        setNotifications(activeList);
        setUnreadCount(fetchedUnread);
        onUnreadCountChange?.(fetchedUnread);
      } catch (err: any) {
        console.log('[NotificationsModal] load error:', err?.message || err);
      } finally {
        setLoading(false);
      }
    },
    [token, onUnreadCountChange]
  );

  useEffect(() => {
    if (visible && token) {
      loadNotifications();
    }
  }, [visible, token, loadNotifications]);

  useEffect(() => {
    if (!visible || !token) return;
    return realtime.subscribe(event => {
      if (['sync', 'notifications.changed'].includes(event.type) && AppState.currentState === 'active') {
        void loadNotifications();
      }
    });
  }, [visible, token, loadNotifications]);

  const handleDeleteNotification = useCallback((id: string) => {
    void markNotificationDeleted(id);
    setNotifications((prev) => {
      const target = prev.find((n) => n.notification_id === id);
      if (target?.notification_state === 'Unread') {
        const nextCount = Math.max(0, unreadCount - 1);
        setUnreadCount(nextCount);
        onUnreadCountChange?.(nextCount);
      }
      return prev.filter((n) => n.notification_id !== id);
    });

    if (token && !id.startsWith('sys-') && !id.startsWith('msg-')) {
      void deleteNotification(token, id);
    }
  }, [token, unreadCount, onUnreadCountChange]);

  const handleMarkOneRead = async (item: NotificationItem) => {
    if (item.notification_state === 'Read') return;

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

    if (token && !item.notification_id.startsWith('sys-') && !item.notification_id.startsWith('msg-')) {
      try {
        await markNotificationRead(token, item.notification_id);
      } catch (err: any) {
        console.log('[NotificationsModal] mark one error:', err?.message || err);
      }
    }
  };

  const sections = groupNotificationsIntoSections(notifications);

  const handleMarkAllRead = async () => {
    if (markingAll || notifications.length === 0) return;

    try {
      setMarkingAll(true);

      const allItems: NotificationItem[] = [];
      for (const section of sections) {
        for (const it of section.items) {
          allItems.push(it);
        }
      }

      await markAllNotificationsDeleted(allItems.map(it => it.notification_id));

      const total = allItems.length;
      if (total > 0) {
        const promises: Promise<void>[] = [];
        for (let i = 0; i < total; i++) {
          const item = allItems[i];
          if (!item) continue;
          const trigger = swipeTriggersRef.current[item.notification_id];
          if (trigger) {
            const delayFromBottom = (total - 1 - i) * 80;
            promises.push(trigger('left', delayFromBottom));
          }
        }
        await Promise.all(promises);
      }

      setNotifications([]);
      setUnreadCount(0);
      onUnreadCountChange?.(0);

      if (token) {
        await markAllNotificationsRead(token);
      }
    } catch (err: any) {
      console.log('[NotificationsModal] mark all error:', err?.message || err);
    } finally {
      setMarkingAll(false);
    }
  };

  const toggleExpand = (id: string, item: NotificationItem) => {
    setExpandedIds(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
    if (item.notification_state === 'Unread') {
      void handleMarkOneRead(item);
    }
  };

  const panY = useRef(new Animated.Value(SNAP_EXPANDED)).current;
  const currentSnapRef = useRef<'collapsed' | 'expanded'>('expanded');
  const [currentSnap, setCurrentSnap] = useState<'collapsed' | 'expanded'>('expanded');
  const currentTranslateY = useRef(SNAP_EXPANDED);
  const gestureStartY = useRef(SNAP_EXPANDED);
  const isClosingRef = useRef(false);
  const scrollOffset = useRef(0);


  useEffect(() => {
    const id = panY.addListener(({ value }) => {
      currentTranslateY.current = value;
    });
    return () => {
      panY.removeListener(id);
    };
  }, [panY]);

  const snapTo = (toValue: number, snapName: 'collapsed' | 'expanded', onComplete?: () => void) => {
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
  };

  const handleClose = () => {
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
      panY.setValue(SNAP_EXPANDED);
    });
  };

  const handleOpenItemChat = useCallback((item: NotificationItem, displayTitle: string, avatarUri?: string) => {
    void handleMarkOneRead(item);
    handleClose();

    const chats = chatStore.getChats();
    const senderIdStr = item.sender_id ? String(item.sender_id) : '';
    const senderName = (item.sender_name || displayTitle || '').trim().toLowerCase();
    const matchingChat = chats.find(c =>
      (senderIdStr && String(c.partnerId) === senderIdStr) ||
      (senderName && c.name && c.name.toLowerCase() === senderName)
    );

    const partnerId = senderIdStr || (matchingChat?.partnerId ? String(matchingChat.partnerId) : (matchingChat?.id ? String(matchingChat.id) : (item.sender_name || 'chat')));
    const contactName = displayTitle || item.sender_name || matchingChat?.name || 'Chat';
    const contactAvatar = avatarUri || matchingChat?.avatar;
    const contactRole = matchingChat?.badge || 'User';

    onOpenChat?.({
      partnerId,
      contactName,
      contactAvatar,
      contactRole,
    });
  }, [onOpenChat, handleMarkOneRead]);

  const handleRelease = (gestureState: { dy: number; vy: number }) => {
    const currentY = currentTranslateY.current;
    const dy = gestureState.dy;
    const vy = gestureState.vy;

    if (dy > 120 || vy > 0.85) {
      handleClose();
      return;
    }

    if (currentSnapRef.current === 'expanded') {
      if (dy > 45 || vy > 0.35) {
        snapTo(SNAP_COLLAPSED, 'collapsed');
      } else {
        snapTo(SNAP_EXPANDED, 'expanded');
      }
    } else {
      if (dy < -45 || vy < -0.35) {
        snapTo(SNAP_EXPANDED, 'expanded');
      } else if (dy > 60 || vy > 0.45) {
        handleClose();
      } else {
        snapTo(SNAP_COLLAPSED, 'collapsed');
      }
    }
  };

  const headerPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
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

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const isVertical = Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
        return isVertical && gestureState.dy > 3 && scrollOffset.current <= 5;
      },
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        const isVertical = Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
        return isVertical && gestureState.dy > 3 && scrollOffset.current <= 5;
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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <Animated.View style={[styles.modalBackdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

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
            <BottomSheetHandle onPress={handleClose} />

            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{uiText("Notifications")}</Text>

              <Pressable
                onPress={handleMarkAllRead}
                disabled={markingAll}
                style={({ pressed }) => [
                  styles.markAllBtn,
                  pressed && styles.btnPressed,
                ]}
                hitSlop={8}
              >
                {markingAll ? (
                  <ActivityIndicator size="small" color="#4B5563" />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark"
                      size={18}
                      color="#374151"
                      style={{ marginRight: 4 }}
                    />
                    <Text style={styles.markAllBtnText}>{uiText("Mark all as read")}</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>

          {/* Body Content */}
          {loading && notifications.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={THEME.colors.brandDark} />
              <Text style={styles.loadingText}>{uiText("Updating notifications...")}</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.sheetScroll}
              contentContainerStyle={styles.sheetScrollContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
              onScroll={(e) => {
                scrollOffset.current = e.nativeEvent.contentOffset.y;
              }}
              scrollEventThrottle={16}
            >
              {sections.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconCircle}>
                    <Ionicons name="notifications-outline" size={32} color="#9CA3AF" />
                  </View>
                  <Text style={styles.emptyTitle}>{uiText("All caught up!")}</Text>
                  <Text style={styles.emptySub}>{uiText("No notifications right now.")}</Text>
                </View>
              ) : (
                sections.map((section) => (
                  <View key={section.id} style={styles.sectionCard}>
                    {/* Section Header */}
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionHeaderText}>
                        {uiText(section.title)}
                        {section.timeLabel ? (
                          <>
                            {' '}
                            <Text style={styles.sectionHeaderDot}>·</Text>{' '}
                            <Text style={styles.sectionHeaderTime}>{section.timeLabel}</Text>
                          </>
                        ) : null}
                      </Text>
                    </View>
                    <View style={styles.sectionDivider} />

                    {/* Section Items */}
                    {section.items.map((item, index) => {
                      const visual = getItemVisual(item);
                      const display = getItemDisplay(item);
                      const isExpanded = !!expandedIds[item.notification_id];
                      const isUnread = item.notification_state === 'Unread';
                      const isLast = index === section.items.length - 1;
                      const isMessage = getItemCategory(item) === 'Messages';

                      return (
                        <SwipeableNotificationItem
                          key={item.notification_id}
                          item={item}
                          visual={visual}
                          display={display}
                          isExpanded={isExpanded}
                          isUnread={isUnread}
                          isLast={isLast}
                          isMessage={isMessage}
                          onToggleExpand={() => toggleExpand(item.notification_id, item)}
                          onOpenChat={() => handleOpenItemChat(item, display.title, visual.type === 'avatar' ? visual.avatar : undefined)}
                          onDelete={handleDeleteNotification}
                          registerSwipeTrigger={registerSwipeTrigger}
                          unregisterSwipeTrigger={unregisterSwipeTrigger}
                        />
                      );
                    })}
                  </View>
                ))
              )}
            </ScrollView>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13, 13, 17, 0.45)',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '94%',
    minHeight: '65%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 20,
    overflow: 'hidden',
  },
  swipableHeaderArea: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    paddingTop: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    fontFamily: THEME.typography.fontFamily.display,
    color: '#0D0D11',
    letterSpacing: -0.5,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  markAllBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
    fontFamily: THEME.typography.fontFamily.bodyMedium,
  },
  btnPressed: {
    opacity: 0.7,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: THEME.colors.textSecondary,
    fontFamily: THEME.typography.fontFamily.body,
  },
  sheetScroll: {
    flexGrow: 1,
  },
  sheetScrollContent: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 36,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 0,
    borderWidth: 0,
    borderColor: 'transparent',
    marginBottom: 16,
    overflow: 'hidden',
  },
  sectionHeader: {
    backgroundColor: '#EAEAEB',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  sectionHeaderText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#111827',
    fontFamily: THEME.typography.fontFamily.mainBold,
  },
  sectionHeaderDot: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  sectionHeaderTime: {
    color: '#4B5563',
    fontSize: 12.5,
    fontWeight: '400',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
  },
  itemRowPressed: {
    backgroundColor: '#F9FAFB',
  },
  itemVisualCol: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarImg: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  itemContentCol: {
    flex: 1,
  },
  itemTitleRow: {
    marginBottom: 2,
  },
  itemSender: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#111827',
    fontFamily: THEME.typography.fontFamily.mainBold,
  },
  itemSenderUnread: {
    color: '#111827',
    fontWeight: '800',
  },
  itemTime: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '400',
  },
  itemBody: {
    fontSize: 12.5,
    lineHeight: 17,
    color: '#374151',
    fontFamily: THEME.typography.fontFamily.body,
  },
  itemChevronCol: {
    marginLeft: 8,
    paddingLeft: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  swipeContainer: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  deleteBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F3F4F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingLeft: 20,
    zIndex: 1,
  },
  deleteActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteActionText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 6,
  },
  swipeForeground: {
    backgroundColor: '#FFFFFF',
    zIndex: 2,
  },
  emptyContainer: {
    paddingVertical: 56,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
    fontFamily: THEME.typography.fontFamily.display,
  },
  emptySub: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});
