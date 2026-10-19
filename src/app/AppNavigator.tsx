import { useLanguage as useUiLanguage } from '../shared/localization/LanguageContext';
import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../shared/localization/LanguageContext';
import THEME from '../shared/theme/theme';

import { BrowseScreen } from '../features/feed/screens/BrowseScreen';

import { useUser } from '../features/auth/session/UserContext';
import { chatStore } from '../features/chat/store/chatStore';
import { preloadPostLoginAssets } from './services/preloadAssets';

import { ROLE_CONFIG, resolveRole, type Role } from './roleConfig';
export type { Role } from './roleConfig';
import { HomeScreen } from '../features/feed/screens/HomeScreen';
import { ChatsScreen } from '../features/chat/screens/ChatsScreen';
import { ProfileScreen } from '../features/profile/screens/ProfileScreen';
import { PostScreen } from '../features/posting/screens/PostScreen';
export type Tab = 'home' | 'browse' | 'chats' | 'profile';

interface AppNavigatorProps {
  role?: Role;
  avatarUri?: string | null;
  token?: string | null;
  onUpdateAvatar?: (uri: string) => void;
  onLogout?: () => void;
}

export function AppNavigator({ role = 'homeowner', avatarUri: oldAvatarUri, token, onUpdateAvatar, onLogout }: AppNavigatorProps) {
  const { tr: uiText } = useUiLanguage();

  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [profileInitialView, setProfileInitialView] = useState<'main' | 'personal_info'>('main');
  const [postJobVisible, setPostJobVisible] = useState(false);
  const [totalUnreadChats, setTotalUnreadChats] = useState(chatStore.getTotalUnreadCount());

  const activeRole = resolveRole(user.accountType, role);
  const avatarUri = user.profileLink || oldAvatarUri;
  const authToken = token || user.token;

  useEffect(() => {
    setTotalUnreadChats(chatStore.getTotalUnreadCount());

    if (authToken) {
      chatStore.loadInbox(authToken);
      preloadPostLoginAssets(authToken, avatarUri);
    }

    const unsubscribe = chatStore.subscribe(() => {
      setTotalUnreadChats(chatStore.getTotalUnreadCount());
    });

    return () => {
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
        return <HomeScreen role={activeRole} avatarUri={avatarUri} onAvatarPress={handleOpenProfileView} onViewAll={() => setActiveTab('browse')} token={authToken} />;
      case 'browse':
        return <BrowseScreen key={`${activeRole}:${user.id}`} role={activeRole} avatarUri={avatarUri} onViewProfile={handleOpenProfileView} token={authToken} />;
      case 'chats':
        return <ChatsScreen role={activeRole} />;
      case 'profile':
        return <ProfileScreen role={activeRole} avatarUri={avatarUri} initialView={profileInitialView} onUpdateAvatar={onUpdateAvatar} onBack={() => setActiveTab('home')} onLogout={onLogout} />;
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
              style={[styles.tabIconBg, activeTab === 'browse' && styles.tabIconBgActive]}
              onPress={() => setActiveTab('browse')}
            >
              <Ionicons
                name={activeTab === 'browse' ? 'briefcase' : 'briefcase-outline'}
                size={23}
                color={activeTab === 'browse' ? THEME.colors.ink : THEME.colors.textMuted}
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
                      {totalUnreadChats > 9 ? '9+' : totalUnreadChats}
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
          accessibilityRole="button"
          accessibilityLabel={uiText("Create a post")}
          accessibilityHint={uiText("Open the form to create a new post.")}
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
          onPress={() => setPostJobVisible(true)}
        >
          <Ionicons name="add" size={30} color={THEME.colors.white} />
        </Pressable>
      </View>

      <PostScreen
        mode={ROLE_CONFIG[activeRole].postingMode}
        visible={postJobVisible}
        onClose={() => setPostJobVisible(false)}
        token={authToken}
        onOpenVerification={() => { setPostJobVisible(false); setProfileInitialView('personal_info'); setActiveTab('profile'); }}
      />
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
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FE2C55',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  tabBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    includeFontPadding: false,
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: THEME.roundness.pill,
    backgroundColor: THEME.colors.brandDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.95 }],
  },
});
