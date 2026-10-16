import { useLanguage as useUiLanguage } from '../../../shared/localization/LanguageContext';
import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Image, Pressable, Modal, Animated, PanResponder, Dimensions, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../../auth/session/UserContext';
import { fetchReviewSummary, ReviewSummaryData } from '../../reviews/api/reviewApi';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SNAP_EXPANDED = 0;
const SNAP_COLLAPSED = Math.round(SCREEN_HEIGHT * 0.40);
const SNAP_DISMISSED = SCREEN_HEIGHT;

export interface JobDetailData {
  id: number | string;
  partnerId?: number | string;
  employerName?: string;
  title?: string;
  avatar?: string;
  image?: string;
  time?: string;
  location?: string;
  roleTag?: string;
  termTag?: string;
  tags?: string[];
  price?: string;
  unit?: string;
  aboutText?: string;
  description?: string;
}

export interface JobDetailSheetProps {
  visible: boolean;
  job: JobDetailData | null;
  onClose: () => void;
  onApply: (job: any) => void;
  isApplied: boolean;
  isSaved?: boolean;
  isClosed?: boolean;
  onToggleSave?: (job: any) => void;
  onViewProfile?: () => void;
  ctaText?: string;
  ctaNotice?: string;
  token?: string | null;
}

export function JobDetailSheet({
  visible,
  job,
  onClose,
  onApply,
  isApplied,
  isSaved = false,
  isClosed = false,
  onToggleSave,
  onViewProfile,
  ctaText,
  ctaNotice,
  token,
}: JobDetailSheetProps) {
  const { tr: uiText } = useUiLanguage();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const effectiveToken = token || user?.token;

  const [summary, setSummary] = useState<ReviewSummaryData | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState(false);

  useEffect(() => {
    if (!visible || !job) {
      setSummary(null);
      setIsSummaryLoading(false);
      setSummaryError(false);
      return;
    }

    const rawTargetId = (job as any).partnerId || (job as any).partner_id || (job as any).poster_id || job.id;
    const targetUserId = rawTargetId ? String(rawTargetId).trim() : '';

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetUserId);

    if (!isUuid || !effectiveToken) {
      setSummary(null);
      setIsSummaryLoading(false);
      setSummaryError(false);
      return;
    }

    let isMounted = true;
    setIsSummaryLoading(true);
    setSummaryError(false);

    fetchReviewSummary(effectiveToken, targetUserId)
      .then((data) => {
        if (isMounted) {
          setSummary(data);
          setIsSummaryLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn('[JobDetailSheet] fetchReviewSummary failed:', err);
          setSummaryError(true);
          setIsSummaryLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [visible, job?.id, (job as any)?.partnerId, effectiveToken]);

  const panY = useRef(new Animated.Value(SNAP_EXPANDED)).current;
  const currentSnapRef = useRef<'collapsed' | 'expanded'>('expanded');
  const [currentSnap, setCurrentSnap] = useState<'collapsed' | 'expanded'>('expanded');
  const currentTranslateY = useRef(SNAP_EXPANDED);
  const gestureStartY = useRef(SNAP_EXPANDED);
  const isClosingRef = useRef(false);

  // Sync currentTranslateY with panY for precise gesture tracking
  useEffect(() => {
    const id = panY.addListener(({ value }) => {
      currentTranslateY.current = value;
    });
    return () => {
      panY.removeListener(id);
    };
  }, [panY]);

  const snapTo = (toValue: number, snapName: 'collapsed' | 'expanded', onComplete?: () => void) => {
    currentSnapRef.current = snapName;
    setCurrentSnap(snapName);
    currentTranslateY.current = toValue;
    Animated.spring(panY, {
      toValue,
      damping: 24,
      stiffness: 260,
      mass: 0.8,
      overshootClamping: true,
      useNativeDriver: true,
    }).start(onComplete);
  };

  const handleClose = () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    Animated.timing(panY, {
      toValue: SNAP_DISMISSED,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      onClose();
      isClosingRef.current = false;
      currentSnapRef.current = 'expanded';
      setCurrentSnap('expanded');
      currentTranslateY.current = SNAP_EXPANDED;
    });
  };

  // Entrance animation: opens to top/expanded position by default!
  useEffect(() => {
    if (visible && job) {
      isClosingRef.current = false;
      currentSnapRef.current = 'expanded';
      setCurrentSnap('expanded');
      currentTranslateY.current = SNAP_EXPANDED;
      panY.setValue(SNAP_DISMISSED);
      Animated.spring(panY, {
        toValue: SNAP_EXPANDED,
        damping: 24,
        stiffness: 240,
        mass: 0.8,
        overshootClamping: true,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, job]);

  // Release physics for snapping between expanded, collapsed, and dismiss
  const handleRelease = (gestureState: { dy: number; vy: number }) => {
    const { dy, vy } = gestureState;
    const currentY = currentTranslateY.current;

    if (currentSnapRef.current === 'collapsed') {
      // 1. Swipe up to expand back to top default position
      if (dy < -35 || vy < -0.25) {
        snapTo(SNAP_EXPANDED, 'expanded');
      }
      // 2. Swipe down to dismiss completely
      else if (dy > 55 || vy > 0.35) {
        handleClose();
      }
      // Return to resting collapsed position
      else {
        snapTo(SNAP_COLLAPSED, 'collapsed');
      }
    } else {
      // Currently expanded (top default position)
      if (dy > 0) {
        // Deep swipe down or rapid downward flick -> dismiss completely
        if (dy > SNAP_COLLAPSED + 50 || vy > 0.95 || currentY > SNAP_COLLAPSED + 60) {
          handleClose();
        }
        // Responsive swipe down -> collapse back to mid height
        else if (dy > 45 || vy > 0.25 || currentY > SNAP_COLLAPSED * 0.25) {
          snapTo(SNAP_COLLAPSED, 'collapsed');
        }
        // Small nudge -> stay expanded
        else {
          snapTo(SNAP_EXPANDED, 'expanded');
        }
      } else {
        // Swiped up while already expanded -> stay expanded
        snapTo(SNAP_EXPANDED, 'expanded');
      }
    }
  };

  // Single unified PanResponder for smooth 1:1 up/down drag gestures across the sheet
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 3 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 3 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderGrant: () => {
        gestureStartY.current = currentTranslateY.current;
      },
      onPanResponderMove: (_, gestureState) => {
        const rawY = gestureStartY.current + gestureState.dy;
        // Strictly prevent pulling the sheet upward past its resting top position!
        const targetY = Math.max(SNAP_EXPANDED, rawY);
        panY.setValue(targetY);
      },
      onPanResponderRelease: (_, gestureState) => {
        handleRelease(gestureState);
      },
      onPanResponderTerminate: (_, gestureState) => {
        handleRelease(gestureState);
      },
    })
  ).current;

  if (!visible || !job) return null;

  const employerName = job.employerName || job.title || 'Homeowner';
  const avatarUrl =
    job.avatar ||
    job.image ||
    'https://ui-avatars.com/api/?name=' + encodeURIComponent(employerName);
  const rawRole = job.roleTag || (job.tags && job.tags[1]) || 'Household Help';
  const role = rawRole.replace(/_/g, ' ');
  const term = job.termTag || 'Not specified';
  const location = job.location || 'Location not provided';
  const time = job.time || 'Date not available';
  const price = job.price || 'Rate not provided';
  const unit = job.unit || '';
  const about =
    job.aboutText ||
    job.description ||
    'No description provided.';

  const backdropOpacity = panY.interpolate({
    inputRange: [SNAP_EXPANDED, SNAP_COLLAPSED, SNAP_DISMISSED],
    outputRange: [1, 0.75, 0],
    extrapolate: 'clamp',
  });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        {/* Animated Dark Backdrop */}
        <Animated.View style={[styles.modalBackdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        {/* Animated Bottom Sheet */}
        <Animated.View
          style={[
            styles.sheetContent,
            {
              paddingBottom: Math.max(insets.bottom, 20) + 80,
              marginBottom: -80,
              transform: [{ translateY: panY }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          {/* Top Drag & Header Area */}
          <View style={styles.sheetTopArea}>
            <Pressable
              style={styles.handleHitZone}
              onPress={() => {
                if (currentSnapRef.current === 'collapsed') {
                  snapTo(SNAP_EXPANDED, 'expanded');
                } else {
                  snapTo(SNAP_COLLAPSED, 'collapsed');
                }
              }}
              hitSlop={12}
            >
              <View style={styles.sheetHandle} />
            </Pressable>

            {/* Header: Employer Avatar, Name, Badges & Save Action */}
            <View style={styles.sheetHeader}>
              <Pressable
                onPress={onViewProfile}
                disabled={!onViewProfile}
                style={styles.avatarWrap}
                hitSlop={8}
              >
                <Image source={{ uri: avatarUrl }} style={styles.sheetAvatar} />
              </Pressable>

              <View style={styles.sheetTitleInfo}>
                <Pressable
                  onPress={onViewProfile}
                  disabled={!onViewProfile}
                  style={styles.nameRow}
                  hitSlop={8}
                >
                  <Text style={styles.sheetEmployerName} numberOfLines={1}>
                    {employerName}
                  </Text>
                  <Ionicons name="checkmark-circle" size={19} color="#10B981" style={{ marginLeft: 5 }} />
                </Pressable>

                <View style={styles.locationRow}>
                  <Ionicons name="location-sharp" size={13} color="#F97316" />
                  <Text style={styles.sheetLocation} numberOfLines={1}>
                    {location}
                  </Text>
                </View>

                <View style={styles.sheetTagRow}>
                  <View style={styles.rolePill}>
                    <Text style={styles.rolePillText}>{role}</Text>
                  </View>
                  <Text style={styles.sheetPostTime}>• {time}</Text>
                </View>
              </View>

              {/* Bookmark Button */}
              {onToggleSave && (
                <Pressable
                  style={({ pressed }) => [styles.bookmarkBtn, pressed && { opacity: 0.7 }]}
                  onPress={() => onToggleSave(job)}
                  hitSlop={10}
                >
                  <Ionicons
                    name={isSaved ? 'bookmark' : 'bookmark-outline'}
                    size={22}
                    color={isSaved ? '#F97316' : '#64748B'}
                  />
                </Pressable>
              )}
            </View>
          </View>

          {/* SWIPABLE BODY */}
          <View style={styles.sheetScrollContent}>
            {/* Price & Term Display */}
            <View style={styles.priceRow}>
              <View style={styles.priceWrap}>
                <Text style={styles.sheetPrice}>{price}</Text>
                <Text style={styles.sheetUnit}>{unit}</Text>
              </View>
              <View style={[styles.termBadge, term.toLowerCase().includes('short') && styles.termBadgeShort]}>
                <Text style={[styles.termText, term.toLowerCase().includes('short') && styles.termTextShort]}>
                  {term}
                </Text>
              </View>
            </View>

            {/* About This Role (Clean Squircle Card) */}
            <View style={styles.aboutCard}>
              <View style={styles.aboutHeader}>
                <Ionicons name="briefcase-outline" size={14} color="#F97316" />
                <Text style={styles.aboutTitle}>{uiText("ABOUT THIS ROLE")}</Text>
              </View>
              <Text style={styles.aboutBody}>{about}</Text>
            </View>

            {/* Dynamic Worker/Employer Feedback Summary from Database */}
            {(() => {
              const totalReviews = summary?.total_reviews || 0;
              const posCount = summary?.sentiment_breakdown?.Positive || 0;
              const neuCount = summary?.sentiment_breakdown?.Neutral || 0;
              const negCount = summary?.sentiment_breakdown?.Negative || 0;

              const posPct = totalReviews > 0 ? Math.round((posCount / totalReviews) * 100) : 0;
              const neuPct = totalReviews > 0 ? Math.round((neuCount / totalReviews) * 100) : 0;
              const negPct = totalReviews > 0 ? Math.max(0, 100 - posPct - neuPct) : 0;

              const avgRating = summary?.average_rating ? Number(summary.average_rating) : 0;
              const ratingBadgeText = avgRating > 0 ? `${avgRating.toFixed(1)} Rating` : 'Unrated';

              return (
                <View style={styles.feedbackSection}>
                  <View style={styles.feedbackHeaderRow}>
                    <Text style={styles.feedbackSectionTitle}>{uiText("Feedback Summary")}</Text>
                    <View style={styles.feedbackPillBadge}>
                      <Ionicons name="star" size={12} color="#F59E0B" />
                      <Text style={styles.feedbackPillBadgeText}>{ratingBadgeText}</Text>
                    </View>
                  </View>

                  {isSummaryLoading ? (
                    <View style={styles.feedbackLoadingBox}>
                      <ActivityIndicator size="small" color="#FFB43B" />
                      <Text style={styles.feedbackLoadingText}>{uiText("Loading feedback metrics...")}</Text>
                    </View>
                  ) : summaryError ? (
                    <View style={styles.feedbackEmptyCard}>
                      <Ionicons name="alert-circle-outline" size={22} color="#94A3B8" style={{ marginBottom: 4 }} />
                      <Text style={styles.feedbackEmptyTitle}>{uiText("Feedback data unavailable")}</Text>
                      <Text style={styles.feedbackEmptySubtitle}>{uiText("Could not load review summary at this time.")}</Text>
                    </View>
                  ) : totalReviews === 0 ? (
                    <View style={styles.feedbackEmptyCard}>
                      <Ionicons name="chatbubbles-outline" size={24} color="#CBD5E1" style={{ marginBottom: 6 }} />
                      <Text style={styles.feedbackEmptyTitle}>{uiText("No reviews yet")}</Text>
                      <Text style={styles.feedbackEmptySubtitle}>
                        {uiText("This member has no completed service reviews yet. Feedback will appear here after bookings.")}</Text>
                    </View>
                  ) : (
                    <React.Fragment>
                      {/* Proportional Segmented Progress Bar */}
                      <View style={styles.progressBarWrap}>
                        {posPct > 0 && (
                          <View style={[styles.progressSegment, { flex: Math.max(posPct, 1), backgroundColor: '#10B981' }]} />
                        )}
                        {neuPct > 0 && (
                          <View style={[styles.progressSegment, { flex: Math.max(neuPct, 1), backgroundColor: '#94A3B8' }]} />
                        )}
                        {negPct > 0 && (
                          <View style={[styles.progressSegment, { flex: Math.max(negPct, 1), backgroundColor: '#F87171' }]} />
                        )}
                      </View>

                      {/* 3 Metric Cards */}
                      <View style={styles.feedbackRow}>
                        <View style={[styles.feedbackCard, styles.feedbackPositive]}>
                          <Text style={[styles.feedbackValue, { color: '#059669' }]}>{posPct}%</Text>
                          <Text style={[styles.feedbackLabel, { color: '#047857' }]}>Positive ({posCount})</Text>
                        </View>
                        <View style={[styles.feedbackCard, styles.feedbackNeutral]}>
                          <Text style={[styles.feedbackValue, { color: '#475569' }]}>{neuPct}%</Text>
                          <Text style={[styles.feedbackLabel, { color: '#64748B' }]}>Neutral ({neuCount})</Text>
                        </View>
                        <View style={[styles.feedbackCard, styles.feedbackNegative]}>
                          <Text style={[styles.feedbackValue, { color: '#DC2626' }]}>{negPct}%</Text>
                          <Text style={[styles.feedbackLabel, { color: '#B91C1C' }]}>Negative ({negCount})</Text>
                        </View>
                      </View>

                      <Text style={styles.feedbackSubCountText}>
                        Based on {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'} from completed bookings
                      </Text>
                    </React.Fragment>
                  )}
                </View>
              );
            })()}

            {/* Apply Button & Direct Message Notice */}
            <Pressable
              disabled={isClosed}
              style={({ pressed }) => [
                styles.applyBtn,
                isClosed
                  ? { backgroundColor: '#E2E8F0', shadowOpacity: 0, elevation: 0 }
                  : isApplied
                    ? styles.applyBtnDone
                    : null,
                pressed && !isClosed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
              ]}
              onPress={() => !isClosed && onApply(job)}
            >
              {isClosed ? (
                <View style={styles.applyBtnInner}>
                  <Ionicons name="lock-closed" size={18} color="#64748B" style={{ marginRight: 6 }} />
                  <Text style={[styles.applyBtnText, { color: '#64748B' }]}>{uiText("Listing Closed (Position Filled)")}</Text>
                </View>
              ) : isApplied ? (
                <View style={styles.applyBtnInner}>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.applyBtnText}>{uiText("Application Submitted")}</Text>
                </View>
              ) : (
                <Text style={styles.applyBtnText}>{ctaText || 'Apply Now'}</Text>
              )}
            </Pressable>

            <Text style={styles.applyNotice}>
              {isClosed
                ? 'This post has been filled and contract made with an applicant.'
                : ctaNotice || 'Your application goes directly to the employer'}
            </Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  sheetContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 20,
  },
  sheetTopArea: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  handleHitZone: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  sheetHandle: {
    width: 48,
    height: 5,
    backgroundColor: '#CBD5E1',
    borderRadius: 9999,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F8FAFC',
    marginRight: 14,
    overflow: 'hidden',
  },
  sheetAvatar: {
    width: '100%',
    height: '100%',
  },
  sheetTitleInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sheetEmployerName: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
    marginBottom: 4,
  },
  sheetLocation: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#64748B',
  },
  sheetTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rolePill: {
    backgroundColor: '#0F172A',
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 3.5,
  },
  rolePillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  sheetPostTime: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#94A3B8',
  },
  bookmarkBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sheetScroll: {
    flexGrow: 0,
  },
  sheetScrollContent: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  priceWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  sheetPrice: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.8,
  },
  sheetUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  termBadge: {
    backgroundColor: '#FFF7ED',
    borderRadius: 9999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  termBadgeShort: {
    backgroundColor: '#E0F2FE',
  },
  termText: {
    color: '#C2410C',
    fontSize: 12,
    fontWeight: '700',
  },
  termTextShort: {
    color: '#0369A1',
  },
  aboutCard: {
    backgroundColor: '#FFF9F5',
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
  },
  aboutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  aboutTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#EA580C',
    letterSpacing: 0.8,
  },
  aboutBody: {
    fontSize: 13.5,
    lineHeight: 21,
    color: '#334155',
    fontWeight: '500',
  },
  feedbackSection: {
    marginBottom: 16,
  },
  feedbackHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  feedbackSectionTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  feedbackPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 9999,
  },
  feedbackPillBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  progressBarWrap: {
    height: 6,
    borderRadius: 9999,
    backgroundColor: '#E2E8F0',
    flexDirection: 'row',
    overflow: 'hidden',
    gap: 2,
    marginBottom: 10,
  },
  progressSegment: {
    height: '100%',
    borderRadius: 9999,
  },
  feedbackRow: {
    flexDirection: 'row',
    gap: 8,
  },
  feedbackCard: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 18,
    alignItems: 'center',
  },
  feedbackPositive: {
    backgroundColor: '#ECFDF5',
  },
  feedbackNeutral: {
    backgroundColor: '#F1F5F9',
  },
  feedbackNegative: {
    backgroundColor: '#FEF2F2',
  },
  feedbackValue: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  feedbackLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    marginTop: 2,
  },
  feedbackSubCountText: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },
  feedbackLoadingBox: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
  },
  feedbackLoadingText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  feedbackEmptyCard: {
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  feedbackEmptyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  feedbackEmptySubtitle: {
    fontSize: 11.5,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 16,
  },
  applyBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 9999,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  applyBtnDone: {
    backgroundColor: '#10B981',
  },
  applyBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  applyNotice: {
    fontSize: 11.5,
    color: '#94A3B8',
    fontWeight: '500',
    textAlign: 'center',
  },
});
