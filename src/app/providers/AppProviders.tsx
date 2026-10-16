import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { UserProvider } from '../../features/auth/session/UserContext';
import { LanguageProvider } from '../../shared/localization/LanguageContext';
import { RealtimeProvider } from './RealtimeProvider';
import { NotificationProvider } from '../../features/notifications/NotificationContext';
import { subscribeAccountSuspension } from '../../shared/api/httpClient';

export function AppProviders({ children, token, onAccountSuspended }: {
  children: React.ReactNode;
  token: string | null;
  onAccountSuspended?: (message: string) => void;
}) {
  useEffect(() => {
    if (!onAccountSuspended) return;
    return subscribeAccountSuspension(onAccountSuspended);
  }, [onAccountSuspended]);

  return (
    <SafeAreaProvider>
      <UserProvider token={token}>
        <LanguageProvider>
          <RealtimeProvider><NotificationProvider>{children}</NotificationProvider></RealtimeProvider>
        </LanguageProvider>
      </UserProvider>
    </SafeAreaProvider>
  );
}
