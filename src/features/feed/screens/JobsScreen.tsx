import { BrowseActivityCard } from '../components/BrowseActivityCard';
import { AppHeader } from '../../../shared/components/AppHeader';
import { BrowseHeader, BrowseFilters } from '../components/BrowseHeader';
import { BrowsePostCard, BrowseCardBackdrop } from '../components/BrowsePostCard';
import { BrowseDeckEmpty, BrowseDeckSkeleton, BrowseDeckSwipeControls, BrowseEmptyState, browseDeckStyles as deckStyles } from '../components/BrowseDeck';
import { useBrowseSwipeDeck } from '../hooks/useBrowseSwipeDeck';
import { activeBrowseChip, quickBrowseFilters, countBrowseFilters, browseHeaderCopy } from '../browsePresentation';
import { useExploreFeed } from '../hooks/useExploreFeed';
import { mapJobPreview } from '../feedMapper';
import React, { useState, useRef, useEffect } from 'react';
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
  roleTag?: string;
  termTag?: string;
  aboutText?: string;
}

export function JobsScreen({ avatarUri, onViewProfile, token }: { avatarUri?: string | null; onViewProfile?: () => void, token?: string | null } = {}) {
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const effectiveToken = token || user.token;

  const { items: jobs, setItems: setJobs, isLoading, error: feedError, fetchItems, fetchedCount } = useExploreFeed<JobOpening>('kasambahay', effectiveToken, mapJobPreview);
  const jobsRef = useRef<JobOpening[]>(jobs);
  jobsRef.current = jobs;

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

  const [subTab, setSubTab] = useState<'explore' | 'saved' | 'applied'>('explore');
  const [selectedJobForDetails, setSelectedJobForDetails] = useState<JobOpening | SavedJobItem | null>(null);
  const {
    savedJobs,
    savedLoadError,
    loadingSaved,
    appliedJobs,
    savedCount,
    appliedCount,
    isSaved,
    isApplied,
    isClosed,
    isJobClosed,
    toggleSave,
    refreshSavedFromBackend,
  } = useJobsActivity();

  const handleToggleSave = (job: JobOpening | SavedJobItem) => {
    void toggleSave({
      id: job.id,
      partnerId: job.partnerId,
      employerName: (job as any).employerName || (job as any).title || 'Homeowner',
      title: (job as any).title || (job as any).roleTag || 'Household Service',
      avatar: job.avatar || (job as any).image,
      location: job.location || 'Location not provided',
      roleTag: (job as any).roleTag || ((job as any).tags && (job as any).tags[1]) || 'Service',
      termTag: (job as any).termTag || ((job as any).tags && (job as any).tags[2]) || 'Part-time',
      price: job.price,
      unit: job.unit || '/ month',
      aboutText: (job as any).aboutText || (job as any).description || 'Looking for experienced and trustworthy household assistance.',
      tags: (job as any).tags || [],
      image: (job as any).image || job.avatar,
    }, effectiveToken);
  };

  const handleApplyJob = (job: JobOpening | SavedJobItem) => {
    const partnerId = (job as any).partnerId || job.id;
    chatStore.addOrUpdateChat({
      id: partnerId,
      partnerId: (job as any).partnerId,
      name: (job as any).employerName || 'Homeowner',
      badge: 'Homeowner',
      avatar: job.avatar || (job as any).image,
      time: 'Just now',
      message: 'I am interested in this job position',
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

  // forceRefresh=true skips the cache and hits the API fresh (used for pull-to-refresh & filters)
  const fetchFeed = async (forceRefresh = false, activeFilters: FeedFilters = filters) => {
    const loaded = await fetchItems(forceRefresh, activeFilters);
    if (loaded) {
      jobsRef.current = loaded;
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
    const currentJob = jobsRef.current[0];
    if (!currentJob) return;

    if (swipedRight) {
      handleApplyJob(currentJob);

      const jobRole = currentJob.roleTag || currentJob.title || 'Household Service';
      const jobRate = `${currentJob.price} ${currentJob.unit}`.trim();
      const jobLocation = currentJob.location || 'Location not provided';
      const jobTerm = currentJob.termTag || (currentJob.tags && currentJob.tags[1]) || '';
      const replySnippet = `${jobRole} • ${jobRate} • ${jobLocation}${jobTerm ? ` • ${jobTerm}` : ''}`;

      // Directly open ChatDetailScreen modal replying to this specific job post!
      setActiveChat({
        visible: true,
        partnerId: currentJob.partnerId,
        name: currentJob.employerName,
        role: 'Homeowner',
        avatar: currentJob.avatar,
        initialMessage: 'I am interested in this job position',
        initialReplyTo: {
          author: 'Job Post',
          text: replySnippet,
        },
      });
    }

    setJobs((prev) => {
      const next = prev.filter((job) => job.id !== currentJob.id);
      jobsRef.current = next;
      return next;
    });
    position.setValue({ x: 0, y: 0 });
  };

  // Card Stack (filter out closed jobs so confirmed bookings never appear)
  const visibleJobs = jobs.filter(
    (job) => !isClosed(job.id) && !isClosed((job as any).partnerId) && !isClosed((job as any).employerName)
  );
  const card0 = visibleJobs[0];
  const card1 = visibleJobs[1];
  const card2 = visibleJobs[2];
  const { position, rotateCard, panHandlers, swipeCard } = useBrowseSwipeDeck(subTab === 'explore' && !isLoading && !feedError ? card0?.id : undefined, removeCurrentCard);
  jobsRef.current = visibleJobs;

  const handleResetDeck = () => {
    void fetchFeed(true);
    position.setValue({ x: 0, y: 0 });
  };

  const headerCopy = browseHeaderCopy('kasambahay', subTab, subTab === 'explore' ? visibleJobs.length : subTab === 'saved' ? savedCount : appliedCount, isLoading, feedError);

  const renderExploreDeck = () => {
    if (isLoading) return <View style={deckStyles.container}><BrowseDeckSkeleton /></View>;
    if (feedError || !card0) {
      return <View style={deckStyles.emptyContainer}><BrowseDeckEmpty role="kasambahay" fetchedCount={fetchedCount} hasFilters={activeAdvancedFilterCount > 0} error={feedError} onRefresh={handleResetDeck} onClearFilters={() => handleApplyFilters({ ...DEFAULT_FILTERS })} /></View>;
    }
    return (
      <>
        <View style={deckStyles.container}>
          {card2 && <View style={deckStyles.back}><BrowseCardBackdrop avatarUri={card2.avatar} name={card2.employerName} /></View>}
          {card1 && <View style={deckStyles.middle}><BrowseCardBackdrop avatarUri={card1.avatar} name={card1.employerName} /></View>}
          <Animated.View style={[deckStyles.front, { transform: [{ translateX: position.x }, { translateY: position.y }, { rotate: rotateCard }] }]} {...panHandlers}>
            <BrowsePostCard name={card0.employerName} avatarUri={card0.avatar} authorRole="Homeowner" title={card0.title} location={card0.location} description={card0.description} tags={card0.tags} price={card0.price} unit={card0.unit} saved={isSaved(card0.id)} applied={isApplied(card0.id)} onProfilePress={() => handleOpenProfile(card0)} onSave={() => handleToggleSave(card0)} onDetails={() => setSelectedJobForDetails(card0)} />
          </Animated.View>
          <BrowseDeckSwipeControls role="kasambahay" dragX={position.x} onSkip={() => swipeCard('left')} onInterested={() => swipeCard('right')} />
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

        {/* Clean White Greeting Card */}
        <BrowseHeader
          {...headerCopy}
          name={user.firstName || 'Kasambahay'}
          avatarUri={user.profileLink || avatarUri}
          tab={subTab}
          savedCount={savedCount}
          appliedCount={appliedCount}
          onTabChange={(tab) => setSubTab(tab)}
          onProfilePress={onViewProfile}
          onFilterPress={() => setIsFilterModalVisible(true)}
        />

        {/* Filter chips */}
        {subTab === 'explore' && <BrowseFilters activeChip={activeFilter} filterCount={activeAdvancedFilterCount} onChipPress={handleChipPress} onFilterPress={() => setIsFilterModalVisible(true)} />}

        {/* Content Rendering by Active SubTab */}
        {subTab === 'explore' ? (
          <React.Fragment>

            {/* Vertical Stacked Cards Deck Area */}
            {renderExploreDeck()}
          </React.Fragment>
        ) : subTab === 'saved' ? (
          /* ── Indeed-Style Saved Tab View ── */
          <View style={styles.activityTabContainer}>
            {loadingSaved && savedJobs.length === 0 ? <BrowseDeckSkeleton /> : savedLoadError ? (
              <BrowseEmptyState icon="cloud-offline-outline" title="Unable to load saved posts" description={savedLoadError} action="Retry" onAction={() => { void refreshSavedFromBackend(effectiveToken || null); }} />
            ) : savedJobs.length === 0 ? (
              <View style={deckStyles.emptyContainer}><BrowseEmptyState icon="bookmark-outline" title="No saved jobs yet" description="Save job posts to review and apply when you are ready." action="Find Jobs" onAction={() => setSubTab('explore')} /></View>
            ) : (
              <View style={styles.activityList}>
                {savedJobs.map((post) => <BrowseActivityCard key={post.id} post={post} applied={isApplied(post.id)} closed={isJobClosed(post)} onProfile={() => handleOpenProfile(post)} onDetails={() => setSelectedJobForDetails(post)} onUnsave={() => handleToggleSave(post)} />)}
              </View>
            )}
          </View>
        ) : (
          /* ── Indeed-Style Applied Tab View ── */
          <View style={styles.activityTabContainer}>
            {loadingSaved && appliedJobs.length === 0 ? <BrowseDeckSkeleton /> : savedLoadError ? (
              <BrowseEmptyState icon="cloud-offline-outline" title="Unable to load applications" description={savedLoadError} action="Retry" onAction={() => { void refreshSavedFromBackend(effectiveToken || null); }} />
            ) : appliedJobs.length === 0 ? (
              <View style={deckStyles.emptyContainer}><BrowseEmptyState icon="paper-plane-outline" title="No applications yet" description="Jobs you apply to will appear here." action="Find Jobs" onAction={() => setSubTab('explore')} /></View>
            ) : (
              <View style={styles.activityList}>
                {appliedJobs.map((post) => <BrowseActivityCard key={post.id} post={post} applied closed={isJobClosed(post)} onProfile={() => handleOpenProfile(post)} onDetails={() => setSelectedJobForDetails(post)} />)}
              </View>
            )}
          </View>
        )}

        {/* Role Details Modal Sheet */}
        {/* Job Details Modal Sheet */}
        <JobDetailSheet
          visible={!!selectedJobForDetails}
          job={selectedJobForDetails as any}
          onClose={() => setSelectedJobForDetails(null)}
          onApply={(j) => {
            handleApplyJob(j as any);
            const targetJob = (selectedJobForDetails || j) as any;
            if (targetJob) {
              const jobRole = targetJob.roleTag || targetJob.title || 'Household Service';
              const jobRate = `${targetJob.price} ${targetJob.unit || ''}`.trim();
              const jobLocation = targetJob.location || 'Location not provided';
              const jobTerm = targetJob.termTag || (targetJob.tags && targetJob.tags[1]) || '';
              const replySnippet = `${jobRole} • ${jobRate} • ${jobLocation}${jobTerm ? ` • ${jobTerm}` : ''}`;
              setSelectedJobForDetails(null);
              setActiveChat({
                visible: true,
                partnerId: targetJob.partnerId || targetJob.id,
                name: targetJob.employerName || 'Homeowner',
                role: 'Homeowner',
                avatar: targetJob.avatar || targetJob.image,
                initialMessage: 'I am interested in this job position',
                initialReplyTo: {
                  author: 'Job Post',
                  text: replySnippet,
                },
              });
            }
          }}
          isApplied={selectedJobForDetails ? isApplied(selectedJobForDetails.id) : false}
          isSaved={selectedJobForDetails ? isSaved(selectedJobForDetails.id) : false}
          isClosed={
            selectedJobForDetails
              ? isClosed(selectedJobForDetails.id) ||
              isClosed((selectedJobForDetails as any).partnerId) ||
              isClosed((selectedJobForDetails as any).employerName)
              : false
          }
          onToggleSave={(j) => handleToggleSave(j as any)}
          onViewProfile={() => {
            if (selectedJobForDetails) {
              handleOpenProfile(selectedJobForDetails);
            }
          }}
          token={effectiveToken}
        />

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
