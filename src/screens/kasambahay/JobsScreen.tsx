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
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { chatStore } from '../../store/chatStore';
import { ChatDetailScreen } from '../ChatDetailScreen';
import { FilterModal, FeedFilters, DEFAULT_FILTERS } from '../FilterModal';

import { UserProfileModal } from '../UserProfileModal';
import { API_BASE_URL, fetchWithTimeout } from '../../config/api';

import { useUser } from '../../context/UserContext';
import { NotificationBell } from '../../context/NotificationContext';
import THEME from '../../config/theme';
import { useJobsActivity, SavedJobItem } from '../../store/savedJobsStore';

const logoSource = require('../../../assets/serbisure_new_clean.png');
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

  const [subTab, setSubTab] = useState<'explore' | 'saved' | 'applied'>('explore');
  const [showFilters, setShowFilters] = useState<boolean>(true);
  const [selectedJobForDetails, setSelectedJobForDetails] = useState<JobOpening | SavedJobItem | null>(null);
  const {
    savedJobs,
    appliedJobs,
    savedCount,
    appliedCount,
    isSaved,
    isApplied,
    toggleSave,
    applyJob,
  } = useJobsActivity();

  const handleToggleSave = (job: JobOpening | SavedJobItem) => {
    toggleSave({
      id: job.id,
      employerName: (job as any).employerName || (job as any).title || 'Homeowner',
      title: (job as any).title || (job as any).roleTag || 'Household Service',
      avatar: job.avatar || (job as any).image,
      location: job.location || 'Cagayan de Oro',
      roleTag: (job as any).roleTag || ((job as any).tags && (job as any).tags[1]) || 'Service',
      termTag: (job as any).termTag || ((job as any).tags && (job as any).tags[2]) || 'Part-time',
      price: job.price,
      unit: job.unit || '/ month',
      aboutText: (job as any).aboutText || (job as any).description || 'Looking for experienced and trustworthy household assistance.',
      tags: (job as any).tags || [],
      image: (job as any).image || job.avatar,
    });
  };

  const handleApplyJob = (job: JobOpening | SavedJobItem) => {
    applyJob({
      id: job.id,
      employerName: (job as any).employerName || (job as any).title || 'Homeowner',
      title: (job as any).title || (job as any).roleTag || 'Household Service',
      avatar: job.avatar || (job as any).image,
      location: job.location || 'Cagayan de Oro',
      roleTag: (job as any).roleTag || ((job as any).tags && (job as any).tags[1]) || 'Service',
      termTag: (job as any).termTag || ((job as any).tags && (job as any).tags[2]) || 'Part-time',
      price: job.price,
      unit: job.unit || '/ month',
      aboutText: (job as any).aboutText || (job as any).description || '',
      tags: (job as any).tags || [],
      image: (job as any).image || job.avatar,
    });

    const partnerId = (job as any).partnerId || job.id;
    chatStore.addOrUpdateChat({
      id: partnerId,
      partnerId: (job as any).partnerId,
      name: (job as any).employerName || 'Homeowner',
      badge: 'Homeowner',
      avatar: job.avatar || (job as any).image,
      time: 'Just now',
      message: 'I am interested in this job position',
      online: true,
    });
  };

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
      handleApplyJob(currentJob);

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
    <View style={styles.container}>
      {/* Top Status Bar Spacer */}
      <View style={{ height: insets.top, backgroundColor: '#F6F5F2', zIndex: 10 }} />

      <ScrollView
        style={{ flex: 1, backgroundColor: '#F6F5F2' }}
        contentContainerStyle={subTab === 'explore' ? { flexGrow: 1 } : { paddingBottom: 100 }}
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

      {/* Clean White Greeting Card */}
      <View style={styles.greetingCard}>
        {/* Sub-Navigation Tabs: Explore | Saved | Applied Inside Card Above Header */}
        <View style={styles.subTabBar}>
          <Pressable
            style={[styles.subTabPill, subTab === 'explore' && styles.subTabPillActive]}
            onPress={() => setSubTab('explore')}
          >
            <Text style={[styles.subTabText, subTab === 'explore' && styles.subTabTextActive]}>
              Explore
            </Text>
          </Pressable>

          <Pressable
            style={[styles.subTabPill, subTab === 'saved' && styles.subTabPillActive]}
            onPress={() => setSubTab('saved')}
          >
            <Text style={[styles.subTabText, subTab === 'saved' && styles.subTabTextActive]}>
              Saved <Text style={[styles.subTabCount, subTab === 'saved' && styles.subTabCountActive]}>({savedCount})</Text>
            </Text>
          </Pressable>

          <Pressable
            style={[styles.subTabPill, subTab === 'applied' && styles.subTabPillActive]}
            onPress={() => setSubTab('applied')}
          >
            <Text style={[styles.subTabText, subTab === 'applied' && styles.subTabTextActive]}>
              Applied <Text style={[styles.subTabCount, subTab === 'applied' && styles.subTabCountActive]}>({appliedCount})</Text>
            </Text>
          </Pressable>
        </View>

        {/* Title & Action Row */}
        <View style={styles.greetingHeaderRow}>
          <View style={styles.greetingTextContainer}>
            <Text style={styles.headerTitle}>
              {subTab === 'explore'
                ? (user.accountType === 'Homeowner' ? 'Available Kasambahay' : 'Available Homeowner')
                : subTab === 'saved'
                ? 'Saved Opportunities'
                : 'My Applications'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {subTab === 'explore'
                ? (isLoading
                    ? 'Finding opportunities near you...'
                    : jobs.length > 0
                    ? `${jobs.length} opportunities available nearby`
                    : 'No more opportunities left nearby')
                : subTab === 'saved'
                ? `${savedJobs.length} saved ${savedJobs.length === 1 ? 'opportunity' : 'opportunities'}`
                : `${appliedJobs.length} submitted ${appliedJobs.length === 1 ? 'application' : 'applications'}`}
            </Text>
          </View>
          {subTab === 'explore' && (
            <Pressable
              style={[styles.filterIconButton, showFilters && styles.filterIconButtonActive]}
              onPress={() => setShowFilters((prev) => !prev)}
              hitSlop={8}
            >
              <Ionicons
                name="options-outline"
                size={20}
                color={showFilters ? '#FFFFFF' : THEME.colors.ink}
              />
            </Pressable>
          )}
        </View>
      </View>

      {/* Expandable Filter Chips Bar — placed just below greeting card */}
      {showFilters && subTab === 'explore' && (
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
              color={activeAdvancedFilterCount > 0 ? '#FFFFFF' : THEME.colors.brandDark}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.filterText,
                { color: activeAdvancedFilterCount > 0 ? '#FFFFFF' : THEME.colors.brandDark, fontWeight: '700' },
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
      )}

      {/* Content Rendering by Active SubTab */}
      {subTab === 'explore' ? (
        <React.Fragment>

          {/* Vertical Stacked Cards Deck Area */}
          <View style={styles.cardsContainer}>
            {isLoading ? (
              /* Rich Skeleton Loading */
              <React.Fragment>
                <Animated.View style={[styles.skeletonStackDeep, { opacity: shimmerAnim }]} />
                <Animated.View style={[styles.skeletonStackMid, { opacity: shimmerAnim }]} />
                <Animated.View style={[styles.skeletonCard, { opacity: shimmerAnim }]}>
                  <View style={styles.skeletonImageArea}>
                    <View style={styles.skeletonAvatarRow}>
                      <View style={styles.skeletonAvatar} />
                      <View style={{ flex: 1, marginLeft: 12, gap: 8 }}>
                        <View style={styles.skeletonNameBar} />
                        <View style={styles.skeletonSubBar} />
                      </View>
                    </View>
                    <View style={styles.skeletonVerifiedPill} />
                  </View>
                  <View style={styles.skeletonContentArea}>
                    <View style={styles.skeletonTitle} />
                    <View style={styles.skeletonLocationRow}>
                      <View style={styles.skeletonLocationDot} />
                      <View style={styles.skeletonLocationBar} />
                    </View>
                    <View style={[styles.skeletonDescBar, { width: '100%' }]} />
                    <View style={[styles.skeletonDescBar, { width: '80%', marginTop: 6 }]} />
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
                <Animated.View style={[styles.skeletonActionRow, { opacity: shimmerAnim }]}>
                  <View style={styles.skeletonActionBtn} />
                  <View style={[styles.skeletonActionBtn, { marginLeft: 32 }]} />
                </Animated.View>
              </React.Fragment>
            ) : jobs.length === 0 ? (
              <View style={styles.emptyDeckCard}>
                <Ionicons name="checkmark-circle-outline" size={56} color={THEME.colors.brand} style={{ marginBottom: 12 }} />
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
                          <View style={styles.cardHeaderRow}>
                            <Pressable
                              style={styles.employerPill}
                              onPress={() => handleOpenProfile(card0)}
                            >
                              <Image source={{ uri: card0.avatar }} style={styles.employerPillAvatar} />
                              <Text style={styles.employerPillName}>{card0.employerName || 'Homeowner'}</Text>
                              <Ionicons name="information-circle-outline" size={14} color={THEME.colors.brand} style={{ marginLeft: 4 }} />
                            </Pressable>

                            {/* Bookmark Icon in Top Right Corner */}
                            <Pressable
                              style={styles.cardBookmarkBtn}
                              onPress={() => handleToggleSave(card0)}
                              hitSlop={12}
                            >
                              <Ionicons
                                name={isSaved(card0.id) ? "bookmark" : "bookmark-outline"}
                                size={20}
                                color={THEME.colors.ink}
                              />
                            </Pressable>
                          </View>
                        </View>

                        <View style={styles.cardInfoBottom}>
                          <Pressable onPress={() => setSelectedJobForDetails(card0)}>
                            <Text style={styles.workerName}>{card0.title}</Text>
                          </Pressable>
                          <Text style={styles.workerLocation}>{card0.location}</Text>
                          <Text style={styles.workerRole} numberOfLines={2}>{card0.description}</Text>

                          <View style={styles.tagsContainer}>
                            {card0.tags.map((tag) => (
                              <View key={tag} style={styles.tag}>
                                <Text style={styles.tagText}>{tag}</Text>
                              </View>
                            ))}
                          </View>

                          <View style={styles.cardFooterActionRow}>
                            <View style={styles.priceContainer}>
                              <Text style={styles.priceAmount}>{card0.price}</Text>
                              <Text style={styles.priceUnit}>{card0.unit}</Text>
                            </View>

                            {/* See Details Button */}
                            <Pressable
                              style={[styles.seeDetailsBtn, isApplied(card0.id) && styles.seeDetailsBtnApplied]}
                              onPress={() => setSelectedJobForDetails(card0)}
                            >
                              <Text style={[styles.seeDetailsBtnText, isApplied(card0.id) && styles.seeDetailsBtnTextApplied]}>
                                {isApplied(card0.id) ? 'Applied' : 'See Details'}
                              </Text>
                            </Pressable>
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
        </React.Fragment>
      ) : subTab === 'saved' ? (
        /* ── Indeed-Style Saved Tab View ── */
        <View style={styles.activityTabContainer}>
          {savedJobs.length === 0 ? (
            <View style={styles.emptyActivityBox}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="bookmark" size={34} color={THEME.colors.ink} />
              </View>
              <Text style={styles.emptyActivityTitle}>No saved jobs yet</Text>
              <Text style={styles.emptyActivitySub}>
                Jobs you bookmark will appear here so you can easily review and apply when ready.
              </Text>
              <Pressable style={styles.findJobsBtn} onPress={() => setSubTab('explore')}>
                <Text style={styles.findJobsBtnText}>Find jobs →</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.activityList}>
              {savedJobs.map((job) => {
                const applied = isApplied(job.id);
                return (
                  <Pressable key={job.id} style={styles.activityJobCard} onPress={() => setSelectedJobForDetails(job)}>
                    <View style={styles.activityJobHeader}>
                      <Image source={{ uri: job.avatar }} style={styles.activityAvatar} />
                      <View style={styles.activityEmployerInfo}>
                        <View style={styles.nameRow}>
                          <Text style={styles.activityEmployerName}>{job.employerName}</Text>
                          <Ionicons name="checkmark-circle" size={15} color="#10B981" style={{ marginLeft: 4 }} />
                        </View>
                        <Text style={styles.activityLocationText}>
                          <Ionicons name="location-sharp" size={11} color="#888" /> {job.location || 'Cagayan de Oro'}
                        </Text>
                        <View style={styles.tagsRow}>
                          {job.roleTag && (
                            <View style={[styles.tagBadge, styles.tagRole]}>
                              <Text style={styles.tagRoleText}>{job.roleTag}</Text>
                            </View>
                          )}
                          {job.termTag && (
                            <View style={[styles.tagBadge, styles.tagTerm]}>
                              <Text style={styles.tagTermText}>{job.termTag}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <Pressable
                        style={styles.activityBookmarkBtn}
                        onPress={() => handleToggleSave(job)}
                        hitSlop={10}
                      >
                        <Ionicons name="bookmark" size={22} color={THEME.colors.ink} />
                      </Pressable>
                    </View>

                    <View style={styles.activityDivider} />

                    <View style={styles.activityFooter}>
                      <Text style={styles.priceText}>
                        {job.price} <Text style={styles.unitText}>{job.unit}</Text>
                      </Text>
                      <Pressable
                        style={[styles.seeDetailsBtn, applied && styles.seeDetailsBtnApplied]}
                        onPress={() => setSelectedJobForDetails(job)}
                      >
                        <Text style={[styles.seeDetailsBtnText, applied && styles.seeDetailsBtnTextApplied]}>
                          {applied ? 'Applied' : 'See Details'}
                        </Text>
                      </Pressable>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      ) : (
        /* ── Indeed-Style Applied Tab View ── */
        <View style={styles.activityTabContainer}>
          {appliedJobs.length === 0 ? (
            <View style={styles.emptyActivityBox}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="paper-plane" size={34} color={THEME.colors.brandDark} />
              </View>
              <Text style={styles.emptyActivityTitle}>No applications yet</Text>
              <Text style={styles.emptyActivitySub}>
                Applications completed on SerbiSure will appear here for 6 months.
              </Text>
              <Pressable style={styles.findJobsBtn} onPress={() => setSubTab('explore')}>
                <Text style={styles.findJobsBtnText}>Find jobs →</Text>
              </Pressable>
              <Pressable style={styles.notSeeingBtn} onPress={() => setSubTab('explore')}>
                <Text style={styles.notSeeingText}>Not seeing an application?</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.activityList}>
              {appliedJobs.map((job) => (
                <Pressable key={job.id} style={styles.activityJobCard} onPress={() => setSelectedJobForDetails(job)}>
                  <View style={styles.activityJobHeader}>
                    <Image source={{ uri: job.avatar }} style={styles.activityAvatar} />
                    <View style={styles.activityEmployerInfo}>
                      <View style={styles.nameRow}>
                        <Text style={styles.activityEmployerName}>{job.employerName}</Text>
                        <Ionicons name="checkmark-circle" size={15} color="#10B981" style={{ marginLeft: 4 }} />
                      </View>
                      <Text style={styles.activityLocationText}>
                        <Ionicons name="location-sharp" size={11} color="#888" /> {job.location || 'Cagayan de Oro'}
                      </Text>
                      <View style={styles.appliedStatusBadge}>
                        <Ionicons name="checkmark-circle" size={12} color="#00875A" style={{ marginRight: 4 }} />
                        <Text style={styles.appliedStatusText}>Application Sent</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.activityDivider} />

                  <View style={styles.activityFooter}>
                    <Text style={styles.priceText}>
                      {job.price} <Text style={styles.unitText}>{job.unit}</Text>
                    </Text>
                    <Pressable
                      style={[styles.seeDetailsBtn, styles.seeDetailsBtnApplied]}
                      onPress={() => setSelectedJobForDetails(job)}
                    >
                      <Text style={[styles.seeDetailsBtnText, styles.seeDetailsBtnTextApplied]}>
                        View Application
                      </Text>
                    </Pressable>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Role Details Modal Sheet */}
      <Modal
        visible={!!selectedJobForDetails}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedJobForDetails(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setSelectedJobForDetails(null)} />
          {selectedJobForDetails && (
            <View style={styles.sheetContent}>
              <View style={styles.sheetHandle} />

              <View style={styles.sheetHeader}>
                <Image
                  source={{ uri: (selectedJobForDetails as any).avatar || (selectedJobForDetails as any).image }}
                  style={styles.sheetAvatar}
                />
                <View style={styles.sheetTitleInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.sheetEmployerName}>
                      {(selectedJobForDetails as any).employerName || (selectedJobForDetails as any).title || 'Homeowner'}
                    </Text>
                    <Ionicons name="checkmark-circle" size={18} color="#10B981" style={{ marginLeft: 4 }} />
                  </View>
                  <Text style={styles.sheetLocation}>
                    <Ionicons name="location-sharp" size={12} color="#666" /> {selectedJobForDetails.location || 'Cagayan de Oro'}
                  </Text>
                  <View style={styles.sheetTagRow}>
                    <View style={[styles.tagBadge, styles.tagRole]}>
                      <Text style={styles.tagRoleText}>
                        {(selectedJobForDetails as any).roleTag ||
                          ((selectedJobForDetails as any).tags && (selectedJobForDetails as any).tags[1]) ||
                          'Service'}
                      </Text>
                    </View>
                    <Text style={styles.sheetPostTime}>{(selectedJobForDetails as any).time || 'Active today'}</Text>
                  </View>
                </View>

                {/* Bookmark Button in Sheet Header */}
                <Pressable
                  style={styles.sheetBookmarkBtn}
                  onPress={() => handleToggleSave(selectedJobForDetails)}
                  hitSlop={10}
                >
                  <Ionicons
                    name={isSaved(selectedJobForDetails.id) ? 'bookmark' : 'bookmark-outline'}
                    size={24}
                    color={THEME.colors.ink}
                  />
                </Pressable>
              </View>

              {/* Price & Term */}
              <View style={styles.sheetPriceRow}>
                <Text style={styles.sheetPrice}>
                  {selectedJobForDetails.price}{' '}
                  <Text style={styles.sheetUnit}>{selectedJobForDetails.unit || '/ month'}</Text>
                </Text>
                <View style={[styles.tagBadge, styles.tagTerm]}>
                  <Text style={styles.tagTermText}>
                    {(selectedJobForDetails as any).termTag ||
                      ((selectedJobForDetails as any).tags && (selectedJobForDetails as any).tags[2]) ||
                      'Part-time'}
                  </Text>
                </View>
              </View>

              {/* About this role */}
              <View style={styles.aboutBox}>
                <Text style={styles.aboutTitle}>ABOUT THIS ROLE</Text>
                <Text style={styles.aboutBody}>
                  {(selectedJobForDetails as any).aboutText ||
                    (selectedJobForDetails as any).description ||
                    'Looking for reliable, verified household assistance in a safe, friendly home.'}
                </Text>
              </View>

              {/* Feedback summary */}
              <Text style={styles.feedbackTitle}>Worker Feedback Summary</Text>
              <View style={styles.feedbackRow}>
                <View style={[styles.feedbackCard, styles.feedbackPositive]}>
                  <Text style={[styles.feedbackValue, { color: '#00875A' }]}>72%</Text>
                  <Text style={[styles.feedbackLabel, { color: '#00875A' }]}>Positive</Text>
                </View>
                <View style={[styles.feedbackCard, styles.feedbackNeutral]}>
                  <Text style={[styles.feedbackValue, { color: '#5E6C84' }]}>18%</Text>
                  <Text style={[styles.feedbackLabel, { color: '#5E6C84' }]}>Neutral</Text>
                </View>
                <View style={[styles.feedbackCard, styles.feedbackNegative]}>
                  <Text style={[styles.feedbackValue, { color: '#DE350B' }]}>10%</Text>
                  <Text style={[styles.feedbackLabel, { color: '#DE350B' }]}>Negative</Text>
                </View>
              </View>

              {/* Compliance banner */}
              <View style={styles.complianceBox}>
                <Ionicons name="information-circle" size={18} color="#7C3AED" style={{ marginRight: 8, marginTop: 2 }} />
                <Text style={styles.complianceText}>
                  SerbiSure enforces fair wage compliance (₱9,000 meets RTWPB-10 minimum). Our Booking Frequency Cap prevents illegal misclassification of regular work as short-term gigs.
                </Text>
              </View>

              {/* Apply button */}
              <Pressable
                style={({ pressed }) => [
                  styles.applyNowBtn,
                  isApplied(selectedJobForDetails.id) && styles.applyNowBtnDone,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => handleApplyJob(selectedJobForDetails)}
              >
                <Text style={styles.applyNowText}>
                  {isApplied(selectedJobForDetails.id) ? 'Application Submitted' : 'Apply Now'}
                </Text>
              </Pressable>
              <Text style={styles.applyNotice}>Your application goes directly to the employer</Text>
            </View>
          )}
        </View>
      </Modal>

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
  greetingCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 6,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    borderRadius: 24,
  },
  greetingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greetingTextContainer: {
    flex: 1,
    paddingRight: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: THEME.typography.fontFamily.display,
    color: THEME.colors.ink,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: THEME.typography.fontFamily.secondaryRegular,
    color: THEME.colors.textSecondary,
    marginTop: 3,
  },
  filterIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterIconButtonActive: {
    backgroundColor: '#0D0D11',
  },
  subTabBar: {
    flexDirection: 'row',
    backgroundColor: '#F5F4F0',
    borderRadius: 9999,
    padding: 3,
    marginBottom: 14,
  },
  subTabPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  subTabPillActive: {
    backgroundColor: '#0D0D11',
  },
  subTabText: {
    fontSize: 12,
    fontFamily: THEME.typography.fontFamily.display,
    color: '#71717A',
  },
  subTabTextActive: {
    color: '#FFFFFF',
  },
  subTabCount: {
    fontSize: 11,
    fontFamily: THEME.typography.fontFamily.secondaryMedium,
    color: '#A1A1AA',
  },
  subTabCountActive: {
    color: '#FFB380',
  },
  filterScroll: {
    maxHeight: 46,
    marginBottom: 10,
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
    marginTop: 2,
  },
  stackedCard: {
    position: 'absolute',
    borderRadius: 24,
    overflow: 'hidden',
  },
  stackedCardFront: {
    width: SCREEN_WIDTH - 40,
    height: 380,
    zIndex: 10,
  },
  stackedCardMid: {
    width: SCREEN_WIDTH - 56,
    height: 380,
    top: -12,
    zIndex: 5,
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  stackedCardDeep: {
    width: SCREEN_WIDTH - 72,
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
    backgroundColor: 'rgba(0,0,0,0.42)',
    paddingVertical: 18,
    paddingHorizontal: 28,
  },
  cardInfoTop: {
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  employerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  employerPillAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
  },
  employerPillName: {
    color: '#FFF',
    fontSize: 12,
    fontFamily: THEME.typography.fontFamily.display,
  },
  cardBookmarkBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfoBottom: {},
  workerName: {
    fontSize: 22,
    fontFamily: THEME.typography.fontFamily.display,
    color: '#FFF',
    marginBottom: 4,
  },
  workerLocation: {
    fontSize: 13,
    color: THEME.colors.brand,
    fontFamily: THEME.typography.fontFamily.secondaryMedium,
    marginBottom: 6,
  },
  workerRole: {
    fontSize: 12,
    color: '#FFF',
    fontFamily: THEME.typography.fontFamily.secondaryRegular,
    marginBottom: 10,
    lineHeight: 16,
  },
  cardFooterActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 10,
    fontFamily: THEME.typography.fontFamily.secondaryMedium,
    color: THEME.colors.ink,
  },
  priceContainer: {
    alignItems: 'flex-start',
  },
  priceAmount: {
    fontSize: 18,
    fontFamily: THEME.typography.fontFamily.display,
    color: '#FFF',
  },
  priceUnit: {
    fontSize: 11,
    fontFamily: THEME.typography.fontFamily.secondaryRegular,
    color: '#FFF',
    opacity: 0.85,
  },
  seeDetailsBtn: {
    backgroundColor: THEME.colors.brand,
    borderRadius: THEME.roundness.pill,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seeDetailsBtnApplied: {
    backgroundColor: '#E8F8EE',
  },
  seeDetailsBtnText: {
    color: THEME.colors.ink,
    fontSize: 13,
    fontFamily: THEME.typography.fontFamily.display,
  },
  seeDetailsBtnTextApplied: {
    color: '#00875A',
  },
  emptyDeckCard: {
    width: SCREEN_WIDTH - 40,
    height: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: THEME.typography.fontFamily.display,
    color: THEME.colors.ink,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    fontFamily: THEME.typography.fontFamily.secondaryRegular,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  resetBtn: {
    backgroundColor: THEME.colors.brand,
    borderRadius: THEME.roundness.pill,
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  resetBtnText: {
    color: THEME.colors.ink,
    fontFamily: THEME.typography.fontFamily.display,
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
    paddingHorizontal: 2,
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
    fontFamily: THEME.typography.fontFamily.display,
    color: '#4CD964',
  },
  minusCountText: {
    fontSize: 13,
    fontFamily: THEME.typography.fontFamily.display,
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
  /* Activity Tab Views (Saved / Applied) */
  activityTabContainer: {
    flex: 1,
    paddingBottom: 40,
  },
  activityList: {
    paddingHorizontal: 20,
    gap: 12,
    paddingTop: 4,
  },
  activityJobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
  },
  activityJobHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  activityAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  activityEmployerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityEmployerName: {
    fontSize: 15,
    fontFamily: THEME.typography.fontFamily.display,
    color: THEME.colors.ink,
  },
  activityLocationText: {
    fontSize: 12,
    fontFamily: THEME.typography.fontFamily.secondaryRegular,
    color: THEME.colors.textSecondary,
    marginTop: 2,
    marginBottom: 6,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tagBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagRole: {
    backgroundColor: THEME.colors.ink,
  },
  tagRoleText: {
    color: THEME.colors.white,
    fontSize: 11,
    fontFamily: THEME.typography.fontFamily.secondaryMedium,
  },
  tagTerm: {
    backgroundColor: THEME.colors.brandLight,
  },
  tagTermText: {
    color: THEME.colors.brandDark,
    fontSize: 11,
    fontFamily: THEME.typography.fontFamily.secondaryMedium,
  },
  activityBookmarkBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityDivider: {
    height: 1,
    backgroundColor: '#F3F3F5',
    marginVertical: 12,
  },
  activityFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 16,
    fontFamily: THEME.typography.fontFamily.display,
    color: THEME.colors.ink,
  },
  unitText: {
    fontSize: 12,
    fontFamily: THEME.typography.fontFamily.secondaryRegular,
    color: THEME.colors.textMuted,
  },
  appliedStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F8EE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  appliedStatusText: {
    fontSize: 11,
    fontFamily: THEME.typography.fontFamily.secondaryMedium,
    color: '#00875A',
  },
  emptyActivityBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingVertical: 60,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: THEME.colors.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyActivityTitle: {
    fontSize: 18,
    fontFamily: THEME.typography.fontFamily.display,
    color: THEME.colors.ink,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyActivitySub: {
    fontSize: 13,
    fontFamily: THEME.typography.fontFamily.secondaryRegular,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  findJobsBtn: {
    backgroundColor: THEME.colors.brand,
    borderRadius: THEME.roundness.pill,
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  findJobsBtnText: {
    color: THEME.colors.ink,
    fontSize: 14,
    fontFamily: THEME.typography.fontFamily.display,
  },
  notSeeingBtn: {
    marginTop: 18,
  },
  notSeeingText: {
    color: THEME.colors.brandDark,
    fontSize: 13,
    fontFamily: THEME.typography.fontFamily.secondaryMedium,
    textAlign: 'center',
  },
  /* Role Details Modal Sheet */
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 36,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 14,
  },
  sheetTitleInfo: {
    flex: 1,
  },
  sheetEmployerName: {
    fontSize: 18,
    fontFamily: THEME.typography.fontFamily.display,
    color: THEME.colors.ink,
  },
  sheetLocation: {
    fontSize: 12,
    fontFamily: THEME.typography.fontFamily.secondaryRegular,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  sheetTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  sheetPostTime: {
    fontSize: 11,
    fontFamily: THEME.typography.fontFamily.secondaryRegular,
    color: THEME.colors.textMuted,
  },
  sheetBookmarkBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetPrice: {
    fontSize: 22,
    fontFamily: THEME.typography.fontFamily.display,
    color: THEME.colors.ink,
  },
  sheetUnit: {
    fontSize: 14,
    fontFamily: THEME.typography.fontFamily.secondaryRegular,
    color: THEME.colors.textSecondary,
  },
  aboutBox: {
    backgroundColor: THEME.colors.brandLight,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  aboutTitle: {
    fontSize: 12,
    fontFamily: THEME.typography.fontFamily.display,
    color: THEME.colors.brandDark,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  aboutBody: {
    fontSize: 13,
    fontFamily: THEME.typography.fontFamily.secondaryRegular,
    color: THEME.colors.ink,
    lineHeight: 20,
  },
  feedbackTitle: {
    fontSize: 14,
    fontFamily: THEME.typography.fontFamily.display,
    color: THEME.colors.ink,
    marginBottom: 8,
  },
  feedbackRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  feedbackCard: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  feedbackPositive: {
    backgroundColor: '#E8F8EE',
  },
  feedbackNeutral: {
    backgroundColor: '#F4F5F7',
  },
  feedbackNegative: {
    backgroundColor: '#FEE2E2',
  },
  feedbackValue: {
    fontSize: 16,
    fontFamily: THEME.typography.fontFamily.display,
  },
  feedbackLabel: {
    fontSize: 10,
    fontFamily: THEME.typography.fontFamily.secondaryMedium,
    marginTop: 2,
  },
  complianceBox: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.canvas,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  complianceText: {
    flex: 1,
    fontSize: 11,
    fontFamily: THEME.typography.fontFamily.secondaryRegular,
    color: THEME.colors.textSecondary,
    lineHeight: 15,
  },
  applyNowBtn: {
    backgroundColor: THEME.colors.ink,
    borderRadius: THEME.roundness.pill,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  applyNowBtnDone: {
    backgroundColor: '#10B981',
  },
  applyNowText: {
    color: THEME.colors.white,
    fontSize: 15,
    fontFamily: THEME.typography.fontFamily.display,
  },
  applyNotice: {
    fontSize: 11,
    fontFamily: THEME.typography.fontFamily.secondaryRegular,
    color: THEME.colors.textMuted,
    textAlign: 'center',
  },
  /* Skeletons */
  skeletonStackDeep: {
    position: 'absolute',
    width: SCREEN_WIDTH - 72,
    height: 380,
    borderRadius: 24,
    backgroundColor: '#D8DDE8',
    zIndex: 2,
    transform: [{ scale: 0.92 }],
    top: -24,
  },
  skeletonStackMid: {
    position: 'absolute',
    width: SCREEN_WIDTH - 56,
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
    width: SCREEN_WIDTH - 40,
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
