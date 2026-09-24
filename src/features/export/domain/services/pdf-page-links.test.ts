import { describe, expect, it } from 'vitest';
import type { GeneratedPage } from '@/features/export/domain/entities/generated-page';
import type { Template, TemplateImage } from '@/features/template';
import {
  attachPdfLinks,
  buildDestinationIndex,
  collectLinksForTemplatePage,
  dailyDestinationKey,
  monthDestinationKey,
  templateAabbToPdfLinkRect,
  toWeekStartISO,
} from '@/features/export/domain/services/pdf-page-links';
import { buildExportKey } from '@/features/export/domain/services/planner-export';

function page(partial: Partial<GeneratedPage> & Pick<GeneratedPage, 'pageNumber' | 'type'>): GeneratedPage {
  return {
    imageData: 'data:image/png;base64,xx',
    width: 100,
    height: 100,
    ...partial,
  };
}

describe('buildDestinationIndex', () => {
  it('indexes first daily page per date when multiple templates exist', () => {
    const pages = [
      page({ pageNumber: 1, type: 'daily-page', year: 2026, month: 0, day: 1, templatePageId: 'd1' }),
      page({ pageNumber: 2, type: 'daily-page', year: 2026, month: 0, day: 1, templatePageId: 'd2' }),
      page({ pageNumber: 3, type: 'daily-page', year: 2026, month: 0, day: 2, templatePageId: 'd1' }),
    ];

    const index = buildDestinationIndex(pages);
    expect(index.daily.get(dailyDestinationKey(2026, 0, 1))).toBe(1);
    expect(index.daily.get(dailyDestinationKey(2026, 0, 2))).toBe(3);
  });

  it('prefers first monthly-calendar over month-cover', () => {
    const pages = [
      page({ pageNumber: 1, type: 'month-cover', year: 2026, month: 2 }),
      page({ pageNumber: 2, type: 'monthly-calendar', year: 2026, month: 2, templatePageId: 'm1' }),
      page({ pageNumber: 3, type: 'monthly-calendar', year: 2026, month: 2, templatePageId: 'm2' }),
    ];

    const index = buildDestinationIndex(pages);
    expect(index.month.get(monthDestinationKey(2026, 2))).toBe(2);
  });

  it('falls back to month-cover when no monthly-calendar exists', () => {
    const pages = [
      page({ pageNumber: 5, type: 'month-cover', year: 2026, month: 5 }),
    ];
    const index = buildDestinationIndex(pages);
    expect(index.month.get(monthDestinationKey(2026, 5))).toBe(5);
  });
});

describe('templateAabbToPdfLinkRect', () => {
  it('scales and Y-flips template AABB into PDF points', () => {
    const rect = templateAabbToPdfLinkRect(
      { x: 0, y: 0, width: 100, height: 50 },
      { width: 200, height: 200 },
      { width: 200, height: 200 },
      { width: 200, height: 200 },
    );

    // Top-left 100x50 in a 200x200 page → PDF bottom-left y = 200 - 50 = 150
    expect(rect.x).toBeCloseTo(0);
    expect(rect.y).toBeCloseTo(150);
    expect(rect.width).toBeCloseTo(100);
    expect(rect.height).toBeCloseTo(50);
  });

  it('maps through different output and PDF sizes', () => {
    // template 100x100 → output 200x200 (2x) → PDF 100x100 pts (0.5x from output)
    const rect = templateAabbToPdfLinkRect(
      { x: 10, y: 20, width: 30, height: 40 },
      { width: 100, height: 100 },
      { width: 200, height: 200 },
      { width: 100, height: 100 },
    );

    // output px: 20,40,60,80 → pdf: 10,20,30,40; y flip: 100 - (40+80)*0.5 = 100-60 = 40
    expect(rect.x).toBeCloseTo(10);
    expect(rect.y).toBeCloseTo(40);
    expect(rect.width).toBeCloseTo(30);
    expect(rect.height).toBeCloseTo(40);
  });
});

describe('collectLinksForTemplatePage', () => {
  const bindingGroups = {
    'bind-days': { id: 'bind-days', source: 'monthDays' as const },
  };

  const monthlyTemplate: TemplateImage = {
    id: 'monthly-1',
    name: 'Monthly',
    type: 'monthly-calendar',
    width: 200,
    height: 200,
    src: '',
    rectangles: [
      {
        id: 'day-1',
        x: 10,
        y: 10,
        width: 40,
        height: 40,
        fieldType: 'day',
        order: 0,
        bindingGroupId: 'bind-days',
        sequenceIndex: 0,
      },
    ],
    bindingGroups,
  };

  it('links monthDays cells to the matching daily page', () => {
    const index = buildDestinationIndex([
      page({ pageNumber: 10, type: 'daily-page', year: 2026, month: 0, day: 1 }),
    ]);

    // Jan 2026 starts on Thursday; with weekStartsOn Monday, grid starts Dec 29 2025.
    // sequenceIndex 0 → Dec 29 — no daily in index → no link.
    // Put a day that exists: find sequence for Jan 1.
    // Dec 29=0, 30=1, 31=2, Jan1=3
    const templateWithJan1: TemplateImage = {
      ...monthlyTemplate,
      rectangles: [
        {
          ...monthlyTemplate.rectangles[0],
          sequenceIndex: 3,
        },
      ],
    };

    const links = collectLinksForTemplatePage({
      templateImage: templateWithJan1,
      context: {
        year: 2026,
        month: 0,
        days: undefined,
        plannerStart: new Date(2026, 0, 1),
        plannerEnd: new Date(2026, 0, 31),
      },
      weekStartsOn: 'monday',
      outputSize: { width: 200, height: 200 },
      paperSize: { kind: 'A4', orientation: 'portrait' },
      index,
    });

    expect(links).toHaveLength(1);
    expect(links[0].destPageNumber).toBe(10);
    expect(links[0].width).toBeGreaterThan(0);
    expect(links[0].height).toBeGreaterThan(0);
  });

  it('falls back to weekly page when no daily exists for that day', () => {
    const weekStart = new Date(2026, 0, 5);
    const index = buildDestinationIndex([
      page({
        pageNumber: 7,
        type: 'weekly-calendar',
        year: 2026,
        month: 0,
        weekNumber: 0,
        weekStartISO: toWeekStartISO(weekStart),
      }),
    ]);

    const templateWithJan5: TemplateImage = {
      id: 'monthly-1',
      name: 'Monthly',
      type: 'monthly-calendar',
      width: 200,
      height: 200,
      src: '',
      rectangles: [
        {
          id: 'day-5',
          x: 10,
          y: 10,
          width: 40,
          height: 40,
          fieldType: 'day',
          order: 0,
          bindingGroupId: 'bind-days',
          sequenceIndex: 7,
        },
      ],
      bindingGroups: {
        'bind-days': { id: 'bind-days', source: 'monthDays' },
      },
    };

    const links = collectLinksForTemplatePage({
      templateImage: templateWithJan5,
      context: {
        year: 2026,
        month: 0,
        plannerStart: new Date(2026, 0, 1),
        plannerEnd: new Date(2026, 0, 31),
      },
      weekStartsOn: 'monday',
      outputSize: { width: 200, height: 200 },
      index,
    });

    expect(links).toHaveLength(1);
    expect(links[0].destPageNumber).toBe(7);
  });

  it('falls back to monthly page when no daily or weekly exists', () => {
    const index = buildDestinationIndex([
      page({ pageNumber: 3, type: 'monthly-calendar', year: 2026, month: 0 }),
      page({ pageNumber: 8, type: 'monthly-calendar', year: 2025, month: 11 }),
    ]);

    // sequenceIndex 0 on Jan 2026 Monday grid → Dec 29, 2025 → month 11
    const templateWithDec29: TemplateImage = {
      id: 'monthly-1',
      name: 'Monthly',
      type: 'monthly-calendar',
      width: 200,
      height: 200,
      src: '',
      rectangles: [
        {
          id: 'day-0',
          x: 10,
          y: 10,
          width: 40,
          height: 40,
          fieldType: 'day',
          order: 0,
          bindingGroupId: 'bind-days',
          sequenceIndex: 0,
        },
      ],
      bindingGroups: {
        'bind-days': { id: 'bind-days', source: 'monthDays' },
      },
    };

    const links = collectLinksForTemplatePage({
      templateImage: templateWithDec29,
      context: {
        year: 2026,
        month: 0,
        plannerStart: new Date(2026, 0, 1),
        plannerEnd: new Date(2026, 0, 31),
      },
      weekStartsOn: 'monday',
      outputSize: { width: 200, height: 200 },
      index,
    });

    expect(links).toHaveLength(1);
    expect(links[0].destPageNumber).toBe(8);
  });

  it('links in-month day cells to the current monthly when that is the only destination', () => {
    const index = buildDestinationIndex([
      page({ pageNumber: 3, type: 'monthly-calendar', year: 2026, month: 0 }),
    ]);

    const templateWithJan1: TemplateImage = {
      id: 'monthly-1',
      name: 'Monthly',
      type: 'monthly-calendar',
      width: 200,
      height: 200,
      src: '',
      rectangles: [
        {
          id: 'day-1',
          x: 10,
          y: 10,
          width: 40,
          height: 40,
          fieldType: 'day',
          order: 0,
          bindingGroupId: 'bind-days',
          sequenceIndex: 3,
        },
      ],
      bindingGroups: {
        'bind-days': { id: 'bind-days', source: 'monthDays' },
      },
    };

    const links = collectLinksForTemplatePage({
      templateImage: templateWithJan1,
      context: {
        year: 2026,
        month: 0,
        plannerStart: new Date(2026, 0, 1),
        plannerEnd: new Date(2026, 0, 31),
      },
      weekStartsOn: 'monday',
      outputSize: { width: 200, height: 200 },
      index,
    });

    expect(links).toHaveLength(1);
    expect(links[0].destPageNumber).toBe(3);
  });

  it('links month field on month-cover to monthly-calendar', () => {
    const cover: TemplateImage = {
      id: 'cover-m',
      name: 'Month cover',
      type: 'month-cover',
      width: 200,
      height: 200,
      src: '',
      rectangles: [
        {
          id: 'month-title',
          x: 20,
          y: 20,
          width: 100,
          height: 30,
          fieldType: 'month',
          order: 0,
        },
      ],
    };

    const index = buildDestinationIndex([
      page({ pageNumber: 4, type: 'monthly-calendar', year: 2026, month: 3 }),
    ]);

    const links = collectLinksForTemplatePage({
      templateImage: cover,
      context: {
        year: 2026,
        month: 3,
        plannerStart: new Date(2026, 3, 1),
        plannerEnd: new Date(2026, 3, 30),
      },
      outputSize: { width: 200, height: 200 },
      index,
    });

    expect(links).toHaveLength(1);
    expect(links[0].destPageNumber).toBe(4);
  });

  it('links month cells on yearly-calendar to monthly destinations', () => {
    const yearly: TemplateImage = {
      id: 'yearly-1',
      name: 'Yearly',
      type: 'yearly-calendar',
      width: 200,
      height: 200,
      src: '',
      rectangles: [
        {
          id: 'apr',
          x: 10,
          y: 10,
          width: 40,
          height: 20,
          fieldType: 'month',
          order: 0,
          bindingGroupId: 'bind-year',
          sequenceIndex: 3,
        },
      ],
      bindingGroups: {
        'bind-year': { id: 'bind-year', source: 'yearMonths' },
      },
    };

    const index = buildDestinationIndex([
      page({ pageNumber: 8, type: 'monthly-calendar', year: 2026, month: 3 }),
    ]);

    const links = collectLinksForTemplatePage({
      templateImage: yearly,
      context: {
        year: 2026,
        plannerStart: new Date(2026, 0, 1),
        plannerEnd: new Date(2026, 11, 31),
      },
      outputSize: { width: 200, height: 200 },
      index,
    });

    expect(links).toHaveLength(1);
    expect(links[0].destPageNumber).toBe(8);
  });

  it('links day cells on yearly mini calendars to daily destinations', () => {
    const yearly: TemplateImage = {
      id: 'yearly-days',
      name: 'Yearly',
      type: 'yearly-calendar',
      width: 200,
      height: 200,
      src: '',
      rectangles: [
        {
          id: 'd0',
          x: 10,
          y: 10,
          width: 20,
          height: 20,
          fieldType: 'day',
          order: 0,
          bindingGroupId: 'bind-jan',
          // Monday-start grid for Jan 2026: Dec 29,30,31, Jan1 → index 3 = Jan 1
          sequenceIndex: 3,
        },
      ],
      bindingGroups: {
        'bind-jan': { id: 'bind-jan', source: 'monthDays', yearMonthIndex: 0 },
      },
    };

    const index = buildDestinationIndex([
      page({ pageNumber: 12, type: 'daily-page', year: 2026, month: 0, day: 1 }),
    ]);

    const links = collectLinksForTemplatePage({
      templateImage: yearly,
      context: {
        year: 2026,
        plannerStart: new Date(2026, 0, 1),
        plannerEnd: new Date(2026, 11, 31),
      },
      weekStartsOn: 'monday',
      outputSize: { width: 200, height: 200 },
      index,
    });

    expect(links).toHaveLength(1);
    expect(links[0].destPageNumber).toBe(12);
  });
});

describe('attachPdfLinks', () => {
  it('clears links when disabled', () => {
    const pages = [
      page({
        pageNumber: 1,
        type: 'monthly-calendar',
        year: 2026,
        month: 0,
        templatePageId: 'm1',
        links: [{ x: 0, y: 0, width: 1, height: 1, destPageNumber: 2 }],
      }),
    ];
    const template = {
      id: 't1',
      name: 'T',
      images: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as Template;

    const result = attachPdfLinks(template, pages, {
      startDate: new Date(2026, 0, 1),
      endDate: new Date(2026, 0, 31),
      enabled: false,
    });

    expect(result[0].links).toBeUndefined();
  });
});

describe('buildExportKey', () => {
  it('includes the internal-links flag so cache does not mix modes', () => {
    const updatedAt = new Date('2026-01-01T00:00:00.000Z');
    const start = new Date('2026-01-01T00:00:00.000Z');
    const end = new Date('2026-01-31T00:00:00.000Z');
    const withLinks = buildExportKey('t1', start, end, updatedAt, true);
    const without = buildExportKey('t1', start, end, updatedAt, false);
    expect(withLinks).not.toBe(without);
    expect(withLinks).toContain('links=1');
    expect(without).toContain('links=0');
  });
});
