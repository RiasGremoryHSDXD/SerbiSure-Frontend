import { AppProviders } from './src/app/providers/AppProviders';
import { useCallback, useState } from 'react';
import { ActivityIndicator, LogBox, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

LogBox.ignoreLogs(['Unable to activate keep awake', '[PostService]', '[PostJob]']);
import {
  useFonts,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
} from '@expo-google-fonts/nunito';

import {
  LandingScreen,
  LoginScreen,
  UserSelectionScreen,
  RegistrationStep1,
  RegistrationStep2,
  RegistrationStep3,
  SuspendedAccountScreen,
} from './src/features/auth';
import { clearExploreFeedCache } from './src/features/feed/feedCache';
import { chatStore } from './src/features/chat/store/chatStore';
import { AppNavigator, type Role } from './src/app/AppNavigator';
import { preloadPostLoginAssets } from './src/app/services/preloadAssets';
import { realtime } from './src/shared/realtime';
import { createSelfieUploadTask, uploadSelfie, type SelfieUploadTask } from './src/features/verification/api/selfieUpload';

// Clean App Navigation Flow matching Figma structure:
// landing -> login -> user_selection -> registration1-3 -> dashboard (bottom tab navigator)
type AppFlowState =
  | 'landing'
  | 'login'
  | 'user_selection'
  | 'registration1'
  | 'registration2'
  | 'registration3'
  | 'suspended'
  | 'dashboard';

export default function App() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
    'Geist-Regular': require('./assets/fonts/Geist-Regular.ttf'),
    'Geist-Medium': require('./assets/fonts/Geist-Medium.ttf'),
    'Geist-SemiBold': require('./assets/fonts/Geist-SemiBold.ttf'),
    'Geist-Bold': require('./assets/fonts/Geist-Bold.ttf'),
  });

  const [flowState, setFlowState] = useState<AppFlowState>('landing');
  const [selectedRole, setSelectedRole] = useState<Role>('homeowner');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [suspensionMessage, setSuspensionMessage] = useState<string | null>(null);
  const [selfieUpload, setSelfieUpload] = useState<SelfieUploadTask | undefined>();

  const clearSession = useCallback(() => {
    realtime.stop();
    clearExploreFeedCache();
    chatStore.clearCache();
    setAccessToken(null);
    setAvatarUri(null);
    setSelfieUpload(undefined);
  }, []);

  const handleLogout = useCallback(() => {
    clearSession();
    setSuspensionMessage(null);
    setFlowState('login');
  }, [clearSession]);

  const handleAccountSuspended = useCallback((message: string) => {
    clearSession();
    setSuspensionMessage(message);
    setFlowState('suspended');
  }, [clearSession]);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F6F5F2', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#0D0D11" />
      </View>
    );
  }

  const handleSelectRole = (role: Role) => {
    setSelectedRole(role);
    setFlowState('registration1');
  };

  return (
    <AppProviders token={accessToken} onAccountSuspended={handleAccountSuspended}>
      <StatusBar style={flowState === 'registration3' ? 'light' : 'dark'} />

      {/* Step 1 & 1.5: Landing Page & Animated Login Flow */}
      {(flowState === 'landing' || flowState === 'login') && (
        <LandingScreen
          isLoginView={flowState === 'login'}
          onGetStarted={() => setFlowState('user_selection')}
          onLoginPress={() => setFlowState('login')}
          onBackToLanding={() => setFlowState('landing')}
          onLoginSuccess={(token?: string) => {
            if (token) {
              setAccessToken(token);
              preloadPostLoginAssets(token, avatarUri);
            }
            setFlowState('dashboard');
          }}
          onSignUp={() => setFlowState('user_selection')}
        />
      )}

      {/* Step 2: User Selection (Homeowner / Kasambahay) */}
      {flowState === 'user_selection' && (
        <UserSelectionScreen
          onSelectRole={handleSelectRole}
          onBack={() => setFlowState('landing')}
        />
      )}

      {/* Step 3: Registration 1 - Account Form Details */}
      {flowState === 'registration1' && (
        <RegistrationStep1
          role={selectedRole}
          onBack={() => setFlowState('user_selection')}
          onNext={(token?: string) => {
            if (token) setAccessToken(token);
            setFlowState('registration2');
          }}
          onCancel={() => setFlowState('landing')}
          onNavigateToLogin={() => setFlowState('login')}
        />
      )}

      {/* Step 4: Registration 2 - Take a Selfie / Mandatory Liveness Verification */}
      {flowState === 'registration2' && (
        <RegistrationStep3
          role={selectedRole}
          token={accessToken}
          onVerified={(result) => {
            if (!result.selfiePath) return;
            const uri = result.selfiePath.startsWith('file:') ? result.selfiePath : `file://${result.selfiePath}`;
            setAvatarUri(uri);
            setSelfieUpload(createSelfieUploadTask(() => uploadSelfie(accessToken || '', uri)));
            setFlowState('registration3');
          }}
          onBack={() => setFlowState('registration1')}
        />
      )}

      {/* Step 5: Registration 3 - Verify Identity / Document Upload (Optional & Skippable) */}
      {flowState === 'registration3' && (
        <RegistrationStep2
          role={selectedRole}
          token={accessToken}
          selfieUpload={selfieUpload}
          onBack={() => setFlowState('registration2')}
          onNext={() => setFlowState('dashboard')}
          onCancel={() => setFlowState('dashboard')}
          onSkip={() => setFlowState('dashboard')}
        />
      )}

      {flowState === 'suspended' && (
        <SuspendedAccountScreen
          message={suspensionMessage || undefined}
          onReturnToSignIn={() => {
            setSuspensionMessage(null);
            setFlowState('login');
          }}
        />
      )}

      {/* Step 6: Main Dashboard (Bottom Tab Navigator - Home, Services/Jobs, Chats, Profile) */}
      {flowState === 'dashboard' && (
        <AppNavigator
          role={selectedRole}
          avatarUri={avatarUri}
          token={accessToken}
          onUpdateAvatar={(uri: string) => setAvatarUri(uri)}
          onLogout={handleLogout}
        />
      )}
    </AppProviders>
  );
}
