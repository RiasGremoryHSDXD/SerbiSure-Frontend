import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { useUser } from '../../features/auth/session/UserContext';
import { chatStore } from '../../features/chat/store/chatStore';
import { realtime } from '../../shared/realtime';

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  useEffect(() => {
    const token = user.token ?? null;
    chatStore.clearCache();
    const sync = () => { if (token && AppState.currentState === 'active') void chatStore.loadInbox(token, true); };
    const off = realtime.subscribe(event => {
      if (__DEV__ && event.type !== 'chat.typing') console.debug('[Realtime] Received', event.type);
      if (['sync', 'chat.changed', 'booking.changed'].includes(event.type)) sync();
    });
    const offStatus = realtime.subscribeStatus(status => {
      if (__DEV__) console.debug('[Realtime] Connection:', status);
    });
    const appState = AppState.addEventListener('change', state => {
      realtime.setActive(state === 'active');
      if (state === 'active') sync();
    });
    realtime.setActive(AppState.currentState === 'active');
    realtime.start(token, user.id || token);
    sync();
    const timer = setInterval(() => { if (realtime.status !== 'connected') sync(); }, 30000);
    return () => { off(); offStatus(); appState.remove(); clearInterval(timer); realtime.stop(); chatStore.clearCache(); };
  }, [user.token, user.id]);
  return <>{children}</>;
}
