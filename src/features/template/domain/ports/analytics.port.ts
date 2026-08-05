export type AnalyticsEvent =
  | 'landing_view'
  | 'waitlist_join'
  | 'demo_cta_click'
  | 'login'
  | 'planner_created'
  | 'block_added'
  | 'planner_generated'
  | 'planner_downloaded';

export interface AnalyticsPort {
  track(event: AnalyticsEvent, props?: Record<string, string | number | boolean>): void;
  pageView(name: string): void;
}
