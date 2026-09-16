import type { FieldType } from '@/features/template';

/** Reference page size used for default block/grid sizing (matches demo baseline). */
export const DEFAULT_SIZE_BASELINE = { width: 1200, height: 1600 } as const;

const BASELINE_BLOCK_SIZE: Record<FieldType, { width: number; height: number }> = {
  month: { width: 280, height: 90 },
  year: { width: 160, height: 70 },
  day: { width: 80, height: 60 },
  startDay: { width: 80, height: 60 },
  endDay: { width: 80, height: 60 },
  weekNumber: { width: 80, height: 60 },
  composite: { width: 220, height: 70 },
};

/** Baseline grid cell size before page scaling. */
export const BASELINE_GRID_RECT_SIZE = { width: 72, height: 54 } as const;

export function scaleSizeToPage(
  size: { width: number; height: number },
  pageWidth: number,
  pageHeight: number,
): { width: number; height: number } {
  const scaleX = pageWidth / DEFAULT_SIZE_BASELINE.width;
  const scaleY = pageHeight / DEFAULT_SIZE_BASELINE.height;
  return {
    width: Math.round(size.width * scaleX),
    height: Math.round(size.height * scaleY),
  };
}

export function getDefaultBlockSize(
  fieldType: FieldType,
  pageWidth: number,
  pageHeight: number,
): { width: number; height: number } {
  return scaleSizeToPage(BASELINE_BLOCK_SIZE[fieldType], pageWidth, pageHeight);
}

export function getDefaultGridRectSize(
  pageWidth: number,
  pageHeight: number,
): { width: number; height: number } {
  return scaleSizeToPage(BASELINE_GRID_RECT_SIZE, pageWidth, pageHeight);
}
