import type { TemplateImage, TemplateType } from '@/types/planner';

export const TEMPLATE_TYPE_ORDER: TemplateType[] = [
  'cover',
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
  return [...images].sort((a, b) => getTypeOrder(a.type) - getTypeOrder(b.type));
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
