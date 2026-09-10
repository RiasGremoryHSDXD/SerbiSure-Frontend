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

const logoSource = require('../../../assets/serbisure-logo.png');

function generateUUIDv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

interface PostServiceScreenProps {
  visible: boolean;
  onClose: () => void;
  token?: string | null;
}

export function PostServiceScreen({ visible, onClose, token }: PostServiceScreenProps) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [engagementType, setEngagementType] = useState<'short' | 'long'>('short');
  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 1); // Default to tomorrow
  const [viewDate, setViewDate] = useState<Date>(new Date(defaultDate.getFullYear(), defaultDate.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<Date>(defaultDate);
  const [selectedTime, setSelectedTime] = useState<'morning' | 'afternoon' | 'night'>('afternoon');
  const [address, setAddress] = useState('');
  const [floorUnit, setFloorUnit] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [instructions, setInstructions] = useState('');
  const [offerAmount, setOfferAmount] = useState('500');
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [postedSuccess, setPostedSuccess] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

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

  const handlePrevMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const getCalendarDays = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: Array<{
      date: Date;
      dayNum: number;
      isCurrentMonth: boolean;
    }> = [];

    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const prevDate = new Date(year, month - 1, daysInPrevMonth - i);
      days.push({
        date: prevDate,
        dayNum: prevDate.getDate(),
        isCurrentMonth: false,
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const currDate = new Date(year, month, d);
      days.push({
        date: currDate,
        dayNum: d,
        isCurrentMonth: true,
      });
    }

    const totalCells = days.length > 35 ? 42 : 35;
    const remaining = totalCells - days.length;
    for (let n = 1; n <= remaining; n++) {
      const nextDate = new Date(year, month + 1, n);
      days.push({
        date: nextDate,
        dayNum: n,
        isCurrentMonth: false,
      });
    }

    return days;
  };

  const formatSelectedDate = (date: Date) => {
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  const services = [
    { id: 'Cleaning', label: 'Cleaning', icon: 'sparkles' },
    { id: 'Child_care', label: 'Child Care', icon: 'happy' },
    { id: 'Cooking', label: 'Cook', icon: 'restaurant' },
    { id: 'Caregiver', label: 'Caregiver', icon: 'heart' },
    { id: 'Laundry', label: 'Laundry', icon: 'shirt' },
    { id: 'All-around', label: 'All-around', icon: 'home' },
  ];

  const resetForm = () => {
    setStep(1);
    setSelectedServices([]);
    setEngagementType('short');
    setSelectedTime('afternoon');
    setAddress('');
    setFloorUnit('');
    setZipCode('');
    setInstructions('');
    setOfferAmount('500');
    setAgreedTerms(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleNext = async () => {
    if (step < 4) {
      if (step === 1 && selectedServices.length === 0) {
        Alert.alert('Selection Required', 'Please choose at least one service to continue.');
        return;
      }
      setStep((prev) => (prev + 1) as 1 | 2 | 3 | 4);
    } else {
      if (!agreedTerms) {
        Alert.alert('Terms Required', 'Please agree to the Terms of Service to post.');
        return;
      }
      
      setIsPosting(true);
      
      try {
        const startTime = new Date(selectedDate);
        startTime.setHours(selectedTime === 'morning' ? 8 : selectedTime === 'afternoon' ? 12 : 17, 0, 0, 0);

        const endTime = new Date(selectedDate);
        endTime.setHours(selectedTime === 'morning' ? 12 : selectedTime === 'afternoon' ? 17 : 21, 0, 0, 0);

        const payload = {
          booking_type: engagementType === 'short' ? 'short_term' : 'long_term',
          service_category: selectedServices,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          service_address: address,
          floor_number: floorUnit || undefined,
          zip_code: zipCode,
          special_instruction: instructions || undefined,
          daily_rate: offerAmount
        };

        const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/booking/post/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
            'Idempotency-Key': generateUUIDv4()
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error(errorData);
          Alert.alert('Booking Error', JSON.stringify(errorData));
          setIsPosting(false);
          return;
        }

        setPostedSuccess(true);
        setTimeout(() => {
          setPostedSuccess(false);
          setIsPosting(false);
          resetForm();
          onClose();
        }, 2000);
      } catch (error) {
        console.error(error);
        Alert.alert('Network Error', 'Failed to connect to the server.');
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
                What <Text style={styles.titleHighlight}>service</Text> do you offer today?
              </Text>
            )}
            {step === 2 && (
              <Text style={styles.mainTitle}>
                When do you <Text style={styles.titleHighlight}>offer</Text> the service?
              </Text>
            )}
            {step === 3 && (
              <Text style={styles.mainTitle}>
                Service <Text style={styles.titleHighlight}>details</Text>
              </Text>
            )}
            {step === 4 && (
              <Text style={styles.mainTitle}>
                Review & <Text style={styles.titleHighlight}>submit</Text>
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
                  
                  const handleToggle = () => {
                    setSelectedServices(prev => {
                      if (item.id === 'All-around') return ['All-around'];
                      
                      let updated = prev.includes(item.id) 
                        ? prev.filter(s => s !== item.id) 
                        : [...prev, item.id];
                        
                      updated = updated.filter(s => s !== 'All-around');
                      
                      const coreServices = ['Cleaning', 'Child_care', 'Cooking', 'Caregiver', 'Laundry'];
                      const hasAllCore = coreServices.every(s => updated.includes(s));
                      
                      if (hasAllCore) return ['All-around'];
                      return updated;
                    });
                  };

                  return (
                    <Pressable
                      key={item.id}
                      style={[styles.serviceCard, isSelected && styles.serviceCardActive]}
                      onPress={handleToggle}
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

            {/* STEP 2: SCHEDULE & TIME */}
            {step === 2 && (
              <View style={styles.step2Container}>
                {/* Short-term / Long-term Toggle */}
                <View style={styles.typeToggleRow}>
                  <Pressable
                    style={[styles.typeCard, engagementType === 'short' && styles.typeCardActive]}
                    onPress={() => setEngagementType('short')}
                  >
                    <Ionicons
                      name="time"
                      size={24}
                      color={engagementType === 'short' ? '#0D0D11' : '#FFB380'}
                      style={styles.typeIcon}
                    />
                    <Text style={styles.typeTitle}>Short-term</Text>
                    <Text style={styles.typeSub}>Single visit or quick shift</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.typeCard, engagementType === 'long' && styles.typeCardActive]}
                    onPress={() => setEngagementType('long')}
                  >
                    <Ionicons
                      name="calendar"
                      size={24}
                      color={engagementType === 'long' ? '#0D0D11' : '#FFB380'}
                      style={styles.typeIcon}
                    />
                    <Text style={styles.typeTitle}>Long-term</Text>
                    <Text style={styles.typeSub}>Weekly or monthly routine</Text>
                  </Pressable>
                </View>

                {/* Calendar Card */}
                <View style={styles.calendarCard}>
                  <View style={styles.calendarHeader}>
                    <Text style={styles.calendarMonth}>
                      {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </Text>
                    <View style={styles.calendarArrows}>
                      <Pressable onPress={handlePrevMonth} style={styles.calendarArrowBtn} hitSlop={10}>
                        <Ionicons name="chevron-back" size={16} color="#0D0D11" />
                      </Pressable>
                      <Pressable onPress={handleNextMonth} style={styles.calendarArrowBtn} hitSlop={10}>
                        <Ionicons name="chevron-forward" size={16} color="#0D0D11" />
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.daysHeader}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                      <Text key={d} style={styles.dayHeaderText}>
                        {d}
                      </Text>
                    ))}
                  </View>

                  <View style={styles.datesGrid}>
                    {getCalendarDays().map((item, idx) => {
                      const isSelected =
                        selectedDate.getFullYear() === item.date.getFullYear() &&
                        selectedDate.getMonth() === item.date.getMonth() &&
                        selectedDate.getDate() === item.date.getDate();

                      return (
                        <View key={idx} style={styles.dateCellWrapper}>
                          <Pressable
                            style={[
                              styles.dateCell,
                              isSelected && styles.dateCellSelected,
                            ]}
                            onPress={() => {
                              setSelectedDate(item.date);
                              if (!item.isCurrentMonth) {
                                setViewDate(new Date(item.date.getFullYear(), item.date.getMonth(), 1));
                              }
                            }}
                          >
                            <Text
                              style={[
                                styles.dateCellText,
                                !item.isCurrentMonth && styles.dateCellMuted,
                                isSelected && styles.dateCellTextSelected,
                              ]}
                            >
                              {item.dayNum}
                            </Text>
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                </View>

                {/* Time Selection */}
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
            )}

            {/* STEP 3: DETAILS & RATE */}
            {step === 3 && (
              <View style={styles.step3Container}>
                <Text style={styles.inputGroupLabel}>SERVICE ADDRESS</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Street, barangay, or city"
                  placeholderTextColor="#9CA3AF"
                  value={address}
                  onChangeText={setAddress}
                />

                <View style={styles.twoColumnRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.inputGroupLabel}>FLOOR / UNIT (OPTIONAL)</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Unit 4B"
                      placeholderTextColor="#9CA3AF"
                      value={floorUnit}
                      onChangeText={setFloorUnit}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.inputGroupLabel}>ZIP CODE</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. 6000"
                      placeholderTextColor="#9CA3AF"
                      value={zipCode}
                      onChangeText={setZipCode}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <Text style={styles.inputGroupLabel}>SPECIAL INSTRUCTIONS</Text>
                <TextInput
                  style={styles.multilineInput}
                  multiline
                  numberOfLines={4}
                  placeholder="e.g. Available on weekdays, pet-friendly, non-smoker..."
                  placeholderTextColor="#9CA3AF"
                  value={instructions}
                  onChangeText={setInstructions}
                />

                <Text style={styles.inputGroupLabel}>YOUR DAILY RATE (PHP)</Text>
                <View style={styles.offerInputWrapper}>
                  <Text style={styles.currencyPrefix}>₱</Text>
                  <TextInput
                    style={styles.offerInput}
                    value={offerAmount}
                    onChangeText={setOfferAmount}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.recommendBox}>
                  <Text style={styles.recommendTitle}>
                    Market rate for {selectedServices.length > 0 ? (services.find(x => x.id === selectedServices[0])?.label || selectedServices[0]) : 'Home Service'}: <Text style={{ fontWeight: '800' }}>₱400 - ₱700 / day</Text>
                  </Text>
                  <Text style={styles.recommendSub}>
                    Suggested rate for professional domestic services in your area.
                  </Text>
                </View>
              </View>
            )}

            {/* STEP 4: SUMMARY & SUBMISSION */}
            {step === 4 && (
              <View style={styles.step4Container}>
                <Text style={styles.inputGroupLabel}>SUMMARY</Text>
                <View style={styles.summaryCard}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Service</Text>
                    <Text style={[styles.summaryValue, { flex: 1, textAlign: 'right', marginLeft: 16 }]}>
                      {selectedServices.length > 0 
                        ? selectedServices.map(s => services.find(x => x.id === s)?.label || s).join(', ')
                        : 'None'}
                    </Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Type</Text>
                    <Text style={styles.summaryValue}>
                      {engagementType === 'short' ? 'Short-term' : 'Long-term'}
                    </Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Date</Text>
                    <Text style={styles.summaryValue}>{formatSelectedDate(selectedDate)}</Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Daily Rate</Text>
                    <Text style={[styles.summaryValue, { color: '#D97706', fontWeight: '800' }]}>
                      ₱{offerAmount} / day
                    </Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Preferred Time</Text>
                    <Text style={styles.summaryValue}>
                      {selectedTime === 'morning' ? '8:00 AM - 12:00 PM' : selectedTime === 'afternoon' ? '12:00 PM - 5:00 PM' : '5:00 PM - 9:00 PM'}
                    </Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Location</Text>
                    <Text style={[styles.summaryValue, { textAlign: 'right', flex: 1, marginLeft: 20 }]}>
                      {address || 'Not specified'}
                    </Text>
                  </View>
                </View>

                <View style={styles.visibleNoticeBox}>
                  <Ionicons name="shield-checkmark" size={16} color="#065F46" style={{ marginRight: 8, marginTop: 1 }} />
                  <Text style={styles.visibleNoticeText}>
                    Your listing will be visible to verified homeowners looking for domestic services.
                  </Text>
                </View>

                <Pressable
                  style={styles.checkboxRow}
                  onPress={() => setAgreedTerms(!agreedTerms)}
                >
                  <View style={[styles.checkbox, agreedTerms && styles.checkboxActive]}>
                    {agreedTerms && <Ionicons name="checkmark" size={14} color="#FFF" />}
                  </View>
                  <Text style={styles.checkboxText}>
                    I agree to the <Text style={{ color: '#0D0D11', fontWeight: '700' }}>SerbiSure Terms of Service</Text> and confirm that my posted service details are accurate.
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
    backgroundColor: '#FFF4ED',
  },
  cardCheckBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFB380',
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceIcon: {
    marginBottom: 12,
  },
  serviceLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0D0D11',
  },
  serviceLabelActive: {
    color: '#0D0D11',
    fontWeight: '800',
  },

  // STEP 2 STYLES
  step2Container: {
    width: '100%',
  },
  typeToggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  typeCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 14,
    alignItems: 'flex-start',
  },
  typeCardActive: {
    backgroundColor: '#FFF4ED',
  },
  typeIcon: {
    marginBottom: 10,
  },
  typeTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0D0D11',
    marginBottom: 2,
  },
  typeSub: {
    fontSize: 10.5,
    color: '#6B7280',
    lineHeight: 14,
  },
  calendarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  calendarMonth: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0D0D11',
  },
  calendarArrows: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  calendarArrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  daysHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayHeaderText: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 10.5,
    color: '#9CA3AF',
    fontWeight: '700',
  },
  datesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dateCellWrapper: {
    width: '14.28%',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  dateCell: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
  },
  dateCellSelected: {
    backgroundColor: '#0D0D11',
  },
  dateCellText: {
    fontSize: 11,
    color: '#0D0D11',
    fontWeight: '600',
  },
  dateCellMuted: {
    color: '#D1D5DB',
  },
  dateCellTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.8,
    marginBottom: 8,
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
    backgroundColor: '#FFF4ED',
  },
  timeSlotTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D0D11',
    marginTop: 4,
  },
  timeSlotSub: {
    fontSize: 9.5,
    color: '#6B7280',
    marginTop: 1,
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
  twoColumnRow: {
    flexDirection: 'row',
  },
  multilineInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    height: 85,
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
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0D0D11',
    marginRight: 8,
  },
  offerInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: '#0D0D11',
  },
  recommendBox: {
    backgroundColor: '#FFF4ED',
    borderRadius: 18,
    padding: 14,
  },
  recommendTitle: {
    fontSize: 12,
    color: '#B45309',
    fontWeight: '600',
  },
  recommendSub: {
    fontSize: 10.5,
    color: '#92400E',
    marginTop: 3,
  },

  // STEP 4 STYLES
  step4Container: {
    width: '100%',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
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
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#0D0D11',
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
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 16,
  },
  rotatingRing: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: '#FFB380',
    borderTopColor: 'transparent',
  },
  innerLogoCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFF4ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successLogoImage: {
    width: 44,
    height: 44,
  },
  successTitleText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0D0D11',
    marginTop: 4,
  },
});
