import React, { useState, useRef, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, Image, ScrollView, TextInput, Pressable, RefreshControl, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';
import { useUser } from '../../context/UserContext';
import THEME from '../../config/theme';
import { NotificationBell } from '../../context/NotificationContext';

import { ChatDetailScreen } from '../ChatDetailScreen';
import { chatStore, ChatConversation } from '../../store/chatStore';

const logoSource = require('../../../assets/serbisure_new_clean.png');

export function ChatsScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { user } = useUser();

  const [chatList, setChatList] = useState<ChatConversation[]>(chatStore.getChats());
  const [isLoading, setIsLoading] = useState<boolean>(!chatStore.getIsLoaded());
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeChat, setActiveChat] = useState<{
    visible: boolean;
    name: string;
    role: string;
    avatar: string;
    partnerId?: string;
  }>({
    visible: false,
    name: 'Joshua Asucal',
    role: 'Homeowner',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300',
  });

  const shimmerAnim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    if (isLoading) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerAnim, {
            toValue: 0.35,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isLoading]);

  const loadInboxData = useCallback(async () => {
    if (user.token) {
      await chatStore.loadInbox(user.token);
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, [user.token]);

  useEffect(() => {
    setChatList([...chatStore.getChats()]);
    loadInboxData();

    // Poll inbox every 6 seconds while viewing Chats tab
    const intervalId = setInterval(() => {
      loadInboxData();
    }, 6000);

    const unsubscribe = chatStore.subscribe(() => {
      setChatList([...chatStore.getChats()]);
      setIsLoading(false);
    });

    return () => {
      clearInterval(intervalId);
      unsubscribe();
    };
  }, [loadInboxData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadInboxData();
    setIsRefreshing(false);
  };

  const openChat = (name: string, role: string, avatar: string, partnerId?: string) => {
    setActiveChat({ visible: true, name, role, avatar, partnerId });
  };

  const filteredChats = chatList.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.badge.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Top Status Bar Spacer */}
      <View style={{ height: insets.top, backgroundColor: '#F6F5F2', zIndex: 10 }} />

      <ScrollView
        style={{ flex: 1, backgroundColor: '#F6F5F2' }}
        contentContainerStyle={[styles.scrollContent, { paddingTop: 8 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#FFB43B']}
            tintColor="#FFB43B"
            progressViewOffset={0}
          />
        }
      >
        {/* Header Logo & Bell */}
        <View style={styles.headerTop}>
          <View style={styles.headerSide} />
          <Image source={logoSource} style={styles.logo} resizeMode="contain" />
          <View style={[styles.headerSide, styles.headerSideRight]}>
            <NotificationBell />
          </View>
        </View>

        {/* Clean Header Area: Title & Pill Search */}
        <View style={styles.headerArea}>
          <Text style={styles.headerTitle}>{t.chatsHeader || 'Messages'}</Text>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color="#9CA3AF" style={styles.searchIcon} />
            <TextInput
              placeholder={t.searchChats || 'Search conversations...'}
              placeholderTextColor="#9CA3AF"
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </Pressable>
            )}
          </View>
        </View>

        <Text style={styles.sectionHeader}>RECENT</Text>

        <View style={styles.chatList}>
          {isLoading ? (
            <View>
              {[1, 2, 3, 4].map((key) => (
                <Animated.View key={key} style={[styles.skeletonChatCard, { opacity: shimmerAnim }]}>
                  <View style={styles.skeletonAvatar} />
                  <View style={styles.skeletonTextContainer}>
                    <View style={styles.skeletonTopRow}>
                      <View style={styles.skeletonName} />
                      <View style={styles.skeletonTime} />
                    </View>
                    <View style={styles.skeletonSnippet} />
                  </View>
                </Animated.View>
              ))}
            </View>
          ) : filteredChats.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="chatbubbles" size={32} color={THEME.colors.ink} />
              </View>
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptySub}>
                When you connect with homeowners, your chats will appear here.
              </Text>
            </View>
          ) : (
            filteredChats.map((chat) => (
              <Pressable
                key={chat.id}
                style={({ pressed }) => [styles.chatCard, pressed && styles.chatCardPressed]}
                onPress={() => openChat(chat.name, chat.badge, chat.avatar, chat.partnerId)}
              >
                <View style={styles.avatarContainer}>
                  <Image source={{ uri: chat.avatar }} style={styles.avatar} />
                  {chat.online && <View style={styles.onlineDot} />}
                </View>

                <View style={styles.chatContent}>
                  <View style={styles.titleRow}>
                    <Text style={styles.name} numberOfLines={1}>
                      {chat.name}
                    </Text>
                    <Text style={styles.time}>{chat.time}</Text>
                  </View>

                  <View style={styles.tagRow}>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{chat.badge}</Text>
                    </View>
                  </View>

                  <Text style={styles.message} numberOfLines={1}>
                    {chat.message}
                  </Text>
                </View>
              </Pressable>
            ))
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Messenger-style Chat Detail Modal */}
      <ChatDetailScreen
        visible={activeChat.visible}
        onClose={() => setActiveChat((prev) => ({ ...prev, visible: false }))}
        partnerId={activeChat.partnerId}
        token={user.token}
        contactName={activeChat.name}
        contactRole={activeChat.role}
        contactAvatar={activeChat.avatar}
        userRole="kasambahay"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F5F2',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
    width: '100%',
  },
  headerSide: {
    width: 44,
  },
  headerSideRight: {
    alignItems: 'flex-end',
  },
  logo: {
    width: 44,
    height: 44,
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerArea: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: THEME.typography.fontFamily.display,
    color: THEME.colors.ink,
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 9999,
    paddingHorizontal: 16,
    height: 46,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: THEME.typography.fontFamily.secondaryRegular,
    color: THEME.colors.ink,
  },
  scrollContent: {
    paddingTop: 10,
  },
  sectionHeader: {
    fontSize: 11,
    fontFamily: THEME.typography.fontFamily.display,
    color: '#71717A',
    letterSpacing: 1,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  chatList: {
    paddingHorizontal: 20,
  },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    marginBottom: 10,
  },
  chatCardPressed: {
    backgroundColor: '#FAF9F6',
    transform: [{ scale: 0.99 }],
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  chatContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    flex: 1,
    fontSize: 15,
    fontFamily: THEME.typography.fontFamily.display,
    color: THEME.colors.ink,
    marginRight: 8,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    marginBottom: 4,
  },
  badge: {
    backgroundColor: '#FFB380',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 10,
    fontFamily: THEME.typography.fontFamily.display,
    color: '#0D0D11',
    fontWeight: '800',
  },
  time: {
    fontSize: 11,
    fontFamily: THEME.typography.fontFamily.secondaryRegular,
    color: '#9CA3AF',
  },
  message: {
    fontSize: 13,
    fontFamily: THEME.typography.fontFamily.secondaryRegular,
    color: '#6B7280',
    lineHeight: 18,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F5F4F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: THEME.typography.fontFamily.display,
    color: THEME.colors.ink,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    fontFamily: THEME.typography.fontFamily.secondaryRegular,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  skeletonChatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    marginBottom: 10,
  },
  skeletonAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E2E8F0',
    marginRight: 14,
  },
  skeletonTextContainer: {
    flex: 1,
  },
  skeletonTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  skeletonName: {
    width: '45%',
    height: 14,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
  },
  skeletonTime: {
    width: '20%',
    height: 10,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
  },
  skeletonSnippet: {
    width: '75%',
    height: 12,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
  },
});
