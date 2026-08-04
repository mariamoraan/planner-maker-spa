import { useTemplateStore } from '@/features/template/ui/stores/template-store';
import { useEditorStore } from '@/features/editor/ui/stores/editor-store';
import { useHistoryStore } from '@/features/editor/ui/stores/history-store';
import { FieldType, Rectangle } from '@/features/template';
import { getDefaultFormatVariant } from '@/features/editor/domain/services/field-style-config';
import { useCallback } from 'react';
import { useTemplateId } from './use-template-id';

export const useManageAreas = () => {
    const templateId = useTemplateId();
    const currentImageId = useEditorStore(state => state.currentImageId);
    const {
      addRectangle,
      updateRectangle,
      deleteRectangle,
      getCurrentImage,
      updateRectangles,
    } = useTemplateStore();

    const selectedRectangleIds = useEditorStore(state => state.selectedRectangleIds)
    const setSelectedRectangleIds = useEditorStore(state => state.setSelectedRectangleIds)
    const pushHistory = useHistoryStore(state => state.push)
      
    const addArea = useCallback((rect: Omit<Rectangle, 'id'>, options?: { select?: boolean }) => {
        if (templateId && currentImageId) {
          const id = addRectangle(templateId, currentImageId, rect);
          pushHistory(templateId, {
            type: 'addRectangle',
            imageId: currentImageId,
            rectangle: { ...rect, id },
          });
          if (options?.select !== false) {
            setSelectedRectangleIds([id]);
          }
          return id;
        }
        return null;
    }, [templateId, currentImageId, addRectangle, setSelectedRectangleIds, pushHistory]);

    const addAreas = useCallback((rects: Omit<Rectangle, 'id'>[]) => {
        const ids: string[] = [];
        if (!templateId || !currentImageId || rects.length === 0) return ids;

        const currentImage = getCurrentImage(templateId);
        const baseIndex = currentImage?.rectangles.length ?? 0;
        const created: Rectangle[] = [];

        for (let i = 0; i < rects.length; i++) {
          const rect = rects[i];
          const id = addRectangle(templateId, currentImageId, rect);
          created.push({ ...rect, id });
          ids.push(id);
        }

        if (created.length === 1) {
          pushHistory(templateId, {
            type: 'addRectangle',
            imageId: currentImageId,
            rectangle: created[0],
          });
        } else {
          pushHistory(templateId, {
            type: 'addRectangles',
            imageId: currentImageId,
            rectangles: created,
            indices: created.map((_, i) => baseIndex + i),
          });
        }

        setSelectedRectangleIds(ids);
        return ids;
    }, [templateId, currentImageId, addRectangle, setSelectedRectangleIds, getCurrentImage, pushHistory]);

    const updateArea = useCallback((id: string, updates: Partial<Rectangle>) => {
        if (templateId && currentImageId) {
          const currentImage = getCurrentImage(templateId);
          const rectangle = currentImage?.rectangles.find(r => r.id === id);
          if (!rectangle) return;

          const before: Partial<Rectangle> = {};
          (Object.keys(updates) as (keyof Rectangle)[]).forEach(key => {
            before[key] = rectangle[key] as never;
          });

          pushHistory(templateId, {
            type: 'updateRectangle',
            imageId: currentImageId,
            rectangleId: id,
            before,
            after: updates,
          });
          updateRectangle(templateId, currentImageId, id, updates);
        }
    }, [templateId, currentImageId, updateRectangle, getCurrentImage, pushHistory]);

    const deleteAreas = useCallback((ids: string[]) => {
        if (!templateId || !currentImageId || ids.length === 0) return;

        const currentImage = getCurrentImage(templateId);
        if (!currentImage) return;

        const toDelete = ids
          .map(id => {
            const index = currentImage.rectangles.findIndex(r => r.id === id);
            const rectangle = currentImage.rectangles[index];
            return index >= 0 && rectangle ? { rectangle: { ...rectangle }, index } : null;
          })
          .filter((entry): entry is { rectangle: Rectangle; index: number } => entry !== null);

        if (toDelete.length === 0) return;

        if (toDelete.length === 1) {
          pushHistory(templateId, {
            type: 'deleteRectangle',
            imageId: currentImageId,
            rectangle: toDelete[0].rectangle,
            index: toDelete[0].index,
          });
        } else {
          pushHistory(templateId, {
            type: 'deleteRectangles',
            imageId: currentImageId,
            rectangles: toDelete.map(d => d.rectangle),
            indices: toDelete.map(d => d.index),
          });
        }

        for (const id of [...ids].sort((a, b) => {
          const indexA = toDelete.find(d => d.rectangle.id === a)?.index ?? 0;
          const indexB = toDelete.find(d => d.rectangle.id === b)?.index ?? 0;
          return indexB - indexA;
        })) {
          deleteRectangle(templateId, currentImageId, id);
        }

        setSelectedRectangleIds(
          selectedRectangleIds.filter(selectedId => !ids.includes(selectedId)),
        );
    }, [templateId, currentImageId, deleteRectangle, selectedRectangleIds, setSelectedRectangleIds, getCurrentImage, pushHistory]);

    const deleteArea = useCallback((id: string) => {
        deleteAreas([id]);
    }, [deleteAreas]);

    const moveAreas = useCallback((moves: { id: string; x: number; y: number }[]) => {
        if (!templateId || !currentImageId || moves.length === 0) return;

        const currentImage = getCurrentImage(templateId);
        if (!currentImage) return;

        const moveEntries = moves
          .map(move => {
            const rectangle = currentImage.rectangles.find(r => r.id === move.id);
            if (!rectangle) return null;
            return {
              id: move.id,
              before: { x: rectangle.x, y: rectangle.y },
              after: { x: move.x, y: move.y },
            };
          })
          .filter((entry): entry is { id: string; before: { x: number; y: number }; after: { x: number; y: number } } => entry !== null);

        if (moveEntries.length === 0) return;

        const hasMovement = moveEntries.some(
          entry => entry.before.x !== entry.after.x || entry.before.y !== entry.after.y,
        );
        if (!hasMovement) return;

        if (moveEntries.length === 1) {
          const entry = moveEntries[0];
          pushHistory(templateId, {
            type: 'updateRectangle',
            imageId: currentImageId,
            rectangleId: entry.id,
            before: entry.before,
            after: entry.after,
          });
          updateRectangle(templateId, currentImageId, entry.id, entry.after);
        } else {
          pushHistory(templateId, {
            type: 'moveRectangles',
            imageId: currentImageId,
            moves: moveEntries,
          });
          updateRectangles(
            templateId,
            currentImageId,
            moveEntries.map(move => ({
              rectangleId: move.id,
              changes: move.after,
            })),
          );
        }
      }, [templateId, currentImageId, updateRectangle, updateRectangles, getCurrentImage, pushHistory]);
      
    const updateAreaType = useCallback((id: string, type: FieldType) => {
        if (templateId && currentImageId) {
            const currentImage = getCurrentImage(templateId);
            const rectangle = currentImage?.rectangles.find(r => r.id === id);
            if (!rectangle) return;

            const updates = {
              fieldType: type,
              formatVariant: getDefaultFormatVariant(type),
            };

            pushHistory(templateId, {
              type: 'updateRectangle',
              imageId: currentImageId,
              rectangleId: id,
              before: {
                fieldType: rectangle.fieldType,
                formatVariant: rectangle.formatVariant,
              },
              after: updates,
            });
            updateRectangle(templateId, currentImageId, id, updates);
        }
    }, [templateId, currentImageId, updateRectangle, getCurrentImage, pushHistory]);


    return {
      addArea,
      addAreas,
      updateArea,
      deleteArea,
      deleteAreas,
      moveAreas,
      updateAreaType,
    }
 
}
