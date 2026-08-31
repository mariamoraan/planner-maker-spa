import { useTemplateStore } from "@/features/template/ui/stores/template-store";
import { useHistoryStore } from "@/features/editor/ui/stores/history-store";
import { TemplateType } from "@/features/template";
import { useCallback } from "react";
import { useTemplateId } from "./use-template-id";
import { getInsertIndexForType } from "@/features/template/domain/services/template-image-order";
import {
  applyPageImageData,
  resolvePageImageRef,
  persistPageImageAsset,
  syncPageImageRefIfCloud,
} from "@/features/editor/domain/services/page-image-asset";

const toImageMeta = (image: {
  id: string;
  name: string;
  type: TemplateType;
  width: number;
  height: number;
  rectangles: import("@/features/template").Rectangle[];
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
        updateImage,
        syncUid,
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

    const replaceImage = useCallback(async (pageId: string, imageData: string) => {
        if (!templateId) return;

        const template = getTemplate(templateId);
        const page = template?.images.find(p => p.id === pageId);
        if (!page) return;

        const beforeImageData = (await getImageData(pageId)) ?? page.src ?? '';
        if (beforeImageData === imageData) return;

        const imageRef = resolvePageImageRef(syncUid, pageId, page.imageRef);
        const resolvedSrc = await persistPageImageAsset(imageRef, imageData);

        pushHistory(templateId, {
          type: 'replacePageImage',
          imageId: pageId,
          beforeImageData,
          afterImageData: imageData,
        });

        updateImage(templateId, pageId, {
          src: resolvedSrc,
          imageRef,
          missingLocalAsset: false,
        });

        await syncPageImageRefIfCloud(syncUid, templateId, pageId, imageRef);
    }, [templateId, getImageData, getTemplate, pushHistory, syncUid, updateImage]);

    return {
        addImage,
        deleteImage,
        uploadImageToEmptyCanvas,
        reorderImages,
        replaceImage,
    }
}
