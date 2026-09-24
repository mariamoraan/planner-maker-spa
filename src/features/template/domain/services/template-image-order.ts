import type { TemplateImage } from '@/features/template/domain/entities/template-page';
import type { TemplateType } from '@/features/template/domain/value-objects/planner-locale';
import {
  flattenUnits,
  getUnitId,
  getUnitType,
  groupImagesAsUnits,
} from '@/features/template/domain/services/template-spread';

export const TEMPLATE_TYPE_ORDER: TemplateType[] = [
  'cover',
  'yearly-calendar',
  'month-cover',
  'monthly-calendar',
  'weekly-calendar',
  'daily-page',
  'extra',
];

export const getTypeOrder = (type: TemplateType): number => {
  const index = TEMPLATE_TYPE_ORDER.indexOf(type);
  return index === -1 ? TEMPLATE_TYPE_ORDER.length : index;
};

export const groupImagesByType = (
  images: TemplateImage[]
): Partial<Record<TemplateType, TemplateImage[]>> => {
  const groups: Partial<Record<TemplateType, TemplateImage[]>> = {};

  for (const image of images) {
    if (!groups[image.type]) {
      groups[image.type] = [];
    }
    groups[image.type]!.push(image);
  }

  return groups;
};

export const normalizeImageOrder = (images: TemplateImage[]): TemplateImage[] => {
  const byType = [...images].sort((a, b) => getTypeOrder(a.type) - getTypeOrder(b.type));
  const result: TemplateImage[] = [];

  for (const type of TEMPLATE_TYPE_ORDER) {
    const ofType = byType.filter(img => img.type === type);
    if (ofType.length === 0) continue;
    result.push(...flattenUnits(groupImagesAsUnits(ofType)));
  }

  const known = new Set<TemplateType>(TEMPLATE_TYPE_ORDER);
  const unknown = byType.filter(img => !known.has(img.type));
  if (unknown.length > 0) {
    result.push(...flattenUnits(groupImagesAsUnits(unknown)));
  }

  return result;
};

export const imagesOrderChanged = (
  current: TemplateImage[],
  normalized: TemplateImage[]
): boolean => {
  if (current.length !== normalized.length) return true;
  return current.some((img, index) => img.id !== normalized[index]?.id);
};

export const getInsertIndexForType = (
  images: TemplateImage[],
  type: TemplateType
): number => {
  const typeOrder = getTypeOrder(type);
  let insertIndex = images.length;

  for (let i = 0; i < images.length; i++) {
    if (getTypeOrder(images[i].type) > typeOrder) {
      insertIndex = i;
      break;
    }
  }

  return insertIndex;
};

export const reorderWithinType = (
  images: TemplateImage[],
  activeId: string,
  overId: string
): TemplateImage[] | null => {
  const activeIndex = images.findIndex(img => img.id === activeId);
  const overIndex = images.findIndex(img => img.id === overId);

  if (activeIndex === -1 || overIndex === -1) return null;
  if (activeIndex === overIndex) return null;
  if (images[activeIndex].type !== images[overIndex].type) return null;

  const reordered = [...images];
  const [moved] = reordered.splice(activeIndex, 1);
  reordered.splice(overIndex, 0, moved);

  return reordered;
};

/**
 * Reorder page units (single pages or whole spreads) within the same type.
 * `activeUnitId` / `overUnitId` are spreadIds or page ids from `getUnitId`.
 */
export const reorderUnitsWithinType = (
  images: TemplateImage[],
  activeUnitId: string,
  overUnitId: string
): TemplateImage[] | null => {
  if (activeUnitId === overUnitId) return null;

  const allUnits = groupImagesAsUnits(images);
  const activeUnit = allUnits.find(unit => getUnitId(unit) === activeUnitId);
  const overUnit = allUnits.find(unit => getUnitId(unit) === overUnitId);
  if (!activeUnit || !overUnit) return null;

  const type = getUnitType(activeUnit);
  if (getUnitType(overUnit) !== type) return null;

  const typeUnits = allUnits.filter(unit => getUnitType(unit) === type);
  const activeIndex = typeUnits.findIndex(unit => getUnitId(unit) === activeUnitId);
  const overIndex = typeUnits.findIndex(unit => getUnitId(unit) === overUnitId);
  if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) return null;

  const reorderedTypeUnits = [...typeUnits];
  const [moved] = reorderedTypeUnits.splice(activeIndex, 1);
  reorderedTypeUnits.splice(overIndex, 0, moved);

  const result: TemplateImage[] = [];
  let typeEmitted = false;
  for (const unit of allUnits) {
    if (getUnitType(unit) === type) {
      if (!typeEmitted) {
        result.push(...flattenUnits(reorderedTypeUnits));
        typeEmitted = true;
      }
    } else {
      result.push(...flattenUnits([unit]));
    }
  }

  return result;
};
