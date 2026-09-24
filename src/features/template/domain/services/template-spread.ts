import type { TemplateImage } from '@/features/template/domain/entities/template-page';
import type { TemplateType } from '@/features/template/domain/value-objects/planner-locale';
import type { SpreadFace } from '@/features/template/domain/entities/template-page';

export const SPREAD_ELIGIBLE_TYPES: readonly TemplateType[] = [
  'yearly-calendar',
  'month-cover',
  'monthly-calendar',
  'weekly-calendar',
  'daily-page',
  'extra',
] as const;

export type PageUnit =
  | { kind: 'single'; page: TemplateImage }
  | { kind: 'spread'; spreadId: string; left: TemplateImage; right: TemplateImage };

export function isSpreadEligibleType(type: TemplateType): boolean {
  return (SPREAD_ELIGIBLE_TYPES as readonly string[]).includes(type);
}

export function isSpreadFace(page: TemplateImage): boolean {
  return Boolean(page.spreadId && page.spreadFace);
}

export function getUnitId(unit: PageUnit): string {
  return unit.kind === 'spread' ? unit.spreadId : unit.page.id;
}

export function getUnitType(unit: PageUnit): TemplateType {
  return unit.kind === 'spread' ? unit.left.type : unit.page.type;
}

export function getUnitPrimaryPage(unit: PageUnit): TemplateImage {
  return unit.kind === 'spread' ? unit.left : unit.page;
}

export function flattenUnits(units: PageUnit[]): TemplateImage[] {
  const result: TemplateImage[] = [];
  for (const unit of units) {
    if (unit.kind === 'single') {
      result.push(unit.page);
    } else {
      result.push(unit.left, unit.right);
    }
  }
  return result;
}

export function getSpreadMate(
  page: TemplateImage,
  images: TemplateImage[]
): TemplateImage | null {
  if (!page.spreadId || !page.spreadFace) return null;
  return (
    images.find(img => img.spreadId === page.spreadId && img.id !== page.id) ?? null
  );
}

export function resolveSpreadFaces(
  a: TemplateImage,
  b: TemplateImage
): { left: TemplateImage; right: TemplateImage } | null {
  if (!a.spreadId || a.spreadId !== b.spreadId) return null;
  if (a.spreadFace === 'left' && b.spreadFace === 'right') return { left: a, right: b };
  if (a.spreadFace === 'right' && b.spreadFace === 'left') return { left: b, right: a };
  return null;
}

/**
 * Group pages into single-page units or contiguous spreads.
 * Walks `images` in order; paired faces are emitted once (L then R).
 */
export function groupImagesAsUnits(images: TemplateImage[]): PageUnit[] {
  const units: PageUnit[] = [];
  const consumed = new Set<string>();

  for (const image of images) {
    if (consumed.has(image.id)) continue;

    if (image.spreadId && image.spreadFace) {
      const mate = images.find(
        img => img.spreadId === image.spreadId && img.id !== image.id
      );
      if (mate?.spreadFace) {
        const faces = resolveSpreadFaces(image, mate);
        if (faces) {
          units.push({
            kind: 'spread',
            spreadId: image.spreadId,
            left: faces.left,
            right: faces.right,
          });
          consumed.add(faces.left.id);
          consumed.add(faces.right.id);
          continue;
        }
      }
    }

    units.push({ kind: 'single', page: image });
    consumed.add(image.id);
  }

  return units;
}

export function groupImagesOfTypeAsUnits(
  images: TemplateImage[],
  type: TemplateType
): PageUnit[] {
  return groupImagesAsUnits(images.filter(img => img.type === type));
}

export function findUnitByPageId(
  images: TemplateImage[],
  pageId: string
): PageUnit | null {
  return (
    groupImagesAsUnits(images).find(unit => {
      if (unit.kind === 'single') return unit.page.id === pageId;
      return unit.left.id === pageId || unit.right.id === pageId;
    }) ?? null
  );
}

export function findUnitByUnitId(
  images: TemplateImage[],
  unitId: string
): PageUnit | null {
  return groupImagesAsUnits(images).find(unit => getUnitId(unit) === unitId) ?? null;
}

/** Clear spread metadata from a page (single-page again). */
export function clearSpreadFields<T extends TemplateImage>(page: T): T {
  const next = { ...page };
  delete next.spreadId;
  delete next.spreadFace;
  return next;
}

export function withSpreadFields<T extends TemplateImage>(
  page: T,
  spreadId: string,
  spreadFace: SpreadFace
): T {
  return { ...page, spreadId, spreadFace };
}

/**
 * Rebuild page order so each spread's left face immediately precedes its right,
 * preserving unit order within the list.
 */
export function ensureSpreadPairsAdjacent(images: TemplateImage[]): TemplateImage[] {
  return flattenUnits(groupImagesAsUnits(images));
}
