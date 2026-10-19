import { useLanguage as useUiLanguage } from '../../../shared/localization/LanguageContext';
import type { WorkSetup } from '../workSetup';
import { workSetupLabel } from '../workSetup';
import { confirmBookingAcceptance, bookingResponseMessage } from '../bookingAcceptance';
import { buildEngagementSchedule, normalizeServices, toggleService, SERVICE_CHOICES, WORK_SHIFTS, type WorkShift } from '../engagementForm';
import { BookingOfferReview, type BookingOfferStep } from './BookingOfferReview';
import { WorkScheduleFields } from './WorkScheduleFields';
import { WorkLocationFields } from './WorkLocationFields';
import { workLocationError } from '../workLocation';
import { useWorkLocation } from '../hooks/useWorkLocation';
import { validatePostingRate } from '../../posting/validation';
import { ProfileAvatar } from '../../../shared/ui/ProfileAvatar';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { StyleSheet, Text, View, Image, TextInput, Pressable, Modal, Alert, Animated, Dimensions, ScrollView, Keyboard, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fetchMinimumWage, MinimumWageData } from '../api/bookingApi';
import THEME from '../../../shared/theme/theme';

const logoSource = require('../../../../assets/serbisure-logo.png');
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const OFFER_STEPS = [
  { label: 'Service', title: 'What help is needed?', hint: 'Choose the services and work arrangement.' },
  { label: 'Schedule', title: 'When will the work happen?', hint: 'Choose the dates and working times.' },
  { label: 'Location', title: 'Where, and for how much?', hint: 'Add the work address and agreed pay.' },
  { label: 'Review', title: 'Check your booking offer', hint: 'Review the terms before sending them.' },
] as const;

export interface BookingJobPost {
  role?: string;
  rate?: string;
  location?: string;
  extra?: string;
  rawText?: string;
}

export interface BookingConfirmData {
  serviceCategory: string[];
  workSetup: WorkSetup;
  region: string;
  province: string;
  city: string;
  barangay: string;
  street: string;
  floorUnit: string;
  zipCode: string;
  startDate: string;
  endDate: string;
  workHours: string;
  location: string;
  days: string[];
  salary: string;
  bookingType: 'long_term' | 'short_term';
  ongoing?: boolean;
  jobPost?: BookingJobPost | null;
}

interface BookingModalProps {
  visible: boolean;
  onClose: () => void;
  contactName?: string;
  contactRole?: string;
  contactAvatar?: string;
  readOnly?: boolean;
  canRespond?: boolean;
  isConfirmed?: boolean;
  userRole?: 'homeowner' | 'kasambahay';
  token?: string | null;
  bookingType?: 'long_term' | 'short_term';
  jobPost?: BookingJobPost | null;
  initialDetails?: {
    serviceCategory?: string[];
    workSetup?: WorkSetup | null;
    region?: string;
    startDate?: string;
    endDate?: string;
    workHours?: string;
    location?: string;
    days?: string[];
    salary?: string;
    bookingType?: 'long_term' | 'short_term';
    jobPost?: BookingJobPost | null;
  } | null;
  onConfirm?: (bookingDetails: BookingConfirmData) => Promise<void> | void;
  onKasambahayConfirm?: () => Promise<void> | void;
  onKasambahayDecline?: () => Promise<void> | void;
  isDeclined?: boolean;
  isAcquired?: boolean;
}

export function BookingModal({
  visible,
  onClose,
  contactName = 'Kasambahay',
  contactRole = 'Household Helper',
  contactAvatar,
  readOnly = false,
  canRespond = false,
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
  const { tr: uiText } = useUiLanguage();
  const insets = useSafeAreaInsets();

  // Slide animation: Right to Left
  const [modalVisible, setModalVisible] = useState(visible);
  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;

  // Form states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [ongoing, setOngoing] = useState(false);
  const [workHours, setWorkHours] = useState('');
  const [savedLocation, setSavedLocation] = useState('');
  const address = useWorkLocation(visible && !readOnly);
  const location = readOnly ? savedLocation : [address.streetAddress, address.selectedBarangay?.name, address.selectedCity?.name, address.selectedProvince?.name].filter(Boolean).join(', ');
  const [selectedShift, setSelectedShift] = useState<WorkShift | null>(null);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [salary, setSalary] = useState('');
  const [selectedBookingType, setSelectedBookingType] = useState<'long_term' | 'short_term'>('long_term');
  const [serviceCategory, setServiceCategory] = useState<string[]>([]);
  const [workSetup, setWorkSetup] = useState<WorkSetup | null>(null);
  const [savedRegion, setSavedRegion] = useState('');
  const region = readOnly ? savedRegion : address.selectedRegion?.displayName || address.selectedRegion?.name || '';
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [minWageInfo, setMinWageInfo] = useState<MinimumWageData | null>(null);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [policyAttempt, setPolicyAttempt] = useState(0);
  const [offerStep, setOfferStep] = useState<BookingOfferStep>(1);
  const [formError, setFormError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const currentStep = OFFER_STEPS[offerStep - 1]!;
  const wageLocation = address.selectedCity?.name || '';
  const previewLocation = readOnly ? savedLocation : [address.floorUnit.trim(), address.streetAddress.trim(), address.selectedBarangay?.name, address.selectedCity?.name, address.selectedProvince?.name, address.zipcode.trim()].filter(Boolean).join(', ');

  const goToStep = (step: BookingOfferStep, error: string | null = null) => {
    if (submittingRef.current) return;
    Keyboard.dismiss(); setFormError(error); setOfferStep(step);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };
  useEffect(() => { scrollRef.current?.scrollTo({ y: 0, animated: false }); }, [offerStep]);
  useEffect(() => { setFormError(null); }, [serviceCategory.join(','), workSetup, selectedBookingType, startDate, endDate,
    workHours, selectedShift, selectedDays.join(','), region, address.selectedProvince?.code, address.selectedCity?.code,
    address.selectedBarangay?.code, address.streetAddress, address.zipcode, salary]);

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
      submittingRef.current = false;
      setSubmitting(false);
      onClose();
    });
  };

  // Sync initial details and auto-fill from referenced job post
  useEffect(() => {
    if (!visible) return;
    setOfferStep(1); setFormError(null);

    // Detect booking type preference (short-term vs long-term)
    const isShortTermFromJob =
      effectiveJobPost?.extra?.toLowerCase().includes('part') ||
      effectiveJobPost?.rate?.toLowerCase().includes('day') ||
      effectiveJobPost?.extra?.toLowerCase().includes('short') ||
      bookingType === 'short_term';

    const defaultType = initialDetails?.bookingType || (isShortTermFromJob ? 'short_term' : 'long_term');
    setSelectedBookingType(defaultType);

    setStartDate(initialDetails?.startDate || '');
    setEndDate(initialDetails?.endDate || '');
    setOngoing(defaultType === 'long_term' && !!initialDetails && !initialDetails.endDate);
    setWorkHours(initialDetails?.workHours || '');
    setSelectedShift(WORK_SHIFTS.find(item => item.hours === initialDetails?.workHours)?.value || (initialDetails?.workHours ? 'custom' : null));
    setSavedLocation(initialDetails?.location || effectiveJobPost?.location || '');
    setSelectedDays(initialDetails?.days || []);
    setSalary(initialDetails?.salary || '');
    setServiceCategory(normalizeServices(initialDetails?.serviceCategory || []));
    setWorkSetup(initialDetails?.workSetup || null);
    setSavedRegion(initialDetails?.region || '');

  }, [visible, initialDetails, effectiveJobPost, bookingType]);

  useEffect(() => {
    let current = true;
    setMinWageInfo(null);
    if (visible && !readOnly && region) {
      setPolicyLoading(true);
      void fetchMinimumWage(token || undefined, selectedBookingType, wageLocation, region).then(policy => {
        if (current) { setMinWageInfo(policy); setPolicyLoading(false); }
      });
    } else setPolicyLoading(false);
    return () => { current = false; };
  }, [visible, readOnly, token, selectedBookingType, wageLocation, region, policyAttempt]);

  const getSchedule = () => buildEngagementSchedule({
    bookingType: selectedBookingType, startDate, endDate, workHours, days: selectedDays, shift: selectedShift, ongoing,
  });
  const stepError = (step: BookingOfferStep): string | null => {
    if (step === 1) {
      if (!serviceCategory.length) return 'Choose at least one service to continue.';
      if (!workSetup) return 'Choose Stay-in or Stay-out to continue.';
    } else if (step === 2) {
      try { getSchedule(); }
      catch (error) { return error instanceof Error ? error.message : 'Choose a valid work schedule.'; }
    } else if (step === 3) {
      const error = workLocationError(address);
      if (error) return error;
      if (policyLoading) return 'Please wait while the minimum pay for this location is checked.';
      if (!minWageInfo || minWageInfo.booking_type !== selectedBookingType) return 'Minimum pay is unavailable. Reconnect and select a supported work region, then retry.';
      return validatePostingRate(userRole === 'kasambahay' ? 'service' : 'job', selectedBookingType === 'long_term' ? 'long' : 'short', salary, minWageInfo)?.message || null;
    }
    return null;
  };
  const handleNext = () => {
    if (submittingRef.current || offerStep === 4) return;
    const error = stepError(offerStep);
    if (error) { setFormError(error); scrollRef.current?.scrollTo({ y: 0, animated: true }); return; }
    goToStep((offerStep + 1) as BookingOfferStep);
  };
  const handleBack = () => {
    if (submittingRef.current) return;
    if (!readOnly && offerStep > 1) goToStep((offerStep - 1) as BookingOfferStep);
    else handleClose();
  };

  const handleConfirm = () => {
    if (readOnly || offerStep !== 4 || submittingRef.current) return;
    for (const step of [1, 2, 3] as const) {
      const error = stepError(step);
      if (error) { goToStep(step, error); return; }
    }
    const schedule = getSchedule();
    if (!onConfirm || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    void Promise.resolve().then(() => onConfirm({
      startDate, endDate: selectedBookingType === 'short_term' ? startDate : ongoing ? '' : endDate,
      ongoing: selectedBookingType === 'long_term' && ongoing,
      workHours: selectedBookingType === 'short_term' && selectedShift !== 'custom' ? WORK_SHIFTS.find(item => item.value === selectedShift)!.hours : workHours,
      location: location.trim(), days: schedule.work_days,
      salary: salary.trim(), bookingType: selectedBookingType, jobPost: effectiveJobPost,
      serviceCategory: normalizeServices(serviceCategory), workSetup: workSetup!, region,
      province: address.selectedProvince!.name, city: address.selectedCity!.name, barangay: address.selectedBarangay!.name,
      street: address.streetAddress.trim(), floorUnit: address.floorUnit.trim(), zipCode: address.zipcode.trim(),
    })).then(handleClose).catch(error => {
      submittingRef.current = false; setSubmitting(false);
      Alert.alert(uiText('Cannot Send Offer'), uiText(error instanceof Error ? error.message : 'Please try again.'));
    });

  };

  const runResponse = (action?: () => Promise<void> | void) => {
    if (!action || submittingRef.current) return;
    submittingRef.current = true; setSubmitting(true);
    void Promise.resolve().then(action).then(handleClose).catch(error => {
      submittingRef.current = false; setSubmitting(false);
      Alert.alert(uiText('Booking not updated'), uiText(bookingResponseMessage(error)));
    });
  };

  const salaryNum = parseFloat(salary.replace(/[^0-9.]/g, '')) || 0;
  const effectiveMinDaily = minWageInfo?.rate_period === 'day' ? Number(minWageInfo.minimum_rate) : 0;
  const effectiveMinMonthly = minWageInfo?.rate_period === 'month' ? Number(minWageInfo.minimum_rate) : 0;
  const isBelowMinWage =
    salaryNum > 0 &&
    (selectedBookingType === 'short_term'
      ? salaryNum < effectiveMinDaily
      : salaryNum < effectiveMinMonthly);


  return (
    <Modal
      visible={modalVisible}
      animationType="none"
      transparent
      statusBarTranslucent
      onRequestClose={handleBack}
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
          <Pressable onPress={handleBack} disabled={submitting} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </Pressable>

          <View style={styles.headerTitleCenter}>
            <Text style={styles.headerTitle}>{readOnly ? 'Booking Details' : 'Booking Offer'}</Text>
          </View>

          <View style={styles.headerRight}>
            <Image source={logoSource} style={styles.logo} resizeMode="contain" />
          </View>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {!readOnly && <View style={styles.progressContainer}>
          <View style={styles.progressMeta}><Text style={styles.progressText}>{uiText("Step")}{offerStep} {uiText("of")}{OFFER_STEPS.length}</Text>
            <Text style={styles.progressHint}>{currentStep.label}</Text></View>
          <View style={styles.progressRow}>{OFFER_STEPS.map((item, index) => <Pressable key={item.label}
            accessibilityRole="button" accessibilityLabel={`Step ${index + 1}: ${item.label}`}
            accessibilityState={{ selected: offerStep === index + 1, disabled: index + 1 >= offerStep || submitting }}
            disabled={index + 1 >= offerStep || submitting} onPress={() => goToStep((index + 1) as BookingOfferStep)} style={styles.progressItem}>
            <View style={[styles.progressBar, index < offerStep && styles.progressBarActive]} />
            <Text style={[styles.progressLabel, index + 1 === offerStep && styles.progressLabelActive]}>{uiText(item.label)}</Text>
          </Pressable>)}</View>
        </View>}
        <ScrollView ref={scrollRef} style={styles.scrollView} contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <View style={styles.workerCard}>
            <ProfileAvatar uri={contactAvatar} name={contactName} size={40} />
            <View style={styles.workerTextCol}>
              <Text style={styles.workerName} numberOfLines={1}>{contactName}</Text>
              <Text style={styles.kasambahaySub}>{contactRole} · {selectedBookingType === 'short_term' ? uiText("Short-term") : uiText("Long-term")}</Text>
            </View>
          </View>
          {!readOnly && <View style={styles.stepIntro} accessibilityLiveRegion="polite"><Text style={styles.stepTitle}>{offerStep === 1 && userRole === 'kasambahay' ? 'Which services will you offer?' : currentStep.title}</Text><Text style={styles.stepHint}>{currentStep.hint}</Text></View>}
          {!!formError && <View style={styles.errorCard} accessibilityLiveRegion="polite">
            <Ionicons name="alert-circle-outline" size={20} color="#B91C1C" />
            <Text style={styles.errorText}>{uiText(formError)}</Text>
          </View>}

          {!readOnly && offerStep === 1 && <>
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>{uiText("SERVICES")}</Text>
              <View style={styles.serviceGrid}>{SERVICE_CHOICES.map(item => {
                const selected = serviceCategory.includes(item.id);
                return <Pressable key={item.id} disabled={submitting} accessibilityRole="button" accessibilityState={{ selected }}
                  style={[styles.serviceChoice, selected && styles.choiceActive]} onPress={() => setServiceCategory(current => toggleService(current, item.id))}>
                  <Ionicons name={item.icon} size={24} color={selected ? '#9A3412' : '#6B7280'} />
                  <Text style={styles.choiceText}>{uiText(item.label)}</Text>
                  {selected && <Ionicons style={styles.choiceCheck} name="checkmark-circle" size={16} color="#9A3412" />}
                </Pressable>;
              })}</View>
              <Text style={styles.helperText}>{serviceCategory.includes('All-around') ? 'All-around includes all five services.' : 'Select one or more services. All five become All-around.'}</Text>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>{uiText("WORK SETUP")}</Text>
              <View style={styles.typeSelectorRow}>{(['stay_in', 'stay_out'] as const).map(value => <Pressable key={value}
                accessibilityRole="button" accessibilityState={{ selected: workSetup === value }} disabled={submitting}
                style={[styles.setupChoice, workSetup === value && styles.choiceActive]} onPress={() => setWorkSetup(value)}>
                <Ionicons name={value === 'stay_in' ? 'home-outline' : 'walk-outline'} size={20} color="#9A3412" />
                <Text style={styles.choiceText}>{workSetupLabel(value)}</Text>
              </Pressable>)}</View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>{uiText("ENGAGEMENT TYPE")}</Text>
              <View style={styles.typeSelectorRow}>{(['short_term', 'long_term'] as const).map(value => <Pressable key={value}
                accessibilityRole="button" accessibilityState={{ selected: selectedBookingType === value }} disabled={submitting}
                style={[styles.termChoice, selectedBookingType === value && styles.choiceActive]}
                onPress={() => {
                  if (value !== selectedBookingType) { setSalary(''); setWorkHours(''); setSelectedShift(null); setSelectedDays([]); setEndDate(''); setOngoing(false); }
                  setSelectedBookingType(value);
                }}>
                <Text style={styles.choiceText}>{value === 'short_term' ? uiText("Short-term") : uiText("Long-term")}</Text>
                <Text style={styles.helperText}>{value === 'short_term' ? 'A dated shift · daily pay' : 'Ongoing work · monthly pay'}</Text>
              </Pressable>)}</View>
            </View>
          </>}
          {!readOnly && offerStep === 2 && <WorkScheduleFields bookingType={selectedBookingType} startDate={startDate} endDate={endDate}
            workHours={workHours} days={selectedDays} shift={selectedShift}
            onStartDate={setStartDate} onEndDate={setEndDate} onWorkHours={setWorkHours} onDays={setSelectedDays}
            onShift={value => { setSelectedShift(value); const preset = WORK_SHIFTS.find(item => item.value === value); if (preset) setWorkHours(preset.hours); }}
            ongoing={ongoing} onOngoing={setOngoing}
            disabled={!visible || submitting} />}
          {!readOnly && offerStep === 3 && <>
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>{uiText("WORK ADDRESS")}</Text>
              <WorkLocationFields form={address} disabled={submitting} />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>{selectedBookingType === 'short_term' ? 'AGREED DAILY RATE' : 'AGREED MONTHLY SALARY'}</Text>
              <View style={[styles.inputBox, isBelowMinWage && styles.inputBoxInvalid]}>
                <Text style={styles.currencyPrefix}>₱</Text>
                <TextInput accessibilityLabel={selectedBookingType === 'short_term' ? 'Daily rate' : 'Monthly salary'}
                  style={styles.inputText} value={salary} onChangeText={setSalary} editable={!submitting} keyboardType="decimal-pad"
                  placeholder="Enter amount" placeholderTextColor="#9CA3AF" />
                <Text style={styles.rateUnitSuffix}>{selectedBookingType === 'short_term' ? uiText("/ day") : uiText("/ month")}</Text>
              </View>
              {policyLoading ? <View style={styles.policyLoading}><ActivityIndicator size="small" color="#9A3412" /><Text style={styles.helperText}>{uiText("Checking minimum pay…")}</Text></View>
                : minWageInfo ? <Text style={[styles.helperText, isBelowMinWage && styles.invalidRateHint]}>
                  {uiText("Minimum: ₱")}{Number(minWageInfo.minimum_rate).toLocaleString('en-PH')} / {minWageInfo.rate_period === 'day' ? uiText("day") : uiText("month")}
                </Text> : !!region && <Pressable accessibilityRole="button" style={styles.retryPolicy} onPress={() => { setFormError(null); setPolicyAttempt(value => value + 1); }}>
                  <Ionicons name="refresh-outline" size={16} color="#9A3412" /><Text style={styles.retryText}>{uiText("Minimum pay unavailable · Retry")}</Text>
                </Pressable>}
            </View>
          </>}
          {(readOnly || offerStep === 4) && <>
            <BookingOfferReview serviceCategory={serviceCategory} workSetup={workSetup} bookingType={selectedBookingType}
              startDate={startDate} endDate={selectedBookingType === 'short_term' && !readOnly ? startDate : endDate}
              ongoing={ongoing}
              workHours={workHours} days={selectedDays} region={region} location={previewLocation} salary={salary}
              onEdit={readOnly ? undefined : goToStep} disabled={submitting} />
            <View style={styles.policyCard}><Ionicons name="information-circle-outline" size={18} color="#9A3412" />
              <Text style={styles.policyCardText}>{readOnly ? 'These are the saved terms of this booking offer.' : `${contactName} can review and accept or decline this offer.`}
                {selectedBookingType === 'long_term' ? ' After acceptance, print and sign the DOLE form and register at the Barangay.' : ''}</Text>
            </View>
          </>}
        </ScrollView>

        {/* Action Button Footer */}
        <View style={styles.footerContainer}>
          {readOnly ? (
            isAcquired ? (
              <View style={[styles.pendingBanner, { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' }]}>
                <Ionicons name="lock-closed" size={18} color="#64748B" style={{ marginRight: 6 }} />
                <Text style={[styles.pendingBannerText, { color: '#475569' }]}>{uiText("This job position has already been acquired.")}</Text>
              </View>
            ) : isDeclined ? (
              <View style={[styles.pendingBanner, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}>
                <Ionicons name="close-circle" size={18} color="#EF4444" style={{ marginRight: 6 }} />
                <Text style={[styles.pendingBannerText, { color: '#B91C1C' }]}>{uiText("Booking Offer Declined")}</Text>
              </View>
            ) : isConfirmed ? (
              <View style={styles.confirmedBanner}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" style={{ marginRight: 6 }} />
                <Text style={styles.confirmedBannerText}>{uiText("Booking Confirmed")}</Text>
              </View>
            ) : canRespond ? (
              <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
                <Pressable
                  disabled={submitting} style={({ pressed }) => [styles.declineBtn, pressed && styles.pressedBtn]}
                  onPress={() => {
                    Alert.alert(
                      'Decline Booking Offer',
                      `Are you sure you want to decline this booking offer from ${contactName}? The offer status will be updated.`,
                      [
                        { text: 'Keep Reviewing', style: 'cancel' },
                        {
                          text: 'Decline Offer',
                          style: 'destructive',
                          onPress: () => {
                            runResponse(onKasambahayDecline);
                          },
                        },
                      ]
                    );
                  }}
                >
                  <Ionicons name="close-circle-outline" size={18} color="#DC2626" style={{ marginRight: 6 }} />
                  <Text style={styles.declineBtnText}>{uiText("Decline")}</Text>
                </Pressable>

                <Pressable
                  disabled={submitting} style={({ pressed }) => [styles.agreeBtn, { flex: 1 }, pressed && styles.pressedBtn]}
                  onPress={() => confirmBookingAcceptance(selectedBookingType, uiText, () => runResponse(onKasambahayConfirm))}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.agreeBtnText}>{uiText("Agree & Accept")}</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.pendingBanner}>
                <Ionicons name="time-outline" size={18} color="#D97706" style={{ marginRight: 6 }} />
                <Text style={styles.pendingBannerText}>
                  {uiText("Offer Sent • Waiting for")}{contactName || uiText("Kasambahay")} {uiText("to accept or decline")}</Text>
              </View>
            )
          ) : (
            <View style={styles.footerRow}>
              <Pressable accessibilityRole="button" disabled={submitting} onPress={handleBack} style={styles.wizardBack}>
                <Text style={styles.wizardBackText}>{offerStep === 1 ? uiText("Cancel") : uiText("Back")}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" disabled={submitting || (offerStep === 3 && policyLoading)}
                style={({ pressed }) => [styles.confirmBtn, styles.wizardNext, pressed && styles.pressedBtn, (submitting || (offerStep === 3 && policyLoading)) && styles.disabledBtn]}
                onPress={offerStep === 4 ? handleConfirm : handleNext}>
                {(submitting || (offerStep === 3 && policyLoading)) && <ActivityIndicator size="small" color="#0D0D11" />}
                <Text style={styles.confirmBtnText}>{submitting ? 'Sending…' : offerStep === 3 && policyLoading ? 'Checking pay…' : offerStep === 4 ? 'Send Offer' : offerStep === 3 ? 'Review Offer' : uiText("Next")}</Text>
                {!submitting && !(offerStep === 3 && policyLoading) && <Ionicons name={offerStep === 4 ? 'paper-plane-outline' : 'arrow-forward'} size={18} color="#0D0D11" />}
              </Pressable>
            </View>
          )}
        </View>
        </KeyboardAvoidingView>
      </Animated.View>

    </Modal>
  );
}

const styles = StyleSheet.create({
  progressContainer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10 },
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressText: { color: '#9A3412', fontSize: 12, fontFamily: THEME.typography.fontFamily.mainBold },
  progressHint: { color: THEME.colors.textSecondary, fontSize: 12 },
  progressRow: { flexDirection: 'row', gap: 8 },
  progressItem: { flex: 1 },
  progressBar: { height: 4, borderRadius: 4, backgroundColor: '#E5E7EB', marginBottom: 6 },
  progressBarActive: { backgroundColor: THEME.colors.brand },
  progressLabel: { color: THEME.colors.textSecondary, fontSize: 11, textAlign: 'center' },
  progressLabelActive: { color: '#9A3412', fontFamily: THEME.typography.fontFamily.mainBold },
  stepIntro: { marginBottom: 20 },
  stepTitle: { color: THEME.colors.ink, fontSize: 23, fontFamily: THEME.typography.fontFamily.display, marginBottom: 4 },
  stepHint: { color: THEME.colors.textSecondary, fontSize: 13, lineHeight: 19 },
  serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  serviceChoice: { width: '31%', flexGrow: 1, minHeight: 82, padding: 12, borderRadius: 18, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  choiceActive: { backgroundColor: THEME.colors.brandLight, borderColor: THEME.colors.brandDark },
  choiceCheck: { position: 'absolute', top: 7, right: 7 },
  choiceText: { color: THEME.colors.ink, fontSize: 13, fontFamily: THEME.typography.fontFamily.mainBold, textAlign: 'center' },
  setupChoice: { flex: 1, minHeight: 52, flexDirection: 'row', gap: 8, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', padding: 12 },
  termChoice: { flex: 1, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', padding: 12, gap: 4 },
  helperText: { color: THEME.colors.textSecondary, fontSize: 11, lineHeight: 16, marginTop: 6 },
  errorCard: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: 14, backgroundColor: '#FEF2F2', marginBottom: 16 },
  errorText: { flex: 1, color: '#B91C1C', fontSize: 13, lineHeight: 19 },
  policyLoading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  retryPolicy: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingVertical: 8 },
  retryText: { color: '#9A3412', fontSize: 12 },
  footerRow: { flexDirection: 'row', gap: 10 },
  wizardBack: { flex: 0.4, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: '#FFFFFF' },
  wizardBackText: { color: THEME.colors.ink, fontFamily: THEME.typography.fontFamily.mainBold, fontSize: 14 },
  wizardNext: { flex: 1, flexDirection: 'row', gap: 8, paddingHorizontal: 12 },
  disabledBtn: { opacity: 0.6 },
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
    padding: 12,
    marginBottom: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  workerTextCol: {
    flex: 1,
  },
  workerName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  kasambahaySub: {
    fontSize: 12.5,
    color: '#666',
    fontWeight: '500',
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
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 8,
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
  currencyPrefix: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1A1A',
    marginRight: 4,
  },
  rateUnitSuffix: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#8E8E93',
    marginLeft: 6,
  },
  invalidRateHint: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
    marginTop: 5,
    paddingHorizontal: 2,
  },
  footerContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 4,
    backgroundColor: '#F6F5F2',
  },
  confirmBtn: {
    backgroundColor: THEME.colors.brand,
    borderRadius: 24,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME.colors.brand,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  confirmBtnText: {
    color: '#0D0D11',
    fontFamily: THEME.typography.fontFamily.mainBold,
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
  policyCard: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 14,
    marginTop: 10,
    marginBottom: 16,
  },
  policyCardText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: '#4B5563',
  },
});
