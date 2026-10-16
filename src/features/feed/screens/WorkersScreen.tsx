import { useLanguage as useUiLanguage } from '../../../shared/localization/LanguageContext';
import { BrowseActivityCard } from '../components/BrowseActivityCard';
import { AppHeader } from '../../../shared/components/AppHeader';
import { BrowseHeader, BrowseFilters } from '../components/BrowseHeader';
import { BrowsePostCard, BrowseCardBackdrop } from '../components/BrowsePostCard';
import { BrowseDeckEmpty, BrowseDeckSkeleton, BrowseDeckSwipeControls, BrowseEmptyState, browseDeckStyles as deckStyles } from '../components/BrowseDeck';
import { useBrowseSwipeDeck } from '../hooks/useBrowseSwipeDeck';
import { activeBrowseChip, quickBrowseFilters, countBrowseFilters, browseHeaderCopy } from '../browsePresentation';
import { useExploreFeed } from '../hooks/useExploreFeed';
import { mapWorkerPreview } from '../feedMapper';
import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, ScrollView, Animated, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { chatStore } from '../../chat/store/chatStore';
import { ChatDetailScreen } from '../../chat/components/ChatDetailScreen';
import { FilterModal, FeedFilters, DEFAULT_FILTERS } from '../components/FilterModal';
import { UserProfileModal } from '../../profile/components/UserProfileModal';

import { useUser } from '../../auth/session/UserContext';
import { NotificationBell } from '../../notifications/NotificationContext';

import THEME from '../../../shared/theme/theme';
import { useJobsActivity, SavedJobItem } from '../../bookings/store/savedJobsStore';
import { JobDetailSheet } from '../components/JobDetailSheet';

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
  unit: string;
  aboutText: string;
}

export function WorkersScreen({ avatarUri, onViewProfile, token }: { avatarUri?: string | null, onViewProfile?: () => void, token?: string | null }) {
  const { tr: uiText } = useUiLanguage();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const effectiveToken = token || user.token;

  const { items: profiles, setItems: setProfiles, isLoading, error: feedError, fetchItems, fetchedCount } = useExploreFeed<WorkerProfile>('homeowner', effectiveToken, mapWorkerPreview);
  const profilesRef = useRef<WorkerProfile[]>(profiles);
  profilesRef.current = profiles;

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
    initialReplyTo?: {
      author: string;
      text: string;
    };
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

  const [subTab, setSubTab] = useState<'explore' | 'saved'>('explore');
  const [selectedSavedWorker, setSelectedSavedWorker] = useState<SavedJobItem | null>(null);

  const {
    savedJobs,
    savedLoadError,
    loadingSaved,
    savedCount,
    isSaved,
    toggleSave,
    refreshSavedFromBackend,
  } = useJobsActivity();

  const handleToggleSaveWorker = (worker: WorkerProfile | SavedJobItem) => {
    void toggleSave({
      id: worker.id,
      partnerId: worker.partnerId,
      employerName: (worker as any).name || (worker as any).employerName || 'Kasambahay',
      title: (worker as any).role || (worker as any).title || 'Household Service',
      avatar: worker.avatar || (worker as any).image,
      location: worker.location || 'Location not provided',
      roleTag: (worker as any).role || (worker as any).roleTag || 'Kasambahay',
      termTag: (worker as any).years || (worker as any).termTag || 'Not specified',
      price: worker.price,
      unit: (worker as any).unit || 'per day',
      aboutText: (worker as any).aboutText || 'No description provided.',
      tags: (worker as any).tags || [],
      image: (worker as any).image || worker.avatar,
    }, effectiveToken);
  };

  const handleOpenMessage = (worker: WorkerProfile | SavedJobItem) => {
    const partnerId = (worker as any).partnerId || worker.id;
    const name = (worker as any).name || (worker as any).employerName || 'Kasambahay';
    const role = (worker as any).role || (worker as any).roleTag || 'Kasambahay';
    const avatar = worker.avatar || (worker as any).image;
    chatStore.addOrUpdateChat({
      id: partnerId,
      partnerId: String(partnerId),
      name,
      badge: role,
      avatar,
      time: 'Just now',
      message: 'Hi! I am interested in hiring you for a service.',
    });
    setActiveChat({
      visible: true,
      partnerId: String(partnerId),
      name,
      role,
      avatar,
      initialMessage: 'Hi! I am interested in hiring you for a service.',
    });
  };

  const handleOpenProfile = (target: any) => {
    setSelectedUserForModal({
      id: target.partnerId || target.id,
      name: target.name || target.employerName || 'Kasambahay',
      role: target.role || target.roleTag || 'Kasambahay',
      avatar: target.avatar || target.image,
    });
    setIsUserProfileModalVisible(true);
  };

  // forceRefresh=true skips the cache and hits the API fresh (used for pull-to-refresh & filters)
  const fetchFeed = async (forceRefresh = false, activeFilters: FeedFilters = filters) => {
    const loaded = await fetchItems(forceRefresh, activeFilters);
    if (loaded) {
      profilesRef.current = loaded;
      position.setValue({ x: 0, y: 0 });
    }
  };

  const activeFilter = activeBrowseChip(filters);
  const activeAdvancedFilterCount = countBrowseFilters(filters);

  const handleChipPress = (label: string) => {
    const updated = quickBrowseFilters(filters, label);
    setFilters(updated);
    void fetchFeed(true, updated);
  };

  const handleApplyFilters = (updated: FeedFilters) => {
    setFilters(updated);
    void fetchFeed(true, updated);
  };

  // Pull-to-refresh handler — forces a fresh API call and resets the swipe deck
  const handlePullToRefresh = async () => {
    setIsRefreshing(true);
    position.setValue({ x: 0, y: 0 });
    await Promise.all([
      fetchFeed(true, filters),
      effectiveToken ? refreshSavedFromBackend(effectiveToken) : Promise.resolve(),
    ]);
    setIsRefreshing(false);
  };

  // Only fetches on first load (or when token changes)
  useEffect(() => {
    void fetchFeed();
    if (effectiveToken) {
      void refreshSavedFromBackend(effectiveToken);
    }
  }, [effectiveToken]);

  useEffect(() => {
    if (subTab === 'saved' && effectiveToken) {
      void refreshSavedFromBackend(effectiveToken);
    }
  }, [subTab, effectiveToken]);

  const removeCurrentCard = (swipedRight: boolean) => {
    const currentWorker = profilesRef.current[0];
    if (!currentWorker) return;

    if (swipedRight) {
      const badgeRole = (currentWorker.role && currentWorker.role.split(' ')[0]) || 'Kasambahay';
      chatStore.addOrUpdateChat({
        id: currentWorker.partnerId || currentWorker.id,
        partnerId: currentWorker.partnerId,
        name: currentWorker.name,
        badge: badgeRole,
        avatar: currentWorker.avatar,
        time: 'Just now',
        message: 'Hi! I am interested in hiring you for a service.',
      });

      const serviceRate = currentWorker.price || '';
      const serviceLocation = currentWorker.location || 'Location not provided';
      const replySnippet = `${badgeRole}${serviceRate ? ` • ${serviceRate}` : ''} • ${serviceLocation}`;

      // Directly open ChatDetailScreen modal with auto message!
      setActiveChat({
        visible: true,
        partnerId: currentWorker.partnerId,
        name: currentWorker.name,
        role: badgeRole,
        avatar: currentWorker.avatar,
        initialMessage: 'Hi! I am interested in hiring you for a service.',
        initialReplyTo: {
          author: 'Service Post',
          text: replySnippet,
        },
      });
    }

    setProfiles((prev) => {
      const next = prev.filter((worker) => worker.id !== currentWorker.id);
      profilesRef.current = next;
      return next;
    });
    position.setValue({ x: 0, y: 0 });
  };

  // Card Stack
  const card0 = profiles[0];
  const card1 = profiles[1];
  const card2 = profiles[2];
  const { position, rotateCard, panHandlers, swipeCard } = useBrowseSwipeDeck(subTab === 'explore' && !isLoading && !feedError ? card0?.id : undefined, removeCurrentCard);

  const handleResetDeck = () => {
    void fetchFeed(true);
    position.setValue({ x: 0, y: 0 });
  };

  const headerCopy = browseHeaderCopy('homeowner', subTab, subTab === 'explore' ? profiles.length : savedCount, isLoading, feedError, uiText);

  const renderExploreDeck = () => {
    if (isLoading) return <View style={deckStyles.container}><BrowseDeckSkeleton /></View>;
    if (feedError || !card0) {
      return <View style={deckStyles.emptyContainer}><BrowseDeckEmpty role="homeowner" fetchedCount={fetchedCount} hasFilters={activeAdvancedFilterCount > 0} error={feedError} onRefresh={handleResetDeck} onClearFilters={() => handleApplyFilters({ ...DEFAULT_FILTERS })} /></View>;
    }
    return (
      <>
        <View style={deckStyles.container}>
          {card2 && <View style={deckStyles.back}><BrowseCardBackdrop avatarUri={card2.avatar} name={card2.name} /></View>}
          {card1 && <View style={deckStyles.middle}><BrowseCardBackdrop avatarUri={card1.avatar} name={card1.name} /></View>}
          <Animated.View style={[deckStyles.front, { transform: [{ translateX: position.x }, { translateY: position.y }, { rotate: rotateCard }] }]} {...panHandlers}>
            <BrowsePostCard name={card0.name} avatarUri={card0.avatar} authorRole="Kasambahay" title={card0.role} location={card0.location} description={card0.aboutText} tags={[card0.years, ...card0.tags]} price={card0.price} unit={card0.unit} saved={isSaved(card0.id)} onProfilePress={() => handleOpenProfile(card0)} onSave={() => handleToggleSaveWorker(card0)} onDetails={() => setSelectedSavedWorker({ id: card0.id, partnerId: card0.partnerId, employerName: card0.name, title: card0.role, avatar: card0.avatar, location: card0.location, roleTag: card0.role, termTag: card0.years, price: card0.price, unit: card0.unit, aboutText: card0.aboutText, tags: card0.tags })} />
          </Animated.View>
          <BrowseDeckSwipeControls role="homeowner" dragX={position.x} onSkip={() => swipeCard('left')} onInterested={() => swipeCard('right')} />
        </View>
      </>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Status Bar Spacer */}
      <View style={{ height: insets.top, backgroundColor: THEME.colors.canvas, zIndex: 10 }} />

      <ScrollView
        style={{ flex: 1, backgroundColor: THEME.colors.canvas }}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={true}
        alwaysBounceVertical={true}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handlePullToRefresh}
            colors={[THEME.colors.brandDark]}
            tintColor={THEME.colors.brandDark}
            progressViewOffset={0}
          />
        }
      >

        {/* Header Logo & Bell */}
        <AppHeader right={<NotificationBell />} />

        {/* Greeting Card with Sub-Navigation Tabs */}
        <BrowseHeader
          {...headerCopy}
          name={user.firstName || 'Homeowner'}
          avatarUri={user.profileLink || avatarUri}
          tab={subTab}
          savedCount={savedCount}
          onTabChange={(tab) => setSubTab(tab === 'saved' ? 'saved' : 'explore')}
          onProfilePress={onViewProfile}
          onFilterPress={() => setIsFilterModalVisible(true)}
        />

        {subTab === 'explore' ? (
          <React.Fragment>

            {/* Filter Chips Bar */}
            <BrowseFilters activeChip={activeFilter} filterCount={activeAdvancedFilterCount} onChipPress={handleChipPress} onFilterPress={() => setIsFilterModalVisible(true)} />

            {/* Vertical Stacked Cards Deck Area */}
            {renderExploreDeck()}
          </React.Fragment>
        ) : (
          /* Saved Kasambahays Tab View */
          <View style={styles.activityTabContainer}>
            {loadingSaved && savedJobs.length === 0 ? <BrowseDeckSkeleton /> : savedLoadError ? (
              <BrowseEmptyState icon="cloud-offline-outline" title="Unable to load saved posts" description={savedLoadError} action="Retry" onAction={() => { void refreshSavedFromBackend(effectiveToken || null); }} />
            ) : savedJobs.length === 0 ? (
              <View style={deckStyles.emptyContainer}><BrowseEmptyState icon="bookmark-outline" title="No saved services yet" description="Save service posts to review or message the kasambahay later." action="Find Kasambahay" onAction={() => setSubTab('explore')} /></View>
            ) : (
              <View style={styles.activityList}>
                {savedJobs.map((post) => <BrowseActivityCard key={post.id} post={post} onProfile={() => handleOpenProfile(post)} onDetails={() => setSelectedSavedWorker(post)} onUnsave={() => handleToggleSaveWorker(post)} onMessage={() => handleOpenMessage(post)} />)}
              </View>
            )}
          </View>
        )}

        {/* Messenger-style Chat Detail Modal */}
        <ChatDetailScreen
          visible={activeChat.visible}
          onClose={() => setActiveChat((prev) => ({ ...prev, visible: false }))}
          partnerId={activeChat.partnerId}
          token={effectiveToken}
          contactName={activeChat.name}
          contactRole={activeChat.role}
          contactAvatar={activeChat.avatar}
          initialMessage={activeChat.initialMessage}
          initialReplyTo={activeChat.initialReplyTo}
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

        {/* Saved Kasambahay Detail Sheet */}
        <JobDetailSheet
          visible={!!selectedSavedWorker}
          job={selectedSavedWorker ? {
            id: selectedSavedWorker.id,
            partnerId: (selectedSavedWorker as any).partnerId || selectedSavedWorker.id,
            employerName: selectedSavedWorker.employerName,
            title: selectedSavedWorker.title || selectedSavedWorker.roleTag,
            avatar: selectedSavedWorker.avatar,
            time: selectedSavedWorker.time,
            location: selectedSavedWorker.location,
            roleTag: selectedSavedWorker.roleTag,
            termTag: selectedSavedWorker.termTag,
            price: selectedSavedWorker.price,
            unit: selectedSavedWorker.unit,
            aboutText: selectedSavedWorker.aboutText,
            tags: selectedSavedWorker.tags,
          } : null}
          onClose={() => setSelectedSavedWorker(null)}
          onApply={() => {
            if (selectedSavedWorker) {
              const target = selectedSavedWorker;
              setSelectedSavedWorker(null);
              handleOpenMessage(target);
            }
          }}
          isApplied={false}
          isSaved={selectedSavedWorker ? isSaved(selectedSavedWorker.id) : false}
          onToggleSave={() => {
            if (selectedSavedWorker) {
              handleToggleSaveWorker(selectedSavedWorker);
            }
          }}
          ctaText={uiText("Message Kasambahay")}
          ctaNotice={uiText("Start a direct chat with this kasambahay")}
          onViewProfile={() => {
            if (selectedSavedWorker) {
              const worker = selectedSavedWorker;
              setSelectedSavedWorker(null);
              handleOpenProfile(worker);
            }
          }}
          token={effectiveToken}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.canvas,
  },
  activityTabContainer: {
    flex: 1,
    paddingBottom: 40,
  },
  activityList: {
    paddingHorizontal: 20,
    gap: 12,
    paddingTop: 4,
  }
});
