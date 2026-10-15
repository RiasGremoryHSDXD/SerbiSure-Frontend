import { useEffect, useState } from 'react';
import { realtime } from './index';
export function useRealtimeStatus() {
  const [status, setStatus] = useState(realtime.status);
  useEffect(() => {
    const off = realtime.subscribeStatus(setStatus);
    setStatus(realtime.status);
    return off;
  }, []);
  return status;
}
