import { describe, it, expect } from 'vitest';
import {
  getMonthDatesForGrid,
  getMonthsBetween,
  getFieldValue,
} from '@/lib/planner-utils';
import type { Rectangle, TemplateImage } from '@/types/planner';

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
