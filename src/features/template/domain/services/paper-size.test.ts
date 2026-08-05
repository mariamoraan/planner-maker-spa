import { describe, expect, it } from 'vitest';
import {
  detectPaperSize,
  detectPaperSizeExact,
  formatPaperSizeLabel,
  getTemplatePaperSizeLabel,
  inferTemplatePaperSize,
  paperSizeToPixels,
  resolvePageSizeLabel,
} from '@/features/template/domain/services/paper-size';
import type { Template } from '@/features/template/domain/entities/template';

describe('paperSizeToPixels', () => {
  it('returns canonical 300 DPI dimensions for all presets', () => {
    expect(paperSizeToPixels({ kind: 'A4', orientation: 'portrait' })).toEqual({
      width: 2480,
      height: 3508,
    });
    expect(paperSizeToPixels({ kind: 'A4', orientation: 'landscape' })).toEqual({
      width: 3508,
      height: 2480,
    });
    expect(paperSizeToPixels({ kind: 'A5', orientation: 'portrait' })).toEqual({
      width: 1748,
      height: 2480,
    });
    expect(paperSizeToPixels({ kind: 'A5', orientation: 'landscape' })).toEqual({
      width: 2480,
      height: 1748,
    });
  });
});

describe('detectPaperSize', () => {
  it('detects A4 portrait at 300 DPI', () => {
    expect(detectPaperSize(2480, 3508)).toEqual({ kind: 'A4', orientation: 'portrait' });
  });

  it('detects A4 landscape at 300 DPI', () => {
    expect(detectPaperSize(3508, 2480)).toEqual({ kind: 'A4', orientation: 'landscape' });
  });

  it('detects A5 portrait at 300 DPI', () => {
    expect(detectPaperSize(1748, 2480)).toEqual({ kind: 'A5', orientation: 'portrait' });
  });

  it('detects A5 landscape at 72 DPI', () => {
    expect(detectPaperSize(595, 420)).toEqual({ kind: 'A5', orientation: 'landscape' });
  });

  it('detects A4 portrait at 144 DPI (common Canva export)', () => {
    expect(detectPaperSize(1190, 1684)).toEqual({ kind: 'A4', orientation: 'portrait' });
  });

  it('detects approximate A4 exports with slightly off Canva dimensions', () => {
    expect(detectPaperSize(1200, 1600)).toEqual({ kind: 'A4', orientation: 'portrait' });
  });

  it('returns null for clearly custom sizes', () => {
    expect(detectPaperSize(1200, 800)).toBeNull();
    expect(detectPaperSizeExact(1200, 800)).toBeNull();
  });
});

describe('formatPaperSizeLabel', () => {
  it('formats portrait sizes without orientation suffix', () => {
    expect(formatPaperSizeLabel({ kind: 'A4', orientation: 'portrait' })).toBe('A4');
  });

  it('formats landscape sizes with horizontal suffix', () => {
    expect(formatPaperSizeLabel({ kind: 'A4', orientation: 'landscape' })).toBe('A4 horizontal');
  });
});

describe('resolvePageSizeLabel', () => {
  it('returns standard labels for known paper sizes', () => {
    expect(resolvePageSizeLabel(2480, 3508)).toBe('A4');
  });

  it('returns approximate A4 labels for near-standard Canva exports', () => {
    expect(resolvePageSizeLabel(1200, 1600)).toBe('A4');
  });

  it('returns pixel dimensions for custom sizes', () => {
    expect(resolvePageSizeLabel(1200, 800)).toBe('1200 × 800');
  });
});

describe('inferTemplatePaperSize', () => {
  it('infers from the most common page dimensions', () => {
    const template = {
      id: 't1',
      name: 'Planner',
      images: [
        {
          id: 'cover',
          name: 'Cover',
          type: 'cover',
          width: 1200,
          height: 1600,
          src: '',
          rectangles: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'monthly-1',
          name: 'Monthly 1',
          type: 'monthly-calendar',
          width: 2480,
          height: 3508,
          src: '',
          rectangles: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'monthly-2',
          name: 'Monthly 2',
          type: 'monthly-calendar',
          width: 2480,
          height: 3508,
          src: '',
          rectangles: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies Template;

    expect(inferTemplatePaperSize(template)).toEqual({ kind: 'A4', orientation: 'portrait' });
  });

  it('defaults to A4 portrait when there are no pages', () => {
    const template = {
      id: 't2',
      name: 'Empty',
      images: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies Template;

    expect(inferTemplatePaperSize(template)).toEqual({ kind: 'A4', orientation: 'portrait' });
  });
});

describe('getTemplatePaperSizeLabel', () => {
  it('prioritizes stored paperSize over pixel inference', () => {
    const template = {
      id: 't3',
      name: 'Stored',
      paperSize: { kind: 'A5', orientation: 'landscape' as const },
      images: [
        {
          id: 'page',
          name: 'Page',
          type: 'cover',
          width: 2480,
          height: 3508,
          src: '',
          rectangles: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies Template;

    expect(getTemplatePaperSizeLabel(template)).toBe('A5 horizontal');
  });

  it('uses the most common page dimensions when paperSize is missing', () => {
    const template = {
      id: 't1',
      name: 'Planner',
      images: [
        {
          id: 'cover',
          name: 'Cover',
          type: 'cover',
          width: 1200,
          height: 1600,
          src: '',
          rectangles: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'monthly-1',
          name: 'Monthly 1',
          type: 'monthly-calendar',
          width: 2480,
          height: 3508,
          src: '',
          rectangles: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'monthly-2',
          name: 'Monthly 2',
          type: 'monthly-calendar',
          width: 2480,
          height: 3508,
          src: '',
          rectangles: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies Template;

    expect(getTemplatePaperSizeLabel(template)).toBe('A4');
  });

  it('detects approximate A4 when all pages share Canva-like dimensions', () => {
    const template = {
      id: 't2',
      name: 'Canva Planner',
      images: [
        {
          id: 'page',
          name: 'Page',
          type: 'cover',
          width: 1200,
          height: 1600,
          src: '',
          rectangles: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies Template;

    expect(getTemplatePaperSizeLabel(template)).toBe('A4');
  });
});
