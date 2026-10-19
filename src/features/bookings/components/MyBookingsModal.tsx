import { useLanguage as useUiLanguage } from '../../../shared/localization/LanguageContext';
import { realtime } from '../../../shared/realtime';
import { AppState } from 'react-native';
import { workSetupLabel } from '../workSetup';
import { getBookingCounterparty, isBookingPoster } from '../bookingParticipants';
import { useUser } from '../../auth/session/UserContext';
import { ContractDownloadCard } from './ContractDownloadCard';
import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Pressable, Modal, ActivityIndicator, Alert, ScrollView, RefreshControl, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BookingItem, formatBookingAddress, fetchMyBookings, fetchMyAssignedBookings, startBooking, completeBooking, fetchBookingPenaltyStatus, type BookingPenaltyStatus } from '../api/bookingApi';
import { CancelBookingModal } from './CancelBookingModal';
import { ReviewModal } from '../../reviews/components/ReviewModal';
import { ProposalsModal } from './ProposalsModal';
import { UserProfileModal } from '../../profile/components/UserProfileModal';

export interface MyBookingsModalProps {
  visible: boolean;
  onClose: () => void;
  onSafetyAcknowledged?: () => void;
  token?: string | null;
  accountType?: string; // 'Homeowner' | 'Kasambahay'
  initialTab?: TabType;
}

type TabType = 'active' | 'pending' | 'completed' | 'cancelled';

const TABS: { key: TabType; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'pending', label: 'Pending' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

export function MyBookingsModal({
  visible,
  onClose,
  onSafetyAcknowledged,
  token,
  accountType = 'Homeowner',
  initialTab = 'active',
}: MyBookingsModalProps) {
  const { tr: uiText, formatDate } = useUiLanguage();
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useUser();
  const [penalty, setPenalty] = useState<BookingPenaltyStatus | null>(null);

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<boolean>(false);

  const activeTabRef = useRef<TabType>(activeTab);
  activeTabRef.current = activeTab;

  // Review Modal State
  const [reviewBooking, setReviewBooking] = useState<{
    id: string;
    revieweeName: string;
    isMandatory?: boolean;
  } | null>(null);

  // Proposals Modal State
  const [proposalsTarget, setProposalsTarget] = useState<{
    id: string;
    isPoster: boolean;
    currentRate: string;
    ratePeriod: 'day' | 'month';
    rateNeedsReview?: boolean;
  } | null>(null);

  // User Profile Modal State
  const [profileTarget, setProfileTarget] = useState<{
    id?: string;
    name?: string;
    avatar?: string;
    role?: string;
  } | null>(null);

  const loadData = async (isPullToRefresh = false) => {
    if (!token) { setLoading(false); setRefreshing(false); setErrorMessage('Sign in to view your bookings.'); return; }
    if (!isPullToRefresh) setLoading(true);
    setErrorMessage(null);

    const currentTab = activeTab;

    try {
      let data: BookingItem[] = [];

      const [posted, assigned, penaltyState] = await Promise.all([
        fetchMyBookings(token, currentTab), fetchMyAssignedBookings(token, currentTab), fetchBookingPenaltyStatus(token),
      ]);
      data = Array.from(new Map([...posted, ...assigned].map(item => [item.booking_id, item])).values());

      // Concurrency guard: ignore if tab changed while in-flight
      if (activeTabRef.current !== currentTab) return;

      setPenalty(penaltyState);
      updateUser({ penaltyPoints: penaltyState.penalty_points, isRestricted: penaltyState.is_restricted });
      setBookings(data);
    } catch (err: any) {
      console.warn('[MyBookingsModal] loadData failed:', err);
      if (activeTabRef.current === currentTab) {
        setErrorMessage(err?.message || 'Failed to load bookings. Please pull down to retry.');
      }
    } finally {
      if (activeTabRef.current === currentTab) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    if (visible && initialTab) {
      setActiveTab(initialTab);
    }
  }, [visible, initialTab]);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible, activeTab, accountType, token]);

  useEffect(() => {
    if (!visible || !token) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const off = realtime.subscribe(event => {
      if (['sync', 'booking.changed'].includes(event.type) && AppState.currentState === 'active') {
        clearTimeout(timer); timer = setTimeout(() => void loadData(true), 150);
      }
    });
    return () => { off(); clearTimeout(timer); };
  }, [visible, token, activeTab, accountType]);

  const handleStart = async (bookingId: string) => {
    if (!token || actionInProgress) return;
    Alert.alert('Start Job', 'Mark this booking as In Progress?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm Start',
        onPress: async () => {
          setActionInProgress(true);
          try {
            const res = await startBooking(token, bookingId);
            if (res.success) {
              Alert.alert('Job Started', 'Status updated to In Progress.');
              loadData();
            } else {
              Alert.alert('Error', res.error || 'Failed to start job.');
            }
          } finally {
            setActionInProgress(false);
          }
        },
      },
    ]);
  };

  const handleComplete = async (bookingId: string) => {
    if (!token || actionInProgress) return;
    Alert.alert('Complete Job', 'Confirm that this job has been completed?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark Complete',
        onPress: async () => {
          setActionInProgress(true);
          try {
            const res = await completeBooking(token, bookingId);
            if (res.success) {
              loadData();
              const matchingBooking = bookings.find((b) => b.booking_id === bookingId);
              const target = matchingBooking ? getBookingCounterparty(matchingBooking, user.id) : null;
              const targetName = target ? target.name : 'Partner';

              Alert.alert(
                'Job Completed',
                'Booking marked as Completed! Mandatory quality feedback is now required under SerbiSure QA.'
              );

              setReviewBooking({
                id: bookingId,
                revieweeName: targetName,
                isMandatory: true,
              });
            } else {
              Alert.alert('Error', res.error || 'Failed to complete job.');
            }
          } finally {
            setActionInProgress(false);
          }
        },
      },
    ]);
  };

  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const handleCancel = (bookingId: string) => {
    if (token && !actionInProgress) setCancelTarget(bookingId);
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
            {uiText(accountType === 'Kasambahay' ? 'My Jobs & Contracts' : 'My Bookings & Hires')}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {penalty && penalty.penalty_points > 0 && <View style={{ paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#FFF7ED' }}>
          <Text style={{ color: '#9A3412', fontSize: 13, lineHeight: 19 }}>
            {penalty.penalty_points}/3 penalty points this month. {penalty.is_restricted ? 'Booking and posting are restricted until the 1st of next month.' : 'Points reset on the 1st of next month.'}
          </Text>
        </View>}

        {/* Mandatory Quality Feedback Banner for Completed Bookings */}
        {(() => {
          const pendingFeedback = bookings.find((b) => b.booking_status === 'Completed' && !b.has_reviewed);
          if (!pendingFeedback) return null;
          const target = getBookingCounterparty(pendingFeedback, user.id);
          const targetName = target ? target.name : 'Partner';

          return (
            <Pressable
              style={styles.mandatoryFeedbackBanner}
              onPress={() => {
                setReviewBooking({
                  id: pendingFeedback.booking_id,
                  revieweeName: targetName,
                  isMandatory: true,
                });
              }}
            >
              <View style={styles.mandatoryFeedbackIconWrap}>
                <Ionicons name="chatbubbles" size={18} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.mandatoryFeedbackTitle}>{uiText("Mandatory Service Feedback")}</Text>
                <Text style={styles.mandatoryFeedbackSub} numberOfLines={2}>
                  {uiText("You have a completed booking with")} {targetName} {uiText("awaiting required review. Tap to complete.")}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#D97706" />
            </Pressable>
          );
        })()}

        {/* Tab Switcher */}
        <View style={styles.tabsRow}>
          {TABS.map((tab) => {
            const isCurrent = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={[styles.tabItem, isCurrent && styles.tabItemActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[styles.tabText, isCurrent && styles.tabTextActive]}>
                  {tab.label}
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
          ) : errorMessage ? (
            <View style={styles.emptyCard}>
              <Ionicons name="cloud-offline-outline" size={44} color="#EF4444" />
              <Text style={styles.emptyTitle}>{uiText("Unable to Load Bookings")}</Text>
              <Text style={styles.emptySubtitle}>{errorMessage}</Text>
              <Pressable
                style={styles.retryBtn}
                onPress={() => loadData()}
              >
                <Ionicons name="refresh" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.retryBtnText}>{uiText("Retry")}</Text>
              </Pressable>
            </View>
          ) : bookings.length > 0 ? (
            bookings.map((booking) => {
              const counterparty = getBookingCounterparty(booking, user.id);
              const statusStyle = getStatusBadgeStyle(booking.booking_status);
              const categories = Array.isArray(booking.service_category)
                ? booking.service_category
                : [booking.service_category];
              const startDate = booking.start_time ? formatDate(booking.start_time, 'compact') : '';
              const safeStartDate = startDate || uiText('Date unavailable');
              const endDate = booking.end_time ? formatDate(booking.end_time, 'compact') : '';
              const safeEndDate = endDate || (booking.booking_type === 'long_term'
                ? uiText('No end date')
                : startDate ? uiText('Same day') : uiText('Date unavailable'));

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
                    <Text style={styles.rateValue}>₱{booking.rate_amount}</Text>
                    <Text style={styles.rateUnit}>
                      / {booking.rate_period} · {booking.booking_type === 'long_term' ? uiText("Long-term") : uiText("Short-term")} · {workSetupLabel(booking.work_setup)}
                    </Text>
                  </View>

                  {booking.rate_needs_review ? <Text style={{ color: '#B45309', marginBottom: 8 }}>{uiText("Legacy rate: the monthly amount needs confirmation.")}</Text> : null}
                  {booking.contract_summary ? <ContractDownloadCard summary={booking.contract_summary} /> : null}

                  {/* Address */}
                  <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={14} color="#6B7280" />
                    <Text style={styles.infoText} numberOfLines={1}>
                      {formatBookingAddress(booking)}
                    </Text>
                  </View>

                  {/* Date/Time */}
                  <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                    <Text style={styles.infoText}>
                      {uiText("Start:")} {safeStartDate}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                    <Text style={styles.infoText}>{uiText('Ends')}: {safeEndDate}</Text>
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
                          {counterparty.account_type} · ⭐ {counterparty.rating > 0 ? counterparty.rating : 'Unrated'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                    </Pressable>
                  ) : (
                    <View style={styles.waitingAssignmentBox}>
                      <Ionicons name="hourglass-outline" size={16} color="#D97706" />
                      <Text style={styles.waitingAssignmentText}>
                        {uiText("Waiting for worker assignment / acceptance")}</Text>
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
                          isPoster: isBookingPoster(booking, user.id),
                          currentRate: booking.rate_amount,
                          ratePeriod: booking.rate_period,
                          rateNeedsReview: booking.rate_needs_review,
                        })
                      }
                    >
                      <Ionicons name="pricetag-outline" size={14} color="#4B5563" style={{ marginRight: 4 }} />
                      <Text style={styles.actionBtnOutlineText}>
                        {uiText("Offers")}{booking.proposals_count ? ` (${booking.proposals_count})` : ''}
                      </Text>
                    </Pressable>

                    {/* Status-specific triggers */}
                    {(booking.booking_status === 'Accepted' || (booking.booking_status === 'InProgress' && !booking.started_at)) && (
                      <Pressable
                        style={styles.actionBtnPrimary}
                        disabled={actionInProgress}
                        onPress={() => handleStart(booking.booking_id)}
                      >
                        <Text style={styles.actionBtnPrimaryText}>{uiText("Start Job")}</Text>
                      </Pressable>
                    )}

                    {booking.booking_status === 'InProgress' && !!booking.started_at && (
                      <Pressable
                        style={[styles.actionBtnPrimary, { backgroundColor: '#10B981' }]}
                        disabled={actionInProgress}
                        onPress={() => handleComplete(booking.booking_id)}
                      >
                        <Text style={styles.actionBtnPrimaryText}>{uiText("Complete")}</Text>
                      </Pressable>
                    )}

                    {booking.booking_status === 'Completed' && (
                      <Pressable
                        style={[
                          styles.actionBtnPrimary,
                          booking.has_reviewed && { backgroundColor: '#E5E7EB' },
                        ]}
                        disabled={booking.has_reviewed || actionInProgress}
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

                    {['Pending', 'Accepted', 'InProgress'].includes(booking.booking_status) && (
                      <Pressable style={styles.actionBtnDanger} disabled={actionInProgress} onPress={() => handleCancel(booking.booking_id)}>
                        <Text style={styles.actionBtnDangerText}>{uiText("Cancel")}</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons
                name={
                  activeTab === 'active'
                    ? 'briefcase-outline'
                    : activeTab === 'pending'
                      ? 'hourglass-outline'
                      : activeTab === 'completed'
                        ? 'checkmark-done-circle-outline'
                        : 'close-circle-outline'
                }
                size={44}
                color="#9CA3AF"
              />
              <Text style={styles.emptyTitle}>
                {activeTab === 'active'
                  ? 'No Active Contracts'
                  : activeTab === 'pending'
                    ? 'No Pending Postings'
                    : activeTab === 'completed'
                      ? 'No Completed Bookings'
                      : 'No Cancelled Bookings'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'active'
                  ? 'Confirmed bookings and ongoing domestic work contracts will appear here.'
                  : activeTab === 'pending'
                    ? 'Open postings waiting for worker assignment, acceptance, or counter-offers will appear here.'
                    : activeTab === 'completed'
                      ? 'Domestic work contracts that have reached completion will appear here.'
                      : 'Bookings that were cancelled or withdrawn will appear here.'}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Modals */}
        {cancelTarget && token && <CancelBookingModal key={cancelTarget} bookingId={cancelTarget} token={token}
          onClose={() => setCancelTarget(null)} onCancelled={safety => {
            setCancelTarget(null);
            if (safety) { onClose(); onSafetyAcknowledged?.(); }
            else void loadData();
          }} />}
        {reviewBooking && (
          <ReviewModal
            visible={!!reviewBooking}
            onClose={() => setReviewBooking(null)}
            bookingId={reviewBooking.id}
            revieweeName={reviewBooking.revieweeName}
            isMandatory={reviewBooking.isMandatory ?? true}
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
            ratePeriod={proposalsTarget.ratePeriod}
            rateNeedsReview={proposalsTarget.rateNeedsReview}
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
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
    fontSize: 12.5,
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
  cancelRequestBanner: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    marginBottom: 10,
  },
  cancelRequestTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991B1B',
  },
  cancelRequestSub: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 16,
    marginTop: 2,
  },
  cancelBannerBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBannerBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  cancelPendingMyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
    marginBottom: 10,
  },
  cancelPendingMyTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#92400E',
  },
  cancelPendingMySub: {
    fontSize: 11.5,
    color: '#6B7280',
    marginTop: 1,
  },
  cancelWithdrawBtn: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
  },
  cancelWithdrawBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
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
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFB43B',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    marginTop: 14,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  mandatoryFeedbackBanner: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mandatoryFeedbackIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  mandatoryFeedbackTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#92400E',
  },
  mandatoryFeedbackSub: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 2,
    lineHeight: 15,
  },
});
