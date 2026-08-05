import type { Template } from '../entities/template';
import type { TemplatePage } from '../entities/template-page';

export type PaperSizeKind = 'A4' | 'A5';
export type PaperOrientation = 'portrait' | 'landscape';

export interface PaperSize {
  kind: PaperSizeKind;
  orientation: PaperOrientation;
}

const PAPER_SIZES_PT = {
  A4: { width: 595.28, height: 841.89 },
  A5: { width: 419.53, height: 595.28 },
} as const;

const ISO_A_SERIES_RATIO = PAPER_SIZES_PT.A4.width / PAPER_SIZES_PT.A4.height;

export const COMMON_PAPER_DPIS = [300, 150, 144, 96, 72] as const;

const MIN_DPI = 72;
const MAX_DPI = 600;
const TOLERANCE_PT = 2;
const FUZZY_DPI_AGREEMENT_TOLERANCE = 0.07;
const FUZZY_ASPECT_RATIO_TOLERANCE = 0.07;
const FUZZY_DIMENSION_TOLERANCE = 0.08;

function isClose(a: number, b: number): boolean {
  return Math.abs(a - b) <= TOLERANCE_PT;
}

function matchesPaperSize(
  widthPt: number,
  heightPt: number,
  paper: { width: number; height: number },
): boolean {
  return (
    (isClose(widthPt, paper.width) && isClose(heightPt, paper.height)) ||
    (isClose(widthPt, paper.height) && isClose(heightPt, paper.width))
  );
}

function detectPaperSizeAtDpi(widthPx: number, heightPx: number, dpi: number): PaperSize | null {
  const widthPt = (widthPx * 72) / dpi;
  const heightPt = (heightPx * 72) / dpi;

  for (const [kind, paper] of Object.entries(PAPER_SIZES_PT) as [PaperSizeKind, (typeof PAPER_SIZES_PT)[PaperSizeKind]][]) {
    if (!matchesPaperSize(widthPt, heightPt, paper)) continue;

    return {
      kind,
      orientation: widthPt >= heightPt ? 'landscape' : 'portrait',
    };
  }

  return null;
}

function hasIsoAspectRatio(widthPx: number, heightPx: number): boolean {
  const ratio = Math.min(widthPx, heightPx) / Math.max(widthPx, heightPx);
  return Math.abs(ratio - ISO_A_SERIES_RATIO) / ISO_A_SERIES_RATIO <= FUZZY_ASPECT_RATIO_TOLERANCE;
}

const FUZZY_MIN_LONG_EDGE_PX = 1500;

function detectPaperSizeFuzzy(widthPx: number, heightPx: number): PaperSize | null {
  const longPx = Math.max(widthPx, heightPx);
  if (longPx < FUZZY_MIN_LONG_EDGE_PX) return null;
  if (!hasIsoAspectRatio(widthPx, heightPx)) return null;

  const landscape = widthPx >= heightPx;
  const shortPx = Math.min(widthPx, heightPx);

  let bestMatch: { size: PaperSize; score: number } | null = null;

  for (const kind of Object.keys(PAPER_SIZES_PT) as PaperSizeKind[]) {
    const paper = PAPER_SIZES_PT[kind];
    const shortPt = Math.min(paper.width, paper.height);
    const longPt = Math.max(paper.width, paper.height);

    const dpiFromShort = (shortPx * 72) / shortPt;
    const dpiFromLong = (longPx * 72) / longPt;

    if (
      dpiFromShort < MIN_DPI ||
      dpiFromShort > MAX_DPI ||
      dpiFromLong < MIN_DPI ||
      dpiFromLong > MAX_DPI
    ) {
      continue;
    }

    const averageDpi = (dpiFromShort + dpiFromLong) / 2;
    const dpiDiff = Math.abs(dpiFromShort - dpiFromLong) / averageDpi;
    if (dpiDiff > FUZZY_DPI_AGREEMENT_TOLERANCE) continue;

    const expectedShortPx = (shortPt * averageDpi) / 72;
    const expectedLongPx = (longPt * averageDpi) / 72;
    const shortError = Math.abs(shortPx - expectedShortPx) / expectedShortPx;
    const longError = Math.abs(longPx - expectedLongPx) / expectedLongPx;

    if (shortError > FUZZY_DIMENSION_TOLERANCE || longError > FUZZY_DIMENSION_TOLERANCE) {
      continue;
    }

    const candidate: PaperSize = {
      kind,
      orientation: landscape ? 'landscape' : 'portrait',
    };

    const score = dpiDiff + shortError + longError;
    if (!bestMatch || score < bestMatch.score) {
      bestMatch = { size: candidate, score };
    }
  }

  return bestMatch?.size ?? null;
}

export function detectPaperSizeExact(widthPx: number, heightPx: number): PaperSize | null {
  for (const dpi of COMMON_PAPER_DPIS) {
    const detected = detectPaperSizeAtDpi(widthPx, heightPx, dpi);
    if (detected) return detected;
  }

  return null;
}

export function detectPaperSize(widthPx: number, heightPx: number): PaperSize | null {
  return detectPaperSizeExact(widthPx, heightPx) ?? detectPaperSizeFuzzy(widthPx, heightPx);
}

export function paperSizeToPoints(size: PaperSize): { width: number; height: number } {
  const paper = PAPER_SIZES_PT[size.kind];

  return size.orientation === 'landscape'
    ? { width: Math.max(paper.width, paper.height), height: Math.min(paper.width, paper.height) }
    : { width: Math.min(paper.width, paper.height), height: Math.max(paper.width, paper.height) };
}

export function formatPaperSizeLabel(size: PaperSize): string {
  return size.orientation === 'landscape' ? `${size.kind} horizontal` : size.kind;
}

export function resolvePageSizeLabel(widthPx: number, heightPx: number): string {
  const paperSize = detectPaperSize(widthPx, heightPx);
  if (paperSize) return formatPaperSizeLabel(paperSize);

  return `${widthPx} × ${heightPx}`;
}

function pickRepresentativePage(pages: TemplatePage[]): TemplatePage | null {
  if (!pages.length) return null;

  const dimensionGroups = new Map<string, { count: number; page: TemplatePage }>();

  for (const page of pages) {
    if (!page.width || !page.height) continue;

    const key = `${page.width}x${page.height}`;
    const existing = dimensionGroups.get(key);

    if (existing) {
      existing.count += 1;
      continue;
    }

    dimensionGroups.set(key, { count: 1, page });
  }

  if (!dimensionGroups.size) return null;

  let bestPage: TemplatePage | null = null;
  let bestCount = 0;
  let bestArea = 0;

  for (const { count, page } of dimensionGroups.values()) {
    const area = page.width * page.height;
    const isBetter =
      count > bestCount || (count === bestCount && area > bestArea);

    if (isBetter) {
      bestPage = page;
      bestCount = count;
      bestArea = area;
    }
  }

  return bestPage;
}

export function getTemplatePaperSizeLabel(template: Template): string | null {
  const page = pickRepresentativePage(template.images);
  if (!page?.width || !page?.height) return null;

  return resolvePageSizeLabel(page.width, page.height);
}
