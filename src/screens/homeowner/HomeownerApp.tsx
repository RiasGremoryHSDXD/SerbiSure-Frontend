import { useState } from 'react';
import { StyleSheet, Text, View, Pressable, Platform, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { HomeScreen } from './HomeScreen';
import { ServicesScreen } from './ServicesScreen';
import { ChatsScreen } from './ChatsScreen';
import { ProfileScreen } from './ProfileScreen';

import { HomeScreen as KasambahayHomeScreen } from '../kasambahay/HomeScreen';
import { JobsScreen as KasambahayJobsScreen } from '../kasambahay/JobsScreen';
import { ChatsScreen as KasambahayChatsScreen } from '../kasambahay/ChatsScreen';
import { ProfileScreen as KasambahayProfileScreen } from '../kasambahay/ProfileScreen';

type Tab = 'home' | 'services' | 'chats' | 'profile';

export function HomeownerApp({
  role = 'homeowner',
  avatarUri,
  onLogout,
}: {
  role?: 'homeowner' | 'kasambahay';
  avatarUri?: string | null;
  onLogout?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>('home');

  const isKasambahay = role === 'kasambahay';

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return isKasambahay ? (
          <KasambahayHomeScreen avatarUri={avatarUri} onAvatarPress={() => setActiveTab('profile')} />
        ) : (
          <HomeScreen avatarUri={avatarUri} onAvatarPress={() => setActiveTab('profile')} />
        );
      case 'services':
        return isKasambahay ? <KasambahayJobsScreen /> : <ServicesScreen avatarUri={avatarUri} />;
      case 'chats':
        return isKasambahay ? <KasambahayChatsScreen /> : <ChatsScreen />;
      case 'profile':
        return isKasambahay ? (
          <KasambahayProfileScreen avatarUri={avatarUri} onBack={() => setActiveTab('home')} onLogout={onLogout} />
        ) : (
          <ProfileScreen avatarUri={avatarUri} onBack={() => setActiveTab('home')} onLogout={onLogout} />
        );
    }
  };

  const topBgColor = '#F6F5F2';

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

      {/* Floating Bottom Navigation */}
      <View style={[styles.navContainer, { bottom: Math.max(insets.bottom + 10, 20) }]}>
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
              <Ionicons 
                name={activeTab === 'chats' ? "chatbubble" : "chatbubble-outline"} 
                size={18} 
                color="#FFB43B" 
              />
              <Text style={styles.tabLabel}>Chats</Text>
            </Pressable>
          </View>
          <View style={styles.tabItem}>
            <Pressable 
              style={[styles.tabIconBg, activeTab === 'profile' && styles.tabIconBgActive]}
              onPress={() => setActiveTab('profile')}
            >
              <Ionicons 
                name={activeTab === 'profile' ? "person" : "person-outline"} 
                size={18} 
                color="#FFB43B" 
              />
              <Text style={styles.tabLabel}>Profile</Text>
            </Pressable>
          </View>
        </View>

        <Pressable style={styles.fab}>
          <Ionicons name="add" size={32} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F6F5F2', // Base color used across screens
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
    marginRight: 16, // Space between tab bar and FAB
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
  }
});
