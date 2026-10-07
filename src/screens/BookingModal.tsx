import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TextInput,
  Pressable,
  Modal,
  Alert,
  Animated,
  Dimensions,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fetchMinimumWage, MinimumWageData } from '../api/bookingApi';
import THEME from '../config/theme';

const logoSource = require('../../assets/serbisure-logo.png');
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface BookingJobPost {
  role?: string;
  rate?: string;
  location?: string;
  extra?: string;
  rawText?: string;
}

export interface BookingConfirmData {
  startDate: string;
  endDate: string;
  workHours: string;
  location: string;
  days: string[];
  salary: string;
  bookingType: 'long_term' | 'short_term';
  jobPost?: BookingJobPost | null;
}

interface BookingModalProps {
  visible: boolean;
  onClose: () => void;
  contactName?: string;
  contactRole?: string;
  contactAvatar?: string;
  readOnly?: boolean;
  isConfirmed?: boolean;
  userRole?: 'homeowner' | 'kasambahay';
  token?: string | null;
  bookingType?: 'long_term' | 'short_term';
  jobPost?: BookingJobPost | null;
  initialDetails?: {
    startDate?: string;
    endDate?: string;
    workHours?: string;
    location?: string;
    days?: string[];
    salary?: string;
    bookingType?: 'long_term' | 'short_term';
    jobPost?: BookingJobPost | null;
  } | null;
  onConfirm?: (bookingDetails: BookingConfirmData) => void;
  onKasambahayConfirm?: () => void;
  onKasambahayDecline?: () => void;
  isDeclined?: boolean;
  isAcquired?: boolean;
}

const ALL_DAYS = ['M', 'T', 'W', 'Th', 'F', 'S', 'Su'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const WEEKDAY_HEADER = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function computeDurationDays(startStr: string, endStr: string): string {
  try {
    const s = new Date(startStr);
    const e = new Date(endStr);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return '';
    const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return 'Invalid range';
    if (diff === 0) return '1 Day';
    if (diff >= 28 && diff <= 32) return '1 Month (Approx)';
    if (diff > 32 && diff % 30 < 5) return `${Math.round(diff / 30)} Months`;
    return `${diff} Days`;
  } catch {
    return '';
  }
}

export function BookingModal({
  visible,
  onClose,
  contactName = 'Kasambahay',
  contactRole = 'Household Helper',
  contactAvatar = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300',
  readOnly = false,
  isConfirmed = false,
  userRole = 'homeowner',
  token,
  bookingType = 'long_term',
  jobPost = null,
  initialDetails = null,
  onConfirm,
  onKasambahayConfirm,
  onKasambahayDecline,
  isDeclined = false,
  isAcquired = false,
}: BookingModalProps) {
  const insets = useSafeAreaInsets();

  // Slide animation: Right to Left
  const [modalVisible, setModalVisible] = useState(visible);
  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;

  // Form states
  const [startDate, setStartDate] = useState('04/27/2026');
  const [endDate, setEndDate] = useState('05/27/2026');
  const [workHours, setWorkHours] = useState('08:00 AM - 05:00 PM');
  const [location, setLocation] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>(['M', 'T', 'W', 'Th', 'F']);
  const [salary, setSalary] = useState('5000');
  const [selectedBookingType, setSelectedBookingType] = useState<'long_term' | 'short_term'>('long_term');
  const [minWageInfo, setMinWageInfo] = useState<MinimumWageData | null>(null);

  // Active Job Post reference
  const effectiveJobPost = useMemo(() => {
    return initialDetails?.jobPost || jobPost;
  }, [initialDetails?.jobPost, jobPost]);

  // Open / Close animation effect
  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      slideAnim.setValue(SCREEN_WIDTH);
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 26,
        mass: 0.85,
        stiffness: 240,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_WIDTH,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setModalVisible(false);
      onClose();
    });
  };

  // Sync initial details and auto-fill from referenced job post
  useEffect(() => {
    if (!visible) return;

    // Detect booking type preference (short-term vs long-term)
    const isShortTermFromJob =
      effectiveJobPost?.extra?.toLowerCase().includes('part') ||
      effectiveJobPost?.rate?.toLowerCase().includes('day') ||
      effectiveJobPost?.extra?.toLowerCase().includes('short') ||
      bookingType === 'short_term';

    const defaultType = initialDetails?.bookingType || (isShortTermFromJob ? 'short_term' : 'long_term');
    setSelectedBookingType(defaultType);

    if (initialDetails) {
      if (initialDetails.startDate) setStartDate(initialDetails.startDate);
      if (initialDetails.endDate) setEndDate(initialDetails.endDate);
      if (initialDetails.workHours) setWorkHours(initialDetails.workHours);
      if (initialDetails.location) setLocation(initialDetails.location);
      else if (effectiveJobPost?.location) setLocation(effectiveJobPost.location);
      else setLocation('Zone 6, Cugman');
      if (initialDetails.days) setSelectedDays(initialDetails.days);
      if (initialDetails.salary) setSalary(initialDetails.salary.replace(/[^0-9.]/g, ''));
      else if (effectiveJobPost?.rate) {
        const digits = effectiveJobPost.rate.replace(/[^0-9.]/g, '');
        if (digits) setSalary(digits);
      }
    } else {
      // Auto-fill from job post!
      const defaultLocation = effectiveJobPost?.location || 'Zone 6, Cugman';
      setLocation(defaultLocation);

      if (effectiveJobPost?.rate) {
        const digits = effectiveJobPost.rate.replace(/[^0-9.]/g, '');
        setSalary(digits || (defaultType === 'short_term' ? '600' : '6500'));
      } else {
        setSalary(defaultType === 'short_term' ? '600' : '6500');
      }

      setStartDate('04/27/2026');
      setEndDate(defaultType === 'short_term' ? '05/04/2026' : '05/27/2026');
      setWorkHours('08:00 AM - 05:00 PM');
      setSelectedDays(['M', 'T', 'W', 'Th', 'F']);
    }
  }, [visible, initialDetails, effectiveJobPost, bookingType]);

  // Minimum wage query for long term
  useEffect(() => {
    if (visible && selectedBookingType === 'long_term') {
      fetchMinimumWage(token || undefined, 'long_term', location)
        .then((data) => {
          if (data) setMinWageInfo(data);
        })
        .catch(() => {});
    }
  }, [visible, selectedBookingType, location, token]);

  // Date Picker Modal State
  const [datePickerTarget, setDatePickerTarget] = useState<'start' | 'end' | null>(null);
  const [calendarYear, setCalendarYear] = useState(2026);
  const [calendarMonth, setCalendarMonth] = useState(3); // 0-indexed: 3 = April

  // Time Picker Modal State
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [startHour, setStartHour] = useState('08');
  const [startMin, setStartMin] = useState('00');
  const [startAmpm, setStartAmpm] = useState('AM');
  const [endHour, setEndHour] = useState('05');
  const [endMin, setEndMin] = useState('00');
  const [endAmpm, setEndAmpm] = useState('PM');

  const toggleDay = (day: string) => {
    if (readOnly) return;
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleConfirm = () => {
    if (!startDate || !endDate) {
      Alert.alert('Missing Dates', 'Please select both start and end dates.');
      return;
    }
    if (!location.trim()) {
      Alert.alert('Missing Location', 'Please provide the service location.');
      return;
    }
    if (!salary.trim()) {
      Alert.alert('Missing Salary', 'Please provide the rate/salary.');
      return;
    }

    const salaryVal = parseFloat(salary.replace(/[^0-9.]/g, '')) || 0;
    if (selectedBookingType === 'short_term') {
      if (salaryVal < 600) {
        Alert.alert(
          'Minimum Daily Rate',
          'The rate cannot be below ₱600/day on a short-term basis.'
        );
        return;
      }
    } else {
      if (salaryVal < 6500) {
        Alert.alert(
          'Minimum Monthly Salary',
          'Under Batas Kasambahay (RA 10361), the monthly salary cannot be below ₱6,500/month.'
        );
        return;
      }
    }

    Alert.alert(
      'Notice: Cancellation Policy',
      'Please note the following booking terms:\n\n' +
      '• 2-Hour Cancellation: Cancellation is applicable within 2 hours of booking confirmation only. Beyond 2 hours, you cannot cancel.\n' +
      '• Mutual Confirmation: BOTH parties must be prompted and confirm before cancellation takes effect.\n' +
      '• 3-Strike Restriction: Cancelling confirmed bookings three times will lead to account restriction.\n\n' +
      'Do you want to send this booking offer?',
      [
        { text: 'Review Again', style: 'cancel' },
        {
          text: 'Confirm & Send',
          onPress: () => {
            onConfirm?.({
              startDate,
              endDate,
              workHours,
              location: location.trim(),
              days: selectedDays,
              salary: salary.trim(),
              bookingType: selectedBookingType,
              jobPost: effectiveJobPost,
            });
            handleClose();
          },
        },
      ]
    );
  };

  // Calendar Date Picker Helpers
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const firstDayIndex = new Date(calendarYear, calendarMonth, 1).getDay();

  const handleSelectDate = (dayNum: number) => {
    const formattedMonth = (calendarMonth + 1).toString().padStart(2, '0');
    const formattedDay = dayNum.toString().padStart(2, '0');
    const dateStr = `${formattedMonth}/${formattedDay}/${calendarYear}`;

    if (datePickerTarget === 'start') {
      setStartDate(dateStr);
    } else if (datePickerTarget === 'end') {
      setEndDate(dateStr);
    }
    setDatePickerTarget(null);
  };

  const handleConfirmTime = () => {
    const formattedWorkHours = `${startHour}:${startMin} ${startAmpm} - ${endHour}:${endMin} ${endAmpm}`;
    setWorkHours(formattedWorkHours);
    setShowTimePicker(false);
  };

  const salaryNum = parseFloat(salary.replace(/[^0-9.]/g, '')) || 0;
  const effectiveMinDaily = 600;
  const effectiveMinMonthly = minWageInfo?.min_monthly_rate ? Math.max(6500, parseFloat(minWageInfo.min_monthly_rate)) : 6500;
  const isBelowMinWage =
    salaryNum > 0 &&
    (selectedBookingType === 'short_term'
      ? salaryNum < effectiveMinDaily
      : salaryNum < effectiveMinMonthly);
  const durationText = computeDurationDays(startDate, endDate);

  const isKasambahayUser = userRole === 'kasambahay';

  return (
    <Modal
      visible={modalVisible}
      animationType="none"
      transparent
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ translateX: slideAnim }],
            paddingTop: Math.max(insets.top, 14),
            paddingBottom: Math.max(insets.bottom, 14),
          },
        ]}
      >
        {/* Global Aligned Header Matching Chat Screen */}
        <View style={styles.header}>
          <Pressable onPress={handleClose} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </Pressable>

          <View style={styles.headerTitleCenter}>
            <Text style={styles.headerTitle}>{readOnly ? 'Booking Details' : 'Booking Offer'}</Text>
          </View>

          <View style={styles.headerRight}>
            <Image source={logoSource} style={styles.logo} resizeMode="contain" />
          </View>
        </View>

        {/* Scrollable Form Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Worker Info Card */}
          <View style={styles.workerCard}>
            <Image source={{ uri: contactAvatar }} style={styles.workerAvatar} />
            <View style={styles.workerTextCol}>
              <View style={styles.workerNameRow}>
                <Text style={styles.workerName}>{contactName}</Text>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" style={{ marginLeft: 4 }} />
              </View>

              <View style={styles.workerSubRow}>
                <Text style={styles.kasambahaySub}>{contactRole || 'Kasambahay'}</Text>
                <Text style={styles.metaDot}>•</Text>
                <View
                  style={[
                    styles.termBadgeSmall,
                    selectedBookingType === 'short_term' ? styles.termBadgeShort : styles.termBadgeLong,
                  ]}
                >
                  <Text
                    style={[
                      styles.termBadgeSmallText,
                      selectedBookingType === 'short_term' ? styles.termBadgeShortText : styles.termBadgeLongText,
                    ]}
                  >
                    {selectedBookingType === 'short_term' ? 'Short-Term' : 'Long-Term'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* CONTRACT DURATION SELECTOR / HIGHLIGHT */}
          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>CONTRACT TYPE</Text>
            {readOnly ? (
              <View
                style={[
                  styles.termReadonlyCard,
                  selectedBookingType === 'short_term' ? styles.termReadonlyShort : styles.termReadonlyLong,
                ]}
              >
                <Ionicons
                  name={selectedBookingType === 'short_term' ? 'sunny' : 'business'}
                  size={18}
                  color={selectedBookingType === 'short_term' ? '#D97706' : '#2563EB'}
                />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={styles.termReadonlyTitle}>
                    {selectedBookingType === 'short_term' ? 'Short-Term' : 'Long-Term'}
                  </Text>
                  <Text style={styles.termReadonlySub}>
                    {selectedBookingType === 'short_term'
                      ? 'Flexible daily or project-based household service'
                      : 'Regular monthly domestic arrangement'}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.typeSelectorRow}>
                <Pressable
                  style={[
                    styles.typePill,
                    selectedBookingType === 'short_term' ? styles.typePillActive : styles.typePillInactive,
                  ]}
                  onPress={() => {
                    setSelectedBookingType('short_term');
                    const num = parseFloat(salary.replace(/[^0-9.]/g, '')) || 0;
                    if (num >= 5000 || num < 600) {
                      setSalary('600');
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.typePillText,
                      selectedBookingType === 'short_term' ? styles.typePillTextActive : styles.typePillTextInactive,
                    ]}
                  >
                    Short-Term
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.typePill,
                    selectedBookingType === 'long_term' ? styles.typePillActive : styles.typePillInactive,
                  ]}
                  onPress={() => {
                    setSelectedBookingType('long_term');
                    const num = parseFloat(salary.replace(/[^0-9.]/g, '')) || 0;
                    if (num < 6500) {
                      setSalary('6500');
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.typePillText,
                      selectedBookingType === 'long_term' ? styles.typePillTextActive : styles.typePillTextInactive,
                    ]}
                  >
                    Long-Term
                  </Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* UNIFIED START DATE TO END DATE */}
          <View style={styles.formGroup}>
            <View style={styles.labelRowWithDuration}>
              <Text style={styles.fieldLabel}>START DATE TO END DATE</Text>
              {durationText ? (
                <View style={styles.durationBadge}>
                  <Ionicons name="calendar-outline" size={12} color="#D97706" style={{ marginRight: 4 }} />
                  <Text style={styles.durationBadgeText}>{durationText}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.dateRangeCard}>
              {/* Start Date Box */}
              <Pressable
                style={styles.dateRangeBox}
                onPress={() => !readOnly && setDatePickerTarget('start')}
                disabled={readOnly}
              >
                <Text style={styles.dateRangeSubLabel}>START</Text>
                <View style={styles.dateValueRow}>
                  <Ionicons name="calendar" size={16} color="#FFA51F" style={{ marginRight: 6 }} />
                  <Text style={styles.dateValueText}>{startDate || 'MM/DD/YYYY'}</Text>
                </View>
              </Pressable>

              {/* Arrow Connector */}
              <View style={styles.dateArrowContainer}>
                <Ionicons name="arrow-forward" size={18} color="#9CA3AF" />
              </View>

              {/* End Date Box */}
              <Pressable
                style={styles.dateRangeBox}
                onPress={() => !readOnly && setDatePickerTarget('end')}
                disabled={readOnly}
              >
                <Text style={styles.dateRangeSubLabel}>END</Text>
                <View style={styles.dateValueRow}>
                  <Ionicons name="calendar" size={16} color="#FFA51F" style={{ marginRight: 6 }} />
                  <Text style={styles.dateValueText}>{endDate || 'MM/DD/YYYY'}</Text>
                </View>
              </Pressable>
            </View>
          </View>

          {/* WORK HOURS */}
          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>WORK HOURS</Text>
            <Pressable
              style={styles.inputBox}
              onPress={() => !readOnly && setShowTimePicker(true)}
              disabled={readOnly}
            >
              <Ionicons name="time" size={18} color="#FFA51F" style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.inputText, { flex: 1 }]}
                value={workHours}
                onChangeText={setWorkHours}
                editable={!readOnly}
                placeholder="e.g. 08:00 AM - 05:00 PM"
                placeholderTextColor="#999"
              />
            </Pressable>
          </View>

          {/* LOCATION (Auto-filled from job post) */}
          <View style={styles.formGroup}>
            <View style={styles.labelRowWithDuration}>
              <Text style={styles.fieldLabel}>LOCATION</Text>
              {effectiveJobPost?.location ? (
                <Text style={styles.autoFilledHint}>Auto-filled from job</Text>
              ) : null}
            </View>
            <View style={styles.inputBox}>
              <Ionicons name="location" size={18} color="#FFA51F" style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.inputText, { flex: 1 }]}
                value={location}
                onChangeText={setLocation}
                editable={!readOnly}
                placeholder="Enter street, barangay, or city..."
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* WORK SCHEDULE */}
          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>WORK SCHEDULE (DAYS)</Text>
            <View style={styles.daysRow}>
              {ALL_DAYS.map((day) => {
                const isSelected = selectedDays.includes(day);
                return (
                  <Pressable
                    key={day}
                    disabled={readOnly}
                    style={[styles.dayPill, isSelected ? styles.dayPillSelected : styles.dayPillUnselected]}
                    onPress={() => toggleDay(day)}
                  >
                    <Text style={[styles.dayText, isSelected ? styles.dayTextSelected : styles.dayTextUnselected]}>
                      {day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* SALARY / RATE */}
          <View style={styles.formGroup}>
            <View style={styles.labelRowWithDuration}>
              <Text style={styles.fieldLabel}>
                {selectedBookingType === 'short_term' ? 'RATE (PER DAY / SHORT-TERM)' : 'MONTHLY SALARY'}
              </Text>
              {effectiveJobPost?.rate ? (
                <Text style={styles.autoFilledHint}>Auto-filled from job</Text>
              ) : null}
            </View>
            <View style={[styles.inputBox, isBelowMinWage && styles.inputBoxInvalid]}>
              <Text style={[styles.currencyPrefix, isBelowMinWage && styles.currencyPrefixInvalid]}>₱ </Text>
              <TextInput
                style={[styles.inputText, { flex: 1 }, isBelowMinWage && styles.inputTextInvalid]}
                value={salary}
                onChangeText={setSalary}
                editable={!readOnly}
                keyboardType="numeric"
                placeholder={selectedBookingType === 'short_term' ? '600' : '6500'}
                placeholderTextColor={isBelowMinWage ? '#FCA5A5' : '#999'}
              />
              <Text style={[styles.rateUnitSuffix, isBelowMinWage && styles.rateUnitSuffixInvalid]}>
                {selectedBookingType === 'short_term' ? '/day' : '/month'}
              </Text>
            </View>
            {isBelowMinWage && (
              <Text style={styles.invalidRateHint}>
                {selectedBookingType === 'short_term'
                  ? 'Minimum rate is ₱600 / day'
                  : 'Minimum salary is ₱6,500 / month'}
              </Text>
            )}
          </View>

          {/* CANCELLATION POLICY NOTICE */}
          <View style={styles.policyCard}>
            <View style={styles.policyCardHeader}>
              <Ionicons name="shield-checkmark" size={17} color="#D97706" style={{ marginRight: 6 }} />
              <Text style={styles.policyCardTitle}>Important Cancellation Policy</Text>
            </View>
            <View style={styles.policyCardItem}>
              <Ionicons name="time-outline" size={14} color="#B45309" style={{ marginRight: 6, marginTop: 2 }} />
              <Text style={styles.policyCardText}>
                <Text style={styles.policyCardBold}>2-Hour Window: </Text>
                Cancellation is only applicable within 2 hours of booking confirmation. Beyond 2 hours, you cannot cancel the booking.
              </Text>
            </View>
            <View style={styles.policyCardItem}>
              <Ionicons name="people-outline" size={14} color="#B45309" style={{ marginRight: 6, marginTop: 2 }} />
              <Text style={styles.policyCardText}>
                <Text style={styles.policyCardBold}>Mutual Confirmation: </Text>
                BOTH parties must be prompted to cancel and confirm cancellation before it takes effect.
              </Text>
            </View>
            <View style={styles.policyCardItem}>
              <Ionicons name="alert-circle-outline" size={14} color="#DC2626" style={{ marginRight: 6, marginTop: 2 }} />
              <Text style={styles.policyCardText}>
                <Text style={[styles.policyCardBold, { color: '#DC2626' }]}>3-Strike Restriction: </Text>
                Three (3) times cancelling confirmed bookings will lead to account restriction.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Action Button Footer */}
        <View style={styles.footerContainer}>
          {readOnly ? (
            isAcquired ? (
              <View style={[styles.pendingBanner, { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' }]}>
                <Ionicons name="lock-closed" size={18} color="#64748B" style={{ marginRight: 6 }} />
                <Text style={[styles.pendingBannerText, { color: '#475569' }]}>This job position has already been acquired.</Text>
              </View>
            ) : isDeclined ? (
              <View style={[styles.pendingBanner, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}>
                <Ionicons name="close-circle" size={18} color="#EF4444" style={{ marginRight: 6 }} />
                <Text style={[styles.pendingBannerText, { color: '#B91C1C' }]}>Booking Offer Declined</Text>
              </View>
            ) : isConfirmed ? (
              <View style={styles.confirmedBanner}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" style={{ marginRight: 6 }} />
                <Text style={styles.confirmedBannerText}>Booking Confirmed & Active Contract</Text>
              </View>
            ) : isKasambahayUser ? (
              <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
                <Pressable
                  style={({ pressed }) => [styles.declineBtn, pressed && styles.pressedBtn]}
                  onPress={() => {
                    Alert.alert(
                      'Decline Booking Offer',
                      `Are you sure you want to decline this booking offer from ${contactName}? They will be notified.`,
                      [
                        { text: 'Keep Reviewing', style: 'cancel' },
                        {
                          text: 'Decline Offer',
                          style: 'destructive',
                          onPress: () => {
                            onKasambahayDecline?.();
                            handleClose();
                          },
                        },
                      ]
                    );
                  }}
                >
                  <Ionicons name="close-circle-outline" size={18} color="#DC2626" style={{ marginRight: 6 }} />
                  <Text style={styles.declineBtnText}>Decline</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [styles.agreeBtn, { flex: 1 }, pressed && styles.pressedBtn]}
                  onPress={() => {
                    Alert.alert(
                      'Confirm Contract Agreement',
                      'Please note the following cancellation policy:\n\n' +
                      '• 2-Hour Window: Cancellation is applicable within 2 hours of confirmation only. Beyond 2 hours, you cannot cancel.\n' +
                      '• Dual Confirmation: BOTH parties must prompt and confirm to cancel.\n' +
                      '• 3-Strike Restriction: Three times cancelling confirmed bookings will lead to account restriction.\n\n' +
                      'Do you agree and accept this contract?',
                      [
                        { text: 'Review Details', style: 'cancel' },
                        {
                          text: 'Agree & Accept',
                          onPress: () => {
                            onKasambahayConfirm?.();
                            handleClose();
                          },
                        },
                      ]
                    );
                  }}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.agreeBtnText}>Agree & Accept</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.pendingBanner}>
                <Ionicons name="time-outline" size={18} color="#D97706" style={{ marginRight: 6 }} />
                <Text style={styles.pendingBannerText}>
                  Offer Sent • Waiting for {contactName || 'Kasambahay'} to accept or decline
                </Text>
              </View>
            )
          ) : (
            <Pressable
              style={({ pressed }) => [styles.confirmBtn, pressed && styles.pressedBtn]}
              onPress={handleConfirm}
            >
              <Text style={styles.confirmBtnText}>Send Booking Offer to Kasambahay ➔</Text>
            </Pressable>
          )}
        </View>
      </Animated.View>

      {/* Interactive Calendar Month Date Picker Modal */}
      {!readOnly && (
        <Modal
          visible={datePickerTarget !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setDatePickerTarget(null)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setDatePickerTarget(null)}>
            <Pressable style={styles.calendarCard} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.calendarHeaderTitle}>
                Select {datePickerTarget === 'start' ? 'Start Date' : 'End Date'}
              </Text>

              <View style={styles.monthNavRow}>
                <Pressable
                  onPress={() => {
                    if (calendarMonth === 0) {
                      setCalendarMonth(11);
                      setCalendarYear((y) => y - 1);
                    } else {
                      setCalendarMonth((m) => m - 1);
                    }
                  }}
                  hitSlop={10}
                >
                  <Ionicons name="chevron-back" size={20} color="#1A1A1A" />
                </Pressable>

                <Text style={styles.monthNavText}>
                  {MONTH_NAMES[calendarMonth]} {calendarYear}
                </Text>

                <Pressable
                  onPress={() => {
                    if (calendarMonth === 11) {
                      setCalendarMonth(0);
                      setCalendarYear((y) => y + 1);
                    } else {
                      setCalendarMonth((m) => m + 1);
                    }
                  }}
                  hitSlop={10}
                >
                  <Ionicons name="chevron-forward" size={20} color="#1A1A1A" />
                </Pressable>
              </View>

              {/* Weekday Header */}
              <View style={styles.weekdayRow}>
                {WEEKDAY_HEADER.map((w) => (
                  <Text key={w} style={styles.weekdayText}>
                    {w}
                  </Text>
                ))}
              </View>

              {/* Calendar Days Grid */}
              <View style={styles.calendarGrid}>
                {Array.from({ length: firstDayIndex }).map((_, i) => (
                  <View key={`empty-${i}`} style={styles.calendarCell} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const formattedMonth = (calendarMonth + 1).toString().padStart(2, '0');
                  const formattedDay = dayNum.toString().padStart(2, '0');
                  const thisDateStr = `${formattedMonth}/${formattedDay}/${calendarYear}`;
                  const isSelected =
                    datePickerTarget === 'start' ? startDate === thisDateStr : endDate === thisDateStr;

                  return (
                    <Pressable
                      key={`day-${dayNum}`}
                      style={[styles.calendarCell, isSelected && styles.calendarCellSelected]}
                      onPress={() => handleSelectDate(dayNum)}
                    >
                      <Text style={[styles.calendarCellText, isSelected && styles.calendarCellTextSelected]}>
                        {dayNum}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* Interactive Time Picker Selector Modal */}
      {!readOnly && (
        <Modal
          visible={showTimePicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowTimePicker(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowTimePicker(false)}>
            <Pressable style={styles.timeCard} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.pickerTitle}>Set Work Hours</Text>

              <Text style={styles.timeSectionLabel}>START TIME</Text>
              <View style={styles.timeSelectorRow}>
                <View style={styles.timeGroup}>
                  <Text style={styles.timeSubLabel}>Hour</Text>
                  <View style={styles.timePillsScroll}>
                    {['06', '07', '08', '09', '10', '11', '12'].map((h) => (
                      <Pressable
                        key={h}
                        style={[styles.timeChip, startHour === h && styles.timeChipActive]}
                        onPress={() => setStartHour(h)}
                      >
                        <Text style={[styles.timeChipText, startHour === h && styles.timeChipTextActive]}>{h}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View style={styles.timeGroup}>
                  <Text style={styles.timeSubLabel}>AM/PM</Text>
                  <View style={styles.timePillsScroll}>
                    {['AM', 'PM'].map((ap) => (
                      <Pressable
                        key={ap}
                        style={[styles.timeChip, startAmpm === ap && styles.timeChipActive]}
                        onPress={() => setStartAmpm(ap)}
                      >
                        <Text style={[styles.timeChipText, startAmpm === ap && styles.timeChipTextActive]}>{ap}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>

              <Text style={[styles.timeSectionLabel, { marginTop: 14 }]}>END TIME</Text>
              <View style={styles.timeSelectorRow}>
                <View style={styles.timeGroup}>
                  <Text style={styles.timeSubLabel}>Hour</Text>
                  <View style={styles.timePillsScroll}>
                    {['03', '04', '05', '06', '07', '08', '09'].map((h) => (
                      <Pressable
                        key={h}
                        style={[styles.timeChip, endHour === h && styles.timeChipActive]}
                        onPress={() => setEndHour(h)}
                      >
                        <Text style={[styles.timeChipText, endHour === h && styles.timeChipTextActive]}>{h}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View style={styles.timeGroup}>
                  <Text style={styles.timeSubLabel}>AM/PM</Text>
                  <View style={styles.timePillsScroll}>
                    {['AM', 'PM'].map((ap) => (
                      <Pressable
                        key={ap}
                        style={[styles.timeChip, endAmpm === ap && styles.timeChipActive]}
                        onPress={() => setEndAmpm(ap)}
                      >
                        <Text style={[styles.timeChipText, endAmpm === ap && styles.timeChipTextActive]}>{ap}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>

              <Pressable style={styles.confirmTimeBtn} onPress={handleConfirmTime}>
                <Text style={styles.confirmTimeBtnText}>Done</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F5F2',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EBE9E4',
    backgroundColor: '#F6F5F2',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#1A1A1A',
    fontFamily: THEME.typography.fontFamily.display,
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  logo: {
    height: 34,
    width: 34,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  workerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  workerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  workerTextCol: {
    flex: 1,
  },
  workerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  workerName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  workerSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  kasambahaySub: {
    fontSize: 12.5,
    color: '#666',
    fontWeight: '500',
  },
  metaDot: {
    marginHorizontal: 6,
    color: '#A0A0A0',
    fontSize: 12,
  },
  termBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 10,
  },
  termBadgeShort: {
    backgroundColor: '#FEF3C7',
  },
  termBadgeLong: {
    backgroundColor: '#EFF6FF',
  },
  termBadgeSmallText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  termBadgeShortText: {
    color: '#D97706',
  },
  termBadgeLongText: {
    color: '#2563EB',
  },
  formGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  labelRowWithDuration: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  autoFilledHint: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#10B981',
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  durationBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#D97706',
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 14,
  },
  typePillActive: {
    backgroundColor: '#FFA51F',
  },
  typePillInactive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  typePillText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  typePillTextActive: {
    color: '#FFFFFF',
  },
  typePillTextInactive: {
    color: '#555555',
  },
  termReadonlyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  termReadonlyShort: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  termReadonlyLong: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  termReadonlyTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  termReadonlySub: {
    fontSize: 11,
    color: '#666',
    marginTop: 1,
  },
  dateRangeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  dateRangeBox: {
    flex: 1,
    backgroundColor: '#F9F8F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dateRangeSubLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#8E8E93',
    letterSpacing: 0.5,
  },
  dateValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 2,
  },
  dateValueText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  dateArrowContainer: {
    paddingHorizontal: 8,
  },
  inputBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  inputBoxInvalid: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  inputText: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  inputTextInvalid: {
    color: '#DC2626',
  },
  currencyPrefix: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1A1A',
    marginRight: 4,
  },
  currencyPrefixInvalid: {
    color: '#DC2626',
  },
  rateUnitSuffix: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#8E8E93',
    marginLeft: 6,
  },
  rateUnitSuffixInvalid: {
    color: '#DC2626',
  },
  invalidRateHint: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
    marginTop: 5,
    paddingHorizontal: 2,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayPill: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPillSelected: {
    backgroundColor: '#FFA51F',
  },
  dayPillUnselected: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  dayText: {
    fontSize: 13,
    fontWeight: '700',
  },
  dayTextSelected: {
    color: '#FFFFFF',
  },
  dayTextUnselected: {
    color: '#4B5563',
  },
  jobRefHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  jobPostCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  jobPostTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  jobPostRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  jobPostRoleText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  termPillClean: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  termPillCleanShort: {
    backgroundColor: '#FFFBEB',
  },
  termPillCleanLong: {
    backgroundColor: '#EFF6FF',
  },
  termPillCleanText: {
    fontSize: 11,
    fontWeight: '700',
  },
  termPillCleanTextShort: {
    color: '#D97706',
  },
  termPillCleanTextLong: {
    color: '#2563EB',
  },
  jobPostDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F8F6',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  jobPostMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  jobPostMetaText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    marginLeft: 4,
  },
  footerContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 4,
    backgroundColor: '#F6F5F2',
  },
  confirmBtn: {
    backgroundColor: '#FFA51F',
    borderRadius: 24,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFA51F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  agreeBtn: {
    flexDirection: 'row',
    backgroundColor: '#059669',
    borderRadius: 24,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  agreeBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  declineBtn: {
    flex: 0.45,
    height: 50,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  declineBtnText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 14,
    fontFamily: THEME.typography.fontFamily.mainBold,
  },
  pressedBtn: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  confirmedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  confirmedBannerText: {
    color: '#047857',
    fontSize: 14,
    fontWeight: '800',
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  pendingBannerText: {
    color: '#B45309',
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  calendarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 340,
    elevation: 5,
  },
  calendarHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 12,
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  monthNavText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekdayText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8E93',
    width: 36,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarCell: {
    width: `${100 / 7}%`,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    marginVertical: 2,
  },
  calendarCellSelected: {
    backgroundColor: '#FFA51F',
  },
  calendarCellText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  calendarCellTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  timeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 320,
    elevation: 5,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 14,
  },
  timeSectionLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#8E8E93',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  timeSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  timeGroup: {
    flex: 1,
  },
  timeSubLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
  },
  timePillsScroll: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  timeChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  timeChipActive: {
    backgroundColor: '#FFA51F',
  },
  timeChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
  },
  timeChipTextActive: {
    color: '#FFFFFF',
  },
  confirmTimeBtn: {
    backgroundColor: '#FFA51F',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 18,
  },
  confirmTimeBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  policyCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 14,
    marginTop: 10,
    marginBottom: 16,
  },
  policyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  policyCardTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.3,
  },
  policyCardItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
  },
  policyCardText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: '#4B5563',
  },
  policyCardBold: {
    fontWeight: '700',
    color: '#1F2937',
  },
});
