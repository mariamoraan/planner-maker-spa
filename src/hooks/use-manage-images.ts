import { useTemplateStore } from "@/stores/template-store";
import { useHistoryStore } from "@/stores/history-store";
import { TemplateType } from "@/types/planner";
import { useCallback } from "react";
import { useTemplateId } from "./use-template-id";
import { getInsertIndexForType } from "@/lib/template-image-order";

const toImageMeta = (image: {
  id: string;
  name: string;
  type: TemplateType;
  width: number;
  height: number;
  rectangles: import("@/types/planner").Rectangle[];
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: image.id,
  name: image.name,
  type: image.type,
  width: image.width,
  height: image.height,
  rectangles: image.rectangles.map(r => ({ ...r })),
  createdAt: image.createdAt,
  updatedAt: image.updatedAt,
});

export const useManageImages = () => {
    const templateId = useTemplateId();
    const {
        addImage: addImageToStore,
        deleteImage: deleteImageStore,
        getImageData,
        getTemplate,
        reorderImages: reorderImagesStore,
    } = useTemplateStore();
    const pushHistory = useHistoryStore(state => state.push);

    const deleteImage = useCallback(async (id: string) => {
        if (!templateId) return;

        const template = getTemplate(templateId);
        const index = template?.images.findIndex(img => img.id === id) ?? -1;
        const image = template?.images[index];
        if (!image || index < 0) return;

        const imageData = (await getImageData(id)) ?? image.src ?? '';

        pushHistory(templateId, {
          type: 'deleteImage',
          image: toImageMeta(image),
          imageData,
          index,
        });

        await deleteImageStore(templateId, id);
    }, [templateId, deleteImageStore, getImageData, getTemplate, pushHistory]);

    const addImage = useCallback(async (
        imageData: string,
        width: number,
        height: number,
        name: string,
        type: TemplateType
      ) => {
        if (!templateId) return;

        const template = getTemplate(templateId);
        const index = getInsertIndexForType(template?.images ?? [], type);
        const id = await addImageToStore({ templateId, imageData, width, height, name, type });

        const updated = getTemplate(templateId);
        const image = updated?.images.find(img => img.id === id);
        if (!image) return;

        pushHistory(templateId, {
          type: 'addImage',
          image: toImageMeta(image),
          imageData,
          index,
        });
      }, [templateId, addImageToStore, getTemplate, pushHistory]);

    const uploadImageToEmptyCanvas = useCallback(async (
    imageData: string,
    width: number,
    height: number,
    name: string
    ) => {
    if (!templateId) return;

    const template = getTemplate(templateId);
    const index = template?.images.length ?? 0;
    const id = await addImageToStore({ 
      templateId,
      imageData, 
      width, 
      height, 
      name, 
      type: 'monthly-calendar' 
    });

    const updated = getTemplate(templateId);
    const image = updated?.images.find(img => img.id === id);
    if (!image) return;

    pushHistory(templateId, {
      type: 'addImage',
      image: toImageMeta(image),
      imageData,
      index,
    });
    }, [templateId, addImageToStore, getTemplate, pushHistory]);

    const reorderImages = useCallback((activeId: string, overId: string) => {
        if (!templateId) return;

        const template = getTemplate(templateId);
        if (!template) return;

        const fromIndex = template.images.findIndex(img => img.id === activeId);
        const toIndex = template.images.findIndex(img => img.id === overId);
        if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

        const didReorder = reorderImagesStore(templateId, activeId, overId);
        if (!didReorder) return;

        pushHistory(templateId, {
          type: 'reorderImages',
          activeId,
          overId,
          fromIndex,
          toIndex,
        });
    }, [templateId, getTemplate, reorderImagesStore, pushHistory]);

    return {
        addImage,
        deleteImage,
        uploadImageToEmptyCanvas,
        reorderImages,
    }
}
