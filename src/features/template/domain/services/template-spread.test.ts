import { describe, expect, it } from 'vitest';
import type { TemplateImage } from '@/features/template';
import {
  ensureSpreadPairsAdjacent,
  getSpreadMate,
  getUnitId,
  groupImagesAsUnits,
  isSpreadEligibleType,
} from './template-spread';

function page(
  partial: Pick<TemplateImage, 'id' | 'type'> &
    Partial<Pick<TemplateImage, 'spreadId' | 'spreadFace'>>
): TemplateImage {
  return {
    name: partial.id,
    width: 100,
    height: 100,
    rectangles: [],
    createdAt: new Date(0),
    updatedAt: new Date(0),
    src: '',
    ...partial,
  };
}

describe('template-spread', () => {
  it('marks eligible types', () => {
    expect(isSpreadEligibleType('monthly-calendar')).toBe(true);
    expect(isSpreadEligibleType('cover')).toBe(false);
  });

  it('groups single pages and spreads', () => {
    const images = [
      page({ id: 'a', type: 'monthly-calendar' }),
      page({
        id: 'b-l',
        type: 'weekly-calendar',
        spreadId: 's1',
        spreadFace: 'left',
      }),
      page({
        id: 'b-r',
        type: 'weekly-calendar',
        spreadId: 's1',
        spreadFace: 'right',
      }),
      page({ id: 'c', type: 'extra' }),
    ];

    const units = groupImagesAsUnits(images);
    expect(units).toHaveLength(3);
    expect(units[0]).toMatchObject({ kind: 'single', page: { id: 'a' } });
    expect(units[1]).toMatchObject({
      kind: 'spread',
      spreadId: 's1',
      left: { id: 'b-l' },
      right: { id: 'b-r' },
    });
    expect(getUnitId(units[1]!)).toBe('s1');
  });

  it('repairs R-before-L order when grouping', () => {
    const images = [
      page({
        id: 'r',
        type: 'daily-page',
        spreadId: 's',
        spreadFace: 'right',
      }),
      page({
        id: 'l',
        type: 'daily-page',
        spreadId: 's',
        spreadFace: 'left',
      }),
    ];

    const units = groupImagesAsUnits(images);
    expect(units).toHaveLength(1);
    expect(units[0]).toMatchObject({
      kind: 'spread',
      left: { id: 'l' },
      right: { id: 'r' },
    });
    expect(ensureSpreadPairsAdjacent(images).map(p => p.id)).toEqual(['l', 'r']);
  });

  it('finds spread mate', () => {
    const left = page({
      id: 'l',
      type: 'extra',
      spreadId: 's',
      spreadFace: 'left',
    });
    const right = page({
      id: 'r',
      type: 'extra',
      spreadId: 's',
      spreadFace: 'right',
    });
    expect(getSpreadMate(left, [left, right])?.id).toBe('r');
    expect(getSpreadMate(right, [left, right])?.id).toBe('l');
  });
});
