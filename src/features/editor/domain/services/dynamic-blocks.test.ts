import { describe, it, expect } from 'vitest';
import {
  getFieldValue,
  getWeekNumber,
  resolveRangeEndpointDate,
  resolveCompositeAnchorDate,
} from '@/features/editor/domain/services/planner-utils';
import {
  getFormatVariant,
  normalizeStartEndFormatVariant,
  applyTextCase,
} from '@/features/editor/domain/services/field-style-config';
import { resolveFieldFontSize } from '@/features/editor/domain/services/resolve-field-font-size';
import type { Rectangle, TemplateImage } from '@/features/template';
import { COMPOSITE_PRESETS } from '@/features/template';

function makePage(
  type: TemplateImage['type'],
  rectangles: Rectangle[] = [],
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

describe('normalizeStartEndFormatVariant', () => {
  it('maps legacy numeric to dayNumeric', () => {
    expect(normalizeStartEndFormatVariant('numeric')).toBe('dayNumeric');
  });

  it('keeps explicit start/end formats', () => {
    expect(normalizeStartEndFormatVariant('monthName')).toBe('monthName');
    expect(normalizeStartEndFormatVariant('YYYY')).toBe('YYYY');
  });
});

describe('getFormatVariant start/end legacy', () => {
  it('reads legacy numeric as dayNumeric for startDay', () => {
    const rectangle = makeRect({
      id: 's',
      fieldType: 'startDay',
      formatVariant: 'numeric',
    });
    expect(getFormatVariant(rectangle)).toBe('dayNumeric');
  });
});

describe('startDay/endDay by page type', () => {
  const plannerStart = new Date(2026, 0, 1);
  const plannerEnd = new Date(2026, 11, 31);

  it('resolves monthly calendar to first and last day of month', () => {
    const page = makePage('monthly-calendar');
    const context = { year: 2026, month: 4, plannerStart, plannerEnd };

    expect(resolveRangeEndpointDate('start', context, page)?.getDate()).toBe(1);
    expect(resolveRangeEndpointDate('end', context, page)?.getDate()).toBe(31);

    const startRect = makeRect({ id: 's', fieldType: 'startDay', formatVariant: 'dayNumeric' });
    const endRect = makeRect({ id: 'e', fieldType: 'endDay', formatVariant: 'monthName' });

    expect(
      getFieldValue({
        fieldType: 'startDay',
        context,
        templateImage: page,
        rectangle: startRect,
      }).fieldValue,
    ).toBe('1');

    expect(
      getFieldValue({
        fieldType: 'endDay',
        context,
        templateImage: page,
        rectangle: endRect,
      }).fieldValue,
    ).toBe('Mayo');
  });

  it('resolves daily-page to week bounds', () => {
    const page = makePage('daily-page');
    // Friday 15 May 2026 → week Mon 11 – Sun 17 with monday start
    const date = new Date(2026, 4, 15);
    const context = { date, year: 2026, month: 4, plannerStart, plannerEnd };
    const startRect = makeRect({ id: 's', fieldType: 'startDay', formatVariant: 'dayNumeric' });
    const endRect = makeRect({ id: 'e', fieldType: 'endDay', formatVariant: 'dayNumeric' });

    expect(
      getFieldValue({
        fieldType: 'startDay',
        context,
        templateImage: page,
        rectangle: startRect,
        weekStartsOn: 'monday',
      }).fieldValue,
    ).toBe('11');

    expect(
      getFieldValue({
        fieldType: 'endDay',
        context,
        templateImage: page,
        rectangle: endRect,
        weekStartsOn: 'monday',
      }).fieldValue,
    ).toBe('17');
  });

  it('resolves cover/extra from planner range with year format', () => {
    const page = makePage('cover');
    const context = { plannerStart, plannerEnd };
    const startRect = makeRect({ id: 's', fieldType: 'startDay', formatVariant: 'YYYY' });
    const endRect = makeRect({ id: 'e', fieldType: 'endDay', formatVariant: 'monthNumeric' });

    expect(
      getFieldValue({
        fieldType: 'startDay',
        context,
        templateImage: page,
        rectangle: startRect,
      }).fieldValue,
    ).toBe('2026');

    expect(
      getFieldValue({
        fieldType: 'endDay',
        context,
        templateImage: page,
        rectangle: endRect,
      }).fieldValue,
    ).toBe('12');
  });
});

describe('weekNumber field', () => {
  it('resolves ISO week for weekly-calendar', () => {
    const page = makePage('weekly-calendar');
    const monday = new Date(2026, 4, 11); // ISO week 20
    const context = {
      year: 2026,
      month: 4,
      week: {
        weekNumber: getWeekNumber(monday, 'monday'),
        startDate: monday,
        endDate: new Date(2026, 4, 17),
        days: Array.from({ length: 7 }, (_, i) => new Date(2026, 4, 11 + i)),
      },
    };
    const rectangle = makeRect({ id: 'w', fieldType: 'weekNumber' });

    expect(
      getFieldValue({
        fieldType: 'weekNumber',
        context,
        templateImage: page,
        rectangle,
        weekStartsOn: 'monday',
      }).fieldValue,
    ).toBe(String(getWeekNumber(monday, 'monday')));
  });

  it('resolves week from plannerStart on extra pages', () => {
    const page = makePage('extra');
    const plannerStart = new Date(2026, 0, 5);
    const rectangle = makeRect({ id: 'w', fieldType: 'weekNumber' });

    expect(
      getFieldValue({
        fieldType: 'weekNumber',
        context: { plannerStart, plannerEnd: new Date(2026, 11, 31) },
        templateImage: page,
        rectangle,
        weekStartsOn: 'monday',
      }).fieldValue,
    ).toBe(String(getWeekNumber(plannerStart, 'monday')));
  });
});

describe('composite field', () => {
  it('builds weekday + day preset on daily page', () => {
    const page = makePage('daily-page');
    const date = new Date(2026, 4, 15);
    const preset = COMPOSITE_PRESETS.find(p => p.id === 'weekday-day')!;
    const rectangle = makeRect({
      id: 'c',
      fieldType: 'composite',
      compositeParts: preset.parts,
    });

    expect(
      getFieldValue({
        fieldType: 'composite',
        context: { date, year: 2026, month: 4 },
        templateImage: page,
        rectangle,
      }).fieldValue,
    ).toBe('Viernes 15');
  });

  it('supports newline between weekday and day', () => {
    const page = makePage('daily-page');
    const date = new Date(2026, 4, 15);
    const preset = COMPOSITE_PRESETS.find(p => p.id === 'weekday-newline-day')!;
    const rectangle = makeRect({
      id: 'c',
      fieldType: 'composite',
      compositeParts: preset.parts,
      style: {
        color: '#1f2a3d',
        fontId: 'lato',
        bold: false,
        italic: false,
        textCase: 'default',
        textAlign: 'center',
      },
    });

    expect(
      getFieldValue({
        fieldType: 'composite',
        context: { date, year: 2026, month: 4 },
        templateImage: page,
        rectangle,
      }).fieldValue,
    ).toBe('viernes\n15');
  });

  it('anchors monthly composite to first of month', () => {
    const page = makePage('monthly-calendar');
    expect(
      resolveCompositeAnchorDate({ year: 2026, month: 2 }, page)?.getDate(),
    ).toBe(1);
  });
});

describe('multiline text helpers', () => {
  it('preserves newlines when applying capitalize', () => {
    expect(applyTextCase('lunes\n3', 'capitalize')).toBe('Lunes\n3');
  });

  it('shrinks font size by line count for multiline text', () => {
    const single = resolveFieldFontSize(200, 100, '5', () => 20);
    const multi = resolveFieldFontSize(200, 100, 'a\nb', () => 20);
    expect(multi).toBeCloseTo(single / 2, 5);
  });
});
