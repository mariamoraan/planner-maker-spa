import { describe, it, expect } from 'vitest';
import { resolvePdfPageSize, resolvePdfPageSizeForExport } from '@/features/export/domain/services/pdf-page-size';

describe('resolvePdfPageSize', () => {
  it('resolves A4 landscape at 300 DPI', () => {
    const result = resolvePdfPageSize(3508, 2480);
    expect(result.width).toBeCloseTo(841.89, 1);
    expect(result.height).toBeCloseTo(595.28, 1);
  });

  it('resolves A5 landscape at 300 DPI', () => {
    const result = resolvePdfPageSize(2480, 1748);
    expect(result.width).toBeCloseTo(595.28, 1);
    expect(result.height).toBeCloseTo(419.53, 1);
  });

  it('resolves A4 portrait at 300 DPI', () => {
    const result = resolvePdfPageSize(2480, 3508);
    expect(result.width).toBeCloseTo(595.28, 1);
    expect(result.height).toBeCloseTo(841.89, 1);
  });

  it('resolves A5 portrait at 300 DPI', () => {
    const result = resolvePdfPageSize(1748, 2480);
    expect(result.width).toBeCloseTo(419.53, 1);
    expect(result.height).toBeCloseTo(595.28, 1);
  });

  it('preserves aspect ratio for custom sizes via 300 DPI fallback', () => {
    const result = resolvePdfPageSize(1200, 800);
    expect(result.width).toBeCloseTo(288, 1);
    expect(result.height).toBeCloseTo(192, 1);
    expect(result.width / result.height).toBeCloseTo(1200 / 800, 5);
  });

  it('recognizes A4 at 150 DPI', () => {
    const result = resolvePdfPageSize(1240, 1754);
    expect(result.width).toBeCloseTo(595.28, 1);
    expect(result.height).toBeCloseTo(841.89, 1);
  });

  it('recognizes A5 landscape at 72 DPI', () => {
    const result = resolvePdfPageSize(595, 420);
    expect(result.width).toBeCloseTo(595.28, 1);
    expect(result.height).toBeCloseTo(419.53, 1);
  });
});

describe('resolvePdfPageSizeForExport', () => {
  it('uses template paperSize instead of pixel dimensions for legacy pages', () => {
    const result = resolvePdfPageSizeForExport(1200, 1600, {
      kind: 'A4',
      orientation: 'portrait',
    });
    expect(result.width).toBeCloseTo(595.28, 1);
    expect(result.height).toBeCloseTo(841.89, 1);
  });

  it('falls back to pixel inference when paperSize is missing', () => {
    const result = resolvePdfPageSizeForExport(1200, 800);
    expect(result.width).toBeCloseTo(288, 1);
    expect(result.height).toBeCloseTo(192, 1);
  });
});
