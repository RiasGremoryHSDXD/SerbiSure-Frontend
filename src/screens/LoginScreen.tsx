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
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL, fetchWithTimeout } from '../config/api';
import THEME from '../config/theme';

const logoSource = require('../../assets/serbisure_new_clean.png');

type LoginScreenProps = {
  onLoginSuccess?: (token?: string) => void;
  onSignUp?: () => void;
  onBack?: () => void;
};

export function LoginScreen({ onLoginSuccess, onSignUp, onBack }: LoginScreenProps) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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
            messages.push(msg);
          } else {
            messages.push(`${fieldName}: ${msg}`);
          }
        });
      }
      if (messages.length > 0) {
        return messages.join('\n');
      }
    }

    return "Invalid email or password. Please try again.";
  };

  const handleLogin = async () => {
    setErrorMsg('');
    if (!email.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    if (!email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/accounts/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(formatDjangoError(data));
      }

      if (onLoginSuccess) {
        onLoginSuccess(data.access);
      }
    } catch (error: any) {
      setErrorMsg(error.message || 'Unable to connect to the server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 20, paddingBottom: Math.max(insets.bottom, 24) },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top Back Navigation (Optional) */}
        {onBack && (
          <Pressable style={styles.backBtn} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </Pressable>
        )}

        {/* Brand Header */}
        <View style={styles.brandHeader}>
          <Image source={logoSource} style={styles.logo} resizeMode="contain" />
          <Text style={styles.brandTitle}>SerbiSure</Text>
          <Text style={styles.brandSubtitle}>Connecting kasambahays and homeowners</Text>
        </View>

        {/* Login Form White Card */}
        <View style={styles.formCard}>
          {errorMsg ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={18} color="#E53935" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Email Field */}
          <View style={styles.inputWrapper}>
            <Ionicons name="mail" size={18} color="#000000" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Password Field */}
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed" size={18} color="#000000" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color="#000000"
              />
            </Pressable>
          </View>

          {/* Remember Me + Forgot Password Row */}
          <View style={styles.optionsRow}>
            <Pressable style={styles.rememberRow} onPress={() => setRememberMe(!rememberMe)}>
              <Ionicons
                name={rememberMe ? "checkbox-outline" : "square-outline"}
                size={18}
                color="#000000"
              />
              <Text style={styles.rememberText}>Remember me</Text>
            </Pressable>

            <Pressable style={styles.forgotBtn}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </Pressable>
          </View>

          {/* Login Button */}
          <Pressable
            style={({ pressed }) => [
              styles.loginBtn, 
              (pressed || isLoading) && styles.btnPressed
            ]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.loginBtnText}>Log in</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
              </>
            )}
          </Pressable>

          {/* Hairline Divider */}
          <View style={styles.divider} />

          {/* Sign Up Link */}
          <View style={styles.signupRow}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <Pressable onPress={onSignUp}>
              <Text style={styles.signupLink}>Sign up</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.canvas,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  backBtn: {
    position: 'absolute',
    left: 20,
    top: 50,
    zIndex: 10,
    padding: 8,
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.roundness.pill,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 26,
  },
  logo: {
    width: 68,
    height: 68,
    marginBottom: 8,
  },
  brandTitle: {
    fontSize: 34,
    fontFamily: THEME.typography.fontFamily.displayExtraBold,
    fontWeight: '900',
    color: THEME.colors.ink,
    marginBottom: 4,
    letterSpacing: THEME.typography.tracking.tighter,
  },
  brandSubtitle: {
    fontSize: 15,
    fontFamily: THEME.typography.fontFamily.body,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.roundness.cardLg,
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.canvas,
    borderRadius: THEME.roundness.pill,
    paddingHorizontal: 18,
    height: 50,
    marginBottom: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: THEME.typography.fontFamily.bodyMedium,
    color: THEME.colors.ink,
    height: '100%',
  },
  eyeBtn: {
    paddingLeft: 8,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rememberText: {
    fontSize: 13,
    fontFamily: THEME.typography.fontFamily.bodyMedium,
    color: THEME.colors.textSecondary,
  },
  forgotBtn: {
    paddingVertical: 2,
  },
  forgotText: {
    fontSize: 13,
    fontFamily: THEME.typography.fontFamily.bodyBold,
    fontWeight: '700',
    color: THEME.colors.brandDark,
  },
  loginBtn: {
    backgroundColor: THEME.colors.ink,
    borderRadius: THEME.roundness.pill,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  loginBtnText: {
    color: THEME.colors.white,
    fontSize: 16,
    fontFamily: THEME.typography.fontFamily.display,
    fontWeight: '800',
    letterSpacing: THEME.typography.tracking.tight,
  },
  divider: {
    height: 1,
    backgroundColor: THEME.colors.divider,
    marginVertical: 20,
  },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    fontSize: 13.5,
    fontFamily: THEME.typography.fontFamily.body,
    color: THEME.colors.textSecondary,
  },
  signupLink: {
    fontSize: 13.5,
    fontFamily: THEME.typography.fontFamily.display,
    fontWeight: '800',
    color: THEME.colors.brandDark,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.errorLight,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: THEME.roundness.pill,
    marginBottom: 16,
  },
  errorText: {
    color: THEME.colors.error,
    fontSize: 13,
    fontFamily: THEME.typography.fontFamily.bodyMedium,
    marginLeft: 8,
    flex: 1,
  },
});
