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

/** Keep in sync with `server/plan-limits.ts` — client UI/store read THIS copy. */
export const FREE_TIER_LIMITS: PlanLimits = {
  maxPlanners: 2,
  maxImagesPerPlanner: 12,
  maxFontFamilies: 3,
  maxFacesPerFamily: 4,
  maxImageBytes: 8 * MB,
  maxFontBytes: 8 * MB,
};

/** Future paid stubs (not wired to billing yet). */
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

export type PlanLimitCode =
  | 'planners'
  | 'images'
  | 'fonts'
  | 'faces'
  | 'imageSize'
  | 'fontSize';

export class PlanLimitError extends Error {
  readonly code: PlanLimitCode;

  constructor(code: PlanLimitCode, message: string) {
    super(message);
    this.name = 'PlanLimitError';
    this.code = code;
  }
}

export function isPlanId(value: unknown): value is PlanId {
  return value === 'free' || value === 'normal' || value === 'super' || value === 'extra';
}

export function resolvePlanLimits(planId: PlanId = 'free'): PlanLimits {
  return PLAN_LIMITS[planId] ?? PLAN_LIMITS.free;
}

export function formatBytesLimit(bytes: number): string {
  const mb = bytes / MB;
  return Number.isInteger(mb) ? `${mb} MB` : `${mb.toFixed(1)} MB`;
}
