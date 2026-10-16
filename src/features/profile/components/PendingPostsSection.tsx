import { useLanguage as useUiLanguage } from '../../../shared/localization/LanguageContext';
import React from 'react';
import { Text, View, Pressable, ActivityIndicator } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { PendingPostCard } from './PendingPostCard';

import { profileStyles as styles } from '../styles';
import type { ProfileController } from '../hooks/useProfile';

export function PendingPostsSection({ profile }: { profile: ProfileController }) {
  const { tr: uiText } = useUiLanguage();
  const {
    copy,
    pendingPosts,
    isLoadingPendingPosts,
    pendingPostsError,
    isCancellingPostId,
    openMyBookings,
    loadPendingPosts,
    handleCancelPendingPost,
  } = profile;
  return (<>
    <View style={styles.pendingPostsSection}>
      <View style={styles.tabSectionHeader}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.tabSectionTitle}>{uiText("My Pending Posts")}</Text>
          <Text style={styles.tabSectionSubtitle}>
            {copy.pendingPosts}
          </Text>
        </View>
        <Pressable
          style={styles.refreshIconBtn}
          onPress={() => loadPendingPosts(false)}
          disabled={isLoadingPendingPosts}
          hitSlop={8}
        >
          <Ionicons
            name="refresh-outline"
            size={15}
            color={isLoadingPendingPosts ? '#9CA3AF' : '#EA580C'}
          />
        </Pressable>
      </View>

      {/* State 1: Loading */}
      {isLoadingPendingPosts ? (
        <View style={styles.postsLoadingTile}>
          <ActivityIndicator size="small" color="#FFB380" />
          <Text style={styles.postsLoadingText}>{uiText("Loading your pending posts...")}</Text>
        </View>
      ) : pendingPostsError ? (
        /* State 2: Error */
        <View style={styles.postsErrorTile}>
          <Ionicons name="alert-circle-outline" size={32} color="#DC2626" />
          <Text style={styles.postsErrorTitle}>{uiText("Failed to load pending posts")}</Text>
          <Text style={styles.postsErrorSubtitle}>{pendingPostsError}</Text>
          <Pressable style={styles.postsRetryButton} onPress={() => loadPendingPosts(false)}>
            <Ionicons name="reload" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.postsRetryButtonText}>{uiText("Try Again")}</Text>
          </Pressable>
        </View>
      ) : pendingPosts.length === 0 ? (
        /* State 3: Empty */
        <View style={styles.emptyPendingPostsCard}>
          <View style={styles.emptyPostsIconCircle}>
            <Ionicons name="time-outline" size={26} color="#9CA3AF" />
          </View>
          <Text style={styles.emptyPendingPostsTitle}>{uiText("No Pending Posts")}</Text>
          <Text style={styles.emptyPendingPostsSubtitle}>
            {copy.emptyPosts}
          </Text>
        </View>
      ) : (
        /* State 4: Success / List */
        <View style={styles.pendingPostsList}>
          {pendingPosts.map((post) => {
            const isCancelling = isCancellingPostId === post.booking_id;
            return (
              <PendingPostCard key={post.booking_id} post={post} note={post.proposals_count && post.proposals_count > 0 ? `${post.proposals_count} Proposal(s) received` : copy.waiting}>
                {/* Action Buttons */}
                  <Pressable
                    style={styles.pendingPostManageBtn}
                    onPress={() => openMyBookings('pending')}
                  >
                    <Ionicons name="options-outline" size={14} color="#0D0D11" style={{ marginRight: 4 }} />
                    <Text style={styles.pendingPostManageBtnText}>{uiText("Manage Post")}</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.pendingPostCancelBtn, isCancelling && { opacity: 0.6 }]}
                    onPress={() => handleCancelPendingPost(post.booking_id)}
                    disabled={isCancelling}
                  >
                    {isCancelling ? (
                      <ActivityIndicator size="small" color="#DC2626" />
                    ) : (
                      <>
                        <Ionicons name="close-circle-outline" size={14} color="#DC2626" style={{ marginRight: 3 }} />
                        <Text style={styles.pendingPostCancelBtnText}>{uiText("Cancel")}</Text>
                      </>
                    )}
                  </Pressable>
              </PendingPostCard>
            );
          })}
        </View>
      )}
    </View>
  </>);
}
