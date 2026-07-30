import { describe, it, expect } from 'vitest';
import {
  getDaysOfMonth,
  getFieldValue,
  getMonthsBetween,
} from '@/lib/planner-utils';
import {
  getDefaultFieldStyle,
  getDefaultFormatVariant,
  getFormatVariant,
  applyTextCase,
  isValidHexColor,
  resolveFieldStyle,
} from '@/lib/field-style-config';
import type { Rectangle, TemplateImage } from '@/types/planner';

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

function makeRectangle(overrides: Partial<Rectangle> & Pick<Rectangle, 'id' | 'fieldType'>): Rectangle {
  return {
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    order: 0,
    ...overrides,
  };
}

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

  it('resolves year, month and day from context.date with Spanish locale defaults', () => {
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
    ).toBe('Mayo');

    expect(
      getFieldValue({
        fieldType: 'day',
        context,
        templateImage: dailyTemplate,
        rectangle: dailyTemplate.rectangles[2],
      }).fieldValue
    ).toBe('15');
  });

  it('supports year YY format variant', () => {
    const context = { date, year: date.getFullYear(), month: date.getMonth() };
    const rectangle = makeRectangle({
      id: 'year-yy',
      fieldType: 'year',
      formatVariant: 'YY',
    });

    expect(
      getFieldValue({
        fieldType: 'year',
        context,
        templateImage: dailyTemplate,
        rectangle,
      }).fieldValue
    ).toBe('26');
  });

  it('supports month numeric format variant', () => {
    const context = { date, year: date.getFullYear(), month: date.getMonth() };
    const rectangle = makeRectangle({
      id: 'month-num',
      fieldType: 'month',
      formatVariant: 'numeric',
    });

    expect(
      getFieldValue({
        fieldType: 'month',
        context,
        templateImage: dailyTemplate,
        rectangle,
      }).fieldValue
    ).toBe('5');
  });

  it('supports day weekdayName format variant in Spanish', () => {
    const context = { date, year: date.getFullYear(), month: date.getMonth() };
    const rectangle = makeRectangle({
      id: 'day-name',
      fieldType: 'day',
      formatVariant: 'weekdayName',
    });

    expect(
      getFieldValue({
        fieldType: 'day',
        context,
        templateImage: dailyTemplate,
        rectangle,
      }).fieldValue
    ).toBe('Viernes');
  });
});

describe('field style config helpers', () => {
  it('returns defaults for rectangles without style or formatVariant', () => {
    const rectangle = makeRectangle({ id: 'legacy', fieldType: 'month' });

    expect(getFormatVariant(rectangle)).toBe('name');
    expect(resolveFieldStyle(rectangle)).toEqual(getDefaultFieldStyle());
  });

  it('returns type-specific default format variants', () => {
    expect(getDefaultFormatVariant('year')).toBe('YYYY');
    expect(getDefaultFormatVariant('month')).toBe('name');
    expect(getDefaultFormatVariant('day')).toBe('numeric');
    expect(getDefaultFormatVariant('startDay')).toBe('numeric');
    expect(getDefaultFormatVariant('endDay')).toBe('numeric');
  });

  it('validates hex colors', () => {
    expect(isValidHexColor('#1f2a3d')).toBe(true);
    expect(isValidHexColor('#fff')).toBe(true);
    expect(isValidHexColor('1f2a3d')).toBe(false);
    expect(isValidHexColor('#gggggg')).toBe(false);
  });

  it('applies text case transformations in Spanish', () => {
    expect(applyTextCase('mayo', 'capitalize', 'es')).toBe('Mayo');
    expect(applyTextCase('mayo', 'uppercase', 'es')).toBe('MAYO');
    expect(applyTextCase('MAYO', 'lowercase', 'es')).toBe('mayo');
    expect(applyTextCase('mayo', 'default', 'es')).toBe('mayo');
  });

  it('applies text case via getFieldValue when style.textCase is set', () => {
    const date = new Date(2026, 4, 15);
    const context = { date, year: date.getFullYear(), month: date.getMonth() };
    const rectangle = makeRectangle({
      id: 'month-cap',
      fieldType: 'month',
      style: { ...getDefaultFieldStyle(), textCase: 'capitalize' },
    });

    expect(
      getFieldValue({
        fieldType: 'month',
        context,
        templateImage: dailyTemplate,
        rectangle,
      }).fieldValue
    ).toBe('Mayo');
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
