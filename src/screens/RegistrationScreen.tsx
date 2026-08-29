import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL, fetchWithTimeout } from '../config/api';
import { useUser } from '../context/UserContext';

const logoSource = require('../../assets/serbisure-logo.png');

type RegistrationScreenProps = {
  role: 'homeowner' | 'kasambahay';
  onBack?: () => void;
  onNext?: (token?: string) => void;
  onCancel?: () => void;
};

export function RegistrationScreen({ role, onBack, onNext, onCancel }: RegistrationScreenProps) {
  const insets = useSafeAreaInsets();
  const { updateUser } = useUser();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [rawPhone, setRawPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

  const handleRegister = async () => {
    const cleanDigits = rawPhone.replace(/\D/g, '').replace(/^0+/, '');
    const contactNumber = `+63${cleanDigits}`;

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
    if (password.length < 11) {
      Alert.alert("Password Requirements", "Password must be at least 11 characters long with a letter and a number.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Password Mismatch", "Password and Confirm Password do not match.");
      return;
    }
    if (!termsAccepted || !privacyAccepted) {
      Alert.alert("Consent Required", "Please accept both the Terms & Conditions and Data Privacy Policy.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        first_name: firstName,
        middle_name: middleName,
        last_name: lastName,
        email: email,
        password: password,
        account_type: isHomeowner ? "Homeowner" : "Kasambahay",
        contact_number: contactNumber,
      };

      const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };

      const idempotencyKey = generateUUID();

      // Save user name globally in UserContext
      updateUser({ firstName, middleName, lastName });

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
        // Show clean formatted validation errors instead of raw JSON string
        const cleanErrorMessage = formatDjangoError(data);
        Alert.alert("Registration Failed", cleanErrorMessage);
      }
    } catch (error: any) {
      Alert.alert("Network Error", error.message || "Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 14) }]}>
        <View style={styles.header}>
          <View style={styles.headerSide}>
            <Pressable onPress={onBack}>
              <Ionicons name="arrow-back" size={26} color="#2A2925" />
            </Pressable>
          </View>
          <Image source={logoSource} style={styles.logo} resizeMode="contain" />
          <View style={[styles.headerSide, styles.headerSideRight]} />
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.title}>{isHomeowner ? 'Join as Homeowner' : 'Join as Kasambahay'}</Text>
          <Text style={styles.subtitle}>
            {isHomeowner
              ? 'Join as a homeowner to find trusted professionals for your household.'
              : 'Join as a kasambahay to offer your trusted household services.'}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.formContent}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 4, paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
              <View style={styles.stepIndicator}>
                <View style={[styles.stepDot, styles.stepDotActive]} />
                <View style={styles.stepDot} />
                <View style={styles.stepDot} />
              </View>

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
                  placeholder="Password"
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
            </ScrollView>

            <View style={styles.fixedFooter}>
              <View style={styles.divider} />
              <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]} onPress={handleRegister} disabled={loading}>
                {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Next</Text>}
              </Pressable>
              <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]} onPress={onCancel}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
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
  skipText: {
    color: '#FFB43B',
    fontSize: 14,
    fontWeight: '500',
  },
  titleBlock: {
    marginTop: 12,
    paddingHorizontal: 24,
    minHeight: 66,
  },
  title: {
    color: '#000000',
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 29,
    marginBottom: 2,
  },
  subtitle: {
    color: '#444444',
    fontSize: 13,
    lineHeight: 17,
  },
  alertBox: {
    flexDirection: 'row',
    backgroundColor: '#FFECCB',
    marginHorizontal: 24,
    marginTop: 20,
    padding: 16,
    borderRadius: 8,
    alignItems: 'flex-start',
  },
  alertIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  alertTextContainer: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
    marginBottom: 4,
  },
  alertDesc: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
  card: {
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    flex: 1,
    marginTop: 14,
    paddingBottom: 16,
    paddingHorizontal: 20,
    paddingTop: 14,
    width: '88%',
  },
  homeownerContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  kasambahayContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  formContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  dashIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dash: {
    width: 20,
    height: 3,
    backgroundColor: '#D1D1D1',
    borderRadius: 2,
  },
  dashActive: {
    backgroundColor: '#FFB43B',
  },
  uploadBox: {
    borderWidth: 1.5,
    borderColor: '#333',
    borderStyle: 'dashed',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    marginBottom: 20,
  },
  uploadTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
    marginTop: 12,
    marginBottom: 4,
  },
  uploadSubtitle: {
    fontSize: 12,
    color: '#444',
    marginBottom: 16,
  },
  uploadInfo: {
    fontSize: 10,
    color: '#888',
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
    marginTop: 4,
  },
  stepDot: {
    width: 24,
    height: 4,
    backgroundColor: '#D9D9D9',
    borderRadius: 2,
  },
  stepDotActive: {
    backgroundColor: '#FFB43B',
  },
  formGroup: {
    marginBottom: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 3,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F7F9',
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 44,
    marginBottom: 12,
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
    fontSize: 14.5,
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
    fontSize: 14,
    color: '#1A1A1A',
    height: '100%',
  },
  eyeBtn: {
    paddingLeft: 8,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  specializationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  specTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 16,
  },
  specTagActive: {
    backgroundColor: '#FFECCB',
  },
  specTagEmoji: {
    marginRight: 6,
    fontSize: 14,
  },
  specTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#555',
  },
  specTagTextActive: {
    color: '#000',
  },
  addSpecBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fixedFooter: {
    paddingTop: 8,
  },
  checkboxGroup: {
    marginTop: 8,
    marginBottom: 6,
    paddingHorizontal: 4,
    gap: 10,
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
    color: '#9F5BFF',
    fontWeight: '500',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#707070',
    marginTop: 10,
    marginBottom: 10,
    width: '100%',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#FFB43B',
    height: 38,
    justifyContent: 'center',
    marginBottom: 12,
    marginHorizontal: 18,
  },
  buttonPressed: {
    opacity: 0.78,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#FFB43B',
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    marginHorizontal: 18,
  },
  secondaryButtonText: {
    color: '#FFA51F',
    fontSize: 14,
    fontWeight: '500',
  },
});
