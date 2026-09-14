import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  Pressable,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  StatusBar,
  Alert,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL, fetchWithTimeout } from '../../config/api';
import THEME from '../../config/theme';
import { useUser } from '../../context/UserContext';
import { VerificationRequiredModal } from '../../ui/VerificationRequiredModal';

const logoSource = require('../../../assets/serbisure-logo.png');

function generateUUIDv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

interface PostServiceScreenProps {
  visible: boolean;
  onClose: () => void;
  token?: string | null;
  onOpenVerification?: () => void;
}

export function PostServiceScreen({ visible, onClose, token, onOpenVerification }: PostServiceScreenProps) {
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const effectiveToken = token || user?.token || null;

  // Form State
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [engagementType, setEngagementType] = useState<'short' | 'long' | null>(null);
  const [setupPreference, setSetupPreference] = useState<'stay-out' | 'stay-in' | null>(null);
  const [selectedTime, setSelectedTime] = useState<'morning' | 'afternoon' | 'night' | null>(null);
  const [address, setAddress] = useState('');
  const [floorUnit, setFloorUnit] = useState('');
  const [instructions, setInstructions] = useState('');
  const [offerAmount, setOfferAmount] = useState('500');
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [postedSuccess, setPostedSuccess] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [showVerificationRequired, setShowVerificationRequired] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string>('Unverified');


  // Animation values for Logo Loader
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    if (postedSuccess) {
      scaleAnim.setValue(0.7);
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }).start();

      rotateAnim.setValue(0);
      const animation = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      animation.start();

      return () => animation.stop();
    }
  }, [postedSuccess]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const BASE_SERVICES = ['Cleaning', 'Child_care', 'Cooking', 'Caregiver', 'Laundry'];

  const services = [
    { id: 'Cleaning', label: 'Cleaning', icon: 'sparkles' },
    { id: 'Child_care', label: 'Child Care', icon: 'happy' },
    { id: 'Cooking', label: 'Cook', icon: 'restaurant' },
    { id: 'Caregiver', label: 'Caregiver', icon: 'heart' },
    { id: 'Laundry', label: 'Laundry', icon: 'shirt' },
    { id: 'All-around', label: 'All-around', icon: 'home' },
  ];

  const handleToggleService = (id: string) => {
    // 1. If clicking 'All-around'
    if (id === 'All-around') {
      if (selectedServices.includes('All-around')) {
        setSelectedServices([]);
      } else {
        setSelectedServices(['All-around']);
      }
      return;
    }

    // 2. If 'All-around' is currently selected and user clicks one of the specific services:
    // Switch away from All-around and select ONLY the clicked service!
    if (selectedServices.includes('All-around')) {
      setSelectedServices([id]);
      return;
    }

    // 3. Normal multi-select toggle
    let updated: string[];
    if (selectedServices.includes(id)) {
      updated = selectedServices.filter((s) => s !== id);
    } else {
      updated = [...selectedServices, id];
    }

    // 4. Check if all 5 base services are selected -> automatically switch to All-around!
    const hasAllFive = BASE_SERVICES.every((baseId) => updated.includes(baseId));
    if (hasAllFive) {
      setSelectedServices(['All-around']);
    } else {
      setSelectedServices(updated);
    }
  };

  const resetForm = () => {
    setStep(1);
    setSelectedServices([]);
    setEngagementType(null);
    setSetupPreference(null);
    setSelectedTime(null);
    setAddress('');
    setFloorUnit('');
    setInstructions('');
    setOfferAmount('500');
    setAgreedTerms(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleEngagementChange = (type: 'short' | 'long') => {
    setEngagementType(type);
    if (type === 'long') {
      if (offerAmount === '500' || offerAmount === '800') {
        setOfferAmount('6500');
      }
    } else {
      if (offerAmount === '6500' || offerAmount === '8000') {
        setOfferAmount('500');
      }
    }
  };

  const getSelectedRoleLabel = () => {
    if (selectedServices.length === 0) return 'Household Service';
    if (selectedServices.includes('All-around')) return 'All-around';
    const labels = selectedServices.map(
      (s) => services.find((x) => x.id === s)?.label || s.replace(/_/g, ' ')
    );
    if (labels.length === 1) return labels[0];
    if (labels.length === 2) return `${labels[0]} & ${labels[1]}`;
    return `${labels.slice(0, -1).join(', ')} & ${labels[labels.length - 1]}`;
  };

  const getTimeLabel = () => {
    if (selectedTime === 'morning') return 'morning (8 AM - 12 PM)';
    if (selectedTime === 'afternoon') return 'afternoon (12 PM - 5 PM)';
    if (selectedTime === 'night') return 'night (5 PM - 9 PM)';
    return 'flexible hours';
  };

  const buildAutoMessage = () => {
    const roleText = getSelectedRoleLabel();
    const locText = address.trim() || 'Cagayan de Oro';
    const setupText = setupPreference === 'stay-in' ? 'stay-in' : 'stay-out';

    let msg = '';
    if (engagementType === 'short') {
      msg = `I am offering ${roleText} service in ${locText}, available ${getTimeLabel()} on a ${setupText} arrangement.`;
    } else {
      msg = `I am looking for long-term ${roleText} work in ${locText} on a ${setupText} arrangement.`;
    }

    if (instructions.trim()) {
      msg += `\n\nAbout my experience:\n${instructions.trim()}`;
    }

    return msg;
  };

  const handleNext = async () => {
    if (step === 1) {
      if (selectedServices.length === 0) {
        Alert.alert('Selection Required', 'Please choose at least one service role to continue.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!engagementType) {
        Alert.alert('Selection Required', 'Please select what type of work you want (Short-term or Long-term).');
        return;
      }
      if (!setupPreference) {
        Alert.alert('Selection Required', 'Please select where you will stay (Stay-out or Stay-in).');
        return;
      }
      if (engagementType === 'short' && !selectedTime) {
        Alert.alert('Selection Required', 'Please select what time you are available.');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (!address.trim()) {
        Alert.alert('Address Required', 'Please enter your street, barangay, or city location.');
        return;
      }
      const amount = Number(offerAmount.replace(/[^0-9.]/g, ''));
      if (!offerAmount.trim() || isNaN(amount) || amount <= 0) {
        Alert.alert('Valid Rate Required', 'Please provide a valid asking rate.');
        return;
      }
      if (engagementType === 'short' && amount < 600) {
        Alert.alert(
          'Minimum Daily Rate',
          'The asking rate cannot be below ₱600/day on a short-term basis.'
        );
        return;
      }
      if (engagementType === 'long' && amount < 6500) {
        Alert.alert(
          'Minimum Monthly Rate',
          'Under Batas Kasambahay (RA 10361), monthly salary cannot be below ₱6,500/month.'
        );
        return;
      }
      setStep(4);
    } else {
      if (!agreedTerms) {
        Alert.alert('Terms Required', 'Please confirm that your service details are accurate.');
        return;
      }

      setIsPosting(true);

      try {
        const autoMessage = buildAutoMessage();

        const now = new Date();
        const startTime = new Date(now);
        startTime.setDate(startTime.getDate() + 1);
        startTime.setHours(selectedTime === 'morning' ? 8 : selectedTime === 'afternoon' ? 12 : 17, 0, 0, 0);

        const endTime = new Date(startTime);
        if (engagementType === 'long') {
          endTime.setDate(endTime.getDate() + 30);
        } else {
          endTime.setHours(selectedTime === 'morning' ? 12 : selectedTime === 'afternoon' ? 17 : 21, 0, 0, 0);
        }

        const payload = {
          booking_type: engagementType === 'short' ? 'short_term' : 'long_term',
          service_category: selectedServices,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          service_address: address.trim(),
          floor_number: floorUnit.trim() || undefined,
          zip_code: user?.zipcode || '9000',
          special_instruction: autoMessage,
          daily_rate: offerAmount.trim(),
        };

        const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/booking/post/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: effectiveToken ? `Bearer ${effectiveToken}` : '',
            'Idempotency-Key': generateUUIDv4(),
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.log('[PostService] Server response:', errorData);

          const rawStr = typeof errorData === 'string' ? errorData : JSON.stringify(errorData);
          const isVerificationError =
            response.status === 403 ||
            /verified|verification/i.test(rawStr) ||
            errorData?.code === 'account_not_verified';

          if (isVerificationError) {
            setIsPosting(false);
            setVerificationStatus(errorData?.verification_status || user?.verificationStatus || 'Unverified');
            setShowVerificationRequired(true);
            return;
          }

          let errorMsg = 'Failed to post service. Please check your entries.';
          if (typeof errorData === 'string') {
            errorMsg = errorData;
          } else if (errorData?.detail) {
            errorMsg = String(errorData.detail);
          } else if (typeof errorData === 'object') {
            const msgs: string[] = [];
            for (const [k, v] of Object.entries(errorData)) {
              const label = k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
              const list = Array.isArray(v) ? v : [v];
              list.forEach(m => msgs.push(`• ${label}: ${m}`));
            }
            if (msgs.length > 0) errorMsg = msgs.join('\n');
          }

          Alert.alert('Unable to Post', errorMsg);
          setIsPosting(false);
          return;
        }

        setPostedSuccess(true);
        setTimeout(() => {
          setPostedSuccess(false);
          setIsPosting(false);
          resetForm();
          onClose();
        }, 1800);
      } catch (error: any) {
        console.log('[PostService] Network error:', error);
        Alert.alert('Network Error', error?.message || 'Failed to connect to the server.');
        setIsPosting(false);
      }
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => (prev - 1) as 1 | 2 | 3 | 4);
    } else {
      handleClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent={true}
      onRequestClose={handleClose}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={[
            styles.innerContainer,
            {
              paddingTop: Math.max(insets.top, 16),
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          {/* Header Row */}
          <View style={styles.header}>
            <Pressable style={styles.backCircleButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={20} color="#0D0D11" />
            </Pressable>
            <Text style={styles.headerTitle}>Post a Service</Text>
            <Image source={logoSource} style={styles.logo} resizeMode="contain" />
          </View>

          {/* Step Pill Counter */}
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>Step {step} of 4</Text>
          </View>

          {/* Step Main Title */}
          <View style={styles.titleBlock}>
            {step === 1 && (
              <Text style={styles.mainTitle}>
                What <Text style={styles.titleHighlight}>service</Text> do you offer?
              </Text>
            )}
            {step === 2 && (
              <Text style={styles.mainTitle}>
                Job type & <Text style={styles.titleHighlight}>setup</Text>
              </Text>
            )}
            {step === 3 && (
              <Text style={styles.mainTitle}>
                Location & <Text style={styles.titleHighlight}>expected rate</Text>
              </Text>
            )}
            {step === 4 && (
              <Text style={styles.mainTitle}>
                Review your <Text style={styles.titleHighlight}>service post</Text>
              </Text>
            )}
          </View>

          {/* Scrollable Content Area */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* STEP 1: SERVICE CATEGORY CARDS */}
            {step === 1 && (
              <View style={styles.serviceGrid}>
                {services.map((item) => {
                  const isSelected = selectedServices.includes(item.id);

                  return (
                    <Pressable
                      key={item.id}
                      style={[styles.serviceCard, isSelected && styles.serviceCardActive]}
                      onPress={() => handleToggleService(item.id)}
                    >
                      <Ionicons
                        name={item.icon as any}
                        size={32}
                        color={isSelected ? '#0D0D11' : '#FFB380'}
                        style={styles.serviceIcon}
                      />
                      <Text style={[styles.serviceLabel, isSelected && styles.serviceLabelActive]}>
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* STEP 2: ARRANGEMENT & SETUP */}
            {step === 2 && (
              <View style={styles.step2Container}>
                {/* 1. Engagement Type: Short-term vs Long-term */}
                <Text style={styles.sectionLabel}>ENGAGEMENT TYPE</Text>
                <View style={styles.typeToggleRow}>
                  <Pressable
                    style={[styles.typeCard, engagementType === 'short' && styles.typeCardActive]}
                    onPress={() => handleEngagementChange('short')}
                  >
                    <Ionicons
                      name="time"
                      size={24}
                      color={engagementType === 'short' ? '#0D0D11' : '#FFB380'}
                      style={styles.typeIcon}
                    />
                    <Text style={styles.typeTitle}>Short-term</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.typeCard, engagementType === 'long' && styles.typeCardActive]}
                    onPress={() => handleEngagementChange('long')}
                  >
                    <Ionicons
                      name="calendar"
                      size={24}
                      color={engagementType === 'long' ? '#0D0D11' : '#FFB380'}
                      style={styles.typeIcon}
                    />
                    <Text style={styles.typeTitle}>Long-term</Text>
                  </Pressable>
                </View>

                {/* 2. Setup Preference: Stay-in vs Stay-out */}
                <Text style={[styles.sectionLabel, { marginTop: 14 }]}>WORK SETUP PREFERENCE</Text>
                <View style={styles.typeToggleRow}>
                  <Pressable
                    style={[styles.typeCard, setupPreference === 'stay-out' && styles.typeCardActive]}
                    onPress={() => setSetupPreference('stay-out')}
                  >
                    <Ionicons
                      name="walk"
                      size={24}
                      color={setupPreference === 'stay-out' ? '#0D0D11' : '#FFB380'}
                      style={styles.typeIcon}
                    />
                    <Text style={styles.typeTitle}>Stay-out</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.typeCard, setupPreference === 'stay-in' && styles.typeCardActive]}
                    onPress={() => setSetupPreference('stay-in')}
                  >
                    <Ionicons
                      name="home"
                      size={24}
                      color={setupPreference === 'stay-in' ? '#0D0D11' : '#FFB380'}
                      style={styles.typeIcon}
                    />
                    <Text style={styles.typeTitle}>Stay-in</Text>
                  </Pressable>
                </View>

                {/* 3. Preferred Time (ONLY for Short-term) */}
                {engagementType === 'short' ? (
                  <View style={{ marginTop: 14 }}>
                    <Text style={styles.sectionLabel}>WHAT TIME WORKS BEST?</Text>
                    <View style={styles.timeSlotRow}>
                      <Pressable
                        style={[styles.timeSlotCard, selectedTime === 'morning' && styles.timeSlotActive]}
                        onPress={() => setSelectedTime('morning')}
                      >
                        <Ionicons name="sunny" size={20} color={selectedTime === 'morning' ? '#0D0D11' : '#FFB380'} />
                        <Text style={styles.timeSlotTitle}>Morning</Text>
                        <Text style={styles.timeSlotSub}>8 AM - 12 PM</Text>
                      </Pressable>

                      <Pressable
                        style={[styles.timeSlotCard, selectedTime === 'afternoon' && styles.timeSlotActive]}
                        onPress={() => setSelectedTime('afternoon')}
                      >
                        <Ionicons name="partly-sunny" size={20} color={selectedTime === 'afternoon' ? '#0D0D11' : '#FFB380'} />
                        <Text style={styles.timeSlotTitle}>Afternoon</Text>
                        <Text style={styles.timeSlotSub}>12 PM - 5 PM</Text>
                      </Pressable>

                      <Pressable
                        style={[styles.timeSlotCard, selectedTime === 'night' && styles.timeSlotActive]}
                        onPress={() => setSelectedTime('night')}
                      >
                        <Ionicons name="moon" size={20} color={selectedTime === 'night' ? '#0D0D11' : '#FFB380'} />
                        <Text style={styles.timeSlotTitle}>Night</Text>
                        <Text style={styles.timeSlotSub}>5 PM - 9 PM</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : engagementType === 'long' ? (
                  <View style={styles.longTermScheduleCard}>
                    <Ionicons name="time-outline" size={20} color="#0D0D11" style={{ marginRight: 10, marginTop: 1 }} />
                    <Text style={styles.longTermScheduleText}>
                      Long-term employment follows a standard domestic schedule (approx. 8 hours/day with 1 rest day per week).
                    </Text>
                  </View>
                ) : null}
              </View>
            )}

            {/* STEP 3: DETAILS, INSTRUCTIONS & RATE */}
            {step === 3 && (
              <View style={styles.step3Container}>
                <Text style={styles.inputGroupLabel}>SERVICE ADDRESS</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Street, barangay, or city (e.g. Pagatpat, Cagayan de Oro)"
                  placeholderTextColor="#9CA3AF"
                  value={address}
                  onChangeText={setAddress}
                />

                <Text style={styles.inputGroupLabel}>FLOOR / UNIT (OPTIONAL)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Purok 3, Zone 6"
                  placeholderTextColor="#9CA3AF"
                  value={floorUnit}
                  onChangeText={setFloorUnit}
                />

                <Text style={styles.inputGroupLabel}>SPECIFIC INSTRUCTIONS / SKILLS (OPTIONAL)</Text>
                <TextInput
                  style={styles.multilineInput}
                  multiline
                  numberOfLines={4}
                  placeholder="e.g. 5+ years experience in housekeeping, gentle with kids, pet-friendly and trustworthy."
                  placeholderTextColor="#9CA3AF"
                  value={instructions}
                  onChangeText={setInstructions}
                />

                <Text style={styles.inputGroupLabel}>
                  {engagementType === 'short' ? 'OFFER AMOUNT (PER DAY)' : 'MONTHLY SALARY OFFER'}
                </Text>
                {(() => {
                  const num = Number(offerAmount.replace(/[^0-9.]/g, ''));
                  const isBelowMin = offerAmount.trim().length > 0 && (engagementType === 'short' ? num < 600 : num < 6500);
                  return (
                    <>
                      <View style={[styles.offerInputWrapper, isBelowMin && styles.offerInputWrapperInvalid]}>
                        <Text style={[styles.currencyPrefix, isBelowMin && { color: '#DC2626' }]}>₱</Text>
                        <TextInput
                          style={[styles.offerInput, isBelowMin && { color: '#DC2626' }]}
                          value={offerAmount}
                          onChangeText={setOfferAmount}
                          keyboardType="numeric"
                          placeholder={engagementType === 'short' ? '600' : '6500'}
                          placeholderTextColor={isBelowMin ? '#FCA5A5' : '#9CA3AF'}
                        />
                        <Text style={[styles.rateUnitSuffix, isBelowMin && { color: '#DC2626' }]}>
                          {engagementType === 'short' ? '/day' : '/month'}
                        </Text>
                      </View>
                      {isBelowMin ? (
                        <Text style={styles.invalidRateHint}>
                          {engagementType === 'short'
                            ? 'Minimum rate is ₱600 / day'
                            : 'Minimum salary is ₱6,500 / month'}
                        </Text>
                      ) : null}
                    </>
                  );
                })()}

                <View style={styles.recommendBox}>
                  <Text style={styles.recommendTitle}>
                    {engagementType === 'short'
                      ? `Suggested rate for ${getSelectedRoleLabel()}: `
                      : `Standard monthly rate for ${getSelectedRoleLabel()}: `}
                    <Text style={{ fontFamily: THEME.typography.fontFamily.mainExtraBold, fontWeight: '800', color: '#0D0D11' }}>
                      {engagementType === 'short' ? '₱600 - ₱1,500 / day' : '₱6,500 - ₱15,000 / month'}
                    </Text>
                  </Text>
                  <Text style={styles.recommendSub}>
                    {engagementType === 'short'
                      ? 'Fair compensation based on daily task difficulty and hours (minimum ₱600/day).'
                      : 'Complies with RTWPB Batas Kasambahay statutory regional wage standards (minimum ₱6,500/month).'}
                  </Text>
                </View>
              </View>
            )}

            {/* STEP 4: PREVIEW & REVIEW SUMMARY */}
            {step === 4 && (
              <View style={styles.step4Container}>
                {/* Emphasized Listing Preview */}
                <Text style={styles.inputGroupLabel}>SERVICE LISTING PREVIEW</Text>
                <View style={styles.autoMessageCard}>
                  <View style={styles.autoMessageHeader}>
                    <Ionicons name="chatbox-ellipses" size={18} color="#F97316" />
                    <Text style={styles.autoMessageTitle}>Listing Preview</Text>
                  </View>
                  <Text style={styles.autoMessageQuote}>
                    "{buildAutoMessage()}"
                  </Text>
                </View>

                {/* Clean Summary Table */}
                <Text style={[styles.inputGroupLabel, { marginTop: 14 }]}>SUMMARY</Text>
                <View style={styles.summaryCard}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Service</Text>
                    <Text style={[styles.summaryValue, { flex: 1, textAlign: 'right', marginLeft: 16 }]}>
                      {getSelectedRoleLabel()}
                    </Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Work Type</Text>
                    <Text style={styles.summaryValue}>
                      {engagementType === 'short' ? 'Part-time (Short-term)' : 'Long-term'}
                    </Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Setup</Text>
                    <Text style={styles.summaryValue}>
                      {setupPreference === 'stay-in' ? 'Stay-in' : 'Stay-out'}
                    </Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Asking Rate</Text>
                    <Text style={[styles.summaryValue, { color: '#D97706', fontWeight: '800' }]}>
                      ₱{offerAmount} {engagementType === 'short' ? '/ day' : '/ month'}
                    </Text>
                  </View>
                  {engagementType === 'short' && (
                    <>
                      <View style={styles.summaryDivider} />
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Available Time</Text>
                        <Text style={styles.summaryValue}>
                          {selectedTime === 'morning'
                            ? 'Morning (8 AM - 12 PM)'
                            : selectedTime === 'afternoon'
                            ? 'Afternoon (12 PM - 5 PM)'
                            : 'Night (5 PM - 9 PM)'}
                        </Text>
                      </View>
                    </>
                  )}
                </View>

                {/* Notice Box */}
                <View style={styles.visibleNoticeBox}>
                  <Ionicons name="checkmark-circle" size={18} color="#059669" style={{ marginRight: 8 }} />
                  <Text style={styles.visibleNoticeText}>
                    Your service post will be visible to homeowners searching for household help in your area.
                  </Text>
                </View>

                <Pressable
                  style={styles.checkboxRow}
                  onPress={() => setAgreedTerms(!agreedTerms)}
                >
                  <View style={[styles.checkbox, agreedTerms && styles.checkboxActive]}>
                    {agreedTerms && <Ionicons name="checkmark" size={16} color="#0D0D11" />}
                  </View>
                  <Text style={styles.checkboxText}>
                    I confirm that my service details and availability are accurate and agree to the{' '}
                    <Text style={{ color: '#0D0D11', fontWeight: '700' }}>SerbiSure Terms</Text>.
                  </Text>
                </Pressable>
              </View>
            )}
          </ScrollView>

          {/* Unified Clean Pill Bottom Buttons - Single Row */}
          <View style={styles.bottomButtonsContainer}>
            <Pressable
              style={({ pressed }) => [styles.backButton, pressed && styles.btnPressed]}
              onPress={handleBack}
              disabled={isPosting}
            >
              <Text style={styles.backButtonText}>{step === 1 ? 'Cancel' : 'Back'}</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.nextButton, pressed && styles.btnPressed]}
              onPress={handleNext}
              disabled={isPosting}
            >
              <Text style={styles.nextButtonText}>
                {isPosting ? 'Posting...' : step === 4 ? 'Post Service' : 'Next'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Service Posted Success Overlay */}
        {postedSuccess && (
          <View style={styles.successOverlay}>
            <Animated.View style={[styles.successContainer, { transform: [{ scale: scaleAnim }] }]}>
              <View style={styles.logoRingWrapper}>
                <Animated.View style={[styles.rotatingRing, { transform: [{ rotate: spin }] }]} />
                <View style={styles.innerLogoCircle}>
                  <Image source={logoSource} style={styles.successLogoImage} resizeMode="contain" />
                </View>
              </View>
              <Text style={styles.successTitleText}>Service posted!</Text>
            </Animated.View>
          </View>
        )}

        {/* Verification Required Modal */}
        <VerificationRequiredModal
          visible={showVerificationRequired}
          onClose={() => setShowVerificationRequired(false)}
          onVerify={() => {
            setShowVerificationRequired(false);
            if (onOpenVerification) {
              onOpenVerification();
            } else {
              onClose();
            }
          }}
          role="kasambahay"
          verificationStatus={verificationStatus}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F5F2',
  },
  innerContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backCircleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: THEME.typography.fontFamily.mainExtraBold,
    fontSize: 18,
    fontWeight: '800',
    color: '#0D0D11',
  },
  logo: {
    width: 36,
    height: 36,
  },
  stepBadge: {
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
    marginBottom: 8,
  },
  stepBadgeText: {
    fontFamily: THEME.typography.fontFamily.mainBold,
    fontSize: 11.5,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
  titleBlock: {
    alignItems: 'center',
    marginBottom: 16,
  },
  mainTitle: {
    fontFamily: THEME.typography.fontFamily.mainBlack,
    fontSize: 22,
    fontWeight: '900',
    color: '#0D0D11',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  titleHighlight: {
    color: '#FFB380',
  },
  scrollContent: {
    paddingBottom: 16,
    flexGrow: 1,
    justifyContent: 'center',
  },

  // STEP 1 STYLES
  serviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  serviceCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 20,
    alignItems: 'center',
    position: 'relative',
  },
  serviceCardActive: {
    backgroundColor: '#FFB380',
  },
  serviceIcon: {
    marginBottom: 12,
  },
  serviceLabel: {
    fontFamily: THEME.typography.fontFamily.mainBold,
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0D0D11',
  },
  serviceLabelActive: {
    fontFamily: THEME.typography.fontFamily.mainExtraBold,
    color: '#0D0D11',
    fontWeight: '800',
  },

  // STEP 2 STYLES
  step2Container: {
    width: '100%',
  },
  sectionLabel: {
    fontFamily: THEME.typography.fontFamily.mainBold,
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  typeToggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'flex-start',
  },
  typeCardActive: {
    backgroundColor: '#FFB380',
  },
  typeIcon: {
    marginBottom: 10,
  },
  typeTitle: {
    fontFamily: THEME.typography.fontFamily.mainExtraBold,
    fontSize: 14,
    fontWeight: '800',
    color: '#0D0D11',
  },
  typeSub: {
    fontFamily: THEME.typography.fontFamily.secondaryMedium,
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  timeSlotRow: {
    flexDirection: 'row',
    gap: 8,
  },
  timeSlotCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: 'center',
  },
  timeSlotActive: {
    backgroundColor: '#FFB380',
  },
  timeSlotTitle: {
    fontFamily: THEME.typography.fontFamily.mainBold,
    fontSize: 12,
    fontWeight: '700',
    color: '#0D0D11',
    marginTop: 4,
  },
  timeSlotSub: {
    fontFamily: THEME.typography.fontFamily.secondaryMedium,
    fontSize: 9.5,
    color: '#6B7280',
    marginTop: 1,
  },
  longTermScheduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF4ED',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#0D0D11',
    padding: 14,
    marginTop: 14,
  },
  longTermScheduleText: {
    flex: 1,
    fontFamily: THEME.typography.fontFamily.secondaryMedium,
    fontSize: 12,
    color: '#0D0D11',
    fontWeight: '600',
    lineHeight: 17,
  },

  // STEP 3 STYLES
  step3Container: {
    width: '100%',
  },
  inputGroupLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    height: 48,
    paddingHorizontal: 16,
    fontSize: 13,
    color: '#0D0D11',
    fontWeight: '600',
    marginBottom: 12,
  },
  multilineInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    height: 90,
    padding: 14,
    fontSize: 12.5,
    color: '#0D0D11',
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  offerInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    height: 48,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  offerInputWrapperInvalid: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  invalidRateHint: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
    marginTop: -8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0D0D11',
    marginRight: 6,
  },
  offerInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: '#0D0D11',
  },
  rateUnitSuffix: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  recommendBox: {
    backgroundColor: '#FFF4ED',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#0D0D11',
    padding: 14,
  },
  recommendTitle: {
    fontFamily: THEME.typography.fontFamily.mainBold,
    fontSize: 12,
    color: '#0D0D11',
    fontWeight: '700',
  },
  recommendSub: {
    fontFamily: THEME.typography.fontFamily.secondaryMedium,
    fontSize: 11,
    color: '#0D0D11',
    marginTop: 3,
    lineHeight: 16,
  },

  // STEP 4 STYLES
  step4Container: {
    width: '100%',
  },
  autoMessageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#F97316',
  },
  autoMessageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  autoMessageTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F97316',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  autoMessageQuote: {
    fontSize: 13.5,
    color: '#1E293B',
    lineHeight: 20,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#F6F5F2',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0D0D11',
  },
  visibleNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
  },
  visibleNoticeText: {
    flex: 1,
    fontSize: 11.5,
    color: '#065F46',
    fontWeight: '600',
    lineHeight: 16,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#FFB380',
    borderColor: '#FFB380',
  },
  checkboxText: {
    flex: 1,
    fontSize: 11.5,
    color: '#6B7280',
    lineHeight: 16,
  },

  // BOTTOM BUTTONS (ONE ROW COMPLETE PILL BUTTONS)
  bottomButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
    paddingBottom: 4,
    width: '100%',
  },
  backButton: {
    flex: 1,
    backgroundColor: '#E5E7EB',
    height: 48,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontFamily: THEME.typography.fontFamily.mainBold,
    color: '#4B5563',
    fontSize: 14.5,
    fontWeight: '700',
  },
  nextButton: {
    flex: 1,
    backgroundColor: '#0D0D11',
    height: 48,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    fontFamily: THEME.typography.fontFamily.mainExtraBold,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  btnPressed: {
    opacity: 0.8,
  },

  // SUCCESS OVERLAY
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  successContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingVertical: 32,
    paddingHorizontal: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoRingWrapper: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  rotatingRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#FFB380',
    borderTopColor: 'transparent',
  },
  innerLogoCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF4ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successLogoImage: {
    width: 32,
    height: 32,
  },
  successTitleText: {
    fontFamily: THEME.typography.fontFamily.mainExtraBold,
    fontSize: 18,
    fontWeight: '800',
    color: '#0D0D11',
  },
});
