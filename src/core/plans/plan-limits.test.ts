import { describe, expect, it } from 'vitest';
import {
  FREE_TIER_LIMITS,
  PLAN_LIMITS,
  PlanLimitError,
  formatBytesLimit,
  isPlanId,
  resolvePlanLimits,
} from './plan-limits';
import { resolveUserPlan } from './resolve-user-plan';

describe('plan-limits', () => {
  it('exposes free-tier caps used by waitlist', () => {
    expect(FREE_TIER_LIMITS).toEqual({
      maxPlanners: 2,
      maxImagesPerPlanner: 2,
      maxFontFamilies: 1,
      maxFacesPerFamily: 4,
      maxImageBytes: 8 * 1024 * 1024,
      maxFontBytes: 8 * 1024 * 1024,
    });
  });

  it('resolves known plans and falls back to free', () => {
    expect(resolvePlanLimits('free')).toBe(PLAN_LIMITS.free);
    expect(resolvePlanLimits('normal').maxPlanners).toBeGreaterThan(FREE_TIER_LIMITS.maxPlanners);
    expect(resolvePlanLimits('super').maxImagesPerPlanner).toBeGreaterThan(
      FREE_TIER_LIMITS.maxImagesPerPlanner,
    );
    expect(resolvePlanLimits('extra').maxFontFamilies).toBeGreaterThan(
      FREE_TIER_LIMITS.maxFontFamilies,
    );
  });

  it('validates plan ids', () => {
    expect(isPlanId('free')).toBe(true);
    expect(isPlanId('pro')).toBe(false);
    expect(isPlanId(null)).toBe(false);
  });

  it('defaults resolveUserPlan to free until billing exists', () => {
    expect(resolveUserPlan()).toBe('free');
    expect(resolveUserPlan('uid-1')).toBe('free');
    expect(resolveUserPlan('uid-1', 'super')).toBe('super');
    expect(resolveUserPlan('uid-1', 'unknown')).toBe('free');
  });

  it('formats byte limits for UI copy', () => {
    expect(formatBytesLimit(8 * 1024 * 1024)).toBe('8 MB');
    expect(formatBytesLimit(16 * 1024 * 1024)).toBe('16 MB');
  });

  it('carries a stable PlanLimitError code', () => {
    const error = new PlanLimitError('planners', 'too many');
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe('planners');
    expect(error.name).toBe('PlanLimitError');
  });
});
