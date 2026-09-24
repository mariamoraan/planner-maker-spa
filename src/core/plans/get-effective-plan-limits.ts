import type { PlanLimits } from './plan-limits';
import { resolvePlanLimits } from './plan-limits';
import { resolveUserPlan } from './resolve-user-plan';
import { arePlanLimitsDisabled } from '@/core/dev-tools/dev-tools-store';

const MB = 1024 * 1024;

/** Client-only unlimited caps when the dev-tools bypass is on. */
const UNLIMITED_PLAN_LIMITS: PlanLimits = {
  maxPlanners: Number.MAX_SAFE_INTEGER,
  maxImagesPerPlanner: Number.MAX_SAFE_INTEGER,
  maxFontFamilies: Number.MAX_SAFE_INTEGER,
  maxFacesPerFamily: Number.MAX_SAFE_INTEGER,
  maxImageBytes: 512 * MB,
  maxFontBytes: 512 * MB,
};

/**
 * Plan limits for client UI/stores. Respects the local-only
 * "Disable plan limits" toggle from the dev tools panel.
 */
export function getEffectivePlanLimits(): PlanLimits {
  if (arePlanLimitsDisabled()) return UNLIMITED_PLAN_LIMITS;
  return resolvePlanLimits(resolveUserPlan());
}
