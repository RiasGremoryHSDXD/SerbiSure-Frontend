import React from 'react';
import { Text, View, Pressable, ActivityIndicator } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { formatBookingAddress } from '../../bookings/api/bookingApi';

import { profileStyles as styles } from '../styles';
import type { ProfileController } from '../hooks/useProfile';

export function PendingPostsSection({ profile }: { profile: ProfileController }) {
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
          <Text style={styles.tabSectionTitle}>My Pending Posts</Text>
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
          <Text style={styles.postsLoadingText}>Loading your pending posts...</Text>
        </View>
      ) : pendingPostsError ? (
        /* State 2: Error */
        <View style={styles.postsErrorTile}>
          <Ionicons name="alert-circle-outline" size={32} color="#DC2626" />
          <Text style={styles.postsErrorTitle}>Failed to load pending posts</Text>
          <Text style={styles.postsErrorSubtitle}>{pendingPostsError}</Text>
          <Pressable style={styles.postsRetryButton} onPress={() => loadPendingPosts(false)}>
            <Ionicons name="reload" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.postsRetryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      ) : pendingPosts.length === 0 ? (
        /* State 3: Empty */
        <View style={styles.emptyPendingPostsCard}>
          <View style={styles.emptyPostsIconCircle}>
            <Ionicons name="time-outline" size={26} color="#9CA3AF" />
          </View>
          <Text style={styles.emptyPendingPostsTitle}>No Pending Posts</Text>
          <Text style={styles.emptyPendingPostsSubtitle}>
            {copy.emptyPosts}
          </Text>
        </View>
      ) : (
        /* State 4: Success / List */
        <View style={styles.pendingPostsList}>
          {pendingPosts.map((post) => {
            const isCancelling = isCancellingPostId === post.booking_id;
            const categories = Array.isArray(post.service_category)
              ? post.service_category
              : [String(post.service_category || 'Service')];
            const startDateStr = post.start_time
              ? new Date(post.start_time).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
              : 'Flexible';

            return (
              <View key={post.booking_id} style={styles.pendingPostCard}>
                {/* Top row: Category chips + Pending Status */}
                <View style={styles.pendingPostTopRow}>
                  <View style={styles.categoryChipsWrap}>
                    {categories.map((cat, idx) => (
                      <View key={`${cat}-${idx}`} style={styles.categoryChip}>
                        <Text style={styles.categoryChipText}>{cat}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.pendingStatusBadge}>
                    <Ionicons name="time" size={11} color="#B45309" style={{ marginRight: 3 }} />
                    <Text style={styles.pendingStatusBadgeText}>Pending</Text>
                  </View>
                </View>

                {/* Rate & Booking Type */}
                <View style={styles.pendingPostRateRow}>
                  <Text style={styles.pendingPostRate}>
                    ₱{Number(post.daily_rate || 0).toLocaleString()}
                  </Text>
                  <Text style={styles.pendingPostRateUnit}>
                    / day · {post.booking_type === 'long_term' ? 'Stay-In' : 'Part-time'}
                  </Text>
                </View>

                {/* Details */}
                <View style={styles.pendingPostDetails}>
                  <View style={styles.pendingPostDetailItem}>
                    <Ionicons name="location-outline" size={13} color="#6B7280" style={{ marginRight: 4 }} />
                    <Text style={styles.pendingPostDetailText} numberOfLines={1}>
                      {formatBookingAddress(post)}
                    </Text>
                  </View>
                  <View style={styles.pendingPostDetailItem}>
                    <Ionicons name="calendar-outline" size={13} color="#6B7280" style={{ marginRight: 4 }} />
                    <Text style={styles.pendingPostDetailText}>
                      Starts: {startDateStr}
                    </Text>
                  </View>
                </View>

                {/* Special instruction if available */}
                {post.special_instruction ? (
                  <View style={styles.pendingPostInstructionBox}>
                    <Text style={styles.pendingPostInstructionText} numberOfLines={2}>
                      "{post.special_instruction}"
                    </Text>
                  </View>
                ) : null}

                {/* Proposals / Assignment note */}
                <View style={styles.pendingPostProposalsRow}>
                  <Ionicons name="people-outline" size={13} color="#D97706" style={{ marginRight: 5 }} />
                  <Text style={styles.pendingPostProposalsText}>
                    {post.proposals_count && post.proposals_count > 0
                      ? `${post.proposals_count} Proposal(s) received`
                      : copy.waiting}
                  </Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.pendingPostActionsRow}>
                  <Pressable
                    style={styles.pendingPostManageBtn}
                    onPress={() => openMyBookings('pending')}
                  >
                    <Ionicons name="options-outline" size={14} color="#0D0D11" style={{ marginRight: 4 }} />
                    <Text style={styles.pendingPostManageBtnText}>Manage Post</Text>
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
                        <Text style={styles.pendingPostCancelBtnText}>Cancel</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  </>);
}
