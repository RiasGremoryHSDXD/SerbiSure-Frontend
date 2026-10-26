import { useLanguage as useUiLanguage } from '../../shared/localization/LanguageContext';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { realtime } from '../../shared/realtime';
import { AppState, StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../auth/session/UserContext';
import { fetchNotifications } from './api/notificationsApi';
import { NotificationsModal } from './components/NotificationsModal';
import { ChatDetailScreen } from '../chat/components/ChatDetailScreen';
import { resolveRole } from '../../app/roleConfig';
import { loadDeletedNotificationIds, filterActiveNotifications } from './deletedNotificationsStore';
import { BellIcon } from '../../shared/components/icons/LucideIcons';
import THEME from '../../shared/theme/theme';

export interface ChatTargetParams {
  partnerId: string;
  contactName: string;
  contactAvatar?: string;
  contactRole?: string;
}

interface NotificationContextValue {
  unreadCount: number;
  openNotifications: () => void;
  closeNotifications: () => void;
  refreshUnreadCount: () => Promise<void>;
  setUnreadCount: (count: number) => void;
  openChat: (target: ChatTargetParams) => void;
}

const NotificationContext = createContext<NotificationContextValue>({
  unreadCount: 0,
  openNotifications: () => { },
  closeNotifications: () => { },
  refreshUnreadCount: async () => { },
  setUnreadCount: () => { },
  openChat: () => { },
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const tokenRef = useRef(user.token); tokenRef.current = user.token;
  const [unreadCount, setUnreadCount] = useState(0);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [activeChatTarget, setActiveChatTarget] = useState<ChatTargetParams | null>(null);

  const refreshUnreadCount = useCallback(async () => {
    if (!user?.token) return;
    try {
      await loadDeletedNotificationIds();
      const res = await fetchNotifications(user.token);
      if (tokenRef.current === user.token) {
        const active = filterActiveNotifications(res?.notifications || []);
        const unread = active.filter(n => n.notification_state === 'Unread').length;
        setUnreadCount(unread);
      }
    } catch {
      // Gracefully ignore network / polling errors
    }
  }, [user?.token]);

  useEffect(() => {
    if (user?.token) {
      refreshUnreadCount();
      let active = true;
      const off = realtime.subscribe(event => { if (active && ['sync', 'notifications.changed'].includes(event.type)) void refreshUnreadCount(); });
      const interval = setInterval(() => { if (realtime.status !== 'connected' && AppState.currentState === 'active') void refreshUnreadCount(); }, 30000);
      return () => { active = false; off(); clearInterval(interval); };
    } else {
      setUnreadCount(0);
    }
  }, [user?.token, refreshUnreadCount]);

  const openNotifications = useCallback(() => {
    setIsModalVisible(true);
  }, []);

  const closeNotifications = useCallback(() => {
    setIsModalVisible(false);
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  const openChat = useCallback((target: ChatTargetParams) => {
    setActiveChatTarget(target);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        openNotifications,
        closeNotifications,
        refreshUnreadCount,
        setUnreadCount,
        openChat,
      }}
    >
      {children}
      <NotificationsModal
        visible={isModalVisible}
        onClose={closeNotifications}
        token={user?.token}
        onUnreadCountChange={setUnreadCount}
        onOpenChat={openChat}
      />
      {activeChatTarget && (
        <ChatDetailScreen
          visible={true}
          onClose={() => setActiveChatTarget(null)}
          partnerId={activeChatTarget.partnerId}
          token={user?.token || ''}
          contactName={activeChatTarget.contactName}
          contactAvatar={activeChatTarget.contactAvatar}
          contactRole={activeChatTarget.contactRole}
          userRole={resolveRole(user?.accountType)}
        />
      )}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}

export function NotificationBell() {
  const { tr: uiText } = useUiLanguage();
  const { unreadCount, openNotifications } = useNotifications();

  return (
    <Pressable
      style={styles.bellBtn}
      onPress={openNotifications}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={uiText("Notifications")}
    >
      <BellIcon size={24} color={THEME.colors.ink} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bellBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -4,
    minWidth: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: '#FE2C55',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    borderWidth: 1.5,
    borderColor: '#F6F5F2',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
    includeFontPadding: false,
  },
});
