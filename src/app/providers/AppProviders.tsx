import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { UserProvider } from '../../features/auth/session/UserContext';
import { LanguageProvider } from '../../shared/localization/LanguageContext';
import { NotificationProvider } from '../../features/notifications/NotificationContext';

export function AppProviders({ children, token }: { children: React.ReactNode; token: string | null }) {
  return (
    <SafeAreaProvider>
      <UserProvider token={token}>
        <LanguageProvider>
          <NotificationProvider>{children}</NotificationProvider>
        </LanguageProvider>
      </UserProvider>
    </SafeAreaProvider>
  );
}
