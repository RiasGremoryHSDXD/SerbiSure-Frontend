import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { realtime } from '../../../shared/realtime';
import { fetchSafetyStatus, type SafetyStatus } from '../api/chatSafetyApi';

export function useChatSafety(token?: string | null, enabled = true) {
  const [status, setStatus] = useState<SafetyStatus | null>(null);
  useEffect(() => {
    setStatus(null);
    if (!token || !enabled) return;
    let active = true;
    let requestVersion = 0;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const refresh = async () => {
      const version = ++requestVersion;
      try {
        const next = await fetchSafetyStatus(token);
        if (!active || version !== requestVersion) return;
        setStatus(next);
        clearTimeout(timeout);
        if (next.restricted_until) {
          const remaining = Date.parse(next.restricted_until) - Date.now();
          if (remaining > 0) timeout = setTimeout(() => { void refresh(); }, Math.min(remaining + 1000, 86401000));
        }
      } catch { /* The send API remains authoritative when status refresh fails. */ }
    };
    void refresh();
    const off = realtime.subscribe(event => { if (event.type === 'moderation.changed' || event.type === 'sync') void refresh(); });
    const app = AppState.addEventListener('change', value => { if (value === 'active') void refresh(); });
    return () => { active = false; clearTimeout(timeout); off(); app.remove(); };
  }, [token, enabled]);
  return status;
}
