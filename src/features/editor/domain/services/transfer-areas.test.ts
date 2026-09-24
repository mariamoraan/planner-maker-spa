import { describe, expect, it } from 'vitest';
import type { Rectangle } from '@/features/template';
import { computeTransferAreas } from './transfer-areas';

function rect(partial: Partial<Rectangle> & Pick<Rectangle, 'id' | 'x' | 'y'>): Rectangle {
  return {
    width: 40,
    height: 20,
    fieldType: 'day',
    order: 0,
    ...partial,
  };
}

describe('computeTransferAreas', () => {
  it('moves rectangles from source to destination with new ids', () => {
    const fromRects = [
      rect({ id: 'a', x: 10, y: 10 }),
      rect({ id: 'b', x: 100, y: 10 }),
    ];
    const result = computeTransferAreas({
      from: {
        rectangles: fromRects,
        width: 400,
        height: 600,
        type: 'weekly-calendar',
      },
      to: {
        rectangles: [],
        width: 400,
        height: 600,
        type: 'weekly-calendar',
      },
      rectangleIds: ['a'],
      positions: { a: { x: 50, y: 80 } },
    });

    expect(result).not.toBeNull();
    expect(result!.fromAfter.rectangles.map(r => r.id)).toEqual(['b']);
    expect(result!.toAfter.rectangles).toHaveLength(1);
    expect(result!.toAfter.rectangles[0]!.id).not.toBe('a');
    expect(result!.toAfter.rectangles[0]!.x).toBe(50);
    expect(result!.toAfter.rectangles[0]!.y).toBe(80);
    expect(result!.pastedIds).toHaveLength(1);
  });
});
