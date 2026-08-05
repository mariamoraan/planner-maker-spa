import { describe, it, expect } from 'vitest';
import { canRedistributeSelection, getGridToolPreset } from './grid-tool-presets';

describe('getGridToolPreset', () => {
  it('returns monthly calendar defaults', () => {
    expect(getGridToolPreset('monthly-calendar')).toEqual({
      cols: 7,
      rows: 5,
      fieldType: 'day',
      rectSize: { width: 48, height: 36 },
      align: 'top-left',
    });
  });

  it('returns weekly calendar defaults', () => {
    expect(getGridToolPreset('weekly-calendar')).toEqual({
      cols: 7,
      rows: 1,
      fieldType: 'day',
      rectSize: { width: 48, height: 36 },
      align: 'top-left',
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
