import { describe, it, expect } from 'vitest';
import {
  getMonthDatesForGrid,
  getMonthsBetween,
  getFieldValue,
  findPreviewMonthAlignedToWeekStart,
  getEditorPreviewContext,
} from '@/features/editor/domain/services/planner-utils';
import type { Rectangle, TemplateImage } from '@/features/template';

const weeklyTemplate: TemplateImage = {
  id: 'weekly-1',
  name: 'Weekly',
  type: 'weekly-calendar',
  width: 100,
  height: 100,
  rectangles: [
    {
      id: 'start-day',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      fieldType: 'startDay',
      order: 0,
      formatVariant: 'numeric',
    },
    {
      id: 'end-day',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      fieldType: 'endDay',
      order: 1,
      formatVariant: 'numeric',
    },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
  src: '',
};

describe('getMonthDatesForGrid', () => {
  it('starts March 2026 on Monday 23 Feb when week starts on Monday', () => {
    const days = getMonthDatesForGrid({ year: 2026, month: 2, weekStartsOn: 'monday' });
    expect(days[0].getDate()).toBe(23);
    expect(days[0].getMonth()).toBe(1);
    expect(days.at(-1)?.getDate()).toBe(31);
    expect(days.at(-1)?.getMonth()).toBe(2);
  });

  it('starts March 2026 on Sunday 1 Mar when week starts on Sunday', () => {
    const days = getMonthDatesForGrid({ year: 2026, month: 2, weekStartsOn: 'sunday' });
    expect(days[0].getDate()).toBe(1);
    expect(days[0].getMonth()).toBe(2);
    expect(days.at(-1)?.getDate()).toBe(31);
    expect(days.at(-1)?.getMonth()).toBe(2);
  });

  it('defaults to Monday when weekStartsOn is omitted', () => {
    const days = getMonthDatesForGrid({ year: 2026, month: 2 });
    expect(days[0].getDate()).toBe(23);
    expect(days[0].getMonth()).toBe(1);
  });
});

describe('getMonthsBetween week configuration', () => {
  it('builds Monday-first weeks for March 2026', () => {
    const months = getMonthsBetween({
      startDate: new Date(2026, 2, 1),
      endDate: new Date(2026, 2, 31),
      weekStartsOn: 'monday',
    });
    const week = months[0].weeks[0];

    expect(week.startDate.getDate()).toBe(23);
    expect(week.startDate.getMonth()).toBe(1);
    expect(week.endDate.getDate()).toBe(1);
    expect(week.endDate.getMonth()).toBe(2);
    expect(week.days).toHaveLength(7);
  });

  it('builds Sunday-first weeks for March 2026', () => {
    const months = getMonthsBetween({
      startDate: new Date(2026, 2, 1),
      endDate: new Date(2026, 2, 31),
      weekStartsOn: 'sunday',
    });
    const week = months[0].weeks[0];

    expect(week.startDate.getDate()).toBe(1);
    expect(week.startDate.getMonth()).toBe(2);
    expect(week.endDate.getDate()).toBe(7);
    expect(week.endDate.getMonth()).toBe(2);
    expect(week.days).toHaveLength(7);
  });

  it('uses different week numbers between Monday and Sunday modes', () => {
    const mondayMonths = getMonthsBetween({
      startDate: new Date(2026, 2, 1),
      endDate: new Date(2026, 2, 31),
      weekStartsOn: 'monday',
    });
    const sundayMonths = getMonthsBetween({
      startDate: new Date(2026, 2, 1),
      endDate: new Date(2026, 2, 31),
      weekStartsOn: 'sunday',
    });

    expect(mondayMonths[0].weeks[0].weekNumber).not.toBe(sundayMonths[0].weeks[0].weekNumber);
  });
});

describe('getFieldValue startDay/endDay with weekStartsOn', () => {
  const mondayWeek = {
    weekNumber: 9,
    startDate: new Date(2026, 1, 23),
    endDate: new Date(2026, 2, 1),
    days: [
      new Date(2026, 1, 23),
      new Date(2026, 1, 24),
      new Date(2026, 1, 25),
      new Date(2026, 1, 26),
      new Date(2026, 1, 27),
      new Date(2026, 1, 28),
      new Date(2026, 2, 1),
    ],
  };

  const sundayWeek = {
    weekNumber: 10,
    startDate: new Date(2026, 2, 1),
    endDate: new Date(2026, 2, 7),
    days: [
      new Date(2026, 2, 1),
      new Date(2026, 2, 2),
      new Date(2026, 2, 3),
      new Date(2026, 2, 4),
      new Date(2026, 2, 5),
      new Date(2026, 2, 6),
      new Date(2026, 2, 7),
    ],
  };

  it('resolves Monday week start and Sunday week end', () => {
    const context = { year: 2026, month: 2, week: mondayWeek };

    expect(
      getFieldValue({
        fieldType: 'startDay',
        context,
        templateImage: weeklyTemplate,
        rectangle: weeklyTemplate.rectangles[0] as Rectangle,
      }).fieldValue
    ).toBe('23');

    expect(
      getFieldValue({
        fieldType: 'endDay',
        context,
        templateImage: weeklyTemplate,
        rectangle: weeklyTemplate.rectangles[1] as Rectangle,
      }).fieldValue
    ).toBe('1');
  });

  it('resolves Sunday week start and Saturday week end', () => {
    const context = { year: 2026, month: 2, week: sundayWeek };

    expect(
      getFieldValue({
        fieldType: 'startDay',
        context,
        templateImage: weeklyTemplate,
        rectangle: weeklyTemplate.rectangles[0] as Rectangle,
      }).fieldValue
    ).toBe('1');

    expect(
      getFieldValue({
        fieldType: 'endDay',
        context,
        templateImage: weeklyTemplate,
        rectangle: weeklyTemplate.rectangles[1] as Rectangle,
      }).fieldValue
    ).toBe('7');
  });
});

describe('findPreviewMonthAlignedToWeekStart', () => {
  it('returns a month whose day 1 is Monday when week starts on Monday', () => {
    const { firstOfMonth } = findPreviewMonthAlignedToWeekStart(
      'monday',
      new Date(2026, 8, 17),
    );
    expect(firstOfMonth.getDay()).toBe(1);
    expect(firstOfMonth.getDate()).toBe(1);
  });

  it('returns a month whose day 1 is Sunday when week starts on Sunday', () => {
    const { firstOfMonth } = findPreviewMonthAlignedToWeekStart(
      'sunday',
      new Date(2026, 8, 17),
    );
    expect(firstOfMonth.getDay()).toBe(0);
    expect(firstOfMonth.getDate()).toBe(1);
  });
});

describe('getEditorPreviewContext', () => {
  it('uses an aligned month so the monthly grid starts on day 1', () => {
    const page: TemplateImage = {
      ...weeklyTemplate,
      id: 'monthly-1',
      type: 'monthly-calendar',
      rectangles: [],
    };
    const context = getEditorPreviewContext(page, 'monday');
    expect(context.days?.[0]?.getDate()).toBe(1);
    expect(context.days?.[0]?.getMonth()).toBe(context.month);
  });

  it('honours a custom preview anchor month', () => {
    const page: TemplateImage = {
      ...weeklyTemplate,
      id: 'monthly-2',
      type: 'monthly-calendar',
      rectangles: [],
    };
    const context = getEditorPreviewContext(
      page,
      'monday',
      undefined,
      new Date(2027, 1, 15),
    );
    expect(context.year).toBe(2027);
    expect(context.month).toBe(1);
  });

  it('honours a custom preview anchor day on daily pages', () => {
    const page: TemplateImage = {
      ...weeklyTemplate,
      id: 'daily-1',
      type: 'daily-page',
      rectangles: [],
    };
    const anchor = new Date(2026, 5, 12);
    const context = getEditorPreviewContext(page, 'monday', undefined, anchor);
    expect(context.date?.getFullYear()).toBe(2026);
    expect(context.date?.getMonth()).toBe(5);
    expect(context.date?.getDate()).toBe(12);
  });

  it('uses template planner range for cover and extra pages', () => {
    const page: TemplateImage = {
      ...weeklyTemplate,
      id: 'cover-1',
      type: 'cover',
      rectangles: [],
    };
    const plannerStart = new Date(2026, 0, 1);
    const plannerEnd = new Date(2027, 11, 31);
    const context = getEditorPreviewContext(page, 'monday', {
      plannerStart,
      plannerEnd,
    });
    expect(context.plannerStart).toEqual(plannerStart);
    expect(context.plannerEnd).toEqual(plannerEnd);
    expect(context.year).toBe(2026);
    expect(context.date).toEqual(plannerStart);
  });

  it('honours a custom preview planner range on cover pages', () => {
    const page: TemplateImage = {
      ...weeklyTemplate,
      id: 'cover-2',
      type: 'cover',
      rectangles: [],
    };
    const context = getEditorPreviewContext(
      page,
      'monday',
      {
        plannerStart: new Date(2026, 0, 1),
        plannerEnd: new Date(2026, 11, 31),
      },
      null,
      { start: new Date(2027, 5, 1), end: new Date(2028, 2, 15) },
    );
    expect(context.plannerStart?.getFullYear()).toBe(2027);
    expect(context.plannerStart?.getMonth()).toBe(5);
    expect(context.plannerEnd?.getFullYear()).toBe(2028);
    expect(context.plannerEnd?.getMonth()).toBe(2);
    expect(context.year).toBe(2027);
  });

  it('swaps inverted preview planner range on extra pages', () => {
    const page: TemplateImage = {
      ...weeklyTemplate,
      id: 'extra-1',
      type: 'extra',
      rectangles: [],
    };
    const context = getEditorPreviewContext(
      page,
      'monday',
      {
        plannerStart: new Date(2026, 0, 1),
        plannerEnd: new Date(2026, 11, 31),
      },
      null,
      { start: new Date(2028, 0, 1), end: new Date(2027, 0, 1) },
    );
    expect(context.plannerStart?.getFullYear()).toBe(2027);
    expect(context.plannerEnd?.getFullYear()).toBe(2028);
  });
});

describe('getFieldValue month title uses context month', () => {
  const monthRect = (id: string, bindingGroupId: string, sequenceIndex = 0): Rectangle => ({
    id,
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    fieldType: 'month',
    order: sequenceIndex,
    formatVariant: 'name',
    bindingGroupId,
    sequenceIndex,
  });

  it('shows September on monthly calendar even when grid cell 0 is August', () => {
    const days = getMonthDatesForGrid({ year: 2026, month: 8, weekStartsOn: 'monday' });
    expect(days[0].getMonth()).toBe(7); // leading Aug 31
    expect(days[0].getDate()).toBe(31);

    const rect = monthRect('month-title', 'bind-month');
    const page: TemplateImage = {
      ...weeklyTemplate,
      id: 'monthly-sep',
      type: 'monthly-calendar',
      rectangles: [rect],
      bindingGroups: {
        'bind-month': { id: 'bind-month', source: 'monthDays' },
      },
    };

    const { fieldValue } = getFieldValue({
      fieldType: 'month',
      context: { year: 2026, month: 8, days },
      templateImage: page,
      rectangle: rect,
      fillIncompleteMonths: true,
      weekStartsOn: 'monday',
    });

    expect(fieldValue).toBe('Septiembre');
  });

  it('shows September on first weekly page whose Monday is still August', () => {
    const week = {
      weekNumber: 36,
      startDate: new Date(2026, 7, 31),
      endDate: new Date(2026, 8, 6),
      days: [
        new Date(2026, 7, 31),
        new Date(2026, 8, 1),
        new Date(2026, 8, 2),
        new Date(2026, 8, 3),
        new Date(2026, 8, 4),
        new Date(2026, 8, 5),
        new Date(2026, 8, 6),
      ],
    };

    const rect = monthRect('month-title', 'bind-week');
    const page: TemplateImage = {
      ...weeklyTemplate,
      rectangles: [rect],
      bindingGroups: {
        'bind-week': { id: 'bind-week', source: 'weekDays' },
      },
    };

    const { fieldValue } = getFieldValue({
      fieldType: 'month',
      context: { year: 2026, month: 8, week },
      templateImage: page,
      rectangle: rect,
      fillIncompleteWeeks: true,
      weekStartsOn: 'monday',
    });

    expect(fieldValue).toBe('Septiembre');
  });

  it('shows September on last weekly page that spills into October', () => {
    const week = {
      weekNumber: 40,
      startDate: new Date(2026, 8, 28),
      endDate: new Date(2026, 9, 4),
      days: [
        new Date(2026, 8, 28),
        new Date(2026, 8, 29),
        new Date(2026, 8, 30),
        new Date(2026, 9, 1),
        new Date(2026, 9, 2),
        new Date(2026, 9, 3),
        new Date(2026, 9, 4),
      ],
    };

    const rect = monthRect('month-title', 'bind-week', 6);
    const page: TemplateImage = {
      ...weeklyTemplate,
      rectangles: [rect],
      bindingGroups: {
        'bind-week': { id: 'bind-week', source: 'weekDays' },
      },
    };

    const { fieldValue } = getFieldValue({
      fieldType: 'month',
      context: { year: 2026, month: 8, week },
      templateImage: page,
      rectangle: rect,
      fillIncompleteWeeks: true,
      weekStartsOn: 'monday',
    });

    expect(fieldValue).toBe('Septiembre');
  });
});
