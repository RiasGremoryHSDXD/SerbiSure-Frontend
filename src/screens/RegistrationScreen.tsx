import { useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL, fetchWithTimeout } from '../config/api';
import { useUser } from '../context/UserContext';
import { SearchablePickerModal } from '../ui/SearchablePickerModal';
import {
  getRegions,
  getProvinces,
  getCities,
  getBarangays,
  getZipCodeForCity,
  Region,
  Province,
  CityMunicipality,
  Barangay,
  LocationItem,
} from '../services/locationService';
import THEME from '../config/theme';
import { RegistrationStepper } from '../components/RegistrationStepper';

const logoSource = require('../../assets/serbisure_new_clean.png');

type RegistrationScreenProps = {
  role: 'homeowner' | 'kasambahay';
  onBack?: () => void;
  onNext?: (token?: string) => void;
  onCancel?: () => void;
};

export function RegistrationScreen({ role, onBack, onNext, onCancel }: RegistrationScreenProps) {
  const insets = useSafeAreaInsets();
  const { updateUser } = useUser();

  // Sub-step inside registration: 1 = Personal Details, 2 = Location & Consent
  const [subStep, setSubStep] = useState<1 | 2>(1);

  // Step 1: Personal & Account info
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [rawPhone, setRawPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Step 2: Location & Address info
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

  // Form submission loading
  const [loading, setLoading] = useState(false);

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
    let digits = text.replace(/\D/g, '');
    if (digits.startsWith('0')) {
      digits = digits.substring(1);
    }
    if (digits.length > 10) {
      digits = digits.slice(0, 10);
    }
    setRawPhone(digits);
  };

  // --- Step 1 Validation & Transition ---
  const handleProceedToLocation = async () => {
    const cleanDigits = rawPhone.replace(/\D/g, '').replace(/^0+/, '');

    if (!firstName.trim()) {
      Alert.alert("Missing Field", "Please enter your First Name.");
      return;
    }
    if (!lastName.trim()) {
      Alert.alert("Missing Field", "Please enter your Last Name.");
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }
    if (cleanDigits.length !== 10 || !cleanDigits.startsWith('9')) {
      Alert.alert("Invalid Contact Number", "Please enter a valid 10-digit mobile number starting with 9 (e.g. 9123456789).");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Password Requirements", "Password must be at least 8 characters long with a letter and a number.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Password Mismatch", "Password and Confirm Password do not match.");
      return;
    }

    // Prefetch regions if not already fetched
    if (regionsList.length === 0) {
      loadRegions();
    }

    setSubStep(2);
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

  // --- Step 2 Final Submission ---
  const handleRegister = async () => {
    const cleanDigits = rawPhone.replace(/\D/g, '').replace(/^0+/, '');
    const contactNumber = `+63${cleanDigits}`;

    if (!selectedRegion) {
      Alert.alert("Missing Location", "Please select your Region.");
      return;
    }
    if (!selectedProvince) {
      Alert.alert("Missing Location", "Please select your Province.");
      return;
    }
    if (!selectedCity) {
      Alert.alert("Missing Location", "Please select your City or Municipality.");
      return;
    }
    if (!selectedBarangay) {
      Alert.alert("Missing Location", "Please select your Barangay.");
      return;
    }
    if (!streetAddress.trim()) {
      Alert.alert("Missing Field", "Please enter your Street / House Number / Zone.");
      return;
    }
    const cleanZip = zipcode.trim();
    if (!cleanZip || !/^\d{4}$/.test(cleanZip)) {
      Alert.alert("Invalid Zip Code", "Zip Code must be exactly 4 digits (e.g. 9000).");
      return;
    }
    if (!termsAccepted || !privacyAccepted) {
      Alert.alert("Consent Required", "Please accept both the Terms & Conditions and Data Privacy Policy.");
      return;
    }

    setLoading(true);
    try {
      const brgyLabel = selectedBarangay.name.startsWith('Barangay')
        ? selectedBarangay.name
        : `Brgy. ${selectedBarangay.name}`;
      const combinedStreet = `${brgyLabel}, ${streetAddress.trim()}`.slice(0, 100);

      const payload = {
        first_name: firstName.trim(),
        middle_name: middleName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        password: password,
        account_type: isHomeowner ? "Homeowner" : "Kasambahay",
        contact_number: contactNumber,
        country: "Philippines",
        province: selectedProvince.name,
        city: selectedCity.name,
        street: combinedStreet,
        zipcode: cleanZip,
      };

      const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
          const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };

      const idempotencyKey = generateUUID();

      // Save user location & details globally in UserContext
      updateUser({
        firstName: firstName.trim(),
        middleName: middleName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        contactNumber,
        country: "Philippines",
        province: selectedProvince.name,
        city: selectedCity.name,
        street: combinedStreet,
        zipcode: cleanZip,
      });

      const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/accounts/register/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (response.ok) {
        Alert.alert("Success", "Account created successfully!");
        if (onNext) onNext(data.access);
      } else {
        const cleanErrorMessage = formatDjangoError(data);
        Alert.alert("Registration Failed", cleanErrorMessage);
      }
    } catch (error: any) {
      Alert.alert("Network Error", error.message || "Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  const handleHeaderBack = () => {
    if (subStep === 2) {
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
            {/* Unified 4-Step Indicator (Current: Step 1 or 2) */}
            <RegistrationStepper
              currentStep={subStep}
              title={subStep === 1 ? 'Step 1: Account Information' : 'Step 2: Where do you live?'}
              help={subStep === 2 ? 'We use your location to connect you with jobs and household services in your area.' : undefined}
            />

            <ScrollView
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

                  <View style={styles.inputContainer}>
                    <View style={styles.countryCodeBadge}>
                      <Text style={styles.flagEmoji}>🇵🇭</Text>
                      <Text style={styles.countryCodeText}>+63</Text>
                    </View>
                    <View style={styles.phoneVerticalLine} />
                    <TextInput
                      style={styles.input}
                      placeholder="9123456789"
                      placeholderTextColor="#999"
                      keyboardType="phone-pad"
                      maxLength={10}
                      value={rawPhone}
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

              {/* SUB-STEP 2: LOCATION & CONSENT */}
              {subStep === 2 && (
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
                    <Pressable style={styles.checkboxRow} onPress={() => setTermsAccepted(!termsAccepted)}>
                      <Ionicons
                        name={termsAccepted ? "checkbox-outline" : "square-outline"}
                        size={18}
                        color="#000000"
                      />
                      <Text style={styles.checkboxText}>
                        I consent to <Text style={styles.linkText}>Terms and Conditions</Text>.
                      </Text>
                    </Pressable>

                    <Pressable style={styles.checkboxRow} onPress={() => setPrivacyAccepted(!privacyAccepted)}>
                      <Ionicons
                        name={privacyAccepted ? "checkbox-outline" : "square-outline"}
                        size={18}
                        color="#000000"
                      />
                      <Text style={styles.checkboxText}>
                        I consent to <Text style={styles.linkText}>Data Privacy Policy</Text>.
                      </Text>
                    </Pressable>
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
                    <Text style={styles.secondaryButtonText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
                    onPress={handleProceedToLocation}
                  >
                    <Text style={styles.primaryButtonText}>Next</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.buttonRow}>
                  <Pressable
                    style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
                    onPress={() => setSubStep(1)}
                    disabled={loading}
                  >
                    <Text style={styles.secondaryButtonText}>Back</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
                    onPress={handleRegister}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Create Account</Text>
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
});

