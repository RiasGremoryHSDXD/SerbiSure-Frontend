import { useLanguage as useUiLanguage } from '../../../shared/localization/LanguageContext';
import { useState, useMemo, useRef } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../../../shared/api/config';
import { fetchWithTimeout } from '../../../shared/api/httpClient';
import { updateUserAbout, updateUserTags } from '../../profile/api/accountApi';
import { useUser } from '../session/UserContext';
import { SearchablePickerModal } from '../../../shared/ui/SearchablePickerModal';
import { DateOfBirthPickerModal } from '../../../shared/ui/DateOfBirthPickerModal';
import { DemographicPickerModal, DemographicOption } from '../../../shared/ui/DemographicPickerModal';
import { getRegions, getProvinces, getCities, getBarangays, getZipCodeForCity, Region, Province, CityMunicipality, Barangay, LocationItem } from '../../../shared/services/locationService';
import THEME from '../../../shared/theme/theme';
import { RegistrationStepper } from '../components/RegistrationStepper';
import { RegistrationErrorModal } from '../components/RegistrationErrorModal';
import { readRegistrationResponse } from '../api/registration';
import { PrivacyPolicyModal } from '../../profile/components/PrivacyPolicyModal';
import { SERVICE_CHOICES } from '../../bookings/engagementForm';

import { WorkerCvForm } from '../../profile/worker/WorkerCvForm';
import { emptyWorkerDraft, validateWorkerPage, workerPayload } from '../../profile/worker/workerCv';

const logoSource = require('../../../../assets/serbisure_new_clean.png');

const KASAMBAHAY_ROLES = SERVICE_CHOICES.map(service => ({
  ...service,
  label: service.id === 'Child_care' ? 'Childcare' : service.label,
}));

const NATIONALITY_OPTIONS: DemographicOption[] = [
  { id: 'Filipino', label: 'Filipino', badge: '🇵🇭' },
  { id: 'American', label: 'American', badge: '🇺🇸' },
  { id: 'Chinese', label: 'Chinese', badge: '🇨🇳' },
  { id: 'Japanese', label: 'Japanese', badge: '🇯🇵' },
  { id: 'British', label: 'British', badge: '🇬🇧' },
  { id: 'Canadian', label: 'Canadian', badge: '🇨🇦' },
  { id: 'Australian', label: 'Australian', badge: '🇦🇺' },
  { id: 'Korean', label: 'Korean', badge: '🇰🇷' },
  { id: 'Spanish', label: 'Spanish', badge: '🇪🇸' },
  { id: 'OTHER_CUSTOM', label: 'Other Nationality...' },
];

const RELIGION_OPTIONS: DemographicOption[] = [
  { id: 'Roman Catholic', label: 'Roman Catholic', sublabel: 'Christianity (Catholic)' },
  { id: 'Islam', label: 'Islam', sublabel: 'Muslim' },
  { id: 'Iglesia ni Cristo', label: 'Iglesia ni Cristo', sublabel: 'INC' },
  { id: 'Evangelical / Born Again', label: 'Evangelical / Born Again', sublabel: 'Christian' },
  { id: 'Seventh-day Adventist', label: 'Seventh-day Adventist', sublabel: 'SDA' },
  { id: 'Protestant', label: 'Protestant', sublabel: 'Christian' },
  { id: 'Jehovah\'s Witnesses', label: 'Jehovah\'s Witnesses' },
  { id: 'Baptist', label: 'Baptist', sublabel: 'Christian' },
  { id: 'None / Prefer not to say', label: 'None / Prefer not to say' },
  { id: 'OTHER_CUSTOM', label: 'Other Religion...' },
];

/**
 * Formats a raw Philippine mobile phone number into 3-4-3 grouped blocks for high readability:
 * e.g. "9123456789" -> "912 3456 789"
 */
export const formatPhilippinePhoneNumber = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7, 10)}`;
};

type RegistrationScreenProps = {
  role: 'homeowner' | 'kasambahay';
  onBack?: () => void;
  onNext?: (token?: string) => void;
  onCancel?: () => void;
  onNavigateToLogin?: () => void;
};

export function RegistrationScreen({ role, onBack, onNext, onCancel, onNavigateToLogin }: RegistrationScreenProps) {
  const { tr: uiText } = useUiLanguage();
  const insets = useSafeAreaInsets();
  const { updateUser } = useUser();

  // Sub-step inside registration:
  // Kasambahay: 1 = Personal Details, 2 = Kasambahay Profile & Preferences, 3 = Location & Consent
  // Homeowner: 1 = Personal Details, 3 = Location & Consent
  const [subStep, setSubStep] = useState<1 | 2 | 3>(1);

  // Step 1: Personal & Account info
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(''); // ISO: YYYY-MM-DD
  const [calculatedAge, setCalculatedAge] = useState<number | null>(null);
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other' | null>(null);
  const [nationality, setNationality] = useState('Filipino');
  const [religion, setReligion] = useState<string | null>(null);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [activeDemographicPicker, setActiveDemographicPicker] = useState<'nationality' | 'religion' | null>(null);
  const [rawPhone, setRawPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Step 2 (Kasambahay only): Profile & Preferences (unselected by default)
  const [age, setAge] = useState('');
  const [workerDetails, setWorkerDetails] = useState(emptyWorkerDraft);
  const [workerPage, setWorkerPage] = useState(0);
  const registrationScroll = useRef<ScrollView>(null);
  const selectedRoles = workerDetails.service_categories;
  const desiredSalary = workerDetails.desired_monthly_rate;
  const livingArrangement = workerDetails.work_setup === 'stay_in' ? 'Stay-In' : workerDetails.work_setup === 'stay_out' ? 'Stay-Out' : workerDetails.work_setup === 'either' ? 'Either' : null;
  const selectedDialects = workerDetails.languages;

  // Step 3: Location & Address info
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<Province | null>(null);
  const [selectedCity, setSelectedCity] = useState<CityMunicipality | null>(null);
  const [selectedBarangay, setSelectedBarangay] = useState<Barangay | null>(null);
  const [streetAddress, setStreetAddress] = useState('');
  const [zipcode, setZipcode] = useState('');

  // Location lists & loading states
  const [regionsList, setRegionsList] = useState<Region[]>([]);
  const [provincesList, setProvincesList] = useState<Province[]>([]);
  const [citiesList, setCitiesList] = useState<CityMunicipality[]>([]);
  const [barangaysList, setBarangaysList] = useState<Barangay[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  // Active Picker Modal
  const [activePicker, setActivePicker] = useState<'region' | 'province' | 'city' | 'barangay' | null>(null);

  // Consent
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [legalDocument, setLegalDocument] = useState<'terms' | 'privacy' | null>(null);

  // Form submission loading
  const [loading, setLoading] = useState(false);

  // Server & Validation Error State for Error Modal
  const [serverError, setServerError] = useState<any | null>(null);

  const isHomeowner = role === 'homeowner';

  const formatDjangoError = (data: any): string => {
    if (!data) return "An unexpected error occurred. Please try again.";
    if (typeof data === 'string') return data;
    if (data.detail) return String(data.detail);
    if (data.message) return String(data.message);

    if (typeof data === 'object') {
      const messages: string[] = [];
      for (const [key, value] of Object.entries(data)) {
        const fieldName = key
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (char) => char.toUpperCase());

        const valList = Array.isArray(value) ? value : [value];
        valList.forEach((msg) => {
          if (key === 'non_field_errors' || key === 'detail') {
            messages.push(`• ${msg}`);
          } else {
            messages.push(`• ${fieldName}: ${msg}`);
          }
        });
      }
      if (messages.length > 0) {
        return messages.join('\n');
      }
    }

    return "Registration failed. Please check your entries and try again.";
  };

  const handlePhoneChange = (text: string) => {
    const currentFormatted = formatPhilippinePhoneNumber(rawPhone);
    let cleanText = text;

    // Edge Case: If user pressed backspace on a space separator
    if (text.length < currentFormatted.length) {
      let diffIndex = 0;
      while (diffIndex < text.length && text[diffIndex] === currentFormatted[diffIndex]) {
        diffIndex++;
      }
      if (currentFormatted[diffIndex] === ' ' && diffIndex > 0) {
        cleanText = currentFormatted.slice(0, diffIndex - 1) + currentFormatted.slice(diffIndex);
      }
    }

    let digits = cleanText.replace(/\D/g, '');

    // Edge Case: If pasted with international prefix (+63 or 63)
    if (digits.startsWith('63') && digits.length > 10) {
      digits = digits.slice(2);
    }

    // Edge Case: If typed or pasted with domestic leading 0 (09...)
    if (digits.startsWith('0')) {
      digits = digits.slice(1);
    }

    // Edge Case: Enforce maximum of 10 digits
    if (digits.length > 10) {
      digits = digits.slice(0, 10);
    }

    setRawPhone(digits);
  };

  const computedBio = useMemo(() => {
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim() || 'Kasambahay';
    const ageNum = calculatedAge || parseInt(age, 10);
    const agePart = ageNum ? `, ${ageNum} years old` : '';

    const cityStr = selectedCity?.name;
    const provStr = selectedProvince?.name;
    const fromPart = cityStr && provStr ? ` from ${cityStr}, ${provStr}` : '';
    const roleLabels = selectedRoles.map(id => KASAMBAHAY_ROLES.find(service => service.id === id)?.label || id);

    let rolesPart = '';
    if (roleLabels.length === 1) {
      rolesPart = `applying for the role of ${roleLabels[0]}`;
    } else if (roleLabels.length === 2) {
      rolesPart = `applying for the roles of ${roleLabels[0]} and ${roleLabels[1]}`;
    } else if (roleLabels.length > 2) {
      const initial = roleLabels.slice(0, -1).join(', ');
      const last = roleLabels[roleLabels.length - 1];
      rolesPart = `applying for the roles of ${initial} and ${last}`;
    } else {
      rolesPart = 'applying for household service roles';
    }

    const salaryNum = parseFloat(desiredSalary.replace(/[^\d.]/g, '')) || 0;
    const salaryFormatted = salaryNum > 0
      ? `₱ ${salaryNum.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : '';

    const livingStr = livingArrangement ? livingArrangement.toLowerCase() : 'a flexible';

    return `I am ${fullName}${agePart}${fromPart}, ${rolesPart}.${salaryFormatted ? ` My expected salary is ${salaryFormatted} per month.` : ''} I prefer ${livingStr === 'either' ? 'either stay-in or stay-out' : livingStr} work.`;
  }, [firstName, lastName, calculatedAge, age, selectedCity, selectedProvince, selectedRoles, desiredSalary, livingArrangement]);

  const finalBio = computedBio;

  const generatedTags = useMemo(() => {
    const serviceTags = SERVICE_CHOICES.filter(service => selectedRoles.includes(service.id)).map(service => service.label);
    return livingArrangement ? [...serviceTags, livingArrangement] : serviceTags;
  }, [selectedRoles, livingArrangement]);

  // --- Step 1 Validation & Transition ---
  const handleProceedFromStep1 = async () => {
    const cleanDigits = rawPhone.replace(/\D/g, '').replace(/^0+/, '');

    if (!firstName.trim()) {
      setServerError({ first_name: ["Please enter your First Name."] });
      return;
    }
    if (!lastName.trim()) {
      setServerError({ last_name: ["Please enter your Last Name."] });
      return;
    }
    if (!dateOfBirth) {
      setServerError({ date_of_birth: ["Please select your Date of Birth."] });
      return;
    }
    if (calculatedAge === null || calculatedAge < 18) {
      setServerError({ date_of_birth: ["You must be at least 18 years old to register under Philippine Labor Law (RA 10361)."] });
      return;
    }
    if (!gender) {
      setServerError({ gender: ["Please select your Gender."] });
      return;
    }
    if (!nationality.trim()) {
      setServerError({ nationality: ["Please select your Nationality."] });
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setServerError({ email: ["Please enter a valid email address."] });
      return;
    }
    if (cleanDigits.length !== 10 || !cleanDigits.startsWith('9')) {
      setServerError({ contact_number: ["Please enter a valid 10-digit mobile number starting with 9 (e.g. 912 3456 789)."] });
      return;
    }
    if (password.length < 8) {
      setServerError({ password: ["Password must be at least 8 characters long."] });
      return;
    }
    if (password !== confirmPassword) {
      setServerError({ password: ["Password and Confirm Password do not match."] });
      return;
    }

    if (isHomeowner) {
      if (regionsList.length === 0) {
        loadRegions();
      }
      setSubStep(3);
    } else {
      setSubStep(2);
    }
  };

  // --- Step 2 Validation & Transition ---
  const handleProceedFromStep2 = () => {
    const message = validateWorkerPage(workerDetails, workerPage);
    if (message) { setServerError({ worker_profile: [message] }); return; }
    if (workerPage < 3) { setWorkerPage(workerPage + 1); registrationScroll.current?.scrollTo({ y: 0 }); return; }
    if (regionsList.length === 0) loadRegions();
    setSubStep(3);
  };

  // --- Location Pickers Logic ---
  const loadRegions = async () => {
    setLoadingLocations(true);
    try {
      const data = await getRegions();
      setRegionsList(data);
    } catch (err) {
      console.warn('[RegistrationScreen] loadRegions error:', err);
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
      // Auto-select Metro Manila if NCR
      const metroManila = provs.length === 1 && provs[0]?.name === 'Metro Manila' ? provs[0] : null;
      if (metroManila) {
        setSelectedProvince(metroManila);
        const cities = await getCities(metroManila.code, reg.code);
        setCitiesList(cities);
      }
    } catch (err) {
      console.warn('[RegistrationScreen] handleSelectRegion error:', err);
    } finally {
      setLoadingLocations(false);
    }
  };

  const handleOpenProvincePicker = async () => {
    if (!selectedRegion) {
      Alert.alert("Select Region First", "Please select your Region first.");
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
      console.warn('[RegistrationScreen] handleSelectProvince error:', err);
    } finally {
      setLoadingLocations(false);
    }
  };

  const handleOpenCityPicker = async () => {
    if (!selectedProvince) {
      Alert.alert("Select Province First", "Please select your Province first.");
      return;
    }
    setActivePicker('city');
    if (citiesList.length === 0) {
      setLoadingLocations(true);
      try {
        const cities = await getCities(selectedProvince.code, selectedRegion?.code);
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

    // Auto-suggest zip code (e.g. 9000 for CDO)
    const suggestedZip = getZipCodeForCity(city.code, city.name);
    if (suggestedZip) {
      setZipcode(suggestedZip);
    }

    setLoadingLocations(true);
    try {
      const brgys = await getBarangays(city.code);
      setBarangaysList(brgys);
    } catch (err) {
      console.warn('[RegistrationScreen] handleSelectCity error:', err);
    } finally {
      setLoadingLocations(false);
    }
  };

  const handleOpenBarangayPicker = async () => {
    if (!selectedCity) {
      Alert.alert("Select City First", "Please select your City / Municipality first.");
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

  // --- Step 3 Final Submission ---
  const handleRegister = async () => {
    const cleanDigits = rawPhone.replace(/\D/g, '').replace(/^0+/, '');
    const contactNumber = `+63${cleanDigits}`;

    if (!selectedRegion) {
      setServerError({ region: ["Please select your Region."] });
      return;
    }
    if (!selectedProvince) {
      setServerError({ province: ["Please select your Province."] });
      return;
    }
    if (!selectedCity) {
      setServerError({ city: ["Please select your City or Municipality."] });
      return;
    }
    if (!selectedBarangay) {
      setServerError({ barangay: ["Please select your Barangay."] });
      return;
    }
    if (!streetAddress.trim()) {
      setServerError({ street: ["Please enter your Street / House Number / Zone."] });
      return;
    }
    const cleanZip = zipcode.trim();
    if (!cleanZip || !/^\d{4}$/.test(cleanZip)) {
      setServerError({ zipcode: ["Zip Code must be exactly 4 digits (e.g. 9000)."] });
      return;
    }
    if (!termsAccepted || !privacyAccepted) {
      setServerError({ consent: ["Please accept both the Terms & Conditions and Data Privacy Policy to continue."] });
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        first_name: firstName.trim(),
        middle_name: middleName.trim(),
        last_name: lastName.trim(),
        date_of_birth: dateOfBirth,
        gender: gender,
        nationality: nationality,
        religion: religion || '',
        email: email.trim().toLowerCase(),
        password: password,
        account_type: isHomeowner ? "Homeowner" : "Kasambahay",
        contact_number: contactNumber,
        country: "Philippines",
        region: selectedRegion.displayName || selectedRegion.name,
        province: selectedProvince.name,
        city: selectedCity.name,
        barangay: selectedBarangay.name,
        street: streetAddress.trim(),
        zipcode: cleanZip,
      };

      if (!isHomeowner) {
        payload.language = selectedDialects.join(', ');
        payload.user_about = finalBio;
        payload.user_tags = generatedTags;
        payload.worker_profile = workerPayload(workerDetails);
      }

      const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };

      const idempotencyKey = generateUUID();

      const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/accounts/register/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey
        },
        body: JSON.stringify(payload)
      });

      const result = await readRegistrationResponse(response);
      if (result.ok) {
        // Save user location & details globally in UserContext ONLY upon successful account creation
        updateUser({
          firstName: firstName.trim(),
          middleName: middleName.trim(),
          lastName: lastName.trim(),
          dateOfBirth: dateOfBirth,
          gender: gender || undefined,
          nationality: nationality,
          religion: religion || undefined,
          email: email.trim().toLowerCase(),
          contactNumber,
          country: "Philippines",
          region: selectedRegion.displayName || selectedRegion.name,
          province: selectedProvince.name,
          city: selectedCity.name,
          barangay: selectedBarangay.name,
          street: streetAddress.trim(),
          zipcode: cleanZip,
          userAbout: !isHomeowner ? finalBio : undefined,
          userTags: !isHomeowner ? generatedTags : undefined,
        });

        if (!isHomeowner) {
          updateUserAbout(result.access, finalBio).catch(() => { });
          updateUserTags(result.access, generatedTags).catch(() => { });
        }
        Alert.alert("Success", "Account created successfully!");
        if (onNext) onNext(result.access);
      } else {
        setServerError(result.error);
      }
    } catch (error: any) {
      setServerError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleHeaderBack = () => {
    if (subStep === 3) {
      setSubStep(isHomeowner ? 1 : 2);
    } else if (subStep === 2) {
      if (workerPage > 0) { setWorkerPage(workerPage - 1); return; }
      setSubStep(1);
    } else {
      if (onBack) onBack();
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 14) }]}>
        {/* Navigation Header */}
        <View style={styles.header}>
          <View style={styles.headerSide}>
            <Pressable onPress={handleHeaderBack} hitSlop={10}>
              <Ionicons name="arrow-back" size={26} color="#2A2925" />
            </Pressable>
          </View>
          <Image source={logoSource} style={styles.logo} resizeMode="contain" />
          <View style={[styles.headerSide, styles.headerSideRight]} />
        </View>

        {/* Title Block */}
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{isHomeowner ? 'Join as Homeowner' : 'Join as Kasambahay'}</Text>
          <Text style={styles.subtitle}>
            {isHomeowner
              ? 'Join as a homeowner to find trusted professionals for your household.'
              : 'Join as a kasambahay to offer your trusted household services.'}
          </Text>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          <View style={styles.formContent}>
            {/* Unified Stepper (4 steps for Homeowner, 5 steps for Kasambahay) */}
            <RegistrationStepper
              currentStep={isHomeowner ? (subStep === 1 ? 1 : 2) : subStep}
              totalSteps={isHomeowner ? 4 : 5}
              title={
                subStep === 1
                  ? 'Step 1: Account Information'
                  : subStep === 2
                    ? 'Step 2: Your worker profile'
                    : isHomeowner
                      ? 'Step 2: Where do you live?'
                      : 'Step 3: Where do you live?'
              }
              help={
                subStep === 1
                  ? undefined
                  : subStep === 2
                    ? 'Answer a few short questions to create your SerbiSure CV.'
                    : 'We use your location to connect you with jobs and household services in your area.'
              }
            />

            <ScrollView
              ref={registrationScroll}
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingTop: 4, paddingBottom: 16 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* SUB-STEP 1: PERSONAL & ACCOUNT DETAILS */}
              {subStep === 1 && (
                <View>
                  <View style={styles.inputContainer}>
                    <Ionicons name="person" size={18} color="#000000" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="First Name"
                      placeholderTextColor="#999"
                      value={firstName}
                      onChangeText={setFirstName}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Ionicons name="person" size={18} color="#000000" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Middle Name (Optional)"
                      placeholderTextColor="#999"
                      value={middleName}
                      onChangeText={setMiddleName}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Ionicons name="person" size={18} color="#000000" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Last Name"
                      placeholderTextColor="#999"
                      value={lastName}
                      onChangeText={setLastName}
                    />
                  </View>

                  {/* Date of Birth Picker Button */}
                  <Pressable
                    style={[styles.inputContainer, styles.pickerPressable]}
                    onPress={() => setShowDobPicker(true)}
                  >
                    <Ionicons name="calendar-outline" size={18} color="#000000" style={styles.inputIcon} />
                    <Text
                      style={[
                        styles.pickerText,
                        !dateOfBirth && styles.pickerPlaceholderText,
                      ]}
                    >
                      {dateOfBirth ? `${dateOfBirth} (${calculatedAge} yrs old)` : 'Date of Birth (YYYY-MM-DD)'}
                    </Text>
                    <View style={styles.pickerRightBadge}>
                      {calculatedAge ? (
                        <View style={styles.agePillBadge}>
                          <Text style={styles.agePillText}>{calculatedAge} {uiText("yrs")}</Text>
                        </View>
                      ) : null}
                      <Ionicons name="chevron-down" size={16} color="#8A8985" />
                    </View>
                  </Pressable>

                  {/* Gender Segmented Selection */}
                  <View style={styles.demographicFieldBlock}>
                    <Text style={styles.fieldSubLabel}>{uiText("Gender")}</Text>
                    <View style={styles.genderRow}>
                      {(['Male', 'Female', 'Other'] as const).map((g) => {
                        const isSelected = gender === g;
                        return (
                          <Pressable
                            key={g}
                            style={[
                              styles.genderPill,
                              isSelected && styles.genderPillSelected,
                            ]}
                            onPress={() => setGender(g)}
                          >
                            {isSelected && (
                              <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                            )}
                            <Text
                              style={[
                                styles.genderPillText,
                                isSelected && styles.genderPillTextSelected,
                              ]}
                            >
                              {g}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  {/* Nationality & Religion (2 Columns) */}
                  <View style={styles.demographicRow}>
                    {/* Nationality */}
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.fieldSubLabel}>{uiText("Nationality")}</Text>
                      <Pressable
                        style={[styles.compactInputContainer, styles.compactPickerPressable]}
                        onPress={() => setActiveDemographicPicker('nationality')}
                      >
                        <Ionicons name="globe-outline" size={15} color="#0D0D11" style={{ marginRight: 6 }} />
                        <Text style={styles.compactPickerText} numberOfLines={1}>
                          {nationality || 'Filipino'}
                        </Text>
                        <Ionicons name="chevron-down" size={13} color="#8A8985" style={{ marginLeft: 'auto' }} />
                      </Pressable>
                    </View>

                    {/* Religion */}
                    <View style={{ flex: 1.1 }}>
                      <Text style={styles.fieldSubLabel}>{uiText("Religion")}</Text>
                      <Pressable
                        style={[styles.compactInputContainer, styles.compactPickerPressable]}
                        onPress={() => setActiveDemographicPicker('religion')}
                      >
                        <Ionicons name="heart-outline" size={15} color="#0D0D11" style={{ marginRight: 6 }} />
                        <Text
                          style={[
                            styles.compactPickerText,
                            !religion && styles.compactPickerPlaceholder,
                          ]}
                          numberOfLines={1}
                        >
                          {religion || uiText("Select")}
                        </Text>
                        <Ionicons name="chevron-down" size={13} color="#8A8985" style={{ marginLeft: 'auto' }} />
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.inputContainer}>
                    <View style={styles.countryCodeBadge}>
                      <Text style={styles.flagEmoji}>🇵🇭</Text>
                      <Text style={styles.countryCodeText}>+63</Text>
                    </View>
                    <View style={styles.phoneVerticalLine} />
                    <TextInput
                      style={styles.input}
                      placeholder="912 3456 789"
                      placeholderTextColor="#999"
                      keyboardType="phone-pad"
                      maxLength={12}
                      value={formatPhilippinePhoneNumber(rawPhone)}
                      onChangeText={handlePhoneChange}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Ionicons name="mail" size={18} color="#000000" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Email"
                      placeholderTextColor="#999"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={email}
                      onChangeText={setEmail}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Ionicons name="lock-closed" size={18} color="#000000" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Password (min. 8 characters)"
                      placeholderTextColor="#999"
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={setPassword}
                    />
                    <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={18}
                        color="#000000"
                      />
                    </Pressable>
                  </View>

                  <View style={styles.inputContainer}>
                    <Ionicons name="lock-closed" size={18} color="#000000" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Confirm Password"
                      placeholderTextColor="#999"
                      secureTextEntry={!showConfirmPassword}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                    />
                    <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeBtn}>
                      <Ionicons
                        name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={18}
                        color="#000000"
                      />
                    </Pressable>
                  </View>
                </View>
              )}

              {subStep === 2 && !isHomeowner && (
                <View key={workerPage}>
                  <WorkerCvForm value={workerDetails} onChange={setWorkerDetails} page={workerPage} />
                </View>
              )}

              {/* SUB-STEP 3: LOCATION & CONSENT */}
              {subStep === 3 && (
                <View>
                  {/* Region Dropdown Button */}
                  <Pressable style={styles.selectButton} onPress={handleOpenRegionPicker}>
                    <Ionicons name="map-outline" size={18} color="#000000" style={styles.inputIcon} />
                    <Text
                      style={[styles.selectButtonText, !selectedRegion && styles.placeholderText]}
                      numberOfLines={1}
                    >
                      {selectedRegion ? selectedRegion.displayName || selectedRegion.name : 'Select Region'}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color="#666666" />
                  </Pressable>

                  {/* Province Dropdown Button */}
                  <Pressable
                    style={[styles.selectButton, !selectedRegion && styles.selectButtonDisabled]}
                    onPress={handleOpenProvincePicker}
                    disabled={!selectedRegion}
                  >
                    <Ionicons name="business-outline" size={18} color="#000000" style={styles.inputIcon} />
                    <Text
                      style={[styles.selectButtonText, !selectedProvince && styles.placeholderText]}
                      numberOfLines={1}
                    >
                      {selectedProvince ? selectedProvince.displayName || selectedProvince.name : 'Select Province'}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color="#666666" />
                  </Pressable>

                  {/* City / Municipality Dropdown Button */}
                  <Pressable
                    style={[styles.selectButton, !selectedProvince && styles.selectButtonDisabled]}
                    onPress={handleOpenCityPicker}
                    disabled={!selectedProvince}
                  >
                    <Ionicons name="location-outline" size={18} color="#000000" style={styles.inputIcon} />
                    <Text
                      style={[styles.selectButtonText, !selectedCity && styles.placeholderText]}
                      numberOfLines={1}
                    >
                      {selectedCity ? selectedCity.displayName || selectedCity.name : 'Select City / Municipality'}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color="#666666" />
                  </Pressable>

                  {/* Barangay Dropdown Button */}
                  <Pressable
                    style={[styles.selectButton, !selectedCity && styles.selectButtonDisabled]}
                    onPress={handleOpenBarangayPicker}
                    disabled={!selectedCity}
                  >
                    <Ionicons name="home-outline" size={18} color="#000000" style={styles.inputIcon} />
                    <Text
                      style={[styles.selectButtonText, !selectedBarangay && styles.placeholderText]}
                      numberOfLines={1}
                    >
                      {selectedBarangay ? selectedBarangay.displayName || selectedBarangay.name : 'Select Barangay'}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color="#666666" />
                  </Pressable>

                  {/* House No. / Street / Zone Input */}
                  <View style={styles.inputContainer}>
                    <Ionicons name="navigate-outline" size={18} color="#000000" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="House No. / Street / Zone / Subdivision"
                      placeholderTextColor="#999"
                      value={streetAddress}
                      onChangeText={setStreetAddress}
                      maxLength={70}
                    />
                  </View>

                  {/* Zip Code Input */}
                  <View style={styles.inputContainer}>
                    <Ionicons name="mail-outline" size={18} color="#000000" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Zip Code (e.g. 9000)"
                      placeholderTextColor="#999"
                      keyboardType="number-pad"
                      maxLength={4}
                      value={zipcode}
                      onChangeText={(t) => setZipcode(t.replace(/\D/g, '').slice(0, 4))}
                    />
                  </View>

                  {/* Consent Checkboxes */}
                  <View style={styles.checkboxGroup}>
                    <View style={styles.checkboxRow}>
                      <Pressable
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: termsAccepted }}
                        accessibilityLabel={uiText("I consent to") + ' ' + uiText("Terms and Conditions")}
                        hitSlop={6}
                        onPress={() => setTermsAccepted(!termsAccepted)}
                      >
                        <Ionicons
                          name={termsAccepted ? "checkbox-outline" : "square-outline"}
                          size={18}
                          color="#000000"
                        />
                      </Pressable>
                      <Text style={styles.checkboxText}>
                        {uiText("I consent to")}{' '}
                        <Text
                          accessibilityRole="link"
                          onPress={() => setLegalDocument('terms')}
                          style={styles.linkText}
                        >
                          {uiText("Terms and Conditions")}
                        </Text>.
                      </Text>
                    </View>

                    <View style={styles.checkboxRow}>
                      <Pressable
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: privacyAccepted }}
                        accessibilityLabel={uiText("I consent to") + ' ' + uiText("Data Privacy Policy")}
                        hitSlop={6}
                        onPress={() => setPrivacyAccepted(!privacyAccepted)}
                      >
                        <Ionicons
                          name={privacyAccepted ? "checkbox-outline" : "square-outline"}
                          size={18}
                          color="#000000"
                        />
                      </Pressable>
                      <Text style={styles.checkboxText}>
                        {uiText("I consent to")}{' '}
                        <Text
                          accessibilityRole="link"
                          onPress={() => setLegalDocument('privacy')}
                          style={styles.linkText}
                        >
                          {uiText("Data Privacy Policy")}
                        </Text>.
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Fixed Footer Buttons */}
            <View style={styles.fixedFooter}>
              <View style={styles.divider} />
              {subStep === 1 ? (
                <View style={styles.buttonRow}>
                  <Pressable
                    style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
                    onPress={onCancel}
                  >
                    <Text style={styles.secondaryButtonText}>{uiText("Cancel")}</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
                    onPress={handleProceedFromStep1}
                  >
                    <Text style={styles.primaryButtonText}>{uiText("Next")}</Text>
                  </Pressable>
                </View>
              ) : subStep === 2 ? (
                <View style={styles.buttonRow}>
                  <Pressable
                    style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
                    onPress={() => { if (workerPage > 0) setWorkerPage(workerPage - 1); else setSubStep(1); registrationScroll.current?.scrollTo({ y: 0 }); }}
                  >
                    <Text style={styles.secondaryButtonText}>{uiText("Back")}</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
                    onPress={handleProceedFromStep2}
                  >
                    <Text style={styles.primaryButtonText}>{uiText("Next")}</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.buttonRow}>
                  <Pressable
                    style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
                    onPress={() => setSubStep(isHomeowner ? 1 : 2)}
                    disabled={loading}
                  >
                    <Text style={styles.secondaryButtonText}>{uiText("Back")}</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
                    onPress={handleRegister}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.primaryButtonText}>{uiText("Create Account")}</Text>
                    )}
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Location Pickers Modals */}
        <SearchablePickerModal
          visible={activePicker === 'region'}
          title="Select Region"
          searchPlaceholder="Search region (e.g. Region X, NCR)..."
          items={regionsList}
          selectedCode={selectedRegion?.code}
          loading={loadingLocations}
          onSelect={handleSelectRegion}
          onClose={() => setActivePicker(null)}
        />

        <SearchablePickerModal
          visible={activePicker === 'province'}
          title="Select Province"
          searchPlaceholder="Search province (e.g. Misamis Oriental)..."
          items={provincesList}
          selectedCode={selectedProvince?.code}
          loading={loadingLocations}
          onSelect={handleSelectProvince}
          onClose={() => setActivePicker(null)}
        />

        <SearchablePickerModal
          visible={activePicker === 'city'}
          title="Select City / Municipality"
          searchPlaceholder="Search city (e.g. CDO, Cagayan, Manila)..."
          items={citiesList}
          selectedCode={selectedCity?.code}
          loading={loadingLocations}
          onSelect={handleSelectCity}
          onClose={() => setActivePicker(null)}
        />

        <SearchablePickerModal
          visible={activePicker === 'barangay'}
          title="Select Barangay"
          searchPlaceholder="Search barangay (e.g. Carmen, Nazareth, Bulua)..."
          items={barangaysList}
          selectedCode={selectedBarangay?.code}
          loading={loadingLocations}
          onSelect={handleSelectBarangay}
          onClose={() => setActivePicker(null)}
        />

        {/* Date of Birth Picker Modal */}
        <DateOfBirthPickerModal
          visible={showDobPicker}
          currentValue={dateOfBirth}
          onSelect={(dob, ageVal) => {
            setDateOfBirth(dob);
            setCalculatedAge(ageVal);
            setAge(String(ageVal));
            setShowDobPicker(false);
          }}
          onClose={() => setShowDobPicker(false)}
        />

        {/* Demographic Picker Modal (Nationality / Religion) */}
        <DemographicPickerModal
          visible={activeDemographicPicker !== null}
          title={activeDemographicPicker === 'nationality' ? 'Select Nationality' : 'Select Religion'}
          subtitle={
            activeDemographicPicker === 'nationality'
              ? 'Choose your country of citizenship'
              : 'Select your religious affiliation or preference'
          }
          options={activeDemographicPicker === 'nationality' ? NATIONALITY_OPTIONS : RELIGION_OPTIONS}
          selectedValue={activeDemographicPicker === 'nationality' ? nationality : religion}
          searchPlaceholder={
            activeDemographicPicker === 'nationality'
              ? 'Search nationality (e.g. Filipino)...'
              : 'Search religion...'
          }
          allowCustomInput={true}
          onSelect={(val) => {
            if (activeDemographicPicker === 'nationality') {
              setNationality(val);
            } else if (activeDemographicPicker === 'religion') {
              setReligion(val);
            }
            setActiveDemographicPicker(null);
          }}
          onClose={() => setActiveDemographicPicker(null)}
        />

        {/* Branded & Idiot-Proof Registration Error Modal */}
        <RegistrationErrorModal
          visible={Boolean(serverError)}
          errorData={serverError}
          onClose={() => setServerError(null)}
          onGoToStep={(step) => {
            setServerError(null);
            setSubStep(step);
          }}
          onNavigateToLogin={onNavigateToLogin}
        />

        <PrivacyPolicyModal
          visible={legalDocument !== null}
          document={legalDocument === 'terms' ? 'terms' : 'privacy'}
          onClose={() => setLegalDocument(null)}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: '#F6F5F2',
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    width: '100%',
  },
  headerSide: {
    width: 44,
    justifyContent: 'center',
  },
  headerSideRight: {
    alignItems: 'flex-end',
  },
  logo: {
    height: 44,
    width: 44,
  },
  titleBlock: {
    marginTop: 8,
    paddingHorizontal: 24,
    minHeight: 58,
  },
  title: {
    color: THEME.colors.ink,
    fontSize: 24,
    fontFamily: THEME.typography.fontFamily.display,
    lineHeight: 28,
    marginBottom: 4,
  },
  subtitle: {
    color: THEME.colors.textSecondary,
    fontSize: 13,
    fontFamily: THEME.typography.fontFamily.body,
    lineHeight: 18,
  },
  card: {
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: THEME.roundness.card,
    flex: 1,
    marginTop: 10,
    paddingBottom: 14,
    paddingHorizontal: 18,
    paddingTop: 12,
    width: '92%',
  },
  formContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  subStepContainer: {
    marginBottom: 10,
    alignItems: 'center',
  },
  subStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  subStepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subStepBadgeActive: {
    backgroundColor: THEME.colors.ink,
  },
  subStepNumber: {
    fontSize: 11,
    fontFamily: THEME.typography.fontFamily.display,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  subStepNumberActive: {
    color: THEME.colors.white,
  },
  subStepLine: {
    width: 40,
    height: 2,
    backgroundColor: THEME.colors.divider,
    marginHorizontal: 6,
  },
  subStepLineActive: {
    backgroundColor: THEME.colors.brand,
  },
  subStepTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  subStepHelp: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 2,
    paddingHorizontal: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F7F9',
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 44,
    marginBottom: 10,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F7F9',
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 44,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectButtonDisabled: {
    opacity: 0.5,
    backgroundColor: '#FAFAFA',
  },
  selectButtonText: {
    flex: 1,
    fontSize: 13.5,
    color: '#111827',
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  inputIcon: {
    marginRight: 10,
  },
  countryCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flagEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  phoneVerticalLine: {
    width: 1,
    height: 20,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 12,
  },
  input: {
    flex: 1,
    fontSize: 13.5,
    color: '#1A1A1A',
    height: '100%',
  },
  eyeBtn: {
    paddingLeft: 8,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fixedFooter: {
    paddingTop: 4,
  },
  checkboxGroup: {
    marginTop: 6,
    marginBottom: 4,
    paddingHorizontal: 4,
    gap: 8,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkboxText: {
    fontSize: 11,
    color: '#333333',
  },
  linkText: {
    color: THEME.colors.brandDark,
    fontFamily: THEME.typography.fontFamily.bodyMedium,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: THEME.colors.divider,
    marginTop: 6,
    marginBottom: 10,
    width: '100%',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 12,
    marginBottom: 8,
  },
  primaryButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: THEME.colors.ink,
    height: 48,
    borderRadius: THEME.roundness.pill,
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  primaryButtonText: {
    color: THEME.colors.white,
    fontSize: 15,
    fontFamily: THEME.typography.fontFamily.display,
    fontWeight: '800',
    letterSpacing: THEME.typography.tracking.tight,
  },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: THEME.colors.canvas,
    borderRadius: THEME.roundness.pill,
    height: 48,
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: THEME.colors.ink,
    fontSize: 14,
    fontFamily: THEME.typography.fontFamily.display,
    fontWeight: '700',
  },
  compactStep2Wrap: {
    paddingTop: 2,
  },
  step2Block: {
    marginBottom: 10,
  },
  compactLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  compactSubLabel: {
    fontSize: 11.5,
    fontWeight: '400',
    color: '#6B7280',
  },
  rolesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  roleGridItem: {
    width: '48.5%',
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 0,
  },
  compactCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.6,
    borderColor: '#9CA3AF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: '#FFFFFF',
  },
  compactCheckboxSelected: {
    backgroundColor: '#FFB380',
    borderColor: '#FFB380',
  },
  roleGridLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
  },
  roleGridLabelSelected: {
    color: '#111827',
    fontWeight: '700',
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  compactInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 12,
  },
  compactPesoSymbol: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginRight: 4,
  },
  compactSalaryInput: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '600',
    color: '#111827',
    padding: 0,
    height: '100%',
  },
  compactInputText: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '600',
    color: '#111827',
    padding: 0,
    height: '100%',
  },
  compactPerMonthText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  setupToggleWrap: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    height: 44,
    padding: 3,
  },
  setupToggleBtn: {
    flex: 1,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setupToggleBtnActive: {
    backgroundColor: '#FFB380',
  },
  setupToggleText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#4B5563',
  },
  setupToggleTextActive: {
    color: '#111827',
    fontWeight: '700',
  },
  compactDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 12,
  },
  compactDropdownText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    marginRight: 4,
  },
  compactPlaceholderText: {
    color: '#9CA3AF',
  },
  dialectChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  dialectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    backgroundColor: '#F3F4F6',
  },
  dialectPillActive: {
    backgroundColor: '#FFB380',
  },
  dialectPillText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#4B5563',
  },
  dialectPillTextActive: {
    color: '#111827',
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  preferenceModalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    maxWidth: 380,
  },
  preferenceModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  preferenceModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  preferenceOptionList: {
    gap: 8,
  },
  preferenceOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
  },
  preferenceOptionItemSelected: {
    backgroundColor: '#F3F4F6',
  },
  preferenceOptionText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  preferenceOptionTextSelected: {
    color: '#111827',
    fontWeight: '700',
  },
  pickerPressable: {
    justifyContent: 'space-between',
    paddingRight: 14,
  },
  pickerText: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  pickerPlaceholderText: {
    color: '#9CA3AF',
    fontWeight: '400',
  },
  pickerRightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  agePillBadge: {
    backgroundColor: '#DEF7EC',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  agePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#03543F',
  },
  demographicFieldBlock: {
    marginBottom: 10,
  },
  demographicRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  fieldSubLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
  },
  genderPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  genderPillSelected: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  genderPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  genderPillTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  compactPickerPressable: {
    justifyContent: 'space-between',
  },
  compactPickerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  compactPickerPlaceholder: {
    color: '#9CA3AF',
    fontWeight: '400',
  },
  compactAgeContainer: {
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 4,
  },
  compactAgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
});

