import { useTemplateStore } from '@/features/template/ui/stores/template-store';
import type { TemplateType, TemplatePage, Rectangle } from '@/features/template';

export const addImage = (data: Parameters<ReturnType<typeof useTemplateStore.getState>['addImage']>[0]) =>
  useTemplateStore.getState().addImage(data);

export const updateImage = (
  templateId: string,
  imageId: string,
  updates: Partial<TemplatePage>
) => useTemplateStore.getState().updateImage(templateId, imageId, updates);

export const deleteImage = (templateId: string, imageId: string) =>
  useTemplateStore.getState().deleteImage(templateId, imageId);

export const insertImage = (
  templateId: string,
  image: TemplatePage,
  imageData: string,
  index: number
) => useTemplateStore.getState().insertImage(templateId, image, imageData, index);

export const setCurrentImage = (id: string | null) =>
  useTemplateStore.getState().setCurrentImage(id);

export const reorderImages = (templateId: string, activeId: string, overId: string) =>
  useTemplateStore.getState().reorderImages(templateId, activeId, overId);

export const normalizeImageOrder = (templateId: string) =>
  useTemplateStore.getState().normalizeImageOrder(templateId);

export const getImageData = (imageId: string) =>
  useTemplateStore.getState().getImageData(imageId);

export const loadTemplateImages = (id: string) =>
  useTemplateStore.getState().loadTemplateImages(id);

export type AddImageInput = {
  templateId: string;
  imageData: string;
  type: TemplateType;
  width: number;
  height: number;
  name?: string;
};

export type { Rectangle };
