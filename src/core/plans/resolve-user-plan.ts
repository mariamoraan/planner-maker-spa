import type { PlanId } from './plan-limits';
import { isPlanId } from './plan-limits';

/**
 * Resolves the current user's plan.
 *
 * Today everyone is on `free` (waitlist). Later: read `users/{uid}.plan`
 * from Firestore (or billing) and return that PlanId.
 */
export function resolveUserPlan(_uid?: string | null, storedPlan?: unknown): PlanId {
  if (isPlanId(storedPlan)) return storedPlan;
  return 'free';
}
