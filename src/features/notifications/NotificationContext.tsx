import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../auth/session/UserContext';
import { fetchNotifications } from './api/notificationsApi';
import { NotificationsModal } from './components/NotificationsModal';
import THEME from '../../shared/theme/theme';

interface NotificationContextValue {
  unreadCount: number;
  openNotifications: () => void;
  closeNotifications: () => void;
  refreshUnreadCount: () => Promise<void>;
  setUnreadCount: (count: number) => void;
}

const NotificationContext = createContext<NotificationContextValue>({
  unreadCount: 0,
  openNotifications: () => { },
  closeNotifications: () => { },
  refreshUnreadCount: async () => { },
  setUnreadCount: () => { },
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const refreshUnreadCount = useCallback(async () => {
    if (!user?.token) return;
    try {
      const res = await fetchNotifications(user.token);
      setUnreadCount(res?.unread_count ?? 0);
    } catch {
      // Gracefully ignore network / polling errors
    }
  }, [user?.token]);

  useEffect(() => {
    if (user?.token) {
      refreshUnreadCount();
      const interval = setInterval(refreshUnreadCount, 45000);
      return () => clearInterval(interval);
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

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        openNotifications,
        closeNotifications,
        refreshUnreadCount,
        setUnreadCount,
      }}
    >
      {children}
      <NotificationsModal
        visible={isModalVisible}
        onClose={closeNotifications}
        token={user?.token}
        onUnreadCountChange={setUnreadCount}
      />
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}

export function NotificationBell() {
  const { unreadCount, openNotifications } = useNotifications();

  return (
    <Pressable
      style={styles.bellBtn}
      onPress={openNotifications}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Notifications"
    >
      <Ionicons name="notifications-outline" size={21} color={THEME.colors.ink} />
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: '800',
    textAlign: 'center',
    includeFontPadding: false,
  },
});
