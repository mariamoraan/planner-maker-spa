import { describe, it, expect } from 'vitest';
import {
  getDefaultBlockSize,
  getDefaultGridRectSize,
  scaleSizeToPage,
  BASELINE_GRID_RECT_SIZE,
} from './default-block-size';

describe('default-block-size', () => {
  it('returns baseline sizes on a 1200×1600 page', () => {
    expect(getDefaultBlockSize('month', 1200, 1600)).toEqual({ width: 280, height: 90 });
    expect(getDefaultBlockSize('year', 1200, 1600)).toEqual({ width: 160, height: 70 });
    expect(getDefaultBlockSize('day', 1200, 1600)).toEqual({ width: 80, height: 60 });
    expect(getDefaultGridRectSize(1200, 1600)).toEqual({
      width: BASELINE_GRID_RECT_SIZE.width,
      height: BASELINE_GRID_RECT_SIZE.height,
    });
  });

  it('scales sizes with page dimensions', () => {
    expect(getDefaultBlockSize('month', 2400, 3200)).toEqual({ width: 560, height: 180 });
    expect(getDefaultGridRectSize(2400, 3200)).toEqual({
      width: BASELINE_GRID_RECT_SIZE.width * 2,
      height: BASELINE_GRID_RECT_SIZE.height * 2,
    });
  });

  it('rounds scaled sizes', () => {
    expect(scaleSizeToPage({ width: 100, height: 50 }, 1800, 2400)).toEqual({
      width: 150,
      height: 75,
    });
  });
});
