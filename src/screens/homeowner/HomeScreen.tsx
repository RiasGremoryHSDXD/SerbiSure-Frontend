import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  ScrollView,
  TextInput,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';
import { useUser } from '../../context/UserContext';
import THEME from '../../config/theme';
import { NotificationBell } from '../../context/NotificationContext';
import { API_BASE_URL, fetchWithTimeout } from '../../config/api';
import { formatBookingLocationShort } from '../../api/bookingApi';
import { UserProfileModal } from '../UserProfileModal';
import { ChatDetailScreen } from '../ChatDetailScreen';

const logoSource = require('../../../assets/serbisure_new_clean.png');

export interface KasambahayPost {
  id: string | number;
  partnerId?: string | number;
  name: string;
  avatar: string;
  role: string;
  categories: string[];
  termTag: string;
  rate: string;
  rateUnit: string;
  location: string;
  time: string;
  description: string;
  tags: string[];
}

function formatTimeAgo(dateString?: string) {
  if (!dateString) return 'Recently';
  const now = new Date().getTime();
  const created = new Date(dateString).getTime();
  if (isNaN(created)) return 'Recently';
  const diffMs = Math.max(0, now - created);
  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 60) return `Posted ${Math.max(1, diffMins)}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `Posted ${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `Posted ${diffDays}d ago`;
}

const CATEGORIES = [
  {
    key: 'Child Care',
    label: 'Child Care',
    icon: 'face-woman-outline' as const,
    matchKeys: ['child_care', 'child care', 'babysitter', 'baby sitter', 'nanny'],
  },
  {
    key: 'Cook',
    label: 'Cook',
    icon: 'silverware-fork-knife' as const,
    matchKeys: ['cooking', 'cook', 'chef', 'kitchen'],
  },
  {
    key: 'Cleaner',
    label: 'Cleaner',
    icon: 'broom' as const,
    matchKeys: ['cleaning', 'cleaner', 'clean', 'housekeeping', 'maid'],
  },
  {
    key: 'Laundry',
    label: 'Laundry',
    icon: 'washing-machine' as const,
    matchKeys: ['laundry', 'wash', 'labada', 'ironing'],
  },
];

// Fallback sample posts if backend feed is empty or offline
const FALLBACK_POSTS: KasambahayPost[] = [
  {
    id: 'sample-1',
    partnerId: 'sample-p1',
    name: 'Liza Soriano',
    avatar: 'https://i.pravatar.cc/150?u=liza',
    role: 'Child Care',
    categories: ['Child Care'],
    termTag: 'Stay-in',
    rate: '₱500',
    rateUnit: '/ day',
    location: 'Nazareth, Cagayan de Oro',
    time: 'Posted 2h ago',
    description: 'Experienced child caregiver with 5 years experience handling toddlers and infants. CPR & First-Aid certified.',
    tags: ['Child Care', 'Stay-in', 'Verified'],
  },
  {
    id: 'sample-2',
    partnerId: 'sample-p2',
    name: 'Bald Seki',
    avatar: 'https://i.pravatar.cc/150?u=bald',
    role: 'Cook',
    categories: ['Cook'],
    termTag: 'Part-time',
    rate: '₱600',
    rateUnit: '/ day',
    location: 'Macasandig, Cagayan de Oro',
    time: 'Posted 5h ago',
    description: 'Specializes in Filipino and Asian cuisine, meal prep, grocery planning, and kitchen sanitization.',
    tags: ['Cook', 'Part-time', 'Verified'],
  },
  {
    id: 'sample-3',
    partnerId: 'sample-p3',
    name: 'Elena Santos',
    avatar: 'https://i.pravatar.cc/150?u=elena',
    role: 'Cleaner',
    categories: ['Cleaner'],
    termTag: 'Part-time',
    rate: '₱450',
    rateUnit: '/ day',
    location: 'Carmen, Cagayan de Oro',
    time: 'Posted 1d ago',
    description: 'Detail-oriented cleaner available for deep cleaning, sanitation, dusting, and room organization.',
    tags: ['Cleaner', 'Part-time', 'Verified'],
  },
  {
    id: 'sample-4',
    partnerId: 'sample-p4',
    name: 'Rowena Cruz',
    avatar: 'https://i.pravatar.cc/150?u=rowena',
    role: 'Laundry',
    categories: ['Laundry'],
    termTag: 'Part-time',
    rate: '₱400',
    rateUnit: '/ day',
    location: 'Lapasan, Cagayan de Oro',
    time: 'Posted 1d ago',
    description: 'Fast, gentle garment washing, delicate hand-wash, and crisp fabric ironing service.',
    tags: ['Laundry', 'Part-time', 'Verified'],
  },
];

export function HomeScreen({
  avatarUri,
  onAvatarPress,
  token,
}: {
  avatarUri?: string | null;
  onAvatarPress?: () => void;
  onViewProfile?: () => void;
  token?: string | null;
}) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { user, getFirstNameOnly } = useUser();
  const effectiveToken = token || user?.token;

  const [posts, setPosts] = useState<KasambahayPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Modals state
  const [selectedKasambahay, setSelectedKasambahay] = useState<KasambahayPost | null>(null);
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
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

  const fetchKasambahayPosts = async () => {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/booking/feed/`, {
        headers: effectiveToken ? { Authorization: `Bearer ${effectiveToken}` } : {},
      });

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          const livePosts: KasambahayPost[] = data.map((item: any) => {
            const rawCategories = Array.isArray(item.service_category)
              ? item.service_category
              : item.service_category
              ? [item.service_category]
              : ['General Service'];

            const categoryMap: Record<string, string> = {
              Cleaning: 'Cleaner',
              Child_care: 'Child Care',
              Cooking: 'Cook',
              Caregiver: 'Caregiver',
              Laundry: 'Laundry',
              'All-around': 'All-around',
            };

            const categories = rawCategories.map((c: string) => categoryMap[c] || c.replace(/_/g, ' '));
            const avatarUrl =
              item.profile_link ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || 'Kasambahay')}&background=FFB43B&color=fff`;

            const isLongTerm = item.booking_type === 'long_term';
            const termTag = isLongTerm ? 'Stay-in' : 'Part-time';
            const rateUnit = isLongTerm ? '/ month' : '/ day';
            const location = formatBookingLocationShort(item, 'Cagayan de Oro');

            return {
              id: item.booking_id,
              partnerId: item.poster_id,
              name: item.name || 'Kasambahay Worker',
              avatar: avatarUrl,
              role: categories[0] || 'Kasambahay',
              categories,
              termTag,
              rate: `₱${item.daily_rate || '0'}`,
              rateUnit,
              location,
              time: formatTimeAgo(item.createdAt),
              description: item.special_instruction ? item.special_instruction.trim() : `Available for ${categories.join(' & ')} work in ${location}.`,
              tags: [...categories, termTag],
            };
          });

          setPosts(livePosts);
          return;
        }
      }
      // If API returned empty array, use fallback sample posts
      setPosts(FALLBACK_POSTS);
    } catch (error) {
      console.warn('[HomeownerHomeScreen] Could not load live feed, using fallback', error);
      setPosts(FALLBACK_POSTS);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchKasambahayPosts();
  }, [effectiveToken]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchKasambahayPosts();
  };

  const handleCategoryPress = (catKey: string) => {
    if (selectedCategory === catKey) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(catKey);
    }
  };

  const handleOpenKasambahayProfile = (post: KasambahayPost) => {
    setSelectedKasambahay(post);
    setIsProfileModalVisible(true);
  };

  const handleOpenMessage = (post: KasambahayPost) => {
    setActiveChat({
      visible: true,
      partnerId: post.partnerId ? String(post.partnerId) : undefined,
      name: post.name,
      role: post.role,
      avatar: post.avatar,
      initialMessage: `Hello ${post.name}! I saw your post on SerbiSure for ${post.role} (${post.termTag}) and would like to ask about your availability.`,
    });
  };

  // Filter posts based on active category & search query
  const filteredPosts = posts.filter((post) => {
    if (selectedCategory) {
      const catConfig = CATEGORIES.find((c) => c.key === selectedCategory);
      if (catConfig) {
        const postTagsLower = [
          ...post.categories.map((c) => c.toLowerCase()),
          post.role.toLowerCase(),
          ...post.tags.map((t) => t.toLowerCase()),
        ];
        const matchesCategory =
          catConfig.matchKeys.some((k) => postTagsLower.some((t) => t.includes(k))) ||
          postTagsLower.some((t) => t.includes('all-around'));
        if (!matchesCategory) return false;
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchesName = post.name.toLowerCase().includes(q);
      const matchesRole = post.role.toLowerCase().includes(q);
      const matchesLoc = post.location.toLowerCase().includes(q);
      const matchesDesc = post.description.toLowerCase().includes(q);
      const matchesCategories = post.categories.some((c) => c.toLowerCase().includes(q));
      const matchesTags = post.tags.some((t) => t.toLowerCase().includes(q));

      if (!matchesName && !matchesRole && !matchesLoc && !matchesDesc && !matchesCategories && !matchesTags) {
        return false;
      }
    }

    return true;
  });

  const today = new Date();
  const dateString = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();

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
        <View style={styles.header}>
          <View style={styles.headerSide} />
          <Image source={logoSource} style={styles.logo} resizeMode="contain" />
          <View style={[styles.headerSide, styles.headerSideRight]}>
            <NotificationBell />
          </View>
        </View>

        {/* Greeting Card */}
        <View style={styles.greetingCard}>
          <Pressable onPress={onAvatarPress}>
            <Image
              source={{ uri: avatarUri || 'https://i.pravatar.cc/150?u=serbisure' }}
              style={styles.avatar}
            />
          </Pressable>
          <View style={styles.greetingTextContainer}>
            <Text style={styles.dateText}>{dateString}</Text>
            <Text style={styles.greetingText} numberOfLines={1} adjustsFontSizeToFit>
              {t.greeting}, {getFirstNameOnly()}!
            </Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={THEME.colors.textMuted} style={styles.searchIcon} />
          <TextInput
            placeholder={t.searchPlaceholder || 'Search services, kasambahay, location...'}
            placeholderTextColor={THEME.colors.textMuted}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </Pressable>
          )}
        </View>

        {/* Categories Grid (Interactive Filter Buttons) */}
        <View style={styles.categoriesContainer}>
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.key;
            return (
              <Pressable
                key={cat.key}
                style={[
                  styles.categoryItem,
                  isActive && styles.categoryItemActive,
                ]}
                onPress={() => handleCategoryPress(cat.key)}
              >
                <View style={[styles.categoryIconCircle, isActive && styles.categoryIconCircleActive]}>
                  <MaterialCommunityIcons
                    name={cat.icon}
                    size={26}
                    color={isActive ? '#FFFFFF' : '#0D0D11'}
                  />
                </View>
                <Text
                  style={[styles.categoryLabel, isActive && styles.categoryLabelActive]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Active Filter Indicator Bar */}
        {(selectedCategory || searchQuery.trim().length > 0) && (
          <View style={styles.activeFilterBanner}>
            <View style={styles.activeFilterInfo}>
              <Ionicons name="funnel" size={13} color="#FFB43B" style={{ marginRight: 6 }} />
              <Text style={styles.activeFilterText}>
                {selectedCategory ? `Filter: ${selectedCategory}` : ''}
                {selectedCategory && searchQuery.trim() ? ' • ' : ''}
                {searchQuery.trim() ? `"${searchQuery.trim()}"` : ''}
              </Text>
            </View>
            <Pressable
              onPress={() => {
                setSelectedCategory(null);
                setSearchQuery('');
              }}
              style={styles.clearFilterBtn}
              hitSlop={8}
            >
              <Text style={styles.clearFilterBtnText}>Show All</Text>
              <Ionicons name="close-circle" size={15} color="#FFB43B" />
            </Pressable>
          </View>
        )}

        {/* Recent Posts from Kasambahays Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle} numberOfLines={1} adjustsFontSizeToFit>
            Recent Posts
          </Text>
          <Text style={styles.seeAllText}>
            {filteredPosts.length} available
          </Text>
        </View>

        {/* Posts List */}
        <View style={styles.workerList}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FFB43B" />
              <Text style={styles.loadingText}>Loading recent posts...</Text>
            </View>
          ) : filteredPosts.length === 0 ? (
            <View style={styles.emptyStateCard}>
              <Ionicons name="search-outline" size={48} color="#D1D5DB" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyStateTitle}>No posts found</Text>
              <Text style={styles.emptyStateSub}>
                {selectedCategory || searchQuery
                  ? 'No kasambahays match your current filter. Try searching for other services or clear filters.'
                  : 'There are no active postings at the moment. Check back soon!'}
              </Text>
              {(selectedCategory || searchQuery.length > 0) && (
                <Pressable
                  style={styles.resetFilterBtn}
                  onPress={() => {
                    setSelectedCategory(null);
                    setSearchQuery('');
                  }}
                >
                  <Text style={styles.resetFilterBtnText}>Reset Filters</Text>
                </Pressable>
              )}
            </View>
          ) : (
            filteredPosts.map((post) => (
              <View key={post.id} style={styles.workerCard}>
                {/* Header: Avatar, Name, Role Tag, Time */}
                <Pressable style={styles.workerHeader} onPress={() => handleOpenKasambahayProfile(post)}>
                  <Image source={{ uri: post.avatar }} style={styles.workerAvatar} />
                  <View style={styles.workerInfo}>
                    <View style={styles.workerNameRow}>
                      <Text style={styles.workerName}>{post.name}</Text>
                      <Ionicons name="checkmark-circle" size={16} color="#4CAF50" style={{ marginLeft: 4 }} />
                    </View>
                    <View style={styles.roleRow}>
                      <View style={styles.roleBadge}>
                        <Text style={styles.roleBadgeText}>{post.role}</Text>
                      </View>
                      <Text style={styles.workerTime}>{post.time}</Text>
                    </View>
                  </View>
                </Pressable>

                {/* Details Pills: Location, Term, Rate */}
                <View style={styles.metaRow}>
                  <View style={styles.metaBadge}>
                    <Ionicons name="location-sharp" size={12} color="#6B7280" style={{ marginRight: 3 }} />
                    <Text style={styles.metaBadgeText}>{post.location}</Text>
                  </View>
                  <View style={styles.metaBadge}>
                    <Ionicons name="briefcase-outline" size={12} color="#6B7280" style={{ marginRight: 3 }} />
                    <Text style={styles.metaBadgeText}>{post.termTag}</Text>
                  </View>
                  <View style={styles.rateBadge}>
                    <Text style={styles.rateBadgeAmount}>{post.rate}</Text>
                    <Text style={styles.rateBadgeUnit}> {post.rateUnit}</Text>
                  </View>
                </View>

                {/* Description snippet */}
                {post.description ? (
                  <Text style={styles.descriptionText} numberOfLines={2}>
                    {post.description}
                  </Text>
                ) : null}

                {/* Card Action Buttons: View Profile & Message */}
                <View style={styles.cardActionsRow}>
                  <Pressable
                    style={styles.viewProfileBtn}
                    onPress={() => handleOpenKasambahayProfile(post)}
                  >
                    <Text style={styles.viewProfileText}>View Profile</Text>
                  </Pressable>
                  <Pressable
                    style={styles.messageBtn}
                    onPress={() => handleOpenMessage(post)}
                  >
                    <Ionicons name="chatbubble-ellipses" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.messageBtnText}>Message</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Bottom padding to account for floating tab bar */}
        <View style={{ height: 110 }} />
      </ScrollView>

      {/* User Profile Modal */}
      {selectedKasambahay && (
        <UserProfileModal
          visible={isProfileModalVisible}
          onClose={() => setIsProfileModalVisible(false)}
          userId={selectedKasambahay.partnerId ? String(selectedKasambahay.partnerId) : undefined}
          token={effectiveToken}
          prefilledName={selectedKasambahay.name}
          prefilledAvatar={selectedKasambahay.avatar}
          prefilledRole={selectedKasambahay.role}
        />
      )}

      {/* Messenger-style Chat Detail Modal */}
      <ChatDetailScreen
        visible={activeChat.visible}
        onClose={() => setActiveChat((prev) => ({ ...prev, visible: false }))}
        partnerId={activeChat.partnerId}
        token={effectiveToken || ''}
        contactName={activeChat.name}
        contactRole={activeChat.role}
        contactAvatar={activeChat.avatar}
        initialMessage={activeChat.initialMessage}
        userRole="homeowner"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.canvas,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
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
    backgroundColor: THEME.colors.white,
    marginHorizontal: 20,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 14,
  },
  greetingTextContainer: {
    flex: 1,
  },
  dateText: {
    fontSize: 10.5,
    fontFamily: THEME.typography.fontFamily.secondaryMedium,
    color: THEME.colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  greetingText: {
    fontSize: 19,
    fontFamily: THEME.typography.fontFamily.display,
    color: THEME.colors.ink,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.roundness.pill,
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 10,
    paddingHorizontal: 18,
    height: 48,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: THEME.typography.fontFamily.bodyMedium,
    color: THEME.colors.ink,
  },
  categoriesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  categoryItem: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.white,
    borderRadius: 22,
    padding: 6,
  },
  categoryItemActive: {
    backgroundColor: '#FFB43B',
  },
  categoryIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIconCircleActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  categoryLabel: {
    marginTop: 4,
    fontSize: 10.5,
    fontFamily: THEME.typography.fontFamily.secondaryMedium,
    color: THEME.colors.ink,
    textAlign: 'center',
  },
  categoryLabelActive: {
    color: '#FFFFFF',
    fontFamily: THEME.typography.fontFamily.display,
    fontWeight: '700',
  },
  activeFilterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF8EC',
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
  },
  activeFilterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  activeFilterText: {
    fontSize: 12,
    fontFamily: THEME.typography.fontFamily.secondarySemiBold,
    color: '#B45309',
  },
  clearFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  clearFilterBtnText: {
    fontSize: 11.5,
    fontFamily: THEME.typography.fontFamily.secondaryBold,
    color: '#B45309',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 14,
    marginBottom: 14,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 21,
    fontFamily: THEME.typography.fontFamily.display,
    color: THEME.colors.ink,
    marginRight: 12,
  },
  seeAllText: {
    flexShrink: 0,
    fontSize: 12.5,
    color: THEME.colors.brandDark,
    fontFamily: THEME.typography.fontFamily.secondarySemiBold,
  },
  workerList: {
    paddingHorizontal: 20,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    fontFamily: THEME.typography.fontFamily.secondaryMedium,
    color: THEME.colors.textMuted,
  },
  emptyStateCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  emptyStateTitle: {
    fontSize: 17,
    fontFamily: THEME.typography.fontFamily.display,
    color: THEME.colors.ink,
    marginBottom: 6,
  },
  emptyStateSub: {
    fontSize: 12.5,
    fontFamily: THEME.typography.fontFamily.secondaryRegular,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  resetFilterBtn: {
    backgroundColor: '#FFB43B',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: THEME.roundness.pill,
  },
  resetFilterBtnText: {
    color: '#FFFFFF',
    fontFamily: THEME.typography.fontFamily.display,
    fontSize: 12.5,
  },
  workerCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.roundness.card,
    padding: 18,
    marginBottom: 14,
  },
  workerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  workerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: '#E5E7EB',
  },
  workerInfo: {
    flex: 1,
  },
  workerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  workerName: {
    fontSize: 16,
    fontFamily: THEME.typography.fontFamily.display,
    color: THEME.colors.ink,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleBadge: {
    backgroundColor: '#FFF4E5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  roleBadgeText: {
    fontSize: 11,
    fontFamily: THEME.typography.fontFamily.secondaryBold,
    color: '#D97706',
  },
  workerTime: {
    fontSize: 11,
    fontFamily: THEME.typography.fontFamily.secondaryRegular,
    color: THEME.colors.textMuted,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metaBadgeText: {
    fontSize: 11,
    fontFamily: THEME.typography.fontFamily.secondaryMedium,
    color: '#4B5563',
  },
  rateBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 'auto',
  },
  rateBadgeAmount: {
    fontSize: 12,
    fontFamily: THEME.typography.fontFamily.display,
    color: '#059669',
    fontWeight: '800',
  },
  rateBadgeUnit: {
    fontSize: 10,
    fontFamily: THEME.typography.fontFamily.secondaryRegular,
    color: '#059669',
  },
  descriptionText: {
    fontSize: 12.5,
    fontFamily: THEME.typography.fontFamily.secondaryRegular,
    color: '#4B5563',
    lineHeight: 18,
    marginBottom: 14,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  viewProfileBtn: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: THEME.roundness.pill,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewProfileText: {
    color: '#111827',
    fontFamily: THEME.typography.fontFamily.display,
    fontSize: 12.5,
  },
  messageBtn: {
    flex: 1,
    backgroundColor: '#FFB43B',
    borderRadius: THEME.roundness.pill,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBtnText: {
    color: '#FFFFFF',
    fontFamily: THEME.typography.fontFamily.display,
    fontSize: 12.5,
  },
});
