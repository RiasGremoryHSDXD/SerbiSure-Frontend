import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Modal,
  ActivityIndicator,
  Alert,
  ScrollView,
  RefreshControl,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  BookingItem,
  fetchMyBookings,
  fetchMyAssignedBookings,
  startBooking,
  completeBooking,
  cancelBooking,
} from '../api/bookingApi';
import { ReviewModal } from './ReviewModal';
import { ProposalsModal } from './ProposalsModal';
import { UserProfileModal } from './UserProfileModal';

export interface MyBookingsModalProps {
  visible: boolean;
  onClose: () => void;
  token?: string | null;
  accountType?: string; // 'Homeowner' | 'Kasambahay'
}

type TabType = 'active' | 'completed' | 'cancelled';

export function MyBookingsModal({
  visible,
  onClose,
  token,
  accountType = 'Homeowner',
}: MyBookingsModalProps) {
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Review Modal State
  const [reviewBooking, setReviewBooking] = useState<{
    id: string;
    revieweeName: string;
  } | null>(null);

  // Proposals Modal State
  const [proposalsTarget, setProposalsTarget] = useState<{
    id: string;
    isPoster: boolean;
    currentRate: string;
  } | null>(null);

  // User Profile Modal State
  const [profileTarget, setProfileTarget] = useState<{
    id?: string;
    name?: string;
    avatar?: string;
    role?: string;
  } | null>(null);

  const loadData = async (isPullToRefresh = false) => {
    if (!token) return;
    if (!isPullToRefresh) setLoading(true);

    try {
      let data: BookingItem[] = [];
      if (accountType === 'Homeowner') {
        // Homeowner sees postings they created
        data = await fetchMyBookings(token, activeTab);
      } else {
        // Kasambahay sees assigned jobs
        data = await fetchMyAssignedBookings(token, activeTab);
      }
      setBookings(data);
    } catch (err) {
      console.warn('[MyBookingsModal] loadData failed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible, activeTab, accountType, token]);

  const handleStart = async (bookingId: string) => {
    if (!token) return;
    Alert.alert('Start Job', 'Mark this booking as In Progress?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm Start',
        onPress: async () => {
          const res = await startBooking(token, bookingId);
          if (res.success) {
            Alert.alert('Job Started', 'Status updated to In Progress.');
            loadData();
          } else {
            Alert.alert('Error', res.error || 'Failed to start job.');
          }
        },
      },
    ]);
  };

  const handleComplete = async (bookingId: string) => {
    if (!token) return;
    Alert.alert('Complete Job', 'Confirm that this job has been completed?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark Complete',
        onPress: async () => {
          const res = await completeBooking(token, bookingId);
          if (res.success) {
            Alert.alert('Job Completed', 'Booking marked as Completed! Please leave a review.');
            loadData();
          } else {
            Alert.alert('Error', res.error || 'Failed to complete job.');
          }
        },
      },
    ]);
  };

  const handleCancel = async (bookingId: string) => {
    if (!token) return;
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking?', [
      { text: 'Keep Booking', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          const res = await cancelBooking(token, bookingId);
          if (res.success) {
            Alert.alert('Cancelled', 'Booking has been cancelled.');
            loadData();
          } else {
            Alert.alert('Error', res.error || 'Failed to cancel booking.');
          }
        },
      },
    ]);
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'Accepted':
        return { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' };
      case 'InProgress':
        return { bg: '#FFF7ED', text: '#EA580C', border: '#FED7AA' };
      case 'Completed':
        return { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' };
      case 'Cancelled':
        return { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' };
      default:
        return { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' };
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
          <Pressable onPress={onClose} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </Pressable>
          <Text style={styles.headerTitle}>
            {accountType === 'Kasambahay' ? 'My Jobs & Contracts' : 'My Bookings'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabsRow}>
          {(['active', 'completed', 'cancelled'] as TabType[]).map((tab) => {
            const isCurrent = activeTab === tab;
            return (
              <Pressable
                key={tab}
                style={[styles.tabItem, isCurrent && styles.tabItemActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, isCurrent && styles.tabTextActive]}>
                  {tab === 'active' ? 'Active' : tab === 'completed' ? 'Completed' : 'Cancelled'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Content List */}
        <ScrollView
          style={styles.scrollBody}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadData(true);
              }}
              colors={['#FFB43B']}
            />
          }
        >
          {loading ? (
            <ActivityIndicator color="#FFB43B" size="large" style={{ marginTop: 40 }} />
          ) : bookings.length > 0 ? (
            bookings.map((booking) => {
              const counterparty =
                accountType === 'Homeowner' ? booking.assigned_partner : booking.poster;
              const statusStyle = getStatusBadgeStyle(booking.booking_status);
              const categories = Array.isArray(booking.service_category)
                ? booking.service_category
                : [booking.service_category];

              return (
                <View key={booking.booking_id} style={styles.card}>
                  {/* Card Top Row */}
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.categoriesPillGroup}>
                      {categories.map((cat, idx) => (
                        <View key={`${cat}-${idx}`} style={styles.categoryPill}>
                          <Text style={styles.categoryPillText}>{cat}</Text>
                        </View>
                      ))}
                    </View>

                    <View
                      style={[
                        styles.statusPill,
                        { backgroundColor: statusStyle.bg, borderColor: statusStyle.border },
                      ]}
                    >
                      <Text style={[styles.statusPillText, { color: statusStyle.text }]}>
                        {booking.booking_status}
                      </Text>
                    </View>
                  </View>

                  {/* Daily Rate & Type */}
                  <View style={styles.rateRow}>
                    <Text style={styles.rateValue}>₱{booking.daily_rate}</Text>
                    <Text style={styles.rateUnit}>
                      / day · {booking.booking_type === 'long_term' ? 'Stay-in' : 'Part-time'}
                    </Text>
                  </View>

                  {/* Address */}
                  <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={14} color="#6B7280" />
                    <Text style={styles.infoText} numberOfLines={1}>
                      {booking.service_address}
                    </Text>
                  </View>

                  {/* Date/Time */}
                  <View style={styles.infoRow}>
                    <Ionicons name="time-outline" size={14} color="#6B7280" />
                    <Text style={styles.infoText}>
                      Start: {new Date(booking.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </View>

                  {/* Special Instruction preview */}
                  {booking.special_instruction ? (
                    <Text style={styles.instructionPreview} numberOfLines={2}>
                      "{booking.special_instruction}"
                    </Text>
                  ) : null}

                  {/* Counterparty Mini Profile Card */}
                  {counterparty ? (
                    <Pressable
                      style={styles.partnerRow}
                      onPress={() =>
                        setProfileTarget({
                          id: counterparty.id,
                          name: counterparty.name,
                          avatar: counterparty.profile_link || undefined,
                          role: counterparty.account_type,
                        })
                      }
                    >
                      <Image
                        source={{
                          uri:
                            counterparty.profile_link ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(counterparty.name)}&background=FFB43B&color=fff`,
                        }}
                        style={styles.partnerAvatar}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.partnerName}>{counterparty.name}</Text>
                        <Text style={styles.partnerRole}>
                          {counterparty.account_type} · ⭐ {counterparty.rating}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                    </Pressable>
                  ) : (
                    <View style={styles.waitingAssignmentBox}>
                      <Ionicons name="hourglass-outline" size={16} color="#D97706" />
                      <Text style={styles.waitingAssignmentText}>
                        Waiting for worker assignment / acceptance
                      </Text>
                    </View>
                  )}

                  {/* Action Buttons Row */}
                  <View style={styles.actionRow}>
                    {/* Proposals view button */}
                    <Pressable
                      style={styles.actionBtnOutline}
                      onPress={() =>
                        setProposalsTarget({
                          id: booking.booking_id,
                          isPoster: accountType === 'Homeowner',
                          currentRate: booking.daily_rate,
                        })
                      }
                    >
                      <Ionicons name="pricetag-outline" size={14} color="#4B5563" style={{ marginRight: 4 }} />
                      <Text style={styles.actionBtnOutlineText}>
                        Offers {booking.proposals_count ? `(${booking.proposals_count})` : ''}
                      </Text>
                    </Pressable>

                    {/* Status-specific triggers */}
                    {booking.booking_status === 'Accepted' && (
                      <Pressable
                        style={styles.actionBtnPrimary}
                        onPress={() => handleStart(booking.booking_id)}
                      >
                        <Text style={styles.actionBtnPrimaryText}>Start Job</Text>
                      </Pressable>
                    )}

                    {booking.booking_status === 'InProgress' && (
                      <Pressable
                        style={[styles.actionBtnPrimary, { backgroundColor: '#10B981' }]}
                        onPress={() => handleComplete(booking.booking_id)}
                      >
                        <Text style={styles.actionBtnPrimaryText}>Complete</Text>
                      </Pressable>
                    )}

                    {booking.booking_status === 'Completed' && (
                      <Pressable
                        style={[
                          styles.actionBtnPrimary,
                          booking.has_reviewed && { backgroundColor: '#E5E7EB' },
                        ]}
                        disabled={booking.has_reviewed}
                        onPress={() => {
                          const targetName = counterparty ? counterparty.name : 'Partner';
                          setReviewBooking({
                            id: booking.booking_id,
                            revieweeName: targetName,
                          });
                        }}
                      >
                        <Ionicons
                          name={booking.has_reviewed ? 'checkmark-circle' : 'star'}
                          size={14}
                          color={booking.has_reviewed ? '#6B7280' : '#FFFFFF'}
                          style={{ marginRight: 4 }}
                        />
                        <Text
                          style={[
                            styles.actionBtnPrimaryText,
                            booking.has_reviewed && { color: '#6B7280' },
                          ]}
                        >
                          {booking.has_reviewed ? 'Reviewed' : 'Leave Review'}
                        </Text>
                      </Pressable>
                    )}

                    {['Pending', 'Accepted'].includes(booking.booking_status) && (
                      <Pressable
                        style={styles.actionBtnDanger}
                        onPress={() => handleCancel(booking.booking_id)}
                      >
                        <Text style={styles.actionBtnDangerText}>Cancel</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="calendar-clear-outline" size={42} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No {activeTab} bookings</Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'active'
                  ? 'Your active bookings and contracts will appear here.'
                  : `You have no ${activeTab} bookings at this time.`}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Modals */}
        {reviewBooking && (
          <ReviewModal
            visible={!!reviewBooking}
            onClose={() => setReviewBooking(null)}
            bookingId={reviewBooking.id}
            revieweeName={reviewBooking.revieweeName}
            token={token}
            onSuccess={() => loadData()}
          />
        )}

        {proposalsTarget && (
          <ProposalsModal
            visible={!!proposalsTarget}
            onClose={() => setProposalsTarget(null)}
            bookingId={proposalsTarget.id}
            isPoster={proposalsTarget.isPoster}
            currentRate={proposalsTarget.currentRate}
            token={token}
            onUpdated={() => loadData()}
          />
        )}

        {profileTarget && (
          <UserProfileModal
            visible={!!profileTarget}
            onClose={() => setProfileTarget(null)}
            userId={profileTarget.id}
            token={token}
            prefilledName={profileTarget.name}
            prefilledAvatar={profileTarget.avatar}
            prefilledRole={profileTarget.role}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  tabItemActive: {
    backgroundColor: '#FFB43B',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  categoriesPillGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
  },
  categoryPill: {
    backgroundColor: '#FFF8EC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE2B8',
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  rateValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
    marginRight: 4,
  },
  rateUnit: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#4B5563',
    flex: 1,
  },
  instructionPreview: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#6B7280',
    backgroundColor: '#F9FAFB',
    padding: 8,
    borderRadius: 8,
    marginTop: 6,
    marginBottom: 8,
  },
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 12,
    marginTop: 6,
    marginBottom: 10,
  },
  partnerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    backgroundColor: '#E5E7EB',
  },
  partnerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  partnerRole: {
    fontSize: 11,
    color: '#6B7280',
  },
  waitingAssignmentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFBEB',
    padding: 8,
    borderRadius: 10,
    marginTop: 6,
    marginBottom: 10,
  },
  waitingAssignmentText: {
    fontSize: 12,
    color: '#D97706',
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F3F4F6',
  },
  actionBtnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  actionBtnOutlineText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  actionBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFB43B',
  },
  actionBtnPrimaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionBtnDanger: {
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  actionBtnDangerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4B5563',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 240,
  },
});
