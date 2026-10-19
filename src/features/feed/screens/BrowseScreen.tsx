import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ROLE_CONFIG, type Role } from '../../../app/roleConfig';
import { useLanguage } from '../../../shared/localization/LanguageContext';
import { AppHeader } from '../../../shared/components/AppHeader';
import THEME from '../../../shared/theme/theme';
import { useUser } from '../../auth/session/UserContext';
import { useJobsActivity, type SavedJobItem } from '../../bookings/store/savedJobsStore';
import { ChatDetailScreen } from '../../chat/components/ChatDetailScreen';
import { chatStore } from '../../chat/store/chatStore';
import { NotificationBell } from '../../notifications/NotificationContext';
import { UserProfileModal } from '../../profile/components/UserProfileModal';
import { BrowseActivityCard } from '../components/BrowseActivityCard';
import { BrowseHeader, BrowseFilters } from '../components/BrowseHeader';
import { BrowsePostCard, BrowseCardBackdrop } from '../components/BrowsePostCard';
import { BrowseDeckEmpty, BrowseDeckSkeleton, BrowseDeckSwipeControls, BrowseEmptyState, browseDeckStyles as deckStyles } from '../components/BrowseDeck';
import { FilterModal, DEFAULT_FILTERS, type FeedFilters } from '../components/FilterModal';
import { JobDetailSheet } from '../components/JobDetailSheet';
import { activeBrowseChip, quickBrowseFilters, countBrowseFilters, browseHeaderCopy, type BrowseTab } from '../browsePresentation';
import { mapBrowsePost } from '../feedMapper';
import { useBrowseSwipeDeck } from '../hooks/useBrowseSwipeDeck';
import { useExploreFeed } from '../hooks/useExploreFeed';
import type { BookingFeedDto } from '../types';

interface Props {
  role: Role;
  avatarUri?: string | null;
  onViewProfile?: () => void;
  token?: string | null;
}

interface ActiveChat {
  partnerId: string;
  name: string;
  role: string;
  avatar: string;
  initialMessage: string;
  initialReplyTo?: { author: string; text: string };
}

export function BrowseScreen({ role, avatarUri, onViewProfile, token }: Props) {
  const { tr: uiText } = useLanguage();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const effectiveToken = token || user.token;
  const findingJobs = role === 'kasambahay';
  const partnerRole = ROLE_CONFIG[role].partnerType;
  const mapPost = useCallback((item: BookingFeedDto) => mapBrowsePost(item, role), [role]);
  const { items, setItems, isLoading, error: feedError, fetchItems, fetchedCount } = useExploreFeed(role, effectiveToken, mapPost);
  const [filters, setFilters] = useState<FeedFilters>(DEFAULT_FILTERS);
  const [filterVisible, setFilterVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [subTab, setSubTab] = useState<BrowseTab>('explore');
  const [selectedPost, setSelectedPost] = useState<SavedJobItem | null>(null);
  const [profilePost, setProfilePost] = useState<SavedJobItem | null>(null);
  const [activeChat, setActiveChat] = useState<ActiveChat | null>(null);
  const { savedJobs, savedLoadError, loadingSaved, appliedJobs, savedCount, appliedCount,
    isSaved, isApplied, isJobClosed, toggleSave, refreshSavedFromBackend } = useJobsActivity();
  const visiblePosts = findingJobs ? items.filter(post => !isJobClosed(post)) : items;
  const currentPost = useRef<SavedJobItem | undefined>(undefined);
  currentPost.current = visiblePosts[0];

  const contactPost = (post: SavedJobItem, quote = false) => {
    if (!post.partnerId) return;
    const partnerId = String(post.partnerId);
    const name = post.employerName || partnerRole;
    const contactRole = findingJobs ? partnerRole : post.roleTag || partnerRole;
    const initialMessage = findingJobs ? 'I am interested in this job position' : 'Hi! I am interested in hiring you for a service.';
    const snippet = [post.roleTag || post.title, `${post.price} ${post.unit}`.trim(), post.location, post.termTag].filter(Boolean).join(' • ');
    chatStore.addOrUpdateChat({ id: partnerId, partnerId, name, badge: contactRole, avatar: post.avatar, time: 'Just now', message: initialMessage });
    setSelectedPost(null);
    setActiveChat({ partnerId, name, role: contactRole, avatar: post.avatar, initialMessage,
      initialReplyTo: findingJobs || quote ? { author: findingJobs ? 'Job Post' : 'Service Post', text: snippet } : undefined });
  };

  const removeCurrentCard = (interested: boolean) => {
    const post = currentPost.current;
    if (!post) return;
    if (interested) contactPost(post, true);
    setItems(previous => previous.filter(item => item.id !== post.id));
  };
  const { position, rotateCard, panHandlers, swipeCard } = useBrowseSwipeDeck(
    subTab === 'explore' && !isLoading && !feedError ? visiblePosts[0]?.id : undefined, removeCurrentCard);

  const fetchFeed = async (forceRefresh = false, selectedFilters = filters) => {
    const loaded = await fetchItems(forceRefresh, selectedFilters);
    if (loaded) position.setValue({ x: 0, y: 0 });
  };
  const applyFilters = (updated: FeedFilters) => {
    setFilters(updated);
    void fetchFeed(true, updated);
  };
  const refresh = async () => {
    setIsRefreshing(true);
    try {
      position.setValue({ x: 0, y: 0 });
      await Promise.all([fetchFeed(true), effectiveToken ? refreshSavedFromBackend(effectiveToken) : Promise.resolve()]);
    } finally { setIsRefreshing(false); }
  };

  useEffect(() => {
    setFilters(DEFAULT_FILTERS); setSubTab('explore'); setSelectedPost(null); setProfilePost(null); setActiveChat(null); setFilterVisible(false);
    void fetchFeed(false, DEFAULT_FILTERS);
    if (effectiveToken) void refreshSavedFromBackend(effectiveToken);
  }, [role, effectiveToken]);
  useEffect(() => {
    if (subTab === 'saved' && effectiveToken) void refreshSavedFromBackend(effectiveToken);
  }, [subTab, effectiveToken]);

  const activeFilterCount = countBrowseFilters(filters);
  const activityPosts = subTab === 'applied' ? appliedJobs : savedJobs;
  const headerCopy = browseHeaderCopy(role, subTab, subTab === 'explore' ? visiblePosts.length : subTab === 'saved' ? savedCount : appliedCount, isLoading, feedError, uiText);
  const [card0, card1, card2] = visiblePosts;
  const detailsClosed = findingJobs && !!selectedPost && isJobClosed(selectedPost);
  const openProfile = (post: SavedJobItem) => { if (post.partnerId) setProfilePost(post); };

  return <View style={styles.container}>
    <View style={{ height: insets.top, backgroundColor: THEME.colors.canvas, zIndex: 10 }} />
    <ScrollView style={{ flex: 1, backgroundColor: THEME.colors.canvas }} contentContainerStyle={{ paddingTop: 8, paddingBottom: 140 }}
      showsVerticalScrollIndicator={false} alwaysBounceVertical
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} colors={[THEME.colors.brandDark]} tintColor={THEME.colors.brandDark} progressViewOffset={0} />}>
      <AppHeader right={<NotificationBell />} />
      <BrowseHeader {...headerCopy} name={user.firstName || ROLE_CONFIG[role].accountType} avatarUri={user.profileLink || avatarUri}
        tab={subTab} savedCount={savedCount} appliedCount={findingJobs ? appliedCount : undefined}
        onTabChange={tab => setSubTab(!findingJobs && tab === 'applied' ? 'explore' : tab)} onProfilePress={onViewProfile} onFilterPress={() => setFilterVisible(true)} />
      {subTab === 'explore' ? <>
        <BrowseFilters activeChip={activeBrowseChip(filters)} filterCount={activeFilterCount}
          onChipPress={label => applyFilters(quickBrowseFilters(filters, label))} onFilterPress={() => setFilterVisible(true)} />
        {isLoading ? <View style={deckStyles.container}><BrowseDeckSkeleton /></View>
          : feedError || !card0 ? <View style={deckStyles.emptyContainer}><BrowseDeckEmpty role={role} fetchedCount={fetchedCount}
            hasFilters={activeFilterCount > 0} error={feedError} onRefresh={() => { void fetchFeed(true); }} onClearFilters={() => applyFilters({ ...DEFAULT_FILTERS })} /></View>
          : <View style={deckStyles.container}>
            {card2 && <View style={deckStyles.back}><BrowseCardBackdrop avatarUri={card2.avatar} name={card2.employerName} /></View>}
            {card1 && <View style={deckStyles.middle}><BrowseCardBackdrop avatarUri={card1.avatar} name={card1.employerName} /></View>}
            <Animated.View style={[deckStyles.front, { transform: [{ translateX: position.x }, { translateY: position.y }, { rotate: rotateCard }] }]} {...panHandlers}>
              <BrowsePostCard name={card0.employerName} avatarUri={card0.avatar} authorRole={partnerRole} title={card0.title}
                location={card0.location} description={card0.aboutText} tags={card0.tags} price={card0.price} unit={card0.unit}
                saved={isSaved(card0.id)} applied={findingJobs && isApplied(card0.id)} onProfilePress={() => openProfile(card0)}
                onSave={() => { void toggleSave(card0, effectiveToken); }} onDetails={() => setSelectedPost(card0)} />
            </Animated.View>
            <BrowseDeckSwipeControls role={role} dragX={position.x} onSkip={() => swipeCard('left')} onInterested={() => swipeCard('right')} />
          </View>}
      </> : <View style={styles.activityTabContainer}>
        {loadingSaved && activityPosts.length === 0 ? <BrowseDeckSkeleton />
          : savedLoadError ? <BrowseEmptyState icon="cloud-offline-outline" title={subTab === 'applied' ? 'Unable to load applications' : 'Unable to load saved posts'}
            description={savedLoadError} action="Retry" onAction={() => { void refreshSavedFromBackend(effectiveToken || null); }} />
          : activityPosts.length === 0 ? <View style={deckStyles.emptyContainer}><BrowseEmptyState icon={subTab === 'applied' ? 'paper-plane-outline' : 'bookmark-outline'}
            title={subTab === 'applied' ? 'No applications yet' : findingJobs ? 'No saved jobs yet' : 'No saved services yet'}
            description={subTab === 'applied' ? 'Jobs you apply to will appear here.' : findingJobs ? 'Save job posts to review and apply when you are ready.' : 'Save service posts to review or message the kasambahay later.'}
            action={findingJobs ? 'Find Jobs' : 'Find Kasambahay'} onAction={() => setSubTab('explore')} /></View>
          : <View style={styles.activityList}>{activityPosts.map(post => <BrowseActivityCard key={post.id} post={post}
            applied={findingJobs && (subTab === 'applied' || isApplied(post.id))} closed={findingJobs && isJobClosed(post)}
            onProfile={() => openProfile(post)} onDetails={() => setSelectedPost(post)}
            onUnsave={subTab === 'saved' ? () => { void toggleSave(post, effectiveToken); } : undefined}
            onMessage={!findingJobs ? () => contactPost(post) : undefined} />)}</View>}
      </View>}
      <JobDetailSheet visible={!!selectedPost} job={selectedPost} onClose={() => setSelectedPost(null)}
        onApply={() => { if (selectedPost) contactPost(selectedPost); }} isApplied={findingJobs && !!selectedPost && isApplied(selectedPost.id)}
        isSaved={!!selectedPost && isSaved(selectedPost.id)} isClosed={detailsClosed}
        onToggleSave={() => { if (selectedPost) void toggleSave(selectedPost, effectiveToken); }}
        onViewProfile={() => { if (selectedPost) { openProfile(selectedPost); setSelectedPost(null); } }}
        ctaText={!findingJobs ? uiText('Message Kasambahay') : undefined}
        ctaNotice={!findingJobs ? uiText('Start a direct chat with this kasambahay') : undefined} token={effectiveToken} />
      {activeChat && <ChatDetailScreen visible onClose={() => setActiveChat(null)} {...activeChat}
        contactName={activeChat.name} contactRole={activeChat.role} contactAvatar={activeChat.avatar} userRole={role} token={effectiveToken} />}
      <FilterModal visible={filterVisible} onClose={() => setFilterVisible(false)} onApply={applyFilters} initialFilters={filters} mode={role} />
      {profilePost && <UserProfileModal visible onClose={() => setProfilePost(null)} userId={String(profilePost.partnerId)}
        prefilledName={profilePost.employerName} prefilledRole={partnerRole} prefilledAvatar={profilePost.avatar} token={effectiveToken || ''} />}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.canvas },
  activityTabContainer: { flex: 1, paddingBottom: 40 },
  activityList: { paddingHorizontal: 20, gap: 12, paddingTop: 4 },
});
