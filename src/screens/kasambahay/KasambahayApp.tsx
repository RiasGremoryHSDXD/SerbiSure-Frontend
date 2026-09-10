import { useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { HomeScreen } from './HomeScreen';
import { JobsScreen } from './JobsScreen';
import { ChatsScreen } from './ChatsScreen';
import { ProfileScreen } from './ProfileScreen';
import { PostServiceScreen } from './PostServiceScreen';

type Tab = 'home' | 'jobs' | 'chats' | 'profile';

export function KasambahayApp({ avatarUri, onLogout }: { avatarUri?: string | null; onLogout?: () => void }) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [isPostModalVisible, setIsPostModalVisible] = useState(false);

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen avatarUri={avatarUri} onAvatarPress={() => setActiveTab('profile')} />;
      case 'jobs':
        return <JobsScreen />;
      case 'chats':
        return <ChatsScreen />;
      case 'profile':
        return <ProfileScreen avatarUri={avatarUri} onBack={() => setActiveTab('home')} onLogout={onLogout} />;
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
              style={[styles.tabIconBg, activeTab === 'jobs' && styles.tabIconBgActive]}
              onPress={() => setActiveTab('jobs')}
            >
              <Ionicons name={activeTab === 'jobs' ? 'briefcase' : 'briefcase-outline'} size={18} color="#FFB43B" />
              <Text style={styles.tabLabel}>Jobs</Text>
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

        <Pressable style={styles.fab} onPress={() => setIsPostModalVisible(true)}>
          <Ionicons name="add" size={32} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Kasambahay Post a Service Modal */}
      <PostServiceScreen
        visible={isPostModalVisible}
        onClose={() => setIsPostModalVisible(false)}
      />
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
    borderRadius: 30,
    height: 60,
    alignItems: 'center',
    paddingHorizontal: 8,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconBg: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  tabIconBgActive: {
    backgroundColor: '#FFF0DB',
  },
  tabLabel: {
    fontSize: 10,
    color: '#FFB43B',
    marginTop: 2,
    fontWeight: '600',
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFB43B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFB43B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
});
