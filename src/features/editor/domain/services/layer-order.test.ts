import { describe, expect, it } from 'vitest';
import type { GridGroup, Rectangle } from '@/features/template';
import {
  applyLayerOperation,
  buildLayerUnits,
  canLayerOperation,
  findTopmostRectangleAtPoint,
} from './layer-order';

function rect(id: string, gridGroupId?: string): Rectangle {
  return {
    id,
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    fieldType: 'day',
    order: 0,
    gridGroupId,
  };
}

describe('layer-order', () => {
  it('builds standalone and grid units in array order', () => {
    const rectangles = [rect('a'), rect('b', 'g1'), rect('c', 'g1'), rect('d')];
    const gridGroups: Record<string, GridGroup> = {
      g1: {
        id: 'g1',
        rectIds: ['b', 'c'],
        cols: 2,
        rows: 1,
        bounds: { x: 0, y: 0, width: 100, height: 50 },
        settings: {
          cols: 2,
          rows: 1,
          alignH: 'left',
          alignV: 'top',
          rectWidth: 10,
          rectHeight: 10,
        },
      },
    };

    expect(buildLayerUnits(rectangles, gridGroups)).toEqual([
      { ids: ['a'] },
      { ids: ['b', 'c'] },
      { ids: ['d'] },
    ]);
  });

  it('moves a standalone rectangle forward', () => {
    const rectangles = [rect('a'), rect('b'), rect('c')];
    const result = applyLayerOperation(rectangles, undefined, ['a'], 'forward');
    expect(result?.map(r => r.id)).toEqual(['b', 'a', 'c']);
  });

  it('moves a grid unit as an atomic block to front', () => {
    const rectangles = [rect('a'), rect('b', 'g1'), rect('c', 'g1'), rect('d')];
    const gridGroups: Record<string, GridGroup> = {
      g1: {
        id: 'g1',
        rectIds: ['b', 'c'],
        cols: 2,
        rows: 1,
        bounds: { x: 0, y: 0, width: 100, height: 50 },
        settings: {
          cols: 2,
          rows: 1,
          alignH: 'left',
          alignV: 'top',
          rectWidth: 10,
          rectHeight: 10,
        },
      },
    };

    const result = applyLayerOperation(rectangles, gridGroups, ['b'], 'front');
    expect(result?.map(r => r.id)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('reports when forward is unavailable at front', () => {
    const rectangles = [rect('a'), rect('b')];
    expect(canLayerOperation(rectangles, undefined, ['b'], 'forward')).toBe(false);
    expect(applyLayerOperation(rectangles, undefined, ['b'], 'forward')).toBeNull();
  });

  it('sends selection to back', () => {
    const rectangles = [rect('a'), rect('b'), rect('c')];
    const result = applyLayerOperation(rectangles, undefined, ['c'], 'back');
    expect(result?.map(r => r.id)).toEqual(['c', 'a', 'b']);
  });

  it('finds topmost rectangle at point', () => {
    const rectangles = [
      { ...rect('a'), x: 0, y: 0, width: 100, height: 100 },
      { ...rect('b'), x: 10, y: 10, width: 50, height: 50 },
    ];
    expect(findTopmostRectangleAtPoint({ x: 20, y: 20 }, rectangles)?.id).toBe('b');
    expect(findTopmostRectangleAtPoint({ x: 80, y: 80 }, rectangles)?.id).toBe('a');
  });
});
