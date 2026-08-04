import { useTemplateStore } from '@/features/template/ui/stores/template-store';
import type { Rectangle } from '@/features/template';

export const addRectangle = (
  templateId: string,
  imageId: string,
  rectangle: Omit<Rectangle, 'id'>
) => useTemplateStore.getState().addRectangle(templateId, imageId, rectangle);

export const insertRectangle = (
  templateId: string,
  imageId: string,
  rectangle: Rectangle,
  index: number
) => useTemplateStore.getState().insertRectangle(templateId, imageId, rectangle, index);

export const updateRectangle = (
  templateId: string,
  imageId: string,
  rectangleId: string,
  updates: Partial<Rectangle>
) => useTemplateStore.getState().updateRectangle(templateId, imageId, rectangleId, updates);

export const updateRectangles = (
  templateId: string,
  imageId: string,
  updates: { rectangleId: string; changes: Partial<Rectangle> }[]
) => useTemplateStore.getState().updateRectangles(templateId, imageId, updates);

export const deleteRectangle = (templateId: string, imageId: string, rectangleId: string) =>
  useTemplateStore.getState().deleteRectangle(templateId, imageId, rectangleId);
