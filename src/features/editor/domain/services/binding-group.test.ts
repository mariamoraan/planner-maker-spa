import { describe, expect, it } from 'vitest';
import type { Rectangle, TemplateImage } from '@/features/template';
import {
  defaultLooseBlockBindingSource,
  getBindingDisplayIndex,
  nextFreeYearMonthIndex,
  rebalanceYearMonthIndicesAcrossSpread,
  repairBindingMetadata,
  resolveEffectiveBindingSource,
  withYearMonthIndexForPage,
  createBindingGroup,
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

describe('defaultLooseBlockBindingSource', () => {
  it('binds day blocks to the page day sequence', () => {
    expect(defaultLooseBlockBindingSource('monthly-calendar', 'day')).toBe('monthDays');
    expect(defaultLooseBlockBindingSource('weekly-calendar', 'day')).toBe('weekDays');
  });

  it('keeps title and range blocks on page', () => {
    for (const fieldType of [
      'month',
      'year',
      'startDay',
      'endDay',
      'weekNumber',
      'composite',
    ] as const) {
      expect(defaultLooseBlockBindingSource('monthly-calendar', fieldType)).toBe('page');
      expect(defaultLooseBlockBindingSource('weekly-calendar', fieldType)).toBe('page');
    }
  });

  it('binds yearly month blocks to yearMonths and day blocks to monthDays', () => {
    expect(defaultLooseBlockBindingSource('yearly-calendar', 'month')).toBe('yearMonths');
    expect(defaultLooseBlockBindingSource('yearly-calendar', 'day')).toBe('monthDays');
    expect(defaultLooseBlockBindingSource('yearly-calendar', 'year')).toBe('page');
  });
});

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

  it('assigns yearMonthIndex when repairing unbound days on yearly pages', () => {
    const rects = [0, 1].map(i =>
      makeRect({ id: `d${i}`, fieldType: 'day', order: i }),
    );
    const page = makePage('yearly-calendar', rects);
    const repaired = repairBindingMetadata(page);
    const bindingId = repaired.rectangles[0].bindingGroupId;
    expect(bindingId).toBeTruthy();
    expect(repaired.bindingGroups?.[bindingId!]?.source).toBe('monthDays');
    expect(repaired.bindingGroups?.[bindingId!]?.yearMonthIndex).toBe(0);
  });
});

describe('yearMonthIndex helpers', () => {
  it('picks the lowest free month index', () => {
    expect(
      nextFreeYearMonthIndex({
        a: { id: 'a', source: 'monthDays', yearMonthIndex: 0 },
        b: { id: 'b', source: 'monthDays', yearMonthIndex: 2 },
      }),
    ).toBe(1);
  });

  it('reserves sibling spread-face indices when allocating', () => {
    expect(
      nextFreeYearMonthIndex(
        {},
        {
          left0: { id: 'left0', source: 'monthDays', yearMonthIndex: 0 },
          left1: { id: 'left1', source: 'monthDays', yearMonthIndex: 1 },
        },
      ),
    ).toBe(2);

    const allocated = withYearMonthIndexForPage(
      createBindingGroup('monthDays'),
      'yearly-calendar',
      {},
      {
        siblingBindingGroups: {
          left0: { id: 'left0', source: 'monthDays', yearMonthIndex: 0 },
        },
        preferredYearMonthIndex: 0,
      },
    );
    expect(allocated.yearMonthIndex).toBe(1);
  });

  it('keeps preferred yearMonthIndex when the slot is free', () => {
    const allocated = withYearMonthIndexForPage(
      createBindingGroup('monthDays'),
      'yearly-calendar',
      {},
      { preferredYearMonthIndex: 6 },
    );
    expect(allocated.yearMonthIndex).toBe(6);
  });

  it('attaches yearMonthIndex only for monthDays on yearly pages', () => {
    const withIndex = withYearMonthIndexForPage(
      createBindingGroup('monthDays'),
      'yearly-calendar',
      {},
    );
    expect(withIndex.yearMonthIndex).toBe(0);

    const cleared = withYearMonthIndexForPage(
      { ...withIndex, source: 'yearMonths' },
      'yearly-calendar',
      {},
    );
    expect(cleared.yearMonthIndex).toBeUndefined();
  });

  it('rebalances colliding right-face monthDays onto July–December', () => {
    const left = makePage('yearly-calendar', [], {
      id: 'left',
      spreadId: 's1',
      spreadFace: 'left',
      bindingGroups: {
        'bind-0': { id: 'bind-0', source: 'monthDays', yearMonthIndex: 0 },
        'bind-1': { id: 'bind-1', source: 'monthDays', yearMonthIndex: 1 },
      },
    });
    const right = makePage('yearly-calendar', [], {
      id: 'right',
      spreadId: 's1',
      spreadFace: 'right',
      bindingGroups: {
        'bind-r0': { id: 'bind-r0', source: 'monthDays', yearMonthIndex: 0 },
        'bind-r1': { id: 'bind-r1', source: 'monthDays', yearMonthIndex: 1 },
      },
    });

    const result = rebalanceYearMonthIndicesAcrossSpread(left, right);
    expect(result.changed).toBe(true);
    expect(result.right.bindingGroups?.['bind-r0']?.yearMonthIndex).toBe(2);
    expect(result.right.bindingGroups?.['bind-r1']?.yearMonthIndex).toBe(3);
    expect(result.left.bindingGroups?.['bind-0']?.yearMonthIndex).toBe(0);
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

  it('resolves yearMonths month labels and mutes months outside planner range', () => {
    const rects = [0, 1, 2].map(i =>
      makeRect({
        id: `m${i}`,
        fieldType: 'month',
        order: i,
        formatVariant: 'name',
        bindingGroupId: 'bind-year',
        sequenceIndex: i,
      }),
    );
    const page = makePage('yearly-calendar', rects, {
      bindingGroups: {
        'bind-year': { id: 'bind-year', source: 'yearMonths' },
      },
    });
    const context = {
      year: 2026,
      plannerStart: new Date(2026, 1, 1),
      plannerEnd: new Date(2026, 11, 31),
    };

    expect(
      getFieldValue({
        fieldType: 'month',
        context,
        templateImage: page,
        rectangle: rects[0],
      }).fieldValue,
    ).toBe('');

    expect(
      getFieldValue({
        fieldType: 'month',
        context,
        templateImage: page,
        rectangle: rects[1],
      }).fieldValue.toLowerCase(),
    ).toContain('febr');
  });

  it('resolves monthDays day grids anchored by yearMonthIndex on yearly pages', () => {
    const rect = makeRect({
      id: 'd0',
      fieldType: 'day',
      formatVariant: 'numeric',
      bindingGroupId: 'bind-mar',
      sequenceIndex: 0,
    });
    const page = makePage('yearly-calendar', [rect], {
      bindingGroups: {
        'bind-mar': { id: 'bind-mar', source: 'monthDays', yearMonthIndex: 2 },
      },
    });
    const context = {
      year: 2026,
      plannerStart: new Date(2026, 0, 1),
      plannerEnd: new Date(2026, 11, 31),
    };

    const resolved = resolveBindingDate({
      rectangle: rect,
      templateImage: page,
      context,
      weekStartsOn: 'monday',
    });
    expect(resolved.referenceMonth).toBe(2);
    expect(resolved.date?.getMonth()).toBe(resolved.date ? resolved.date.getMonth() : -1);

    const days = getMonthDatesForGrid({ year: 2026, month: 2, weekStartsOn: 'monday' });
    expect(
      getFieldValue({
        fieldType: 'day',
        context,
        templateImage: page,
        rectangle: rect,
        fillIncompleteMonths: true,
      }).fieldValue,
    ).toBe(String(days[0].getDate()));
  });
});
