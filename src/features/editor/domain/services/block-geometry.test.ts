import { describe, expect, it } from 'vitest';
import {
  aabbFromRects,
  formatRotationDegrees,
  normalizeRotation,
  orientedRectAabb,
  pointInOrientedRect,
  resolveWorldRect,
  rotatePointAround,
  shortestRotationDelta,
  snapToKeyRotation,
} from './block-geometry';

describe('block-geometry', () => {
  it('normalizes rotation into (-180, 180]', () => {
    expect(normalizeRotation(0)).toBe(0);
    expect(normalizeRotation(270)).toBe(-90);
    expect(normalizeRotation(-270)).toBe(90);
    expect(normalizeRotation(180)).toBe(180);
    expect(normalizeRotation(-180)).toBe(180);
  });

  it('computes AABB for a 90° rotated square', () => {
    const aabb = orientedRectAabb({
      x: 0,
      y: 0,
      width: 40,
      height: 20,
      rotation: 90,
    });
    expect(aabb.x).toBeCloseTo(10);
    expect(aabb.y).toBeCloseTo(-10);
    expect(aabb.width).toBeCloseTo(20);
    expect(aabb.height).toBeCloseTo(40);
  });

  it('hit-tests rotated rectangles in local space', () => {
    const rect = { x: 0, y: 0, width: 100, height: 20, rotation: 90 };
    // Center is (50, 10). After 90° CW, local top edge maps near visual left.
    expect(pointInOrientedRect({ x: 50, y: 10 }, rect)).toBe(true);
    expect(pointInOrientedRect({ x: 200, y: 200 }, rect)).toBe(false);
  });

  it('resolves grid world pose around group center', () => {
    const world = resolveWorldRect(
      {
        id: 'a',
        x: 0,
        y: 0,
        width: 20,
        height: 20,
        gridGroupId: 'g1',
      },
      {
        g1: {
          bounds: { x: 0, y: 0, width: 100, height: 100 },
          rotation: 180,
        },
      },
    );

    expect(world.rotation).toBe(180);
    expect(world.x + world.width / 2).toBeCloseTo(90);
    expect(world.y + world.height / 2).toBeCloseTo(90);
  });

  it('builds selection AABB from multiple oriented rects', () => {
    const box = aabbFromRects([
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 20, y: 20, width: 10, height: 10, rotation: 0 },
    ]);
    expect(box).toEqual({ x: 0, y: 0, width: 30, height: 30 });
  });

  it('rotates points and shortest delta', () => {
    expect(rotatePointAround({ x: 2, y: 0 }, { x: 0, y: 0 }, 90)).toEqual({
      x: expect.closeTo(0),
      y: expect.closeTo(2),
    });
    expect(shortestRotationDelta(170, -170)).toBeCloseTo(20);
  });

  it('magnetically snaps near key rotations', () => {
    expect(snapToKeyRotation(88).rotation).toBe(90);
    expect(snapToKeyRotation(88).snapped).toBe(true);
    expect(snapToKeyRotation(3).rotation).toBe(0);
    expect(snapToKeyRotation(268).rotation).toBe(-90); // 270°
    expect(snapToKeyRotation(42).rotation).toBe(45);
    expect(snapToKeyRotation(178).rotation).toBe(180);
  });

  it('does not snap when outside magnetic threshold', () => {
    expect(snapToKeyRotation(80).snapped).toBe(false);
    expect(snapToKeyRotation(80).rotation).toBe(80);
  });

  it('formats rotation degrees for display', () => {
    expect(formatRotationDegrees(-90)).toBe('270°');
    expect(formatRotationDegrees(90)).toBe('90°');
    expect(formatRotationDegrees(0)).toBe('0°');
    expect(formatRotationDegrees(181)).toBe('181°');
  });
});
