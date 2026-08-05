import { describe, expect, it } from 'vitest';
import {
  detectPaperSize,
  formatPaperSizeLabel,
  getTemplatePaperSizeLabel,
  resolvePageSizeLabel,
} from '@/features/template/domain/services/paper-size';
import type { Template } from '@/features/template/domain/entities/template';

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

  it('returns null for custom sizes', () => {
    expect(detectPaperSize(1200, 1600)).toBeNull();
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

  it('returns pixel dimensions for custom sizes', () => {
    expect(resolvePageSizeLabel(1200, 1600)).toBe('1200 × 1600');
  });
});

describe('getTemplatePaperSizeLabel', () => {
  it('uses the cover page dimensions when available', () => {
    const template = {
      id: 't1',
      name: 'Planner',
      images: [
        {
          id: 'cover',
          name: 'Cover',
          type: 'cover',
          width: 2480,
          height: 3508,
          src: '',
          rectangles: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'monthly',
          name: 'Monthly',
          type: 'monthly-calendar',
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

  it('falls back to pixel dimensions for custom sizes', () => {
    const template = {
      id: 't2',
      name: 'Demo',
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

    expect(getTemplatePaperSizeLabel(template)).toBe('1200 × 1600');
  });
});
