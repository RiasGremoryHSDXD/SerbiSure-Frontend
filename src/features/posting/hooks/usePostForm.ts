import { validatePostingRate } from '../validation';
import { useState, useRef, useEffect } from 'react';
import { Animated, Easing, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { POSTING_CONFIG, engagementRate, buildPostDescription } from '../postingConfig';
import { submitPost, type PostingPayload } from '../api/postingApi';

import { useUser } from '../../auth/session/UserContext';

import { getRegions, getProvinces, getCities, getBarangays, getZipCodeForCity, Region, Province, CityMunicipality, Barangay, LocationItem } from '../../../shared/services/locationService';

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
  const [selectedTime, setSelectedTime] = useState<'morning' | 'afternoon' | 'night' | null>(null);

  // PSGC Location State
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<Province | null>(null);
  const [selectedCity, setSelectedCity] = useState<CityMunicipality | null>(null);
  const [selectedBarangay, setSelectedBarangay] = useState<Barangay | null>(null);
  const [streetAddress, setStreetAddress] = useState('');
  const [floorUnit, setFloorUnit] = useState('');
  const [zipcode, setZipcode] = useState('');

  // Location Picker Lists & Modals
  const [regionsList, setRegionsList] = useState<Region[]>([]);
  const [provincesList, setProvincesList] = useState<Province[]>([]);
  const [citiesList, setCitiesList] = useState<CityMunicipality[]>([]);
  const [barangaysList, setBarangaysList] = useState<Barangay[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [activePicker, setActivePicker] = useState<'region' | 'province' | 'city' | 'barangay' | null>(null);

  const [instructions, setInstructions] = useState('');
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

  // Pre-populate with User Profile Address
  const [hasAutoFilled, setHasAutoFilled] = useState(false);

  const applyUserProfileAddress = async () => {
    if (!user) return;
    try {
      const regList = regionsList.length > 0 ? regionsList : await getRegions();
      setRegionsList(regList);

      let matchedReg: Region | null = null;
      if (user.region) {
        matchedReg =
          regList.find(
            (r) =>
              r.name.toLowerCase().includes(user.region!.toLowerCase()) ||
              (r.displayName && r.displayName.toLowerCase().includes(user.region!.toLowerCase())) ||
              (r.regionName && r.regionName.toLowerCase().includes(user.region!.toLowerCase()))
          ) || null;
      }
      if (!matchedReg) {
        matchedReg = regList.find((r) => r.code === '100000000') || null;
      }

      if (matchedReg) {
        setSelectedRegion(matchedReg);
        const provs = await getProvinces(matchedReg.code);
        setProvincesList(provs);

        let matchedProv: Province | null = null;
        if (user.province) {
          matchedProv = provs.find((p) => p.name.toLowerCase().includes(user.province!.toLowerCase())) || null;
        }
        if (!matchedProv) {
          matchedProv = provs.find((p) => p.code === '104300000') || null;
        }

        if (matchedProv) {
          setSelectedProvince(matchedProv);
          const cities = await getCities(matchedProv.code, matchedReg.code);
          setCitiesList(cities);

          let matchedCity: CityMunicipality | null = null;
          if (user.city) {
            matchedCity =
              cities.find(
                (c) =>
                  c.name.toLowerCase().includes(user.city!.toLowerCase()) ||
                  (c.aliases && c.aliases.some((a) => user.city!.toLowerCase().includes(a)))
              ) || null;
          }
          if (!matchedCity) {
            matchedCity = cities.find((c) => c.code === '104305000') || null;
          }

          if (matchedCity) {
            setSelectedCity(matchedCity);
            const brgys = await getBarangays(matchedCity.code);
            setBarangaysList(brgys);

            let matchedBrgy: Barangay | null = null;
            if (user.barangay) {
              const bLow = user.barangay.toLowerCase();
              matchedBrgy =
                brgys.find(
                  (b) =>
                    b.name.toLowerCase() === bLow ||
                    b.name.toLowerCase().includes(bLow) ||
                    bLow.includes(b.name.toLowerCase())
                ) || null;
            }

            if (matchedBrgy) {
              setSelectedBarangay(matchedBrgy);
            } else if (user.barangay) {
              setSelectedBarangay({
                code: '',
                name: user.barangay,
                displayName:
                  user.barangay.startsWith('Barangay') || user.barangay.startsWith('Brgy')
                    ? user.barangay
                    : `Brgy. ${user.barangay}`,
              });
            }
          }
        }
      }

      if (user.street) setStreetAddress(user.street);
      if (user.zipcode) setZipcode(user.zipcode);
      else setZipcode('9000');
    } catch (e) {
      console.warn('[PostJobScreen] applyUserProfileAddress error:', e);
      if (user.region) setSelectedRegion({ code: '100000000', name: user.region, displayName: user.region, regionName: user.region });
      if (user.province) setSelectedProvince({ code: '104300000', name: user.province, displayName: user.province, regionCode: '100000000' });
      if (user.city) setSelectedCity({ code: '104305000', name: user.city, displayName: user.city });
      if (user.barangay) setSelectedBarangay({ code: '', name: user.barangay, displayName: user.barangay });
      if (user.street) setStreetAddress(user.street);
      if (user.zipcode) setZipcode(user.zipcode);
    }
  };

  useEffect(() => {
    if (visible && !hasAutoFilled && user && (user.barangay || user.city)) {
      setHasAutoFilled(true);
      applyUserProfileAddress();
    }
  }, [user, visible, mode, hasAutoFilled]);

  const loadRegions = async () => {
    setLoadingLocations(true);
    try {
      const data = await getRegions();
      setRegionsList(data);
    } catch (err) {
      console.warn('[PostJobScreen] loadRegions error:', err);
    } finally {
      setLoadingLocations(false);
    }
  };

  const handleOpenRegionPicker = async () => {
    setActivePicker('region');
    if (regionsList.length === 0) {
      await loadRegions();
    }
  };

  const handleSelectRegion = async (item: LocationItem) => {
    const reg = item as Region;
    setSelectedRegion(reg);
    setSelectedProvince(null);
    setSelectedCity(null);
    setSelectedBarangay(null);
    setProvincesList([]);
    setCitiesList([]);
    setBarangaysList([]);

    setLoadingLocations(true);
    try {
      const provs = await getProvinces(reg.code);
      setProvincesList(provs);
      const metroManila = provs.length === 1 && provs[0]?.name === 'Metro Manila' ? provs[0] : null;
      if (metroManila) {
        setSelectedProvince(metroManila);
        const cities = await getCities(metroManila.code, reg.code);
        setCitiesList(cities);
      }
    } catch (err) {
      console.warn('[PostJobScreen] handleSelectRegion error:', err);
    } finally {
      setLoadingLocations(false);
    }
  };

  const handleOpenProvincePicker = async () => {
    if (!selectedRegion) {
      Alert.alert('Select Region First', 'Please select a Region first.');
      return;
    }
    setActivePicker('province');
    if (provincesList.length === 0) {
      setLoadingLocations(true);
      try {
        const provs = await getProvinces(selectedRegion.code);
        setProvincesList(provs);
      } finally {
        setLoadingLocations(false);
      }
    }
  };

  const handleSelectProvince = async (item: LocationItem) => {
    const prov = item as Province;
    setSelectedProvince(prov);
    setSelectedCity(null);
    setSelectedBarangay(null);
    setCitiesList([]);
    setBarangaysList([]);

    setLoadingLocations(true);
    try {
      const cities = await getCities(prov.code, selectedRegion?.code);
      setCitiesList(cities);
    } catch (err) {
      console.warn('[PostJobScreen] handleSelectProvince error:', err);
    } finally {
      setLoadingLocations(false);
    }
  };

  const handleOpenCityPicker = async () => {
    if (!selectedProvince && !selectedRegion) {
      Alert.alert('Select Region & Province', 'Please select your Region and Province first.');
      return;
    }
    setActivePicker('city');
    if (citiesList.length === 0) {
      setLoadingLocations(true);
      try {
        const provCode = selectedProvince?.code || '';
        const regCode = selectedRegion?.code || '';
        const cities = await getCities(provCode, regCode);
        setCitiesList(cities);
      } finally {
        setLoadingLocations(false);
      }
    }
  };

  const handleSelectCity = async (item: LocationItem) => {
    const city = item as CityMunicipality;
    setSelectedCity(city);
    setSelectedBarangay(null);
    setBarangaysList([]);

    const suggestedZip = getZipCodeForCity(city.code, city.name);
    if (suggestedZip) {
      setZipcode(suggestedZip);
    }

    setLoadingLocations(true);
    try {
      const brgys = await getBarangays(city.code);
      setBarangaysList(brgys);
    } catch (err) {
      console.warn('[PostJobScreen] handleSelectCity error:', err);
    } finally {
      setLoadingLocations(false);
    }
  };

  const handleOpenBarangayPicker = async () => {
    if (!selectedCity) {
      Alert.alert('Select City First', 'Please select your City / Municipality first.');
      return;
    }
    setActivePicker('barangay');
    if (barangaysList.length === 0) {
      setLoadingLocations(true);
      try {
        const brgys = await getBarangays(selectedCity.code);
        setBarangaysList(brgys);
      } finally {
        setLoadingLocations(false);
      }
    }
  };

  const handleSelectBarangay = (item: LocationItem) => {
    setSelectedBarangay(item as Barangay);
  };

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
    setSelectedRegion(null);
    setSelectedProvince(null);
    setSelectedCity(null);
    setSelectedBarangay(null);
    setStreetAddress('');
    setFloorUnit('');
    setZipcode('');
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
    if (selectedTime === 'morning') return 'morning (8 AM - 12 PM)';
    if (selectedTime === 'afternoon') return 'afternoon (12 PM - 5 PM)';
    if (selectedTime === 'night') return 'night (5 PM - 9 PM)';
    return 'flexible hours';
  };

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
      setStep(3);
    } else if (step === 3) {
      if (!selectedRegion) {
        Alert.alert('Region Required', 'Please select a Region.');
        return;
      }
      if (!selectedProvince) {
        Alert.alert('Province Required', 'Please select a Province.');
        return;
      }
      if (!selectedCity) {
        Alert.alert('City / Municipality Required', 'Please select a City or Municipality.');
        return;
      }
      if (!selectedBarangay) {
        Alert.alert('Barangay Required', 'Please select a Barangay.');
        return;
      }
      if (!streetAddress.trim()) {
        Alert.alert('Street / House No. Required', 'Please enter your street address, house number, or zone.');
        return;
      }
      const cleanZip = zipcode.trim();
      if (!cleanZip || !/^\d{4}$/.test(cleanZip)) {
        Alert.alert('Zip Code Required', 'Please enter a valid 4-digit zip code (e.g. 9000).');
        return;
      }
      const rateError = validatePostingRate(mode, engagementType, offerAmount);
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

        const payload: PostingPayload = {
          booking_type: engagementType === 'short' ? 'short_term' : 'long_term',
          service_category: selectedServices,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          region: selectedRegion?.displayName || selectedRegion?.name,
          province: selectedProvince?.name,
          city: selectedCity?.name,
          barangay: selectedBarangay?.name,
          street: streetAddress.trim(),
          floor_number: floorUnit.trim() || undefined,
          zip_code: zipcode.trim() || '9000',
          special_instruction: autoMessage,
          daily_rate: offerAmount.trim(),
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
    selectedRegion,
    selectedProvince,
    selectedCity,
    selectedBarangay,
    streetAddress,
    setStreetAddress,
    floorUnit,
    setFloorUnit,
    zipcode,
    setZipcode,
    regionsList,
    provincesList,
    citiesList,
    barangaysList,
    loadingLocations,
    activePicker,
    setActivePicker,
    instructions,
    setInstructions,
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
    handleOpenRegionPicker,
    handleSelectRegion,
    handleOpenProvincePicker,
    handleSelectProvince,
    handleOpenCityPicker,
    handleSelectCity,
    handleOpenBarangayPicker,
    handleSelectBarangay,
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
