import React, { useState, useRef, useEffect } from 'react';
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

import { UserProfileModal } from '../UserProfileModal';
import { API_BASE_URL, fetchWithTimeout } from '../../config/api';

import { useUser } from '../../context/UserContext';

const logoSource = require('../../../assets/serbisure-logo.png');
const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 0.25 * SCREEN_WIDTH;

export interface JobOpening {
  id: number | string;
  partnerId?: string;
  employerName: string;
  title: string;
  location: string;
  description: string;
  price: string;
  unit: string;
  tags: string[];
  image: string;
  avatar: string;
}

const FILTER_TABS = ['All', 'Stay-in', 'Part-time', 'Cleaning', 'Cooking', 'Caregiver'];

// Module-level cache: lives OUTSIDE the component so it survives tab switches.
let jobFeedCache: JobOpening[] | null = null;

export const clearJobFeedCache = () => {
  jobFeedCache = null;
};

export function JobsScreen({ onViewProfile, token }: { onViewProfile?: () => void, token?: string | null } = {}) {
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const effectiveToken = token || user.token;

  const [jobs, setJobs] = useState<JobOpening[]>(jobFeedCache || []);
  const [isLoading, setIsLoading] = useState<boolean>(jobFeedCache === null);
  const jobsRef = useRef<JobOpening[]>(jobs);
  jobsRef.current = jobs;

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
      name: target.employerName || target.name || 'Homeowner',
      role: 'Homeowner',
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
    if (!forceRefresh && !hasActiveFilters && jobFeedCache !== null) {
      setJobs(jobFeedCache);
      jobsRef.current = jobFeedCache;
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
        const liveJobs: JobOpening[] = data.map((item: any) => {
          const categories = Array.isArray(item.service_category)
            ? item.service_category
            : item.service_category
            ? [item.service_category]
            : ['Household'];
          const avatarUrl =
            item.profile_link ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || 'Homeowner')}&background=FFB43B&color=fff`;

          const typeLabel = item.booking_type === 'long_term' ? 'Stay-in' : 'Part-time';

          return {
            id: item.booking_id,
            partnerId: item.poster_id,
            employerName: item.name || 'Homeowner',
            title: categories.join(' & ') || 'Household Service',
            location: item.service_address || 'Cagayan de Oro',
            description: `Looking for ${categories.join(', ')} (${typeLabel}) at ${item.service_address || 'residence'}.`,
            price: `P ${item.daily_rate || '0'}`,
            unit: 'per day',
            tags: ['Verified Employer', typeLabel, ...categories],
            image: avatarUrl,
            avatar: avatarUrl,
          };
        });

        if (!hasActiveFilters) {
          jobFeedCache = liveJobs;
        }
        setJobs(liveJobs);
        jobsRef.current = liveJobs;
        position.setValue({ x: 0, y: 0 });
      }
    } catch (error) {
      console.warn('[JobsScreen] Failed to load feed from backend', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChipPress = (tab: string) => {
    setActiveFilter(tab);
    if (tab === 'All') {
      const updated: FeedFilters = { ...filters, categories: [], bookingType: null };
      setFilters(updated);
      fetchFeed(true, updated);
    } else if (tab === 'Stay-in') {
      const updated: FeedFilters = { ...filters, bookingType: 'long_term', categories: [] };
      setFilters(updated);
      fetchFeed(true, updated);
    } else if (tab === 'Part-time') {
      const updated: FeedFilters = { ...filters, bookingType: 'short_term', categories: [] };
      setFilters(updated);
      fetchFeed(true, updated);
    } else {
      const updated: FeedFilters = { ...filters, categories: [tab], bookingType: null };
      setFilters(updated);
      fetchFeed(true, updated);
    }
  };

  const handleApplyFilters = (newFilters: FeedFilters) => {
    setFilters(newFilters);
    const firstCat = newFilters.categories[0];
    if (newFilters.bookingType === 'long_term' && newFilters.categories.length === 0) {
      setActiveFilter('Stay-in');
    } else if (newFilters.bookingType === 'short_term' && newFilters.categories.length === 0) {
      setActiveFilter('Part-time');
    } else if (newFilters.categories.length === 1 && firstCat && FILTER_TABS.includes(firstCat)) {
      setActiveFilter(firstCat);
    } else if (newFilters.categories.length === 0 && !newFilters.bookingType) {
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
    const currentJob = jobsRef.current[0];
    if (!currentJob) return;

    if (swipedRight) {
      showCountAnimation('plus');
      chatStore.addOrUpdateChat({
        id: currentJob.partnerId || currentJob.id,
        partnerId: currentJob.partnerId,
        name: currentJob.employerName,
        badge: 'Homeowner',
        avatar: currentJob.avatar,
        time: 'Just now',
        message: 'I am interested in this job position',
        online: true,
      });

      // Directly open ChatDetailScreen modal with auto message!
      setActiveChat({
        visible: true,
        partnerId: currentJob.partnerId,
        name: currentJob.employerName,
        role: 'Homeowner',
        avatar: currentJob.avatar,
        initialMessage: 'I am interested in this job position',
      });
    } else {
      showCountAnimation('minus');
    }

    setJobs((prev) => {
      const next = prev.slice(1);
      jobsRef.current = next;
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
  const card0 = jobs[0];
  const card1 = jobs[1];
  const card2 = jobs[2];

  const handleResetDeck = () => {
    fetchFeed(true);
    position.setValue({ x: 0, y: 0 });
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#F6F5F2' }}
      contentContainerStyle={{ flex: 1 }}
      scrollEnabled={isRefreshing || jobs.length === 0}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handlePullToRefresh}
          colors={['#FFB43B']}
          tintColor="#FFB43B"
          title="Refreshing feed..."
          titleColor="#888"
        />
      }
    >
    <View style={styles.container}>
      {/* Top Status Bar Spacer */}
      <View style={{ height: insets.top, backgroundColor: '#F6F5F2', zIndex: 10 }} />

      {/* Header Logo & Bell */}
      <View style={[styles.headerTop, { paddingTop: 8 }]}>
        <View style={styles.headerSide} />
        <Image source={logoSource} style={styles.logo} resizeMode="contain" />
        <View style={[styles.headerSide, styles.headerSideRight]}>
          <Ionicons name="notifications" size={24} color="#333" />
        </View>
      </View>

      {/* Yellow Title Banner */}
      <View style={styles.greetingBanner}>
        <View style={styles.greetingTextContainer}>
          <Text style={styles.headerTitle}>
            {user.accountType === 'Homeowner' ? 'Available Kasambahay' : 'Available Homeowner'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {isLoading
              ? 'Finding opportunities near you...'
              : jobs.length > 0
              ? `${jobs.length} opportunities available nearby`
              : 'No more opportunities left nearby'}
          </Text>
        </View>
        <Pressable onPress={() => setIsFilterModalVisible(true)} hitSlop={8}>
          <Ionicons name="options-outline" size={28} color="#333" />
        </Pressable>
      </View>

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
          /* ── Rich Skeleton Loading ── */
          <React.Fragment>
            {/* Deep stack card (skeleton) */}
            <Animated.View
              style={[
                styles.skeletonStackDeep,
                { opacity: shimmerAnim },
              ]}
            />

            {/* Mid stack card (skeleton) */}
            <Animated.View
              style={[
                styles.skeletonStackMid,
                { opacity: shimmerAnim },
              ]}
            />

            {/* Front card (skeleton) - full detail */}
            <Animated.View
              style={[
                styles.skeletonCard,
                { opacity: shimmerAnim },
              ]}
            >
              {/* Image area */}
              <View style={styles.skeletonImageArea}>
                {/* Top bar — avatar + name placeholder */}
                <View style={styles.skeletonAvatarRow}>
                  <View style={styles.skeletonAvatar} />
                  <View style={{ flex: 1, marginLeft: 12, gap: 8 }}>
                    <View style={styles.skeletonNameBar} />
                    <View style={styles.skeletonSubBar} />
                  </View>
                </View>

                {/* Verified badge pill top-right */}
                <View style={styles.skeletonVerifiedPill} />
              </View>

              {/* Content footer area */}
              <View style={styles.skeletonContentArea}>
                {/* Title + location */}
                <View style={styles.skeletonTitle} />
                <View style={styles.skeletonLocationRow}>
                  <View style={styles.skeletonLocationDot} />
                  <View style={styles.skeletonLocationBar} />
                </View>

                {/* Description lines */}
                <View style={[styles.skeletonDescBar, { width: '100%' }]} />
                <View style={[styles.skeletonDescBar, { width: '80%', marginTop: 6 }]} />

                {/* Tags + Price row */}
                <View style={styles.skeletonTagsPriceRow}>
                  <View style={styles.skeletonTagsGroup}>
                    <View style={styles.skeletonTag} />
                    <View style={[styles.skeletonTag, { width: 64 }]} />
                  </View>
                  <View style={styles.skeletonPriceBox}>
                    <View style={styles.skeletonPriceAmount} />
                    <View style={styles.skeletonPriceUnit} />
                  </View>
                </View>
              </View>
            </Animated.View>

            {/* Skeleton action buttons */}
            <Animated.View
              style={[styles.skeletonActionRow, { opacity: shimmerAnim }]}
            >
              <View style={styles.skeletonActionBtn} />
              <View style={[styles.skeletonActionBtn, { marginLeft: 32 }]} />
            </Animated.View>
          </React.Fragment>
        ) : jobs.length === 0 ? (
          <View style={styles.emptyDeckCard}>
            <Ionicons name="checkmark-circle-outline" size={56} color="#FFB43B" style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>You've reviewed all opportunities!</Text>
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
                        <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>{card0.employerName || 'Homeowner'}</Text>
                        <Ionicons name="information-circle-outline" size={14} color="#FFB43B" style={{ marginLeft: 4 }} />
                      </Pressable>
                    </View>
                    <View style={styles.cardInfoBottom}>
                      <Pressable onPress={() => handleOpenProfile(card0)}>
                        <Text style={styles.workerName}>{card0.title}</Text>
                      </Pressable>
                      <Text style={styles.workerLocation}>{card0.location}</Text>
                      <Text style={styles.workerRole}>{card0.description}</Text>

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
                          <Text style={styles.priceUnit}>{card0.unit}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </ImageBackground>
              </Animated.View>
            )}
          </React.Fragment>
        )}
      </View>

      {/* Action Buttons (X and Heart) with Interactive Drag Highlights & Floating +1 / -1 */}
      <View style={styles.actionButtonsContainer}>
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
            disabled={jobs.length === 0}
          >
            <Animated.View
              style={[
                styles.actionBtn,
                {
                  backgroundColor: passBgColor,
                },
              ]}
            >
              {/* Default Red Icon */}
              <Ionicons name="close" size={22} color="#E53935" />
              {/* Highlighted White Icon */}
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
                <Ionicons name="close" size={22} color="#FFFFFF" />
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
            disabled={jobs.length === 0}
          >
            <Animated.View
              style={[
                styles.actionBtn,
                {
                  backgroundColor: likeBgColor,
                },
              ]}
            >
              {/* Default Green Icon */}
              <Ionicons name="heart" size={20} color="#4CD964" />
              {/* Highlighted White Icon */}
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
                <Ionicons name="heart" size={20} color="#FFFFFF" />
              </Animated.View>
            </Animated.View>
          </Pressable>
        </View>
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
        userRole="kasambahay"
      />

      {/* Advanced Filter & Sort Modal */}
      <FilterModal
        visible={isFilterModalVisible}
        onClose={() => setIsFilterModalVisible(false)}
        onApply={handleApplyFilters}
        initialFilters={filters}
        mode="kasambahay"
      />

      {/* Employer Public Profile Modal (T1-5) */}
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
    </View>
    </ScrollView>
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
    paddingHorizontal: 24,
    marginBottom: 6,
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
    backgroundColor: '#FFECCB',
    paddingHorizontal: 24,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  greetingTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  filterScroll: {
    maxHeight: 46,
    marginVertical: 10,
  },
  filterContent: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  filterChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: '#FFB43B',
    borderColor: '#FFB43B',
  },
  filterChipOutline: {
    borderColor: '#FFB43B',
  },
  filterChipActiveOutline: {
    backgroundColor: '#FFB43B',
    borderColor: '#FFB43B',
  },
  filterText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  filterDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#FFB43B',
    opacity: 0.6,
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
    padding: 20,
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
    borderWidth: 1,
    borderColor: '#EFEFEF',
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
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 12,
    gap: 28,
  },
  actionBtnWrapper: {
    alignItems: 'center',
    position: 'relative',
  },
  countFloat: {
    position: 'absolute',
    top: -18,
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
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  skeletonStackDeep: {
    position: 'absolute',
    width: SCREEN_WIDTH - 80,
    height: 380,
    borderRadius: 24,
    backgroundColor: '#D8DDE8',
    zIndex: 2,
    transform: [{ scale: 0.92 }],
    top: -24,
  },
  skeletonStackMid: {
    position: 'absolute',
    width: SCREEN_WIDTH - 64,
    height: 380,
    borderRadius: 24,
    backgroundColor: '#DDE2EC',
    zIndex: 5,
    transform: [{ scale: 0.96 }],
    top: -12,
  },
  skeletonCard: {
    position: 'absolute',
    zIndex: 10,
    width: SCREEN_WIDTH - 48,
    height: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 6,
  },
  skeletonImageArea: {
    flex: 1,
    backgroundColor: '#E8ECF4',
    padding: 16,
    justifyContent: 'space-between',
  },
  skeletonAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skeletonAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#CBD5E1',
  },
  skeletonNameBar: {
    height: 14,
    width: '70%',
    backgroundColor: '#CBD5E1',
    borderRadius: 6,
  },
  skeletonSubBar: {
    height: 10,
    width: '45%',
    backgroundColor: '#D1D9E5',
    borderRadius: 4,
  },
  skeletonVerifiedPill: {
    position: 'absolute',
    right: 16,
    top: 16,
    width: 80,
    height: 24,
    backgroundColor: '#CBD5E1',
    borderRadius: 12,
  },
  skeletonContentArea: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  skeletonTitle: {
    width: '60%',
    height: 20,
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
  },
  skeletonLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  skeletonLocationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E2E8F0',
  },
  skeletonLocationBar: {
    height: 10,
    width: '40%',
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
  },
  skeletonDescBar: {
    height: 10,
    backgroundColor: '#E8ECF4',
    borderRadius: 4,
  },
  skeletonTagsPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 4,
  },
  skeletonTagsGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  skeletonTag: {
    width: 52,
    height: 22,
    backgroundColor: '#FFF0DB',
    borderRadius: 4,
  },
  skeletonPriceBox: {
    alignItems: 'flex-end',
    gap: 4,
  },
  skeletonPriceAmount: {
    width: 64,
    height: 16,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
  },
  skeletonPriceUnit: {
    width: 40,
    height: 10,
    backgroundColor: '#EEF2F7',
    borderRadius: 3,
  },
  skeletonActionRow: {
    position: 'absolute',
    bottom: -62,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  skeletonActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E2E8F0',
  },
});
