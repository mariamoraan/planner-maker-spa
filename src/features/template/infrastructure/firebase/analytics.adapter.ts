import { logEvent } from 'firebase/analytics';
import type { AnalyticsPort, AnalyticsEvent } from '@/features/template/domain/ports/analytics.port';
import { getFirebaseAnalytics } from '@/features/auth/infrastructure/firebase/config';

export class FirebaseAnalyticsAdapter implements AnalyticsPort {
  track(event: AnalyticsEvent, props?: Record<string, string | number | boolean>): void {
    void getFirebaseAnalytics().then(analytics => {
      if (!analytics) return;
      logEvent(analytics, event, props);
    });
  }

  pageView(name: string): void {
    this.track('landing_view', { page: name });
  }
}
