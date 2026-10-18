import { useEffect, useMemo, useRef, useState } from 'react';
import { realtime } from './index';

/** Presence belongs to this signed-in account and expires if the connection goes stale. */
export function useChatPresence(account: string | null, partnerIds: string[]) {
  const key = JSON.stringify([...new Set(partnerIds)].slice(0, 100).sort());
  const ids: string[] = useMemo(() => JSON.parse(key), [key]);
  const [, render] = useState(0);
  const snapshot = useRef('');

  useEffect(() => {
    if (!account) return;
    if (!ids.length) return;
    const update = () => {
      const next = JSON.stringify(ids.map(id => realtime.getPresence(account, id) ?? null));
      if (next !== snapshot.current) { snapshot.current = next; render(value => value + 1); }
    };
    const offEvent = realtime.subscribe(event => {
      if (event.type !== 'presence.changed' || !event.partner_id || !ids.includes(event.partner_id)) return;
      update();
    });
    const offStatus = realtime.subscribeStatus(update);
    const unwatch = realtime.watchPresence(ids);
    update();
    const timer = setInterval(update, 1000);
    return () => { offEvent(); offStatus(); unwatch(); clearInterval(timer); };
  }, [account, ids]);

  return (partnerId?: string): boolean | undefined => {
    return partnerId && ids.includes(partnerId) ? realtime.getPresence(account, partnerId) : undefined;
  };
}
