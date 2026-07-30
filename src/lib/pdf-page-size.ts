const PAPER_SIZES_PT = {
  A4: { width: 595.28, height: 841.89 },
  A5: { width: 419.53, height: 595.28 },
} as const;

const COMMON_DPIS = [300, 150, 72] as const;
const FALLBACK_DPI = 300;
const TOLERANCE_PT = 2;

function isClose(a: number, b: number): boolean {
  return Math.abs(a - b) <= TOLERANCE_PT;
}

function matchesPaperSize(
  widthPt: number,
  heightPt: number,
  paper: { width: number; height: number }
): boolean {
  return (
    (isClose(widthPt, paper.width) && isClose(heightPt, paper.height)) ||
    (isClose(widthPt, paper.height) && isClose(heightPt, paper.width))
  );
}

function resolveStandardSize(widthPt: number, heightPt: number): { width: number; height: number } | null {
  for (const paper of Object.values(PAPER_SIZES_PT)) {
    if (!matchesPaperSize(widthPt, heightPt, paper)) continue;

    const landscape = widthPt >= heightPt;
    return landscape
      ? { width: Math.max(paper.width, paper.height), height: Math.min(paper.width, paper.height) }
      : { width: Math.min(paper.width, paper.height), height: Math.max(paper.width, paper.height) };
  }

  return null;
}

function pixelsToPoints(px: number, dpi: number): number {
  return px * 72 / dpi;
}

export function resolvePdfPageSize(widthPx: number, heightPx: number): { width: number; height: number } {
  for (const dpi of COMMON_DPIS) {
    const widthPt = pixelsToPoints(widthPx, dpi);
    const heightPt = pixelsToPoints(heightPx, dpi);
    const standard = resolveStandardSize(widthPt, heightPt);
    if (standard) return standard;
  }

  return {
    width: pixelsToPoints(widthPx, FALLBACK_DPI),
    height: pixelsToPoints(heightPx, FALLBACK_DPI),
  };
}
