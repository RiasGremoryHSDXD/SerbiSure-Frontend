import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/** Update at the next deadline, midnight in the Philippines, or app resume. */
export function useScheduleClock(starts: number[], enabled = true): number {
  const [now, setNow] = useState(Date.now);
  const midnightPH = Math.floor((now + 8 * 3600000) / 86400000) * 86400000 + 86400000 - 8 * 3600000;
  const next = Math.min(midnightPH, ...starts.filter(stamp => stamp > now));
  useEffect(() => {
    if (!enabled) return;
    setNow(Date.now());
    const listener = AppState.addEventListener('change', state => { if (state === 'active') setNow(Date.now()); });
    return () => listener.remove();
  }, [enabled]);
  useEffect(() => {
    if (!enabled) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.max(1, next - Date.now() + 20));
    return () => clearTimeout(timer);
  }, [enabled, next]);
  return now;
}
