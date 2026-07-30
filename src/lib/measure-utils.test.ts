import { describe, it, expect } from 'vitest';
import { computeMeasureMetrics } from './measure-utils';

describe('computeMeasureMetrics', () => {
  it('computes horizontal distance', () => {
    const result = computeMeasureMetrics({ x: 10, y: 20 }, { x: 50, y: 20 });
    expect(result.dx).toBe(40);
    expect(result.dy).toBe(0);
    expect(result.distance).toBe(40);
  });

  it('computes vertical distance', () => {
    const result = computeMeasureMetrics({ x: 0, y: 0 }, { x: 0, y: 30 });
    expect(result.dx).toBe(0);
    expect(result.dy).toBe(30);
    expect(result.distance).toBe(30);
  });

  it('computes diagonal distance', () => {
    const result = computeMeasureMetrics({ x: 0, y: 0 }, { x: 3, y: 4 });
    expect(result.dx).toBe(3);
    expect(result.dy).toBe(4);
    expect(result.distance).toBe(5);
  });
});
