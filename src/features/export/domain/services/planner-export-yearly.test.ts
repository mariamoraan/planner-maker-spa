import { describe, expect, it } from 'vitest';
import type { Template, TemplateImage } from '@/features/template';
import { getYearsBetween } from '@/features/editor/domain/services/planner-utils';
import { estimatePageCount } from '@/features/export/domain/services/planner-export';

function page(
  partial: Pick<TemplateImage, 'id' | 'type'> & Partial<TemplateImage>,
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

function template(images: TemplateImage[]): Template {
  return {
    id: 't1',
    name: 'Test',
    images,
    locale: 'es',
    weekStartsOn: 'monday',
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };
}

describe('getYearsBetween', () => {
  it('returns each calendar year touched by the range', () => {
    expect(getYearsBetween(new Date(2025, 10, 1), new Date(2027, 1, 15))).toEqual([
      2025, 2026, 2027,
    ]);
  });

  it('returns a single year for an intra-year range', () => {
    expect(getYearsBetween(new Date(2026, 2, 1), new Date(2026, 8, 30))).toEqual([2026]);
  });
});

describe('estimatePageCount with yearly-calendar', () => {
  it('counts one yearly face per year in range', () => {
    const tpl = template([
      page({ id: 'cover', type: 'cover' }),
      page({ id: 'yearly', type: 'yearly-calendar' }),
    ]);

    const singleYear = estimatePageCount(
      tpl,
      new Date(2026, 0, 1),
      new Date(2026, 11, 31),
    );
    const multiYear = estimatePageCount(
      tpl,
      new Date(2025, 11, 1),
      new Date(2027, 0, 15),
    );

    // cover + 1 yearly vs cover + 3 yearly (parity blanks may add pages)
    expect(singleYear).toBeGreaterThanOrEqual(2);
    expect(multiYear).toBeGreaterThan(singleYear);
    expect(multiYear - singleYear).toBeGreaterThanOrEqual(2);
  });
});
