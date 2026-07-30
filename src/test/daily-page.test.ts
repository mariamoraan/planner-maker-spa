import { describe, it, expect } from 'vitest';
import {
  getDaysOfMonth,
  getFieldValue,
  getMonthsBetween,
} from '@/lib/planner-utils';
import type { TemplateImage } from '@/types/planner';

const dailyTemplate: TemplateImage = {
  id: 'daily-1',
  name: 'Daily',
  type: 'daily-page',
  width: 100,
  height: 100,
  rectangles: [
    {
      id: 'year',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      fieldType: 'year',
      order: 0,
    },
    {
      id: 'month',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      fieldType: 'month',
      order: 1,
    },
    {
      id: 'day',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      fieldType: 'day',
      order: 2,
    },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
  src: '',
};

describe('getDaysOfMonth', () => {
  it('returns 31 days for January', () => {
    const days = getDaysOfMonth({ year: 2026, month: 0 });
    expect(days).toHaveLength(31);
    expect(days[0].getDate()).toBe(1);
    expect(days[30].getDate()).toBe(31);
  });

  it('returns 30 days for April', () => {
    const days = getDaysOfMonth({ year: 2026, month: 3 });
    expect(days).toHaveLength(30);
  });
});

describe('getFieldValue for daily-page context', () => {
  const date = new Date(2026, 4, 15);

  it('resolves year, month and day from context.date', () => {
    const context = { date, year: date.getFullYear(), month: date.getMonth() };

    expect(
      getFieldValue({
        fieldType: 'year',
        context,
        templateImage: dailyTemplate,
        rectangle: dailyTemplate.rectangles[0],
      }).fieldValue
    ).toBe('2026');

    expect(
      getFieldValue({
        fieldType: 'month',
        context,
        templateImage: dailyTemplate,
        rectangle: dailyTemplate.rectangles[1],
      }).fieldValue
    ).toBe('May');

    expect(
      getFieldValue({
        fieldType: 'day',
        context,
        templateImage: dailyTemplate,
        rectangle: dailyTemplate.rectangles[2],
      }).fieldValue
    ).toBe('15');
  });
});

describe('daily page count per month', () => {
  it('interleaved mode produces one daily page per day in the month', () => {
    const months = getMonthsBetween({
      startDate: new Date(2026, 0, 1),
      endDate: new Date(2026, 0, 31),
    });
    const month = months[0];

    let dailyCount = 0;
    for (const week of month.weeks) {
      dailyCount += week.days.filter(d => d.getMonth() === month.month).length;
    }

    expect(dailyCount).toBe(31);
  });

  it('standalone mode uses getDaysOfMonth length', () => {
    const days = getDaysOfMonth({ year: 2026, month: 3 });
    expect(days).toHaveLength(30);
  });
});
