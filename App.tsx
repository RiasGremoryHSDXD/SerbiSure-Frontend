import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LanguageProvider } from './src/context/LanguageContext';
import { UserProvider } from './src/context/UserContext';

import {
  LandingScreen,
  LoginScreen,
  UserSelectionScreen,
  RegistrationStep1,
  RegistrationStep2,
  RegistrationStep3,
} from './src/screens';
import { clearFeedCache } from './src/screens/homeowner/ServicesScreen';
import { clearJobFeedCache } from './src/screens/kasambahay/JobsScreen';
import { chatStore } from './src/store/chatStore';
import { BottomTabNavigator, type Role } from './src/navigation/BottomTabNavigator';

// Clean App Navigation Flow matching Figma structure:
// landing -> login -> user_selection -> registration1-3 -> dashboard (bottom tab navigator)
type AppFlowState =
  | 'landing'
  | 'login'
  | 'user_selection'
  | 'registration1'
  | 'registration2'
  | 'registration3'
  | 'dashboard';

export default function App() {
  const [flowState, setFlowState] = useState<AppFlowState>('landing');
  const [selectedRole, setSelectedRole] = useState<Role>('homeowner');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const handleSelectRole = (role: Role) => {
    setSelectedRole(role);
    setFlowState('registration1');
  };

  return (
    <SafeAreaProvider>
      <UserProvider token={accessToken}>
        <LanguageProvider>
          <StatusBar style={flowState === 'registration3' ? 'light' : 'dark'} />

          {/* Step 1 & 1.5: Landing Page & Animated Login Flow */}
          {(flowState === 'landing' || flowState === 'login') && (
            <LandingScreen
              isLoginView={flowState === 'login'}
              onGetStarted={() => setFlowState('user_selection')}
              onLoginPress={() => setFlowState('login')}
              onBackToLanding={() => setFlowState('landing')}
              onLoginSuccess={(token?: string) => {
                if (token) setAccessToken(token);
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
            />
          )}

          {/* Step 4: Registration 2 - Take a Selfie / Mandatory Liveness Verification */}
          {flowState === 'registration2' && (
            <RegistrationStep3
              token={accessToken}
              onVerified={(result) => {
                if (result.selfiePath) {
                  const uri = result.selfiePath.startsWith('data:') || result.selfiePath.startsWith('file:')
                    ? result.selfiePath
                    : `file://${result.selfiePath}`;
                  setAvatarUri(uri);
                }
                setFlowState('registration3');
              }}
              onBack={() => setFlowState('registration1')}
              onCancel={() => setFlowState('registration3')}
              onSkip={() => setFlowState('registration3')}
            />
          )}

          {/* Step 5: Registration 3 - Verify Identity / Document Upload (Optional & Skippable) */}
          {flowState === 'registration3' && (
            <RegistrationStep2
              role={selectedRole}
              token={accessToken}
              onBack={() => setFlowState('registration2')}
              onNext={() => setFlowState('dashboard')}
              onCancel={() => setFlowState('dashboard')}
              onSkip={() => setFlowState('dashboard')}
            />
          )}

          {/* Step 6: Main Dashboard (Bottom Tab Navigator - Home, Services/Jobs, Chats, Profile) */}
          {flowState === 'dashboard' && (
            <BottomTabNavigator
              role={selectedRole}
              avatarUri={avatarUri}
              token={accessToken}
              onUpdateAvatar={(uri: string) => setAvatarUri(uri)}
              onLogout={() => {
                clearFeedCache();
                clearJobFeedCache();
                chatStore.clearCache();
                setAccessToken(null);
                setAvatarUri(null);
                setFlowState('login');
              }}
            />
          )}
        </LanguageProvider>
      </UserProvider>
    </SafeAreaProvider>
  );
}
