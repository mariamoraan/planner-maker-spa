import { describe, it, expect } from 'vitest';
import { canRedistributeSelection, getGridToolPreset } from './grid-tool-presets';
import { BASELINE_GRID_RECT_SIZE } from './default-block-size';

describe('getGridToolPreset', () => {
  it('returns monthly calendar defaults at baseline size', () => {
    expect(getGridToolPreset('monthly-calendar')).toEqual({
      cols: 7,
      rows: 5,
      fieldType: 'day',
      rectSize: { width: BASELINE_GRID_RECT_SIZE.width, height: BASELINE_GRID_RECT_SIZE.height },
      align: 'top-left',
    });
  });

  it('returns weekly calendar defaults at baseline size', () => {
    expect(getGridToolPreset('weekly-calendar')).toEqual({
      cols: 7,
      rows: 1,
      fieldType: 'day',
      rectSize: { width: BASELINE_GRID_RECT_SIZE.width, height: BASELINE_GRID_RECT_SIZE.height },
      align: 'top-left',
    });
  });

  it('scales rectSize to page dimensions', () => {
    const preset = getGridToolPreset('monthly-calendar', undefined, {
      width: 2400,
      height: 3200,
    });
    expect(preset.rectSize).toEqual({
      width: BASELINE_GRID_RECT_SIZE.width * 2,
      height: BASELINE_GRID_RECT_SIZE.height * 2,
    });
  });

  it('falls back to generic preset for other page types', () => {
    expect(getGridToolPreset('daily-page', 'month')).toMatchObject({
      cols: 3,
      rows: 3,
      fieldType: 'month',
    });
  });
});

describe('canRedistributeSelection', () => {
  it('requires at least two blocks', () => {
    expect(canRedistributeSelection(1)).toBe(false);
    expect(canRedistributeSelection(2)).toBe(true);
    expect(canRedistributeSelection(3)).toBe(true);
  });
});
