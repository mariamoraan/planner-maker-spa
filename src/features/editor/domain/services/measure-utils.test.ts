import { describe, it, expect } from 'vitest';
import {
  computeGridMeasureAdjustMoves,
  computeMeasureMetrics,
  computeMeasureAdjustMoves,
  computeMeasureAdjustMovesWithGrid,
  createMeasureAnchor,
  getFixedAnchor,
  getMovingAnchor,
  getMovingBlockIds,
  overlayDeltaToAdjustTarget,
  resolveAnchorPoint,
  type MeasureAnchor,
  type MeasureRect,
} from './measure-utils';

const rects: MeasureRect[] = [
  { id: 'a', x: 100, y: 50 },
  { id: 'b', x: 200, y: 80 },
  { id: 'c', x: 300, y: 100 },
];

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

describe('resolveAnchorPoint', () => {
  it('returns free point when no block attached', () => {
    expect(resolveAnchorPoint({ x: 10, y: 20 }, rects)).toEqual({ x: 10, y: 20 });
  });

  it('follows block position when attached', () => {
    const anchor: MeasureAnchor = {
      x: 120,
      y: 70,
      blockId: 'a',
      offsetInBlock: { x: 20, y: 20 },
    };
    expect(resolveAnchorPoint(anchor, rects)).toEqual({ x: 120, y: 70 });
    expect(resolveAnchorPoint(anchor, [{ id: 'a', x: 110, y: 60 }])).toEqual({ x: 130, y: 80 });
  });
});

describe('getMovingAnchor', () => {
  const free: MeasureAnchor = { x: 0, y: 0 };
  const blockA: MeasureAnchor = { x: 10, y: 10, blockId: 'a', offsetInBlock: { x: 10, y: 10 } };
  const blockB: MeasureAnchor = { x: 20, y: 20, blockId: 'b', offsetInBlock: { x: 20, y: 20 } };

  it('prefers p2 block when both have blocks', () => {
    expect(getMovingAnchor(blockA, blockB)).toBe(blockB);
    expect(getFixedAnchor(blockA, blockB)).toBe(blockA);
  });

  it('uses only block when one is free', () => {
    expect(getMovingAnchor(free, blockB)).toBe(blockB);
    expect(getMovingAnchor(blockA, free)).toBe(blockA);
  });

  it('returns null when no blocks', () => {
    expect(getMovingAnchor(free, { x: 5, y: 5 })).toBeNull();
  });
});

describe('getMovingBlockIds', () => {
  it('returns group when moving block is in multi-selection', () => {
    expect(getMovingBlockIds('b', ['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
  });

  it('returns single id when not in group selection', () => {
    expect(getMovingBlockIds('b', ['a'])).toEqual(['b']);
  });
});

describe('computeMeasureAdjustMoves', () => {
  const fixed: MeasureAnchor = { x: 50, y: 50 };
  const moving: MeasureAnchor = {
    x: 220,
    y: 100,
    blockId: 'b',
    offsetInBlock: { x: 20, y: 20 },
  };

  it('moves block to match target dx/dy from free point', () => {
    const moves = computeMeasureAdjustMoves(fixed, moving, ['b'], 100, 30, rects);
    expect(moves).toEqual([{ id: 'b', x: 130, y: 60 }]);
  });

  it('moves entire group by same delta', () => {
    const moves = computeMeasureAdjustMoves(fixed, moving, ['a', 'b'], 100, 30, rects);
    expect(moves).toEqual([
      { id: 'a', x: 30, y: 30 },
      { id: 'b', x: 130, y: 60 },
    ]);
  });

  it('returns empty when target matches current spacing', () => {
    const currentDx = 220 - 50;
    const currentDy = 100 - 50;
    expect(computeMeasureAdjustMoves(fixed, moving, ['b'], currentDx, currentDy, rects)).toEqual([]);
  });

  it('moves only p2 block when both endpoints are on blocks', () => {
    const p1: MeasureAnchor = {
      x: 120,
      y: 70,
      blockId: 'a',
      offsetInBlock: { x: 20, y: 20 },
    };
    const p2: MeasureAnchor = {
      x: 220,
      y: 100,
      blockId: 'b',
      offsetInBlock: { x: 20, y: 20 },
    };
    const moves = computeMeasureAdjustMoves(p1, p2, ['b'], 50, 10, rects);
    expect(moves).toEqual([{ id: 'b', x: 150, y: 60 }]);
  });
});

describe('overlayDeltaToAdjustTarget', () => {
  const free: MeasureAnchor = { x: 0, y: 0 };
  const blockA: MeasureAnchor = { x: 10, y: 10, blockId: 'a', offsetInBlock: { x: 10, y: 10 } };
  const blockB: MeasureAnchor = { x: 20, y: 20, blockId: 'b', offsetInBlock: { x: 20, y: 20 } };

  it('keeps delta when moving block is p2', () => {
    expect(overlayDeltaToAdjustTarget(blockA, blockB, 50, 10)).toEqual({ targetDx: 50, targetDy: 10 });
  });

  it('inverts delta when moving block is p1', () => {
    expect(overlayDeltaToAdjustTarget(blockA, free, 30, 5)).toEqual({ targetDx: -30, targetDy: -5 });
  });
});

describe('createMeasureAnchor', () => {
  it('stores offset relative to block origin', () => {
    expect(createMeasureAnchor({ x: 115, y: 65 }, 'a', rects)).toEqual({
      x: 115,
      y: 65,
      blockId: 'a',
      offsetInBlock: { x: 15, y: 15 },
    });
  });
});

describe('computeGridMeasureAdjustMoves', () => {
  const gridRects: MeasureRect[] = [
    { id: 'a', x: 100, y: 200, width: 48, height: 36, order: 0 },
    { id: 'b', x: 200, y: 200, width: 48, height: 36, order: 1 },
    { id: 'c', x: 300, y: 200, width: 48, height: 36, order: 2 },
    { id: 'd', x: 100, y: 300, width: 48, height: 36, order: 3 },
    { id: 'e', x: 200, y: 300, width: 48, height: 36, order: 4 },
    { id: 'f', x: 300, y: 300, width: 48, height: 36, order: 5 },
  ];

  it('redistributes a 3x2 grid when horizontal spacing changes', () => {
    const fixed: MeasureAnchor = {
      x: 100,
      y: 200,
      blockId: 'a',
      offsetInBlock: { x: 0, y: 0 },
    };
    const moving: MeasureAnchor = {
      x: 200,
      y: 200,
      blockId: 'b',
      offsetInBlock: { x: 0, y: 0 },
    };

    const moves = computeGridMeasureAdjustMoves(
      fixed,
      moving,
      gridRects.map(rect => rect.id),
      120,
      0,
      gridRects,
    );

    expect(moves).toEqual([
      { id: 'b', x: 220, y: 200 },
      { id: 'c', x: 340, y: 200 },
      { id: 'e', x: 220, y: 300 },
      { id: 'f', x: 340, y: 300 },
    ]);
  });

  it('falls back to translate moves when grid mode is disabled', () => {
    const fixed: MeasureAnchor = { x: 50, y: 50 };
    const moving: MeasureAnchor = {
      x: 220,
      y: 100,
      blockId: 'b',
      offsetInBlock: { x: 20, y: 20 },
    };

    const moves = computeMeasureAdjustMovesWithGrid(
      fixed,
      moving,
      ['b'],
      100,
      30,
      rects,
      { applyToGrid: false },
    );

    expect(moves).toEqual([{ id: 'b', x: 130, y: 60 }]);
  });
});
