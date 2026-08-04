import { getInfra, isFirebaseConfigured } from '@/core/bootstrap/infra';
import type { AnalyticsEvent } from '@/features/template/domain/ports/analytics.port';

export function trackEvent(
  event: AnalyticsEvent,
  props?: Record<string, string | number | boolean>
): void {
  if (!isFirebaseConfigured()) return;
  try {
    getInfra().analytics.track(event, props);
  } catch {
    // Analytics should never break the app
  }
}

export function trackPageView(name: string): void {
  if (!isFirebaseConfigured()) return;
  try {
    getInfra().analytics.pageView(name);
  } catch {
    // Analytics should never break the app
  }
}
