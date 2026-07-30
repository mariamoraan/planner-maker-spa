export type AnalyticsEvent =
  | 'landing_view'
  | 'waitlist_join'
  | 'login'
  | 'planner_created'
  | 'block_added'
  | 'planner_generated'
  | 'planner_downloaded';

export interface AnalyticsPort {
  track(event: AnalyticsEvent, props?: Record<string, string | number | boolean>): void;
  pageView(name: string): void;
}
