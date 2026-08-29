import { useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';

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
  const isKasambahay = user.accountType
    ? user.accountType.toLowerCase() === 'kasambahay'
    : role.toLowerCase() === 'kasambahay';
  const avatarUri = user.profileLink || oldAvatarUri;

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

  const topBgColor = activeTab === 'profile' ? '#FFF0DB' : '#F6F5F2';

  return (
    <View style={styles.root}>
      {/* Top Status Bar Solid Background Overlay - Prevents scrolled content from overlapping status bar */}
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

      {/* Floating Bottom Navigation */}
      <View style={[styles.navContainer, { bottom: Math.max(insets.bottom + 24, 38) }]}>
        <View style={styles.tabBar}>
          <View style={styles.tabItem}>
            <Pressable
              style={[styles.tabIconBg, activeTab === 'home' && styles.tabIconBgActive]}
              onPress={() => setActiveTab('home')}
            >
              <Ionicons name={activeTab === 'home' ? 'home' : 'home-outline'} size={18} color="#FFB43B" />
              <Text style={styles.tabLabel}>Home</Text>
            </Pressable>
          </View>

          <View style={styles.tabItem}>
            <Pressable
              style={[styles.tabIconBg, activeTab === 'services' && styles.tabIconBgActive]}
              onPress={() => setActiveTab('services')}
            >
              <Ionicons name={activeTab === 'services' ? 'briefcase' : 'briefcase-outline'} size={18} color="#FFB43B" />
              <Text style={styles.tabLabel}>{isKasambahay ? 'Jobs' : 'Services'}</Text>
            </Pressable>
          </View>

          <View style={styles.tabItem}>
            <Pressable
              style={[styles.tabIconBg, activeTab === 'chats' && styles.tabIconBgActive]}
              onPress={() => setActiveTab('chats')}
            >
              <Ionicons name={activeTab === 'chats' ? 'chatbubble' : 'chatbubble-outline'} size={18} color="#FFB43B" />
              <Text style={styles.tabLabel}>Chats</Text>
            </Pressable>
          </View>

          <View style={styles.tabItem}>
            <Pressable
              style={[styles.tabIconBg, activeTab === 'profile' && styles.tabIconBgActive]}
              onPress={() => setActiveTab('profile')}
            >
              <Ionicons name={activeTab === 'profile' ? 'person' : 'person-outline'} size={18} color="#FFB43B" />
              <Text style={styles.tabLabel}>Profile</Text>
            </Pressable>
          </View>
        </View>

        <Pressable style={styles.fab} onPress={() => setPostJobVisible(true)}>
          <Ionicons name="add" size={32} color="#FFFFFF" />
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
    backgroundColor: '#F6F5F2',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    height: 60,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    marginRight: 16,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    overflow: 'hidden',
  },
  tabIconBg: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tabIconBgActive: {
    backgroundColor: '#FFECCB',
  },
  tabLabel: {
    color: '#FFB43B',
    fontSize: 8,
    fontWeight: '700',
    marginTop: 2,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#FFB43B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFB43B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
