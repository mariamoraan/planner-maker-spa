import { useTemplateStore } from '@/stores/template-store';
import { useHistoryStore } from '@/stores/history-store';
import { FieldType, Rectangle } from '@/types/planner';
import { getDefaultFormatVariant } from '@/lib/field-style-config';
import { useCallback } from 'react';
import { useTemplateId } from './use-template-id';

export const useManageAreas = () => {
    const templateId = useTemplateId();
    const {
      currentImageId,
      addRectangle,
      updateRectangle,
      deleteRectangle,
      getCurrentImage,
    } = useTemplateStore();

    const selectedRectangleId = useTemplateStore(state => state.selectedRectangleId)
    const setSelectedRectangleId = useTemplateStore(state => state.setSelectedRectangleId)
    const pushHistory = useHistoryStore(state => state.push)
      
    const addArea = useCallback((rect: Omit<Rectangle, 'id'>) => {
        if (templateId && currentImageId) {
          const id = addRectangle(templateId, currentImageId, rect);
          pushHistory(templateId, {
            type: 'addRectangle',
            imageId: currentImageId,
            rectangle: { ...rect, id },
          });
          setSelectedRectangleId(id);
        }
    }, [templateId, currentImageId, addRectangle, setSelectedRectangleId, pushHistory]);


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

    const deleteArea = useCallback((id: string) => {
        if (templateId && currentImageId) {
          const currentImage = getCurrentImage(templateId);
          const index = currentImage?.rectangles.findIndex(r => r.id === id) ?? -1;
          const rectangle = currentImage?.rectangles[index];
          if (!rectangle || index < 0) return;

          pushHistory(templateId, {
            type: 'deleteRectangle',
            imageId: currentImageId,
            rectangle: { ...rectangle },
            index,
          });

          deleteRectangle(templateId, currentImageId, id);

          if (selectedRectangleId === id) {
            setSelectedRectangleId(null);
          }
        }
    }, [templateId, currentImageId, deleteRectangle, selectedRectangleId, setSelectedRectangleId, getCurrentImage, pushHistory]);
      
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
      updateArea,
      deleteArea,
      updateAreaType,
    }
 
}
