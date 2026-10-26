import React, { useEffect, useRef, useState } from 'react';
import { useLanguage as useUiLanguage } from '../../../shared/localization/LanguageContext';
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
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../../../shared/api/config';
import { fetchWithTimeout } from '../../../shared/api/httpClient';
import THEME from '../../../shared/theme/theme';
import { isSessionTokens, type SessionTokens } from '../../../shared/auth/session';
import { APP_HEADER_BACK_ICON_COLOR, APP_HEADER_BACK_ICON_SIZE } from '../../../shared/components/AppHeader';
import {
  getRememberedAccount,
  setRememberedAccount,
  type RememberedAccount,
} from '../../../shared/auth/rememberedAccount';
import { useUser } from '../../auth/session/UserContext';

const logoSource = require('../../../../assets/serbisure_new_clean.png');
const heroSource = require('../../../../assets/landingpage1-transparent.png');

function parseJwtPayload(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) { base64 += '='; }
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let str = base64.replace(/=+$/, '');
    let output = '';
    for (
      let bc = 0, bs = 0, buffer, i = 0;
      (buffer = str.charAt(i++));
      ~buffer && ((bs = bc % 4 ? bs * 64 + buffer : buffer), bc++ % 4) ? (output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)))) : 0
    ) {
      buffer = chars.indexOf(buffer);
    }
    return JSON.parse(output);
  } catch {
    return null;
  }
}

type LandingScreenProps = {
  isLoginView?: boolean;
  onGetStarted?: () => void;
  onLoginPress?: () => void;
  onBackToLanding?: () => void;
  onLoginSuccess?: (tokens: SessionTokens) => Promise<void>;
  sessionMessage?: string;
  onSignUp?: () => void;
};

export function LandingScreen({
  isLoginView = false,
  onGetStarted,
  onLoginPress,
  onBackToLanding,
  onLoginSuccess,
  sessionMessage,
  onSignUp,
}: LandingScreenProps) {
  const { tr: uiText } = useUiLanguage();
  const insets = useSafeAreaInsets();
  const animProgress = useRef(new Animated.Value(isLoginView ? 1 : 0)).current;
  const landingEntryProgress = useRef(new Animated.Value(0)).current;

  let currentUserData: any = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const userContext = useUser();
    currentUserData = userContext?.user;
  } catch {
    // UserContext may not be available in standalone test harnesses
  }

  // Account Remembered State
  const [rememberedAccount, setRememberedAccountState] = useState<RememberedAccount | null>(null);
  const [isSwitchAccount, setIsSwitchAccount] = useState(false);

  // Login Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let mounted = true;
    void getRememberedAccount().then((acc) => {
      if (mounted && acc) {
        setRememberedAccountState(acc);
      }
    });
    return () => {
      mounted = false;
    };
  }, [isLoginView]);

  useEffect(() => {
    setErrorMsg('');
    if (isLoginView) {
      setIsSwitchAccount(false);
      setPassword('');
    }
    Animated.spring(animProgress, {
      toValue: isLoginView ? 1 : 0,
      useNativeDriver: true,
      tension: 40,
      friction: 8,
    }).start();
  }, [isLoginView, animProgress]);

  useEffect(() => {
    Animated.timing(landingEntryProgress, {
      toValue: 1,
      duration: 460,
      useNativeDriver: true,
    }).start();
  }, [landingEntryProgress]);

  const handleBack = () => {
    setIsSwitchAccount(false);
    setErrorMsg('');
    setPassword('');
    onBackToLanding?.();
  };

  useEffect(() => {
    if (!isLoginView) return;
    const backAction = () => {
      handleBack();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => sub.remove();
  }, [isLoginView, handleBack]);

  const formatDjangoError = (data: any): string => {
    if (!data) return "An unexpected error occurred. Please try again.";
    if (typeof data === 'string') return data;
    if (typeof data.detail === 'string') return data.detail;
    if (typeof data.detail?.detail === 'string') return data.detail.detail;
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

  const isWelcomeBackMode = !isSwitchAccount && Boolean(rememberedAccount);

  const handleLogin = async () => {
    setErrorMsg('');
    const targetIdentifier = isWelcomeBackMode
      ? (rememberedAccount?.identifier || email.trim() || currentUserData?.email || currentUserData?.contactNumber || '')
      : email.trim();

    if (!isWelcomeBackMode) {
      if (!targetIdentifier) {
        setErrorMsg('Please enter your email or phone number.');
        return;
      }
      const isEmail = targetIdentifier.includes('@');
      const isPhone = /^[0-9+()\- ]{7,15}$/.test(targetIdentifier);
      if (!isEmail && !isPhone) {
        setErrorMsg('Please enter a valid email or phone number.');
        return;
      }
    } else {
      if (!targetIdentifier) {
        setIsSwitchAccount(true);
        setErrorMsg('Please enter your email or phone number.');
        return;
      }
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
        body: JSON.stringify({ email: targetIdentifier, password }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(response.status >= 500 ? 'Could not sign in. Please try again shortly.' : formatDjangoError(data));
      }

      if (!isSessionTokens(data)) throw new Error('Could not sign in. Please try again.');

      // Persist remembered account for future "Welcome back" logins if valid user
      let firstName = '';
      const claims = parseJwtPayload(data.access);
      if (claims?.first_name) {
        firstName = String(claims.first_name).trim().split(' ')[0] || '';
      } else if (rememberedAccount?.firstName) {
        firstName = rememberedAccount.firstName;
      }
      const savedIdentifier = claims?.email || claims?.contact_number || targetIdentifier;
      if (firstName && savedIdentifier) {
        await setRememberedAccount({ firstName, identifier: savedIdentifier });
        setRememberedAccountState({ firstName, identifier: savedIdentifier });
      }

      if (onLoginSuccess) {
        await onLoginSuccess(data);
      }
    } catch (error: any) {
      const message = error?.message || '';
      setErrorMsg(/network|timed?\s*out|timeout|failed to fetch|could not reach|aborted/i.test(message)
        ? 'Could not connect. Check your connection and try again.'
        : message || 'Could not sign in. Please try again.');
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

  const landingEntryTranslateY = landingEntryProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 0],
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

        {/* Animated Back Arrow for Login View - pressing always navigates back to landing page */}
        <Animated.View
          pointerEvents={isLoginView ? 'auto' : 'none'}
          style={[styles.backBtnWrapper, { top: insets.top + 17, opacity: backBtnOpacity }]}
        >
          <Pressable onPress={handleBack} hitSlop={12} accessibilityLabel="Back to landing page">
            <Ionicons name="arrow-back" size={APP_HEADER_BACK_ICON_SIZE} color={APP_HEADER_BACK_ICON_COLOR} />
          </Pressable>
        </Animated.View>

        {!isLoginView ? (
          /* LANDING PAGE CONTENT */
          <Animated.View
            pointerEvents="auto"
            style={[
              styles.landingContent,
              {
                opacity: Animated.multiply(landingContentOpacity, landingEntryProgress),
                transform: [{ translateY: Animated.add(landingContentTranslateY, landingEntryTranslateY) }],
              },
            ]}
          >
            <View style={styles.animatedHeader}>
              <Text style={styles.brandTitle}>
                Serbi<Text style={{ color: THEME.colors.brand }}>Sure</Text>
              </Text>
            </View>

            <View style={styles.heroContainer}>
              <Image source={heroSource} style={styles.heroImage} />
            </View>

            <View style={styles.contentBlock}>
              <Text style={styles.title}>
                {uiText("Find the perfect help")}{'\n'}
                <Text style={{ color: THEME.colors.brand }}>{uiText("for your home")}</Text>
              </Text>
            </View>

            <View style={styles.footer}>
              <Pressable
                style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
                onPress={onGetStarted}
              >
                <Text style={styles.primaryButtonText}>{uiText("Get Started")}</Text>
                <Ionicons name="arrow-forward-outline" size={22} color="#FFFFFF" style={styles.buttonIcon} />
              </Pressable>

              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>{uiText("Already have an account?")}</Text>
                <Pressable onPress={onLoginPress} style={styles.authLinkPressable}>
                  <Text style={styles.loginLink}>{uiText("Log in")}</Text>
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
              {/* Centered Login Header */}
              <View style={styles.loginHeader}>
                <Image source={logoSource} style={styles.loginLogo} resizeMode="contain" />
                <Text style={styles.loginBrandTitle}>
                  Serbi<Text style={{ color: THEME.colors.brand }}>Sure</Text>
                </Text>
              </View>

              {/* Form Card */}
              <View style={styles.formCard}>
                {errorMsg || sessionMessage ? (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={18} color="#E53935" />
                    <Text style={styles.errorText}>{uiText(errorMsg || sessionMessage || '')}</Text>
                  </View>
                ) : null}

                {/* 1. Welcome Back Header (Only shown when in Welcome Back mode) */}
                {isWelcomeBackMode && (
                  <View style={styles.welcomeBackHeader}>
                    <Text
                      style={styles.welcomeBackText}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.75}
                    >
                      Welcome back, <Text style={styles.welcomeBackName}>{rememberedAccount?.firstName || ''}</Text>
                    </Text>
                  </View>
                )}

                {/* 2. Email Field Container (Only shown in Switch Account / Full Login mode) */}
                {!isWelcomeBackMode && (
                  <View style={styles.inputWrapper}>
                    <Ionicons name="mail-outline" size={22} color="#000000" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Email or phone number"
                      placeholderTextColor="#999"
                      value={email}
                      onChangeText={(value) => {
                        setEmail(value);
                        if (errorMsg) setErrorMsg('');
                      }}
                      keyboardType="default"
                      autoCapitalize="none"
                    />
                  </View>
                )}

                {/* 3. Password Field Container */}
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={22} color="#000000" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#999"
                    value={password}
                    onChangeText={(value) => {
                      setPassword(value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    secureTextEntry={!showPassword}
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={22}
                      color="#000000"
                    />
                  </Pressable>
                </View>

                {/* 4. Login Button */}
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
                      <Text style={styles.loginBtnText}>{uiText("Log in")}</Text>
                      <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                    </>
                  )}
                </Pressable>

                {/* 5. Hairline Divider */}
                <View style={styles.divider} />

                {/* 6. Footer Links: Welcome Back vs Switch Account Views */}
                {isWelcomeBackMode ? (
                  <View style={styles.welcomeLinksRow}>
                    <Pressable onPress={onSignUp} hitSlop={8}>
                      <Text style={styles.welcomeSignUpLink}>{uiText("Sign up")}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setErrorMsg('');
                        setIsSwitchAccount(true);
                      }}
                      hitSlop={8}
                    >
                      <Text style={styles.switchAccountLink}>{uiText("Switch account")}</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.signupRow}>
                    <Text style={styles.signupText}>{uiText("Don't have an account?")}{' '}</Text>
                    <Pressable onPress={onSignUp} style={styles.authLinkPressable} hitSlop={8}>
                      <Text style={styles.signupLink}>{uiText("Sign up")}</Text>
                    </Pressable>
                  </View>
                )}
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
    left: 24,
    zIndex: 30,
  },
  animatedHeader: {
    alignItems: 'center',
    marginBottom: 24,
    flexShrink: 0,
  },
  brandTitle: {
    color: THEME.colors.ink,
    fontSize: 28,
    fontFamily: THEME.typography.fontFamily.displayExtraBold,
    letterSpacing: THEME.typography.tracking.tighter,
  },
  landingContent: {
    flex: 1,
    marginTop: 44,
  },
  heroContainer: {
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
    height: 390,
    flexShrink: 0,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  contentBlock: {
    alignItems: 'center',
    marginBottom: 0,
    flexShrink: 0,
  },
  title: {
    color: THEME.colors.ink,
    fontSize: 28,
    fontFamily: THEME.typography.fontFamily.display,
    textAlign: 'center',
    lineHeight: 33,
    letterSpacing: THEME.typography.tracking.tight,
    marginBottom: 5,
  },
  footer: {
    marginTop: 20,
    alignItems: 'center',
    paddingBottom: 16,
    flexShrink: 0,
  },
  primaryButton: {
    backgroundColor: THEME.colors.ink,
    borderRadius: THEME.roundness.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '92%',
    height: 46,
    marginBottom: 14,
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
  authLinkPressable: {
    marginLeft: 4,
  },
  loginViewWrapper: {
    flex: 1,
    width: '100%',
  },
  scrollCard: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 12,
    paddingTop: 44,
  },
  loginHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  loginLogo: {
    width: 48,
    height: 48,
    marginBottom: 8,
  },
  loginBrandTitle: {
    fontSize: 30,
    fontFamily: THEME.typography.fontFamily.displayExtraBold,
    color: THEME.colors.ink,
    letterSpacing: THEME.typography.tracking.tighter,
  },
  formCard: {
    alignSelf: 'center',
    width: '86%',
  },
  welcomeBackHeader: {
    height: 52,
    marginBottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  welcomeBackText: {
    fontSize: 22,
    fontFamily: THEME.typography.fontFamily.displayExtraBold,
    color: '#0D0D11',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  welcomeBackName: {
    color: THEME.colors.brand,
    fontFamily: THEME.typography.fontFamily.displayExtraBold,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECECEC',
    borderRadius: THEME.roundness.pill,
    paddingHorizontal: 18,
    height: 52,
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
    backgroundColor: '#E2E2DE',
    marginBottom: 16,
    marginTop: 20,
  },
  welcomeLinksRow: {
    height: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  welcomeSignUpLink: {
    fontSize: 14,
    fontFamily: THEME.typography.fontFamily.display,
    color: THEME.colors.brand,
    fontWeight: '700',
  },
  switchAccountLink: {
    fontSize: 14,
    fontFamily: THEME.typography.fontFamily.display,
    color: '#71717A',
    fontWeight: '700',
  },
  signupRow: {
    height: 28,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    fontSize: 14,
    fontFamily: THEME.typography.fontFamily.body,
    color: '#0D0D11',
  },
  signupLink: {
    fontSize: 14,
    fontFamily: THEME.typography.fontFamily.display,
    color: THEME.colors.brand,
    fontWeight: '700',
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
