import { describe, expect, it } from 'vitest';
import type { Rectangle, TemplateImage } from '@/features/template';
import {
  getBindingDisplayIndex,
  repairBindingMetadata,
  resolveEffectiveBindingSource,
} from '@/features/editor/domain/services/binding-group';
import {
  getFieldValue,
  getMonthDatesForGrid,
  resolveBindingDate,
} from '@/features/editor/domain/services/planner-utils';

function makePage(
  type: TemplateImage['type'],
  rectangles: Rectangle[] = [],
  extras: Partial<TemplateImage> = {},
): TemplateImage {
  return {
    id: `${type}-1`,
    name: type,
    type,
    width: 100,
    height: 100,
    rectangles,
    createdAt: new Date(),
    updatedAt: new Date(),
    src: '',
    ...extras,
  };
}

function makeRect(
  overrides: Partial<Rectangle> & Pick<Rectangle, 'id' | 'fieldType'>,
): Rectangle {
  return {
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    order: 0,
    ...overrides,
  };
}

describe('repairBindingMetadata', () => {
  it('creates a monthDays binding for a monthly grid', () => {
    const rects = [0, 1, 2].map(i =>
      makeRect({
        id: `d${i}`,
        fieldType: 'day',
        order: i,
        gridGroupId: 'grid-1',
        gridCellIndex: i,
      }),
    );
    const page = makePage('monthly-calendar', rects, {
      gridGroups: {
        'grid-1': {
          id: 'grid-1',
          rectIds: rects.map(r => r.id),
          cols: 3,
          rows: 1,
          bounds: { x: 0, y: 0, width: 100, height: 20 },
          settings: {
            cols: 3,
            rows: 1,
            rectWidth: 10,
            rectHeight: 10,
            alignH: 'left',
            alignV: 'top',
          },
        },
      },
    });

    const repaired = repairBindingMetadata(page);
    expect(repaired.changed).toBe(true);
    const bindingId = repaired.gridGroups?.['grid-1']?.bindingGroupId;
    expect(bindingId).toBeTruthy();
    expect(repaired.bindingGroups?.[bindingId!]?.source).toBe('monthDays');
    expect(repaired.rectangles.every(r => r.bindingGroupId === bindingId)).toBe(true);
  });

  it('sequences unbound days on weekly pages', () => {
    const rects = [0, 1].map(i =>
      makeRect({ id: `d${i}`, fieldType: 'day', order: i }),
    );
    const page = makePage('weekly-calendar', rects);
    const repaired = repairBindingMetadata(page);
    const bindingId = repaired.rectangles[0].bindingGroupId;
    expect(bindingId).toBeTruthy();
    expect(repaired.bindingGroups?.[bindingId!]?.source).toBe('weekDays');
    expect(repaired.rectangles[0].sequenceIndex).toBe(0);
    expect(repaired.rectangles[1].sequenceIndex).toBe(1);
  });
});

describe('resolveBindingDate + getFieldValue', () => {
  it('keeps page day and month grid independent on a daily page', () => {
    const title = makeRect({
      id: 'title',
      fieldType: 'day',
      formatVariant: 'numeric',
    });
    const cells = [0, 1, 2].map(i =>
      makeRect({
        id: `c${i}`,
        fieldType: 'day',
        order: i,
        formatVariant: 'numeric',
        bindingGroupId: 'bind-month',
        sequenceIndex: i,
      }),
    );
    const page = makePage('daily-page', [title, ...cells], {
      bindingGroups: {
        'bind-month': { id: 'bind-month', source: 'monthDays' },
      },
    });

    const date = new Date(2026, 4, 15);
    const context = {
      date,
      year: 2026,
      month: 4,
      days: getMonthDatesForGrid({ year: 2026, month: 4, weekStartsOn: 'monday' }),
    };

    expect(
      getFieldValue({
        fieldType: 'day',
        context,
        templateImage: page,
        rectangle: title,
        fillIncompleteMonths: true,
      }).fieldValue,
    ).toBe('15');

    expect(
      getFieldValue({
        fieldType: 'day',
        context,
        templateImage: page,
        rectangle: cells[0],
        fillIncompleteMonths: true,
      }).fieldValue,
    ).toBe(String(context.days![0].getDate()));

    expect(resolveEffectiveBindingSource(title, page)).toBe('page');
    expect(getBindingDisplayIndex(cells[1], page)).toBe(2);
  });

  it('formats year/month from a sequence cell date', () => {
    const rect = makeRect({
      id: 'y1',
      fieldType: 'year',
      formatVariant: 'YYYY',
      bindingGroupId: 'bind-week',
      sequenceIndex: 0,
    });
    const page = makePage('daily-page', [rect], {
      bindingGroups: {
        'bind-week': { id: 'bind-week', source: 'weekDays' },
      },
    });
    const context = {
      date: new Date(2026, 4, 15),
      year: 2026,
      month: 4,
    };

    const resolved = resolveBindingDate({
      rectangle: rect,
      templateImage: page,
      context,
      weekStartsOn: 'monday',
    });
    expect(resolved.date).toBeTruthy();
    expect(
      getFieldValue({
        fieldType: 'year',
        context,
        templateImage: page,
        rectangle: rect,
      }).fieldValue,
    ).toBe(String(resolved.date!.getFullYear()));
  });
});
