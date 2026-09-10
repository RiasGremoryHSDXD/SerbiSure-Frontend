import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ImageBackground,
  Image,
  ScrollView,
  Pressable,
  Dimensions,
  Animated,
  PanResponder,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { chatStore } from '../../store/chatStore';
import { ChatDetailScreen } from '../ChatDetailScreen';
import { FilterModal, FeedFilters, DEFAULT_FILTERS } from '../FilterModal';
import { RecommendationsSection } from '../RecommendationsSection';
import { UserProfileModal } from '../UserProfileModal';
import { API_BASE_URL, fetchWithTimeout } from '../../config/api';
import { useUser } from '../../context/UserContext';
import { NotificationBell } from '../../context/NotificationContext';
import THEME from '../../config/theme';

const logoSource = require('../../../assets/serbisure_new_clean.png');
const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 0.25 * SCREEN_WIDTH;

export interface WorkerProfile {
  id: number | string;
  partnerId?: string;
  name: string;
  location: string;
  role: string;
  years: string;
  tags: string[];
  price: string;
  image: string;
  avatar: string;
}

const FILTER_TABS = ['All', 'Cleaning', 'Cooking', 'Caregiver', 'Laundry', 'Child Care'];

// Module-level cache: lives OUTSIDE the component so it survives tab switches.
let feedCache: WorkerProfile[] | null = null;

export const clearFeedCache = () => {
  feedCache = null;
};

export function ServicesScreen({ avatarUri, onViewProfile, token }: { avatarUri?: string | null, onViewProfile?: () => void, token?: string | null }) {
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const effectiveToken = token || user.token;

  const today = new Date();
  const dateString = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();

  const [profiles, setProfiles] = useState<WorkerProfile[]>(feedCache || []);
  const [isLoading, setIsLoading] = useState<boolean>(feedCache === null);
  const profilesRef = useRef<WorkerProfile[]>(profiles);
  profilesRef.current = profiles;

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

  const [activeFilter, setActiveFilter] = useState('All');
  const [filters, setFilters] = useState<FeedFilters>(DEFAULT_FILTERS);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [activeChat, setActiveChat] = useState<{
    visible: boolean;
    partnerId?: string;
    name: string;
    role: string;
    avatar: string;
    initialMessage?: string;
  }>({
    visible: false,
    partnerId: undefined,
    name: '',
    role: '',
    avatar: '',
  });

  const [selectedUserForModal, setSelectedUserForModal] = useState<{
    id: number | string;
    name: string;
    role?: string;
    avatar?: string;
  } | null>(null);
  const [isUserProfileModalVisible, setIsUserProfileModalVisible] = useState(false);

  const handleOpenProfile = (target: any) => {
    setSelectedUserForModal({
      id: target.partnerId || target.id,
      name: target.name || 'Kasambahay',
      role: target.role || 'Kasambahay',
      avatar: target.avatar || target.image,
    });
    setIsUserProfileModalVisible(true);
  };

  const buildFeedUrl = (targetFilters: FeedFilters) => {
    const params = new URLSearchParams();
    if (targetFilters.categories.length > 0) {
      params.append('category', targetFilters.categories.join(','));
    }
    if (targetFilters.bookingType) {
      params.append('booking_type', targetFilters.bookingType);
    }
    if (targetFilters.maxRate !== null) {
      params.append('max_rate', String(targetFilters.maxRate));
    }
    if (targetFilters.location.trim()) {
      params.append('location', targetFilters.location.trim());
    }
    if (targetFilters.sortBy && targetFilters.sortBy !== 'newest') {
      params.append('sort', targetFilters.sortBy);
    }
    const qs = params.toString();
    return qs ? `${API_BASE_URL}/api/v1/booking/feed/?${qs}` : `${API_BASE_URL}/api/v1/booking/feed/`;
  };

  // forceRefresh=true skips the cache and hits the API fresh (used for pull-to-refresh & filters)
  const fetchFeed = async (forceRefresh = false, activeFilters: FeedFilters = filters) => {
    if (!effectiveToken) {
      setIsLoading(false);
      return;
    }

    const hasActiveFilters =
      activeFilters.categories.length > 0 ||
      activeFilters.bookingType !== null ||
      activeFilters.maxRate !== null ||
      activeFilters.location.trim() !== '' ||
      activeFilters.sortBy !== 'newest';

    // If we have cached data and this is NOT a manual refresh and NO active filters, use cache
    if (!forceRefresh && !hasActiveFilters && feedCache !== null) {
      setProfiles(feedCache);
      profilesRef.current = feedCache;
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const url = buildFeedUrl(activeFilters);
      const response = await fetchWithTimeout(url, {
        headers: { Authorization: `Bearer ${effectiveToken}` },
      });

      if (response.ok) {
        const data = await response.json();
        const liveProfiles = data.map((item: any) => {
          const categories = Array.isArray(item.service_category)
            ? item.service_category
            : (item.service_category ? [item.service_category] : ['General']);
          const avatarUrl =
            item.profile_link ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || 'Kasambahay')}&background=FFB43B&color=fff`;

          return {
            id: item.booking_id,
            partnerId: item.poster_id,
            name: item.name || 'Anonymous User',
            location: item.service_address || 'Unknown City',
            role: categories.join(', '),
            years: item.booking_type === 'long_term' ? 'Stay-in' : 'Part-time',
            tags: categories,
            price: `P ${item.daily_rate || '0'}`,
            image: avatarUrl,
            avatar: avatarUrl,
          };
        });

        if (!hasActiveFilters) {
          feedCache = liveProfiles;
        }
        setProfiles(liveProfiles);
        profilesRef.current = liveProfiles;
        position.setValue({ x: 0, y: 0 });
      }
    } catch (error) {
      console.error("Failed to load feed from backend", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChipPress = (tab: string) => {
    setActiveFilter(tab);
    if (tab === 'All') {
      const updated: FeedFilters = { ...filters, categories: [] };
      setFilters(updated);
      fetchFeed(true, updated);
    } else {
      const updated: FeedFilters = { ...filters, categories: [tab] };
      setFilters(updated);
      fetchFeed(true, updated);
    }
  };

  const handleApplyFilters = (newFilters: FeedFilters) => {
    setFilters(newFilters);
    const firstCat = newFilters.categories[0];
    if (newFilters.categories.length === 1 && firstCat && FILTER_TABS.includes(firstCat)) {
      setActiveFilter(firstCat);
    } else if (newFilters.categories.length === 0) {
      setActiveFilter('All');
    } else {
      setActiveFilter('');
    }
    fetchFeed(true, newFilters);
  };

  const activeAdvancedFilterCount =
    filters.categories.length +
    (filters.bookingType !== null ? 1 : 0) +
    (filters.maxRate !== null ? 1 : 0) +
    (filters.location.trim() !== '' ? 1 : 0) +
    (filters.sortBy !== 'newest' ? 1 : 0);

  // Pull-to-refresh handler — forces a fresh API call and resets the swipe deck
  const handlePullToRefresh = async () => {
    setIsRefreshing(true);
    position.setValue({ x: 0, y: 0 });
    await fetchFeed(true, filters);
    setIsRefreshing(false);
  };

  // Only fetches on first load (or when token changes)
  useEffect(() => {
    fetchFeed();
  }, [effectiveToken]);

  // Floating Count (+1 / -1) Animation Values
  const plusAnim = useRef(new Animated.Value(0)).current;
  const minusAnim = useRef(new Animated.Value(0)).current;

  // Card Swipe Gesture Animated Values
  const position = useRef(new Animated.ValueXY()).current;

  const showCountAnimation = (type: 'plus' | 'minus') => {
    const targetAnim = type === 'plus' ? plusAnim : minusAnim;
    targetAnim.setValue(1);
    Animated.timing(targetAnim, {
      toValue: 0,
      duration: 800,
      useNativeDriver: true,
    }).start();
  };

  const removeCurrentCard = (swipedRight: boolean) => {
    const currentWorker = profilesRef.current[0];
    if (!currentWorker) return;

    if (swipedRight) {
      showCountAnimation('plus');
      const badgeRole = (currentWorker.role && currentWorker.role.split(' ')[0]) || 'Kasambahay';
      chatStore.addOrUpdateChat({
        id: currentWorker.partnerId || currentWorker.id,
        partnerId: currentWorker.partnerId,
        name: currentWorker.name,
        badge: badgeRole,
        avatar: currentWorker.avatar,
        time: 'Just now',
        message: 'Hi! I am interested in hiring you for a service.',
        online: true,
      });

      // Directly open ChatDetailScreen modal with auto message!
      setActiveChat({
        visible: true,
        partnerId: currentWorker.partnerId,
        name: currentWorker.name,
        role: badgeRole,
        avatar: currentWorker.avatar,
        initialMessage: 'Hi! I am interested in hiring you for a service.',
      });
    } else {
      showCountAnimation('minus');
    }

    setProfiles((prev) => {
      const next = prev.slice(1);
      profilesRef.current = next;
      return next;
    });
    position.setValue({ x: 0, y: 0 });
  };

  const swipeCard = (direction: 'left' | 'right') => {
    const x = direction === 'right' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5;
    Animated.timing(position, {
      toValue: { x, y: 0 },
      duration: 250,
      useNativeDriver: false,
    }).start(() => removeCurrentCard(direction === 'right'));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        position.setValue({ x: gestureState.dx, y: gestureState.dy });
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD) {
          swipeCard('right');
        } else if (gestureState.dx < -SWIPE_THRESHOLD) {
          swipeCard('left');
        } else {
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            friction: 5,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  // Card Rotation
  const rotateCard = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-12deg', '0deg', '12deg'],
    extrapolate: 'clamp',
  });

  // Button Color & Highlight Interpolations
  const passBgColor = position.x.interpolate({
    inputRange: [-150, -20, 0],
    outputRange: ['#E53935', '#FFEBEE', '#FFFFFF'],
    extrapolate: 'clamp',
  });

  const passBorderColor = position.x.interpolate({
    inputRange: [-150, -20, 0],
    outputRange: ['#E53935', '#FFCDD2', '#FFCDD2'],
    extrapolate: 'clamp',
  });

  const passHighlightOpacity = position.x.interpolate({
    inputRange: [-120, -15, 0],
    outputRange: [1, 0.4, 0],
    extrapolate: 'clamp',
  });

  const likeBgColor = position.x.interpolate({
    inputRange: [0, 20, 150],
    outputRange: ['#FFFFFF', '#E8F5E9', '#4CD964'],
    extrapolate: 'clamp',
  });

  const likeBorderColor = position.x.interpolate({
    inputRange: [0, 20, 150],
    outputRange: ['#C8E6C9', '#C8E6C9', '#4CD964'],
    extrapolate: 'clamp',
  });

  const likeHighlightOpacity = position.x.interpolate({
    inputRange: [0, 15, 120],
    outputRange: [0, 0.4, 1],
    extrapolate: 'clamp',
  });

  // Card Stack
  const card0 = profiles[0];
  const card1 = profiles[1];
  const card2 = profiles[2];

  const handleResetDeck = () => {
    fetchFeed(true);
    position.setValue({ x: 0, y: 0 });
  };

  return (
    <View style={styles.container}>
      {/* Top Status Bar Spacer */}
      <View style={{ height: insets.top, backgroundColor: '#F6F5F2', zIndex: 10 }} />

      <ScrollView
        style={{ flex: 1, backgroundColor: '#F6F5F2' }}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={true}
        alwaysBounceVertical={true}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handlePullToRefresh}
            colors={['#FFB43B']}
            tintColor="#FFB43B"
            progressViewOffset={0}
          />
        }
      >

      {/* Header Logo & Bell */}
      <View style={[styles.headerTop, { paddingTop: 8 }]}>
        <View style={styles.headerSide} />
        <Image source={logoSource} style={styles.logo} resizeMode="contain" />
        <View style={[styles.headerSide, styles.headerSideRight]}>
          <NotificationBell />
        </View>
      </View>

      {/* Greeting Banner */}
      <View style={styles.greetingBanner}>
        <Image
          source={{ uri: avatarUri || 'https://i.pravatar.cc/150?u=serbisure' }}
          style={styles.avatar}
        />
        <View style={styles.greetingTextContainer}>
          <Text style={styles.dateText}>{dateString}</Text>
          <Text style={styles.greetingText} numberOfLines={1} adjustsFontSizeToFit>
            {user.accountType === 'Kasambahay' ? 'Available Homeowner' : 'Available Kasambahay'}
          </Text>
        </View>
        <Pressable onPress={() => setIsFilterModalVisible(true)} hitSlop={8}>
          <Ionicons name="options-outline" size={28} color="#333" />
        </Pressable>
      </View>

      {/* Smart Recommendations Carousel (T3-2) */}
      <RecommendationsSection
        token={effectiveToken}
        accountType="Homeowner"
        onSelectWorker={(worker) => {
          setSelectedUserForModal({
            id: worker.id,
            name: worker.name,
            role: worker.role,
            avatar: worker.avatar,
          });
          setIsUserProfileModalVisible(true);
        }}
      />

      {/* Filter Chips Bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        <Pressable
          style={[
            styles.filterChip,
            styles.filterChipOutline,
            activeAdvancedFilterCount > 0 && styles.filterChipActiveOutline,
          ]}
          onPress={() => setIsFilterModalVisible(true)}
        >
          <Ionicons
            name="funnel-outline"
            size={14}
            color={activeAdvancedFilterCount > 0 ? '#FFFFFF' : '#FFB43B'}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.filterText,
              { color: activeAdvancedFilterCount > 0 ? '#FFFFFF' : '#FFB43B', fontWeight: '700' },
            ]}
          >
            Filters {activeAdvancedFilterCount > 0 ? `(${activeAdvancedFilterCount})` : ''}
          </Text>
        </Pressable>
        <View style={styles.filterDivider} />
        {FILTER_TABS.map((tab) => (
          <Pressable
            key={tab}
            style={[styles.filterChip, activeFilter === tab && styles.filterChipActive]}
            onPress={() => handleChipPress(tab)}
          >
            <Text style={[styles.filterText, activeFilter === tab && styles.filterTextActive]}>{tab}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Vertical Stacked Cards Deck Area */}
      <View style={styles.cardsContainer}>
        {isLoading ? (
          <Animated.View style={[styles.skeletonCard, { opacity: shimmerAnim }]}>
            <View style={styles.skeletonImageArea}>
              <View style={styles.skeletonTagPill} />
            </View>
            <View style={styles.skeletonContentArea}>
              <View style={styles.skeletonTitle} />
              <View style={styles.skeletonSubtitle} />
              <View style={styles.skeletonRow}>
                <View style={styles.skeletonBadge} />
                <View style={styles.skeletonPrice} />
              </View>
            </View>
          </Animated.View>
        ) : profiles.length === 0 ? (
          <View style={styles.emptyDeckCard}>
            <Ionicons name="checkmark-circle-outline" size={56} color="#FFB43B" style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>No more profiles left nearby!</Text>
            <Text style={styles.emptySub}>Check back later or refresh the deck to review again.</Text>
            <Pressable style={styles.resetBtn} onPress={handleResetDeck}>
              <Ionicons name="reload" size={16} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={styles.resetBtnText}>Refresh Deck</Text>
            </Pressable>
          </View>
        ) : (
          <React.Fragment>
            {/* Card 2 (Deepest Stack) */}
            {card2 && (
              <View style={[styles.stackedCard, styles.stackedCardDeep]}>
                <ImageBackground source={{ uri: card2.image }} style={styles.mainCard} imageStyle={styles.mainCardImage}>
                  <View style={styles.cardGradientOverlay} />
                </ImageBackground>
              </View>
            )}

            {/* Card 1 (Middle Stack) */}
            {card1 && (
              <View style={[styles.stackedCard, styles.stackedCardMid]}>
                <ImageBackground source={{ uri: card1.image }} style={styles.mainCard} imageStyle={styles.mainCardImage}>
                  <View style={styles.cardGradientOverlay} />
                </ImageBackground>
              </View>
            )}

            {/* Card 0 (Front Swipable Card) */}
            {card0 && (
              <Animated.View
                style={[
                  styles.stackedCard,
                  styles.stackedCardFront,
                  {
                    transform: [
                      { translateX: position.x },
                      { translateY: position.y },
                      { rotate: rotateCard },
                    ],
                  },
                ]}
                {...panResponder.panHandlers}
              >
                <ImageBackground
                  source={{ uri: card0.image }}
                  style={styles.mainCard}
                  imageStyle={styles.mainCardImage}
                >
                  <View style={styles.cardGradient}>
                    <View style={styles.cardInfoTop}>
                      <Pressable
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: 'rgba(0,0,0,0.5)',
                          alignSelf: 'flex-start',
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 20,
                        }}
                        onPress={() => handleOpenProfile(card0)}
                      >
                        <Image source={{ uri: card0.avatar }} style={{ width: 20, height: 20, borderRadius: 10, marginRight: 6 }} />
                        <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>View Profile</Text>
                        <Ionicons name="chevron-forward" size={12} color="#FFB43B" style={{ marginLeft: 2 }} />
                      </Pressable>
                    </View>
                    <View style={styles.cardInfoBottom}>
                      <Pressable onPress={() => handleOpenProfile(card0)}>
                        <Text style={styles.workerName}>{card0.name}</Text>
                      </Pressable>
                      <Text style={styles.workerLocation}>{card0.location}</Text>
                      <Text style={styles.workerRole}>
                        {card0.role} • <Text style={{ fontWeight: '800' }}>{card0.years}</Text>
                      </Text>

                      <View style={styles.tagsPriceRow}>
                        <View style={styles.tagsContainer}>
                          {card0.tags.map((tag) => (
                            <View key={tag} style={styles.tag}>
                              <Text style={styles.tagText}>{tag}</Text>
                            </View>
                          ))}
                        </View>
                        <View style={styles.priceContainer}>
                          <Text style={styles.priceAmount}>{card0.price}</Text>
                          <Text style={styles.priceUnit}>per hour</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </ImageBackground>
              </Animated.View>
            )}

            {/* Floating Left/Right Action Buttons (X and Heart) Centered Vertically on Card Edge */}
            <View style={styles.actionButtonsContainer} pointerEvents="box-none">
              {/* Pass Button & Floating -1 Indicator */}
              <View style={styles.actionBtnWrapper}>
                <Animated.View
                  style={[
                    styles.countFloat,
                    {
                      opacity: minusAnim,
                      transform: [
                        {
                          translateY: minusAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-30, -5],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Text style={styles.minusCountText}>-1</Text>
                </Animated.View>

                <Pressable
                  onPress={() => swipeCard('left')}
                  disabled={profiles.length === 0}
                >
                  <Animated.View
                    style={[
                      styles.actionBtn,
                      {
                        backgroundColor: passBgColor,
                      },
                    ]}
                  >
                    <Ionicons name="close" size={18} color="#E53935" />
                    <Animated.View
                      style={[
                        StyleSheet.absoluteFillObject,
                        {
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: passHighlightOpacity,
                        },
                      ]}
                    >
                      <Ionicons name="close" size={18} color="#FFFFFF" />
                    </Animated.View>
                  </Animated.View>
                </Pressable>
              </View>

              {/* Interested Button & Floating +1 Indicator */}
              <View style={styles.actionBtnWrapper}>
                <Animated.View
                  style={[
                    styles.countFloat,
                    {
                      opacity: plusAnim,
                      transform: [
                        {
                          translateY: plusAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-30, -5],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Text style={styles.plusCountText}>+1</Text>
                </Animated.View>

                <Pressable
                  onPress={() => swipeCard('right')}
                  disabled={profiles.length === 0}
                >
                  <Animated.View
                    style={[
                      styles.actionBtn,
                      {
                        backgroundColor: likeBgColor,
                      },
                    ]}
                  >
                    <Ionicons name="heart-outline" size={18} color="#22C55E" />
                    <Animated.View
                      style={[
                        StyleSheet.absoluteFillObject,
                        {
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: likeHighlightOpacity,
                        },
                      ]}
                    >
                      <Ionicons name="heart" size={18} color="#FFFFFF" />
                    </Animated.View>
                  </Animated.View>
                </Pressable>
              </View>
            </View>
          </React.Fragment>
        )}
      </View>

      {/* Messenger-style Chat Detail Modal */}
      <ChatDetailScreen
        visible={activeChat.visible}
        onClose={() => setActiveChat((prev) => ({ ...prev, visible: false }))}
        partnerId={activeChat.partnerId}
        token={token}
        contactName={activeChat.name}
        contactRole={activeChat.role}
        contactAvatar={activeChat.avatar}
        initialMessage={activeChat.initialMessage}
        userRole="homeowner"
      />

      {/* Advanced Filter & Sort Modal */}
      <FilterModal
        visible={isFilterModalVisible}
        onClose={() => setIsFilterModalVisible(false)}
        onApply={handleApplyFilters}
        initialFilters={filters}
        mode="homeowner"
      />

      {/* Counterparty Public Profile Modal (T1-5) */}
      {selectedUserForModal && (
        <UserProfileModal
          visible={isUserProfileModalVisible}
          onClose={() => setIsUserProfileModalVisible(false)}
          userId={String(selectedUserForModal.id)}
          prefilledName={selectedUserForModal.name}
          prefilledRole={selectedUserForModal.role}
          prefilledAvatar={selectedUserForModal.avatar}
          token={effectiveToken || ''}
        />
      )}
      </ScrollView>
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
  greetingBanner: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 6,
    marginBottom: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginRight: 12,
  },
  greetingTextContainer: {
    flex: 1,
  },
  dateText: {
    fontSize: 10,
    fontFamily: THEME.typography.fontFamily.secondaryMedium,
    color: THEME.colors.brandDark,
    letterSpacing: 0.5,
  },
  greetingText: {
    fontSize: 18,
    fontFamily: THEME.typography.fontFamily.display,
    color: THEME.colors.ink,
  },
  filterScroll: {
    maxHeight: 46,
    marginBottom: 8,
  },
  filterContent: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  filterChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 9999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: THEME.colors.brand,
  },
  filterChipOutline: {
    backgroundColor: '#FFF0E5',
  },
  filterChipActiveOutline: {
    backgroundColor: THEME.colors.brand,
  },
  filterText: {
    fontSize: 13,
    color: THEME.colors.ink,
    fontFamily: THEME.typography.fontFamily.secondaryMedium,
  },
  filterTextActive: {
    color: THEME.colors.ink,
    fontFamily: THEME.typography.fontFamily.display,
  },
  filterDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#E4E3DF',
    marginRight: 10,
  },
  cardsContainer: {
    height: 400,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: 6,
  },
  stackedCard: {
    position: 'absolute',
    borderRadius: 24,
    overflow: 'hidden',
  },
  stackedCardFront: {
    width: SCREEN_WIDTH - 48,
    height: 380,
    zIndex: 10,
  },
  stackedCardMid: {
    width: SCREEN_WIDTH - 64,
    height: 380,
    top: -12,
    zIndex: 5,
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  stackedCardDeep: {
    width: SCREEN_WIDTH - 80,
    height: 380,
    top: -24,
    zIndex: 2,
    opacity: 0.65,
    transform: [{ scale: 0.92 }],
  },
  mainCard: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  mainCardImage: {
    borderRadius: 24,
  },
  cardGradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  cardGradient: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.38)',
    paddingVertical: 18,
    paddingHorizontal: 28,
  },
  cardInfoTop: {
    flex: 1,
  },
  cardInfoBottom: {},
  workerName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 4,
  },
  workerLocation: {
    fontSize: 13,
    color: '#FFB43B',
    fontWeight: '700',
    marginBottom: 6,
  },
  workerRole: {
    fontSize: 12,
    color: '#FFF',
    marginBottom: 12,
    lineHeight: 16,
  },
  tagsPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    flex: 1,
    marginRight: 8,
  },
  tag: {
    backgroundColor: '#FFF0DB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#333',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
  },
  priceUnit: {
    fontSize: 10,
    color: '#FFF',
    opacity: 0.85,
  },
  emptyDeckCard: {
    width: SCREEN_WIDTH - 48,
    height: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  resetBtn: {
    backgroundColor: '#FFB43B',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  resetBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  actionButtonsContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 50,
    paddingHorizontal: 4,
  },
  actionBtnWrapper: {
    alignItems: 'center',
    position: 'relative',
  },
  countFloat: {
    position: 'absolute',
    top: -24,
    alignItems: 'center',
  },
  plusCountText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4CD964',
  },
  minusCountText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#E53935',
  },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 5,
    elevation: 4,
  },
  skeletonCard: {
    width: SCREEN_WIDTH - 48,
    height: 480,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  skeletonImageArea: {
    flex: 1,
    backgroundColor: '#E2E8F0',
    padding: 16,
    justifyContent: 'flex-start',
  },
  skeletonTagPill: {
    width: 90,
    height: 24,
    backgroundColor: '#CBD5E1',
    borderRadius: 12,
  },
  skeletonContentArea: {
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  skeletonTitle: {
    width: '65%',
    height: 22,
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
    marginBottom: 10,
  },
  skeletonSubtitle: {
    width: '45%',
    height: 14,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    marginBottom: 16,
  },
  skeletonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skeletonBadge: {
    width: 70,
    height: 20,
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
  },
  skeletonPrice: {
    width: 80,
    height: 22,
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
  },
});
