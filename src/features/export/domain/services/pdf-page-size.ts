import {
  detectPaperSizeExact,
  paperSizeToPoints,
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
