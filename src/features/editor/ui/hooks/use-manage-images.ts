import { useTemplateStore } from "@/features/template/ui/stores/template-store";
import { useHistoryStore } from "@/features/editor/ui/stores/history-store";
import { TemplateType, getUnitId, findUnitByPageId } from "@/features/template";
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
  spreadId?: string;
  spreadFace?: 'left' | 'right';
  gridGroups?: import("@/features/template").TemplateImage['gridGroups'];
  bindingGroups?: import("@/features/template").TemplateImage['bindingGroups'];
  imageRef?: import("@/features/template").TemplateImage['imageRef'];
}) => ({
  id: image.id,
  name: image.name,
  type: image.type,
  width: image.width,
  height: image.height,
  rectangles: image.rectangles.map(r => ({ ...r })),
  createdAt: image.createdAt,
  updatedAt: image.updatedAt,
  ...(image.spreadId ? { spreadId: image.spreadId } : {}),
  ...(image.spreadFace ? { spreadFace: image.spreadFace } : {}),
  ...(image.gridGroups ? { gridGroups: image.gridGroups } : {}),
  ...(image.bindingGroups ? { bindingGroups: image.bindingGroups } : {}),
  ...(image.imageRef ? { imageRef: image.imageRef } : {}),
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
        const unit = template ? findUnitByPageId(template.images, id) : null;
        const pagesToDelete =
          unit?.kind === 'spread'
            ? [unit.right, unit.left]
            : template?.images.filter(img => img.id === id) ?? [];

        const snapshots: {
          image: (typeof pagesToDelete)[number];
          imageData: string;
          index: number;
        }[] = [];

        for (const image of pagesToDelete) {
          const index = template?.images.findIndex(img => img.id === image.id) ?? -1;
          if (index < 0) continue;
          const imageData =
            (typeof image.src === 'string' && image.src.length > 0
              ? image.src
              : await getImageData(image.id)) ?? '';
          snapshots.push({ image, imageData, index });
        }

        snapshots.sort((a, b) => b.index - a.index);

        for (const { image, imageData, index } of snapshots) {
          pushHistory(templateId, {
            type: 'deleteImage',
            image: toImageMeta(image),
            imageData,
            index,
          });

          try {
            await deleteImageStore(templateId, image.id);
          } catch (error) {
            useHistoryStore.setState(state => {
              const current = state.histories[templateId];
              if (!current?.past.length) return state;
              const last = current.past[current.past.length - 1];
              if (last?.type !== 'deleteImage' || last.image.id !== image.id) return state;
              return {
                histories: {
                  ...state.histories,
                  [templateId]: {
                    ...current,
                    past: current.past.slice(0, -1),
                  },
                },
              };
            });
            throw error;
          }
        }
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

    const reorderImages = useCallback((activeUnitId: string, overUnitId: string) => {
        if (!templateId) return;

        const template = getTemplate(templateId);
        if (!template) return;

        const fromIndex = template.images.findIndex(img => {
          const unit = findUnitByPageId(template.images, img.id);
          return unit ? getUnitId(unit) === activeUnitId : img.id === activeUnitId;
        });
        const toIndex = template.images.findIndex(img => {
          const unit = findUnitByPageId(template.images, img.id);
          return unit ? getUnitId(unit) === overUnitId : img.id === overUnitId;
        });
        if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

        const didReorder = reorderImagesStore(templateId, activeUnitId, overUnitId);
        if (!didReorder) return;

        pushHistory(templateId, {
          type: 'reorderImages',
          activeId: activeUnitId,
          overId: overUnitId,
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
        const resolvedSrc = await persistPageImageAsset(imageRef, imageData, {
          templateId,
        });

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
