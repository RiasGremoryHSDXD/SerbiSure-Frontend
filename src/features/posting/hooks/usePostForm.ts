import { toggleService, SERVICE_CHOICES, WORK_SHIFTS, buildEngagementSchedule, type WorkShift } from '../../bookings/engagementForm';
import { fetchMinimumWage, type MinimumWageData } from '../../bookings/api/bookingApi';
import { validatePostingRate } from '../validation';
import { useState, useRef, useEffect } from 'react';
import { Animated, Easing, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { POSTING_CONFIG, engagementRate, buildPostDescription } from '../postingConfig';
import { submitPost, type PostingPayload } from '../api/postingApi';

import { useUser } from '../../auth/session/UserContext';

import { useWorkLocation } from '../../bookings/hooks/useWorkLocation';
import { workLocationError } from '../../bookings/workLocation';

function generateUUIDv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

import type { PostScreenProps } from '../types';

export function usePostForm({ visible, onClose, mode = 'job', token, onOpenVerification }: PostScreenProps) {
  const config = POSTING_CONFIG[mode];
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const effectiveToken = token || user?.token || null;

  // Form State
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [engagementType, setEngagementType] = useState<'short' | 'long' | null>(null);
  const [setupPreference, setSetupPreference] = useState<'stay-out' | 'stay-in' | null>(null);
  const [selectedTime, setSelectedTime] = useState<WorkShift | null>(null);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [workDays, setWorkDays] = useState<string[]>([]);
  const [workHours, setWorkHours] = useState('');

  const address = useWorkLocation(visible);
  const { selectedRegion, selectedProvince, selectedCity, selectedBarangay, streetAddress, floorUnit, zipcode } = address;

  const [instructions, setInstructions] = useState('');
  const [wagePolicy, setWagePolicy] = useState<MinimumWageData | null>(null);
  const [offerAmount, setOfferAmount] = useState<string>(config.dailyDefault);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [postedSuccess, setPostedSuccess] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [showVerificationRequired, setShowVerificationRequired] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string>('Unverified');
  const requestVersion = useRef(0);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) {
      setIsPosting(false);
      setPostedSuccess(false);
      setShowVerificationRequired(false);
    }
    return () => {
      requestVersion.current++;
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, [visible, mode, effectiveToken]);

  const [hasAutoFilled, setHasAutoFilled] = useState(false);
  const applyUserProfileAddress = () => { if (user) address.applyProfileAddress(user); };
  useEffect(() => {
    if (visible && !hasAutoFilled && user && (user.barangay || user.city)) {
      setHasAutoFilled(true);
      address.applyProfileAddress(user);
    }
    if (!visible) setHasAutoFilled(false);
  }, [user, visible, mode, hasAutoFilled]);

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

  const services = SERVICE_CHOICES;

  const handleToggleService = (id: string) => setSelectedServices(current => toggleService(current, id));

  const resetForm = () => {
    requestVersion.current++;
    if (successTimer.current) clearTimeout(successTimer.current);
    setPostedSuccess(false);
    setIsPosting(false);
    setShowVerificationRequired(false);
    setStep(1);
    setSelectedServices([]);
    setEngagementType(null);
    setSetupPreference(null);
    setSelectedTime(null);
    setStartDate(''); setEndDate(''); setWorkDays([]); setWorkHours('');
    address.resetWorkLocation();
    setInstructions('');
    setOfferAmount(config.dailyDefault);
    setAgreedTerms(false);
    setHasAutoFilled(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const previousMode = useRef(mode);
  useEffect(() => {
    if (previousMode.current !== mode) {
      previousMode.current = mode;
      resetForm();
    }
  }, [mode]);

  const handleEngagementChange = (type: 'short' | 'long') => {
    if (type !== engagementType) {
      setSelectedTime(null); setEndDate(''); setWorkDays([]); setWorkHours('');
    }
    setEngagementType(type);
    setOfferAmount(engagementRate(mode, offerAmount, type));
  };

  // Construct emphasized auto-message
  const getSelectedRoleLabel = () => {
    if (selectedServices.length === 0) return config.defaultService;
    if (selectedServices.includes('All-around')) return 'All-around';
    const labels = selectedServices.map(
      (s) => services.find((x) => x.id === s)?.label || s.replace(/_/g, ' ')
    );
    if (labels.length === 1) return labels[0];
    if (labels.length === 2) return `${labels[0]} & ${labels[1]}`;
    return `${labels.slice(0, -1).join(', ')} & ${labels[labels.length - 1]}`;
  };

  const getTimeLabel = () => {
    const shift = WORK_SHIFTS.find(item => item.value === selectedTime);
    return engagementType === 'short' && shift ? `${shift.label.toLowerCase()} (${shift.hours})` : workHours;
  };

  const scheduleTerms = () => buildEngagementSchedule({
    bookingType: engagementType === 'long' ? 'long_term' : 'short_term',
    startDate, endDate, workHours, days: workDays, shift: selectedTime,
  });

  const buildAutoMessage = () => {
    const roleText = getSelectedRoleLabel();
    const locText = selectedBarangay && selectedCity
      ? `${selectedBarangay.name}, ${selectedCity.name}`
      : selectedCity
        ? selectedCity.name
        : streetAddress.trim() || 'Cagayan de Oro';
    const setupText = setupPreference === 'stay-in' ? 'stay-in' : 'stay-out';

    return buildPostDescription(mode, {
      service: roleText || config.defaultService, location: locText, setup: setupText,
      time: getTimeLabel(), shortTerm: engagementType === 'short', instructions,
    });
  };

  useEffect(() => {
    let current = true;
    setWagePolicy(null);
    if (engagementType) {
      void fetchMinimumWage(effectiveToken || undefined, engagementType === 'long' ? 'long_term' : 'short_term',
        selectedCity?.name || '', selectedRegion?.displayName || selectedRegion?.name || '').then(policy => {
          if (current) setWagePolicy(policy);
        });
    }
    return () => { current = false; };
  }, [effectiveToken, engagementType, selectedRegion?.name, selectedRegion?.displayName, selectedCity?.name]);

  const handleNext = async () => {
    if (isPosting) return;
    if (step === 1) {
      if (selectedServices.length === 0) {
        Alert.alert('Selection Required', 'Please choose at least one service role to continue.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!engagementType) {
        Alert.alert('Selection Required', config.missingEngagement);
        return;
      }
      if (!setupPreference) {
        Alert.alert('Selection Required', config.missingSetup);
        return;
      }
      if (engagementType === 'short' && !selectedTime) {
        Alert.alert('Selection Required', config.missingTime);
        return;
      }
      if (engagementType === 'long' && !selectedRegion) {
        Alert.alert('Work Region Required', 'Select the work region for the applicable monthly wage policy.');
        return;
      }
      try { scheduleTerms(); } catch (error) {
        Alert.alert('Invalid Schedule', error instanceof Error ? error.message : 'Select a valid schedule.');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      const addressError = workLocationError(address);
      if (addressError) { Alert.alert('Work Location Required', addressError); return; }
      const policy = await fetchMinimumWage(effectiveToken || undefined,
        engagementType === 'long' ? 'long_term' : 'short_term', selectedCity?.name || '',
        selectedRegion?.displayName || selectedRegion?.name || '');
      if (!policy) {
        Alert.alert('Wage Policy Unavailable', 'Reconnect and select a supported work region (Region X or NCR) before continuing.');
        return;
      }
      setWagePolicy(policy);
      const rateError = validatePostingRate(mode, engagementType, offerAmount, policy);
      if (rateError) {
        Alert.alert(rateError.title, rateError.message);
        return;
      }
      setStep(4);
    } else {
      if (!agreedTerms) {
        Alert.alert('Terms Required', config.missingTerms);
        return;
      }

      setIsPosting(true);
      const request = ++requestVersion.current;

      try {
        const autoMessage = buildAutoMessage();

        const schedule = scheduleTerms();

        const payload: PostingPayload = {
          booking_type: engagementType === 'short' ? 'short_term' : 'long_term',
          work_setup: setupPreference === 'stay-in' ? 'stay_in' : 'stay_out',
          service_category: selectedServices,
          ...schedule,
          region: selectedRegion?.displayName || selectedRegion?.name,
          province: selectedProvince?.name,
          city: selectedCity?.name,
          barangay: selectedBarangay?.name,
          street: streetAddress.trim(),
          floor_number: floorUnit.trim() || undefined,
          zip_code: zipcode.trim(),
          special_instruction: autoMessage,
          rate_amount: offerAmount.trim(),
          rate_period: engagementType === 'long' ? 'month' : 'day',
        };

        const response = await submitPost(effectiveToken, payload, generateUUIDv4());
        if (request !== requestVersion.current) return;

        if (!response.ok) {
          const errorData = await response.json();
          if (request !== requestVersion.current) return;
          console.log('[PostJob] Server response:', errorData);

          const rawStr = typeof errorData === 'string' ? errorData : JSON.stringify(errorData);
          const isVerificationError =
            response.status === 403 ||
            /verified|verification/i.test(rawStr) ||
            errorData?.code === 'account_not_verified';

          if (isVerificationError) {
            setIsPosting(false);
            setVerificationStatus(errorData?.verification_status || (mode === 'service' ? user?.verificationStatus : null) || 'Unverified');
            setShowVerificationRequired(true);
            return;
          }

          let errorMsg: string = config.errorMessage;
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
        successTimer.current = setTimeout(() => {
          if (request !== requestVersion.current) return;
          setPostedSuccess(false);
          setIsPosting(false);
          resetForm();
          onClose();
        }, 1800);
      } catch (error: any) {
        if (request !== requestVersion.current) return;
        console.log('[PostJob] Network error:', error);
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

  return {
    visible,
    onClose,
    mode,
    onOpenVerification,
    config,
    insets,
    user,
    step,
    selectedServices,
    engagementType,
    setupPreference,
    setSetupPreference,
    selectedTime,
    setSelectedTime,
    startDate, setStartDate, endDate, setEndDate, workDays, setWorkDays, workHours, setWorkHours,
    ...address,
    instructions,
    setInstructions,
    wagePolicy,
    offerAmount,
    setOfferAmount,
    agreedTerms,
    setAgreedTerms,
    postedSuccess,
    isPosting,
    showVerificationRequired,
    setShowVerificationRequired,
    verificationStatus,
    applyUserProfileAddress,
    scaleAnim,
    spin,
    services,
    handleToggleService,
    handleClose,
    handleEngagementChange,
    getSelectedRoleLabel,
    buildAutoMessage,
    handleNext,
    handleBack,
  };
}

export type PostFormController = ReturnType<typeof usePostForm>;
