import type { Template } from '../entities/template';

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

const COMMON_DPIS = [300, 150, 72] as const;
const TOLERANCE_PT = 2;

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

export function detectPaperSize(widthPx: number, heightPx: number): PaperSize | null {
  for (const dpi of COMMON_DPIS) {
    const detected = detectPaperSizeAtDpi(widthPx, heightPx, dpi);
    if (detected) return detected;
  }

  return null;
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

export function getTemplatePaperSizeLabel(template: Template): string | null {
  const page = template.images.find(image => image.type === 'cover') ?? template.images[0];
  if (!page?.width || !page?.height) return null;

  return resolvePageSizeLabel(page.width, page.height);
}
