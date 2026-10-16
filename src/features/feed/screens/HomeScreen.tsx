import { useLanguage as useUiLanguage } from '../../../shared/localization/LanguageContext';
import { ErrorNotice } from '../../../shared/ui/ErrorNotice';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { resolveRole, ROLE_CONFIG, type Role } from '../../../app/roleConfig';
import { useUser } from '../../auth/session/UserContext';
import { useLanguage } from '../../../shared/localization/LanguageContext';
import { AppHeader } from '../../../shared/components/AppHeader';
import { GreetingCard } from '../../../shared/components/GreetingCard';
import { ScreenLayout } from '../../../shared/components/ScreenLayout';
import { NotificationBell } from '../../notifications/NotificationContext';
import { useJobsActivity } from '../../bookings/store/savedJobsStore';
import { UserProfileModal } from '../../profile/components/UserProfileModal';
import { ChatDetailScreen } from '../../chat/components/ChatDetailScreen';
import { JobDetailSheet } from '../components/JobDetailSheet';
import { HomeFeedFilters, HomeFeedHeader, HomeFeedEmptyState, HomeFeedLoadingState } from '../components/HomeFeedControls';
import { JobPostCard } from '../components/JobPostCard';
import { WorkerPostCard } from '../components/WorkerPostCard';
import { useFeed } from '../hooks/useFeed';
import { matchesHomeFeedFilters, type HomeFeedCategory } from '../feedFilters';
import type { FeedPost } from '../types';
import THEME from '../../../shared/theme/theme';

interface HomeScreenProps {
  readonly role?: Role;
  readonly avatarUri?: string | null;
  readonly onAvatarPress?: () => void;
  readonly onViewAll?: () => void;
  readonly token?: string | null;
}

interface ActiveChat {
  post: FeedPost;
  initialMessage: string;
  initialReplyTo?: { author: string; text: string };
}

export function HomeScreen({ role: requestedRole, avatarUri, onAvatarPress, onViewAll, token }: HomeScreenProps) {
  const { tr: uiText } = useUiLanguage();
  const { user, getFirstNameOnly } = useUser();
  const { t } = useLanguage();
  const role = requestedRole || resolveRole(user.accountType);
  const authToken = token || user.token;
  const { posts, isLoading, isRefreshing, error, refresh } = useFeed(role, authToken, user.id);
  const { isSaved, isApplied, isClosed, toggleSave, refreshSavedFromBackend } = useJobsActivity();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<HomeFeedCategory | null>(null);
  const [selectedPost, setSelectedPost] = useState<FeedPost | null>(null);
  const [profilePost, setProfilePost] = useState<FeedPost | null>(null);
  const [activeChat, setActiveChat] = useState<ActiveChat | null>(null);

  useEffect(() => {
    setSearchQuery(''); setSelectedCategory(null); setSelectedPost(null); setProfilePost(null); setActiveChat(null);
    if (authToken) void refreshSavedFromBackend(authToken);
  }, [authToken, user.id, role]);

  const visiblePosts = posts.filter((post) => {
    if (isClosed(post.id) || isClosed(post.partnerId) || (post.kind === 'job' && isClosed(post.employerName))) return false;
    return matchesHomeFeedFilters(post.categories, [post.employerName, post.location, post.aboutText, post.termTag, ...post.tags], selectedCategory, searchQuery);
  });
  const hasActiveFilters = !!selectedCategory || !!searchQuery.trim();
  const resetFilters = () => { setSearchQuery(''); setSelectedCategory(null); };
  const handleRefresh = async () => { await Promise.all([refresh(), authToken ? refreshSavedFromBackend(authToken) : Promise.resolve()]); };

  const contactPoster = (post: FeedPost) => {
    setSelectedPost(null);
    if (post.kind === 'job') {
      setActiveChat({
        post, initialMessage: 'I am interested in this job position', initialReplyTo: {
          author: 'Job Post', text: `${post.roleTag} • ${post.price} ${post.unit} • ${post.location} • ${post.termTag}`,
        }
      });
    } else {
      setActiveChat({ post, initialMessage: `Hello ${post.employerName}! I saw your post on SerbiSure for ${post.roleTag} (${post.termTag}) and would like to ask about your availability.` });
    }
  };

  const renderPosts = () => {
    if (isLoading) return <HomeFeedLoadingState />;
    if (!error && visiblePosts.length === 0) {
      return <HomeFeedEmptyState role={role} hasActiveFilters={hasActiveFilters} onResetFilters={resetFilters} />;
    }
    return visiblePosts.map((post) => {
      const actions = {
        post,
        saved: isSaved(post.id),
        onViewProfile: () => setProfilePost(post),
        onDetails: () => setSelectedPost(post),
        onToggleSave: () => { void toggleSave(post, authToken); },
      };
      if (post.kind === 'job') return <JobPostCard key={post.id} {...actions} applied={isApplied(post.id)} />;
      return <WorkerPostCard key={post.id} {...actions} />;
    });
  };

  return (
    <View style={styles.container}>
      <ScreenLayout refreshing={isRefreshing} onRefresh={handleRefresh}>
        <AppHeader right={<NotificationBell />} />
        <GreetingCard name={getFirstNameOnly()} greeting={t.greeting} avatarUri={avatarUri} onAvatarPress={onAvatarPress} />
        <HomeFeedFilters placeholder={t[ROLE_CONFIG[role].searchKey]} searchQuery={searchQuery} selectedCategory={selectedCategory} onSearchChange={setSearchQuery} onCategoryChange={setSelectedCategory} />
        <HomeFeedHeader onViewAll={onViewAll} />
        <View style={styles.list}>
          {error && <ErrorNotice message={error} onRetry={() => { void handleRefresh(); }} />}
          {renderPosts()}
        </View>
      </ScreenLayout>
      {profilePost && <UserProfileModal visible onClose={() => setProfilePost(null)} userId={profilePost.partnerId} token={authToken} prefilledName={profilePost.employerName} prefilledRole={profilePost.kind === 'job' ? 'Homeowner' : profilePost.roleTag} prefilledAvatar={profilePost.avatar} />}
      <JobDetailSheet
        visible={!!selectedPost} job={selectedPost} onClose={() => setSelectedPost(null)}
        onApply={() => selectedPost && contactPoster(selectedPost)}
        isApplied={selectedPost?.kind === 'job' ? isApplied(selectedPost.id) : false}
        isSaved={selectedPost ? isSaved(selectedPost.id) : false}
        isClosed={selectedPost ? isClosed(selectedPost.id) || isClosed(selectedPost.partnerId) || (selectedPost.kind === 'job' && isClosed(selectedPost.employerName)) : false}
        onToggleSave={() => { if (selectedPost) void toggleSave(selectedPost, authToken); }}
        onViewProfile={() => selectedPost && setProfilePost(selectedPost)}
        ctaText={role === 'homeowner' ? uiText("Message Kasambahay") : undefined}
        ctaNotice={role === 'homeowner' ? uiText("Start a direct chat with this kasambahay") : undefined}
        token={authToken}
      />
      {activeChat && <ChatDetailScreen visible onClose={() => setActiveChat(null)} partnerId={activeChat.post.partnerId} token={authToken} contactName={activeChat.post.employerName} contactRole={activeChat.post.kind === 'job' ? 'Homeowner' : activeChat.post.roleTag} contactAvatar={activeChat.post.avatar} initialMessage={activeChat.initialMessage} initialReplyTo={activeChat.initialReplyTo} userRole={role} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.canvas }, list: { paddingHorizontal: 20 },
});
