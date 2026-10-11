import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';
import { useUser } from '../../context/UserContext';
import THEME from '../../config/theme';
import { NotificationBell } from '../../context/NotificationContext';
import { API_BASE_URL, fetchWithTimeout } from '../../config/api';
import { formatBookingLocationShort } from '../../api/bookingApi';
import { UserProfileModal } from '../UserProfileModal';
import { ChatDetailScreen } from '../ChatDetailScreen';
import { JobDetailSheet } from '../../components/JobDetailSheet';
import { useJobsActivity } from '../../store/savedJobsStore';
import { HomeFeedFilters, HomeFeedHeader, HomeFeedEmptyState, HomeFeedLoadingState } from '../../components/HomeFeedControls';
import { HomeFeedCategory, matchesHomeFeedFilters } from '../../utils/homeFeedFilters';

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

export function HomeScreen({
  avatarUri,
  onAvatarPress,
  onViewAll,
  token,
}: {
  avatarUri?: string | null;
  onAvatarPress?: () => void;
  onViewProfile?: () => void;
  onViewAll?: () => void;
  token?: string | null;
}) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { user, getFirstNameOnly } = useUser();
  const effectiveToken = token || user?.token;

  const { isSaved, isClosed, toggleSave, refreshSavedFromBackend } = useJobsActivity();

  const [posts, setPosts] = useState<KasambahayPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<HomeFeedCategory | null>(null);

  // Modals state
  const [selectedKasambahay, setSelectedKasambahay] = useState<KasambahayPost | null>(null);
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
  const [selectedPostForDetail, setSelectedPostForDetail] = useState<KasambahayPost | null>(null);
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

  const detailJobData = selectedPostForDetail
    ? {
      id: selectedPostForDetail.id,
      partnerId: selectedPostForDetail.partnerId,
      employerName: selectedPostForDetail.name,
      avatar: selectedPostForDetail.avatar,
      time: selectedPostForDetail.time,
      location: selectedPostForDetail.location,
      roleTag: selectedPostForDetail.role,
      termTag: selectedPostForDetail.termTag,
      price: selectedPostForDetail.rate,
      unit: selectedPostForDetail.rateUnit,
      aboutText: selectedPostForDetail.description,
      tags: selectedPostForDetail.tags,
    }
    : null;

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
      setPosts([]);
    } catch (error) {
      console.warn('[HomeownerHomeScreen] Could not load live feed', error);
      setPosts([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchKasambahayPosts();
    if (effectiveToken) {
      refreshSavedFromBackend(effectiveToken);
    }
  }, [effectiveToken]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      fetchKasambahayPosts(),
      effectiveToken ? refreshSavedFromBackend(effectiveToken) : Promise.resolve(),
    ]);
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

  const handleToggleSavePost = (post: KasambahayPost) => {
    toggleSave({
      id: post.id,
      employerName: post.name,
      title: post.role,
      avatar: post.avatar,
      location: post.location,
      roleTag: post.role,
      termTag: post.termTag,
      price: post.rate,
      unit: post.rateUnit,
      aboutText: post.description,
      tags: post.tags,
      image: post.avatar,
    }, effectiveToken);
  };

  const filteredPosts = posts.filter((post) => {
    if (isClosed(post.id) || (post.partnerId && isClosed(post.partnerId))) return false;
    return matchesHomeFeedFilters(
      [...post.categories, post.role, ...post.tags],
      [post.name, post.location, post.description, post.termTag],
      selectedCategory,
      searchQuery,
    );
  });

  const hasActiveFilters = !!selectedCategory || searchQuery.trim().length > 0;
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
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
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

        <HomeFeedFilters
          placeholder={t.searchWorkers}
          searchQuery={searchQuery}
          selectedCategory={selectedCategory}
          onSearchChange={setSearchQuery}
          onCategoryChange={setSelectedCategory}
        />
        <HomeFeedHeader onViewAll={onViewAll} />

        {/* Posts List */}
        <View style={styles.workerList}>
          {isLoading ? (
            <HomeFeedLoadingState />
          ) : filteredPosts.length === 0 ? (
            <HomeFeedEmptyState
              role="homeowner"
              hasActiveFilters={hasActiveFilters}
              onResetFilters={() => { setSelectedCategory(null); setSearchQuery(''); }}
            />
          ) : (
            filteredPosts.map((post) => (
              <View key={post.id} style={styles.workerCard}>
                {/* Header: Avatar, Name, Role Tag, Time & Bookmark */}
                <View style={styles.workerHeader}>
                  <Pressable
                    style={styles.workerHeaderLeft}
                    onPress={() => handleOpenKasambahayProfile(post)}
                    hitSlop={6}
                  >
                    <Image source={{ uri: post.avatar }} style={styles.workerAvatar} />
                    <View style={styles.workerInfo}>
                      <View style={styles.workerNameRow}>
                        <Text style={styles.workerName}>{post.name}</Text>
                      </View>
                      <View style={styles.roleRow}>
                        <View style={styles.roleBadge}>
                          <Text style={styles.roleBadgeText}>{post.role}</Text>
                        </View>
                        <Text style={styles.workerTime}>{post.time}</Text>
                      </View>
                    </View>
                  </Pressable>

                  {/* Bookmark Button in Top Right Corner */}
                  <Pressable
                    style={styles.bookmarkBtn}
                    onPress={() => handleToggleSavePost(post)}
                    hitSlop={10}
                  >
                    <Ionicons
                      name={isSaved(post.id) ? "bookmark" : "bookmark-outline"}
                      size={22}
                      color={THEME.colors.ink}
                    />
                  </Pressable>
                </View>

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

                {/* Card Action Buttons: View Profile & See Details */}
                <View style={styles.cardActionsRow}>
                  <Pressable
                    style={styles.viewProfileBtn}
                    onPress={() => handleOpenKasambahayProfile(post)}
                  >
                    <Text style={styles.viewProfileText}>View Profile</Text>
                  </Pressable>
                  <Pressable
                    style={styles.seeDetailsBtn}
                    onPress={() => setSelectedPostForDetail(post)}
                  >
                    <Text style={styles.seeDetailsBtnText}>See Details</Text>
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

      {/* Kasambahay Post Details Modal Sheet */}
      <JobDetailSheet
        visible={!!selectedPostForDetail}
        job={detailJobData}
        onClose={() => setSelectedPostForDetail(null)}
        onApply={() => {
          if (selectedPostForDetail) {
            const target = selectedPostForDetail;
            setSelectedPostForDetail(null);
            handleOpenMessage(target);
          }
        }}
        isApplied={false}
        isSaved={selectedPostForDetail ? isSaved(selectedPostForDetail.id) : false}
        onToggleSave={() => {
          if (selectedPostForDetail) {
            handleToggleSavePost(selectedPostForDetail);
          }
        }}
        ctaText="Message Kasambahay"
        ctaNotice="Start a direct chat with this kasambahay"
        token={effectiveToken}
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
  workerList: {
    paddingHorizontal: 20,
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
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  workerHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bookmarkBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
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
  seeDetailsBtn: {
    flex: 1,
    backgroundColor: '#FFB43B',
    borderRadius: THEME.roundness.pill,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seeDetailsBtnText: {
    color: '#FFFFFF',
    fontFamily: THEME.typography.fontFamily.display,
    fontSize: 12.5,
  },
});
