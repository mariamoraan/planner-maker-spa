import {
  detectPaperSizeExact,
  paperSizeToPoints,
  type PaperSize,
} from '@/features/template/domain/services/paper-size';

const FALLBACK_DPI = 300;

function pixelsToPoints(px: number, dpi: number): number {
  return (px * 72) / dpi;
}

export function resolvePdfPageSize(widthPx: number, heightPx: number): { width: number; height: number } {
  const detected = detectPaperSizeExact(widthPx, heightPx);
  if (detected) return paperSizeToPoints(detected);

  return {
    width: pixelsToPoints(widthPx, FALLBACK_DPI),
    height: pixelsToPoints(heightPx, FALLBACK_DPI),
  };
}

export function resolvePdfPageSizeForExport(
  widthPx: number,
  heightPx: number,
  paperSize?: PaperSize,
): { width: number; height: number } {
  if (paperSize) return paperSizeToPoints(paperSize);
  return resolvePdfPageSize(widthPx, heightPx);
}
