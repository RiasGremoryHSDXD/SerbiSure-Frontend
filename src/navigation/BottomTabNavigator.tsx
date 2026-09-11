import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import THEME from '../config/theme';

import { HomeScreen as HomeownerHomeScreen } from '../screens/homeowner/HomeScreen';
import { ServicesScreen as HomeownerServicesScreen } from '../screens/homeowner/ServicesScreen';
import { ChatsScreen as HomeownerChatsScreen } from '../screens/homeowner/ChatsScreen';
import { ProfileScreen as HomeownerProfileScreen } from '../screens/homeowner/ProfileScreen';

import { HomeScreen as KasambahayHomeScreen } from '../screens/kasambahay/HomeScreen';
import { JobsScreen as KasambahayJobsScreen } from '../screens/kasambahay/JobsScreen';
import { ChatsScreen as KasambahayChatsScreen } from '../screens/kasambahay/ChatsScreen';
import { ProfileScreen as KasambahayProfileScreen } from '../screens/kasambahay/ProfileScreen';

import { PostJobScreen } from '../screens/homeowner/PostJobScreen';
import { PostServiceScreen } from '../screens/kasambahay/PostServiceScreen';

import { useUser } from '../context/UserContext';
import { chatStore } from '../store/chatStore';

export type Role = 'homeowner' | 'kasambahay';
export type Tab = 'home' | 'services' | 'chats' | 'profile';

interface BottomTabNavigatorProps {
  role?: Role;
  avatarUri?: string | null;
  token?: string | null;
  onUpdateAvatar?: (uri: string) => void;
  onLogout?: () => void;
}

export function BottomTabNavigator({ role = 'homeowner', avatarUri: oldAvatarUri, token, onUpdateAvatar, onLogout }: BottomTabNavigatorProps) {

  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [profileInitialView, setProfileInitialView] = useState<'main' | 'personal_info'>('main');
  const [postJobVisible, setPostJobVisible] = useState(false);
  const [totalUnreadChats, setTotalUnreadChats] = useState(chatStore.getTotalUnreadCount());

  const isKasambahay = user.accountType
    ? user.accountType.toLowerCase() === 'kasambahay'
    : role.toLowerCase() === 'kasambahay';
  const avatarUri = user.profileLink || oldAvatarUri;
  const authToken = token || user.token;

  useEffect(() => {
    setTotalUnreadChats(chatStore.getTotalUnreadCount());

    if (authToken) {
      chatStore.loadInbox(authToken);
    }

    const interval = setInterval(() => {
      if (authToken) {
        chatStore.loadInbox(authToken);
      }
    }, 6000);

    const unsubscribe = chatStore.subscribe(() => {
      setTotalUnreadChats(chatStore.getTotalUnreadCount());
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [authToken]);

  const handleOpenProfileView = () => {
    setProfileInitialView('personal_info');
    setActiveTab('profile');
  };

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return isKasambahay ? (
          <KasambahayHomeScreen avatarUri={avatarUri} onAvatarPress={handleOpenProfileView} onViewProfile={handleOpenProfileView} />
        ) : (
          <HomeownerHomeScreen avatarUri={avatarUri} onAvatarPress={handleOpenProfileView} onViewProfile={handleOpenProfileView} />
        );
      case 'services':
        return isKasambahay ? (
          <KasambahayJobsScreen onViewProfile={handleOpenProfileView} token={token} />
        ) : (
          <HomeownerServicesScreen avatarUri={avatarUri} onViewProfile={handleOpenProfileView} token={token} />
        );
      case 'chats':
        return isKasambahay ? <KasambahayChatsScreen /> : <HomeownerChatsScreen />;
      case 'profile':
        return isKasambahay ? (
          <KasambahayProfileScreen
            avatarUri={avatarUri}
            initialView={profileInitialView}
            onUpdateAvatar={onUpdateAvatar}
            onBack={() => setActiveTab('home')}
            onLogout={onLogout}
          />
        ) : (
          <HomeownerProfileScreen
            avatarUri={avatarUri}
            initialView={profileInitialView}
            onUpdateAvatar={onUpdateAvatar}
            onBack={() => setActiveTab('home')}
            onLogout={onLogout}
          />
        );
    }
  };

  const topBgColor = THEME.colors.canvas;

  return (
    <View style={styles.root}>
      {/* Top Status Bar Solid Background Overlay */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: insets.top,
          backgroundColor: topBgColor,
          zIndex: 999,
        }}
        pointerEvents="none"
      />
      <View style={styles.content}>{renderScreen()}</View>

      {/* Floating Bottom Navigation Dock */}
      <View style={[styles.navContainer, { bottom: Math.max(insets.bottom + 20, 32) }]}>
        <View style={styles.tabBar}>
          <View style={styles.tabItem}>
            <Pressable
              style={[styles.tabIconBg, activeTab === 'home' && styles.tabIconBgActive]}
              onPress={() => setActiveTab('home')}
            >
              <Ionicons
                name={activeTab === 'home' ? 'home' : 'home-outline'}
                size={23}
                color={activeTab === 'home' ? THEME.colors.ink : THEME.colors.textMuted}
              />
            </Pressable>
          </View>

          <View style={styles.tabItem}>
            <Pressable
              style={[styles.tabIconBg, activeTab === 'services' && styles.tabIconBgActive]}
              onPress={() => setActiveTab('services')}
            >
              <Ionicons
                name={activeTab === 'services' ? 'briefcase' : 'briefcase-outline'}
                size={23}
                color={activeTab === 'services' ? THEME.colors.ink : THEME.colors.textMuted}
              />
            </Pressable>
          </View>

          <View style={styles.tabItem}>
            <Pressable
              style={[styles.tabIconBg, activeTab === 'chats' && styles.tabIconBgActive]}
              onPress={() => setActiveTab('chats')}
            >
              <View style={styles.tabIconWrapper}>
                <Ionicons
                  name={activeTab === 'chats' ? 'chatbubble' : 'chatbubble-outline'}
                  size={23}
                  color={activeTab === 'chats' ? THEME.colors.ink : THEME.colors.textMuted}
                />
                {totalUnreadChats > 0 && (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>
                      {totalUnreadChats > 99 ? '99+' : totalUnreadChats}
                    </Text>
                  </View>
                )}
              </View>
            </Pressable>
          </View>

          <View style={styles.tabItem}>
            <Pressable
              style={[styles.tabIconBg, activeTab === 'profile' && styles.tabIconBgActive]}
              onPress={() => setActiveTab('profile')}
            >
              <Ionicons
                name={activeTab === 'profile' ? 'person' : 'person-outline'}
                size={23}
                color={activeTab === 'profile' ? THEME.colors.ink : THEME.colors.textMuted}
              />
            </Pressable>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
          onPress={() => setPostJobVisible(true)}
        >
          <Ionicons name="add" size={30} color={THEME.colors.white} />
        </Pressable>
      </View>

      {isKasambahay ? (
        <PostServiceScreen visible={postJobVisible} onClose={() => setPostJobVisible(false)} token={token} />
      ) : (
        <PostJobScreen visible={postJobVisible} onClose={() => setPostJobVisible(false)} token={token} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: THEME.colors.canvas,
  },
  content: {
    flex: 1,
  },
  navContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 100,
  },
  tabBar: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.roundness.pill,
    height: 58,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-around',
    marginRight: 14,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconBgActive: {
    backgroundColor: THEME.colors.brandLight,
  },
  tabIconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadge: {
    position: 'absolute',
    top: -5,
    right: -10,
    minWidth: 19,
    height: 19,
    borderRadius: 9.5,
    backgroundColor: '#FE2C55',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  tabBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    includeFontPadding: false,
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: THEME.roundness.pill,
    backgroundColor: THEME.colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.95 }],
  },
});
