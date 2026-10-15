/** Coalesce bursts without losing changes received during a fetch or booking action. */
export function createThreadRefreshQueue(
  load: (initial: boolean) => Promise<unknown>,
  canRun: () => boolean,
) {
  let pending = false;
  let initialPending = false;
  let running = false;
  let stopped = false;

  const drain = async () => {
    if (stopped || running || !pending || !canRun()) return;
    running = true;
    try {
      while (!stopped && pending && canRun()) {
        const initial = initialPending;
        pending = initialPending = false;
        await load(initial);
      }
    } finally {
      running = false;
    }
  };

  return {
    request(initial = false) {
      if (stopped) return;
      pending = true;
      initialPending ||= initial;
      // The screen handles fetch errors. Keep the subscription callback synchronous.
      void drain();
    },
    stop() { stopped = true; pending = initialPending = false; },
  };
}
