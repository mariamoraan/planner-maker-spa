import type { TemplateImage, TemplateType } from '@/features/template';
import type { PageUnit } from '@/features/template/domain/services/template-spread';
import {
  groupImagesOfTypeAsUnits,
} from '@/features/template/domain/services/template-spread';
import type { PaperSize } from '@/features/template/domain/services/paper-size';
import { paperSizeToPixels } from '@/features/template/domain/services/paper-size';
import type { GeneratedPage } from '@/features/export/domain/entities/generated-page';
import { canvasToPngBytes } from '@/features/export/domain/services/canvas-png';

/** Faces a content unit contributes to the PDF (before parity blanks). */
export function unitFaceCount(unit: PageUnit): number {
  return unit.kind === 'spread' ? 2 : 1;
}

/**
 * Advance a page counter for one content unit.
 * Spreads require the left face on an even pageNumber (1-based), so a blank
 * is inserted when the next page would otherwise be odd.
 */
export function advancePageCountWithParity(currentCount: number, faceCount: number): number {
  let count = currentCount;
  if (faceCount >= 2 && (count + 1) % 2 !== 0) {
    count += 1;
  }
  return count + faceCount;
}

export function sumPageCountWithParity(faceCounts: number[]): number {
  return faceCounts.reduce(
    (count, faces) => advancePageCountWithParity(count, faces),
    0
  );
}

export function unitsForType(images: TemplateImage[], type: TemplateType): PageUnit[] {
  return groupImagesOfTypeAsUnits(images, type);
}

export async function createBlankGeneratedPage(
  pagesLength: number,
  paperSize: PaperSize | undefined,
  fallbackSize: { width: number; height: number }
): Promise<GeneratedPage> {
  const size = paperSize ? paperSizeToPixels(paperSize) : fallbackSize;
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size.width, size.height);
  }

  return {
    imageData: await canvasToPngBytes(canvas),
    width: size.width,
    height: size.height,
    paperSize,
    pageNumber: pagesLength + 1,
    type: 'extra',
    isBlank: true,
  };
}
