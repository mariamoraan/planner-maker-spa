import { describe, expect, it } from 'vitest';
import {
  FREE_TIER_LIMITS as SERVER_FREE,
  PLAN_LIMITS as SERVER_PLANS,
  maxFileSizeLabel,
  resolvePlanLimits,
  resolveUserPlan,
} from '../../../server/plan-limits';
import { FREE_TIER_LIMITS, PLAN_LIMITS } from './plan-limits';

describe('server/client plan-limits sync', () => {
  it('keeps free-tier caps identical across client and server modules', () => {
    expect(SERVER_FREE).toEqual(FREE_TIER_LIMITS);
    expect(SERVER_PLANS.free).toEqual(PLAN_LIMITS.free);
    expect(SERVER_PLANS.normal).toEqual(PLAN_LIMITS.normal);
    expect(SERVER_PLANS.super).toEqual(PLAN_LIMITS.super);
    expect(SERVER_PLANS.extra).toEqual(PLAN_LIMITS.extra);
  });

  it('maps free image bytes to UploadThing size labels', () => {
    expect(maxFileSizeLabel(resolvePlanLimits(resolveUserPlan()).maxImageBytes)).toBe('8MB');
    expect(maxFileSizeLabel(16 * 1024 * 1024)).toBe('16MB');
  });
});
