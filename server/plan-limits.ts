/**
 * Server copy of plan limits — keep in sync with `src/core/plans/plan-limits.ts`.
 * (api/server cannot import from `src/` under NodeNext on Vercel.)
 */

export type PlanId = 'free' | 'normal' | 'super' | 'extra';

export interface PlanLimits {
  maxPlanners: number;
  maxImagesPerPlanner: number;
  maxFontFamilies: number;
  maxFacesPerFamily: number;
  maxImageBytes: number;
  maxFontBytes: number;
}

const MB = 1024 * 1024;

export const FREE_TIER_LIMITS: PlanLimits = {
  maxPlanners: 2,
  maxImagesPerPlanner: 12,
  maxFontFamilies: 3,
  maxFacesPerFamily: 4,
  maxImageBytes: 8 * MB,
  maxFontBytes: 8 * MB,
};

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: FREE_TIER_LIMITS,
  normal: {
    maxPlanners: 10,
    maxImagesPerPlanner: 40,
    maxFontFamilies: 15,
    maxFacesPerFamily: 4,
    maxImageBytes: 16 * MB,
    maxFontBytes: 8 * MB,
  },
  super: {
    maxPlanners: 50,
    maxImagesPerPlanner: 100,
    maxFontFamilies: 40,
    maxFacesPerFamily: 4,
    maxImageBytes: 16 * MB,
    maxFontBytes: 8 * MB,
  },
  extra: {
    maxPlanners: 200,
    maxImagesPerPlanner: 200,
    maxFontFamilies: 100,
    maxFacesPerFamily: 8,
    maxImageBytes: 16 * MB,
    maxFontBytes: 8 * MB,
  },
};

export function isPlanId(value: unknown): value is PlanId {
  return value === 'free' || value === 'normal' || value === 'super' || value === 'extra';
}

export function resolvePlanLimits(planId: PlanId = 'free'): PlanLimits {
  return PLAN_LIMITS[planId] ?? PLAN_LIMITS.free;
}

/** Until billing exists, all authenticated uploads use free limits. */
export function resolveUserPlan(storedPlan?: unknown): PlanId {
  if (isPlanId(storedPlan)) return storedPlan;
  return 'free';
}

/** UploadThing file-size strings for route config. */
export function maxFileSizeLabel(bytes: number): '4MB' | '8MB' | '16MB' {
  if (bytes <= 4 * MB) return '4MB';
  if (bytes <= 8 * MB) return '8MB';
  return '16MB';
}
