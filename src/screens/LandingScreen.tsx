import { useEffect, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  Animated,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL, fetchWithTimeout } from '../config/api';
import THEME from '../config/theme';

const logoSource = require('../../assets/serbisure_new_clean.png');
const heroSource = require('../../assets/landingpage.png');

type LandingScreenProps = {
  isLoginView?: boolean;
  onGetStarted?: () => void;
  onLoginPress?: () => void;
  onBackToLanding?: () => void;
  onLoginSuccess?: (token?: string) => void;
  onSignUp?: () => void;
};

export function LandingScreen({
  isLoginView = false,
  onGetStarted,
  onLoginPress,
  onBackToLanding,
  onLoginSuccess,
  onSignUp,
}: LandingScreenProps) {
  const insets = useSafeAreaInsets();
  const animProgress = useRef(new Animated.Value(isLoginView ? 1 : 0)).current;

  // Login Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    Animated.spring(animProgress, {
      toValue: isLoginView ? 1 : 0,
      useNativeDriver: true,
      tension: 40,
      friction: 8,
    }).start();
  }, [isLoginView]);

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

  // Interpolated Animation Values
  const landingContentOpacity = animProgress.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [1, 0.2, 0],
  });

  const landingContentTranslateY = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -30],
  });

  const loginCardOpacity = animProgress.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0.3, 1],
  });

  const loginCardTranslateY = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [140, 0],
  });

  const backBtnOpacity = animProgress.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 0, 1],
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#F7F6F2' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 14) }]}>
        
        {/* Animated Back Arrow for Login View */}
        <Animated.View
          pointerEvents={isLoginView ? 'auto' : 'none'}
          style={[styles.backBtnWrapper, { opacity: backBtnOpacity }]}
        >
          <Pressable onPress={onBackToLanding} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </Pressable>
        </Animated.View>

        {!isLoginView ? (
          /* LANDING PAGE CONTENT */
          <Animated.View
            pointerEvents="auto"
            style={[
              styles.landingContent,
              {
                opacity: landingContentOpacity,
                transform: [{ translateY: landingContentTranslateY }],
              },
            ]}
          >
            <View style={styles.animatedHeader}>
              <Image source={logoSource} style={styles.logo} resizeMode="contain" />
              <Text style={styles.brandTitle}>
                Serbi<Text style={{ color: THEME.colors.brand }}>Sure</Text>
              </Text>
            </View>

            <View style={styles.heroContainer}>
              <Image source={heroSource} style={styles.heroImage} />
            </View>

            <View style={styles.contentBlock}>
              <Text style={styles.title}>
                Find the perfect help{'\n'}
                <Text style={{ color: THEME.colors.brand }}>for your home</Text>
              </Text>
              <Text style={styles.subtitle}>
                SerbiSure connects Filipinos for reliable home services.
              </Text>
            </View>

            <View style={styles.footer}>
              <Pressable
                style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
                onPress={onGetStarted}
              >
                <Text style={styles.primaryButtonText}>Get Started</Text>
                <Ionicons name="arrow-forward-outline" size={22} color="#FFFFFF" style={styles.buttonIcon} />
              </Pressable>

              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>Already have an account? </Text>
                <Pressable onPress={onLoginPress}>
                  <Text style={styles.loginLink}>Log in</Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        ) : (
          /* LOGIN VIEW (Scrolls & Bumps Logo Up When Keyboard Appears) */
          <Animated.View
            pointerEvents="auto"
            style={[
              styles.loginViewWrapper,
              {
                opacity: loginCardOpacity,
                transform: [{ translateY: loginCardTranslateY }],
              },
            ]}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollCard}
            >
              {/* Centered Login Header (Bumps up when typing) */}
              <View style={styles.loginHeader}>
                <Image source={logoSource} style={styles.loginLogo} resizeMode="contain" />
                <Text style={styles.loginBrandTitle}>
                  Serbi<Text style={{ color: THEME.colors.brand }}>Sure</Text>
                </Text>
              </View>

              {/* Form Card */}
              <View style={styles.formCard}>
                {errorMsg ? (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={18} color="#E53935" />
                    <Text style={styles.errorText}>{errorMsg}</Text>
                  </View>
                ) : null}

                {/* Email Field Container */}
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

                {/* Password Field Container */}
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
                    (pressed || isLoading) && styles.btnPressed,
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
          </Animated.View>
        )}

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: THEME.colors.canvas,
    flex: 1,
    paddingHorizontal: 24,
  },
  backBtnWrapper: {
    position: 'absolute',
    left: 20,
    top: 48,
    zIndex: 30,
  },
  backBtn: {
    padding: 8,
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.roundness.pill,
  },
  animatedHeader: {
    alignItems: 'center',
    marginBottom: 8,
  },
  logo: {
    height: 54,
    width: 54,
    marginBottom: 6,
  },
  brandTitle: {
    color: THEME.colors.ink,
    fontSize: 28,
    fontFamily: THEME.typography.fontFamily.displayExtraBold,
    letterSpacing: THEME.typography.tracking.tighter,
  },
  landingContent: {
    flex: 1,
    marginTop: 16,
  },
  heroContainer: {
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
    flex: 1,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    borderRadius: THEME.roundness.cardLg,
    resizeMode: 'cover',
  },
  contentBlock: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    color: THEME.colors.ink,
    fontSize: 28,
    fontFamily: THEME.typography.fontFamily.display,
    textAlign: 'center',
    lineHeight: 34,
    letterSpacing: THEME.typography.tracking.tight,
    marginBottom: 10,
  },
  subtitle: {
    color: THEME.colors.textSecondary,
    fontSize: 15,
    fontFamily: THEME.typography.fontFamily.body,
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    marginTop: 'auto',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: THEME.colors.ink,
    borderRadius: THEME.roundness.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 54,
    marginBottom: 16,
  },
  buttonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  primaryButtonText: {
    color: THEME.colors.white,
    fontSize: 16,
    fontFamily: THEME.typography.fontFamily.display,
    letterSpacing: THEME.typography.tracking.tight,
  },
  buttonIcon: {
    marginLeft: 8,
  },
  loginContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loginText: {
    color: THEME.colors.textSecondary,
    fontSize: 13,
    fontFamily: THEME.typography.fontFamily.body,
  },
  loginLink: {
    color: THEME.colors.brandDark,
    fontSize: 13,
    fontFamily: THEME.typography.fontFamily.bodyBold,
  },
  loginViewWrapper: {
    flex: 1,
    width: '100%',
  },
  scrollCard: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 24,
    paddingTop: 8,
  },
  loginHeader: {
    alignItems: 'center',
    marginBottom: 22,
  },
  loginLogo: {
    width: 64,
    height: 64,
    marginBottom: 8,
  },
  loginBrandTitle: {
    fontSize: 34,
    fontFamily: THEME.typography.fontFamily.displayExtraBold,
    color: THEME.colors.ink,
    letterSpacing: THEME.typography.tracking.tighter,
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
