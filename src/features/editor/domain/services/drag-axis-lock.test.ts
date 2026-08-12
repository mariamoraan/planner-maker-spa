import { describe, expect, it } from 'vitest';
import { resolveDragAxisLock } from './drag-axis-lock';

describe('resolveDragAxisLock', () => {
  it('returns unchanged deltas when shift is not pressed', () => {
    expect(resolveDragAxisLock(12, -8, false, 'x')).toEqual({
      dx: 12,
      dy: -8,
      lock: null,
    });
  });

  it('clears lock when shift is released', () => {
    expect(resolveDragAxisLock(12, -8, false, 'y')).toEqual({
      dx: 12,
      dy: -8,
      lock: null,
    });
  });

  it('locks to horizontal axis when horizontal movement dominates', () => {
    expect(resolveDragAxisLock(20, 5, true, null)).toEqual({
      dx: 20,
      dy: 0,
      lock: 'x',
    });
  });

  it('locks to vertical axis when vertical movement dominates', () => {
    expect(resolveDragAxisLock(3, 15, true, null)).toEqual({
      dx: 0,
      dy: 15,
      lock: 'y',
    });
  });

  it('prefers horizontal axis when movement is equal', () => {
    expect(resolveDragAxisLock(10, 10, true, null)).toEqual({
      dx: 10,
      dy: 0,
      lock: 'x',
    });
  });

  it('keeps the established lock while shift remains pressed', () => {
    expect(resolveDragAxisLock(2, 30, true, 'x')).toEqual({
      dx: 2,
      dy: 0,
      lock: 'x',
    });
  });
});
