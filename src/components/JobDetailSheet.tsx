import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  ScrollView,
  Pressable,
  Modal,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SNAP_EXPANDED = 0;
const SNAP_COLLAPSED = Math.round(SCREEN_HEIGHT * 0.40);
const SNAP_DISMISSED = SCREEN_HEIGHT;

export interface JobDetailData {
  id: number | string;
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
  onToggleSave?: (job: any) => void;
}

export function JobDetailSheet({
  visible,
  job,
  onClose,
  onApply,
  isApplied,
  isSaved = false,
  onToggleSave,
}: JobDetailSheetProps) {
  const insets = useSafeAreaInsets();
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
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300';
  const rawRole = job.roleTag || (job.tags && job.tags[1]) || 'Household Help';
  const role = rawRole.replace(/_/g, ' ');
  const term = job.termTag || (job.tags && job.tags[2]) || 'Long-term';
  const location = job.location || 'Brgy. Pagatpat, CDO';
  const time = job.time || 'Posted 1h ago';
  const price = job.price || '₱15,000';
  const unit = job.unit || '/ month';
  const about =
    job.aboutText ||
    job.description ||
    'Experienced household assistance needed. Verified and safe family household.';

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
              <View style={styles.avatarWrap}>
                <Image source={{ uri: avatarUrl }} style={styles.sheetAvatar} />
              </View>

              <View style={styles.sheetTitleInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.sheetEmployerName} numberOfLines={1}>
                    {employerName}
                  </Text>
                  <Ionicons name="checkmark-circle" size={19} color="#10B981" style={{ marginLeft: 5 }} />
                </View>

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
                <Text style={styles.aboutTitle}>ABOUT THIS ROLE</Text>
              </View>
              <Text style={styles.aboutBody}>{about}</Text>
            </View>

            {/* Worker Feedback Summary (Visual Squircle Cards + Progress Bar) */}
            <View style={styles.feedbackSection}>
              <View style={styles.feedbackHeaderRow}>
                <Text style={styles.feedbackSectionTitle}>Worker Feedback Summary</Text>
                <View style={styles.feedbackPillBadge}>
                  <Ionicons name="star" size={12} color="#F59E0B" />
                  <Text style={styles.feedbackPillBadgeText}>4.8 Rating</Text>
                </View>
              </View>

              {/* Proportional Segmented Progress Bar */}
              <View style={styles.progressBarWrap}>
                <View style={[styles.progressSegment, { flex: 72, backgroundColor: '#10B981' }]} />
                <View style={[styles.progressSegment, { flex: 18, backgroundColor: '#94A3B8' }]} />
                <View style={[styles.progressSegment, { flex: 10, backgroundColor: '#F87171' }]} />
              </View>

              {/* 3 Metric Cards */}
              <View style={styles.feedbackRow}>
                <View style={[styles.feedbackCard, styles.feedbackPositive]}>
                  <Text style={[styles.feedbackValue, { color: '#059669' }]}>72%</Text>
                  <Text style={[styles.feedbackLabel, { color: '#047857' }]}>Positive</Text>
                </View>
                <View style={[styles.feedbackCard, styles.feedbackNeutral]}>
                  <Text style={[styles.feedbackValue, { color: '#475569' }]}>18%</Text>
                  <Text style={[styles.feedbackLabel, { color: '#64748B' }]}>Neutral</Text>
                </View>
                <View style={[styles.feedbackCard, styles.feedbackNegative]}>
                  <Text style={[styles.feedbackValue, { color: '#DC2626' }]}>10%</Text>
                  <Text style={[styles.feedbackLabel, { color: '#B91C1C' }]}>Negative</Text>
                </View>
              </View>
            </View>

            {/* Apply Button & Direct Message Notice */}
            <Pressable
              style={({ pressed }) => [
                styles.applyBtn,
                isApplied && styles.applyBtnDone,
                pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
              ]}
              onPress={() => onApply(job)}
            >
              {isApplied ? (
                <View style={styles.applyBtnInner}>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.applyBtnText}>Application Submitted</Text>
                </View>
              ) : (
                <Text style={styles.applyBtnText}>Apply Now</Text>
              )}
            </Pressable>

            <Text style={styles.applyNotice}>Your application goes directly to the employer</Text>
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
