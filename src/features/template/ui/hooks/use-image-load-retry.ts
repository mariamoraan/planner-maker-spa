import { useCallback, useEffect, useRef, useState } from 'react';

const RETRY_DELAYS_MS = [1_000, 3_000, 8_000, 20_000];

/**
 * Keeps retrying an image load while pages are still without a usable src.
 *
 * Loads are otherwise triggered only when the set of page ids changes, so a
 * transient resolve failure (offline, expired token, 5xx) would leave the page
 * blank until a full reload. Retries also restart when the tab regains focus or
 * the network comes back, which is what recovers a lapsed content ticket.
 */
export function useImageLoadRetry(pendingCount: number, load: () => Promise<void>): void {
  const [attempt, setAttempt] = useState(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  const restart = useCallback(() => setAttempt(0), []);

  useEffect(() => {
    if (pendingCount === 0) {
      if (attempt !== 0) setAttempt(0);
      return;
    }
    if (attempt >= RETRY_DELAYS_MS.length) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void loadRef
        .current()
        .catch(error => console.warn('[image-load-retry] retry failed:', error))
        .finally(() => {
          if (!cancelled) setAttempt(current => current + 1);
        });
    }, RETRY_DELAYS_MS[attempt]);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [pendingCount, attempt]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') restart();
    };
    window.addEventListener('online', restart);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('online', restart);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [restart]);
}
