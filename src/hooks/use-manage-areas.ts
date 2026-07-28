import { useTemplateStore } from '@/stores/template-store';
import { FieldType } from '@/types/planner';
import { useCallback } from 'react';
import { useTemplateId } from './use-template-id';

export const useManageAreas = () => {
    const templateId = useTemplateId();
    const {
    currentImageId,
    addRectangle,
    updateRectangle,
    deleteRectangle,
    } = useTemplateStore();

    const selectedRectangleId = useTemplateStore(state => state.selectedRectangleId)
    const setSelectedRectangleId = useTemplateStore(state => state.setSelectedRectangleId)
      
    const addArea = useCallback((rect: Omit<import('@/types/planner').Rectangle, 'id'>) => {
        if (templateId && currentImageId) {
          const id = addRectangle(templateId, currentImageId, rect);
          setSelectedRectangleId(id);
        }
    }, [templateId, currentImageId, addRectangle, setSelectedRectangleId]);


    const updateArea = useCallback((id: string, updates: Partial<import('@/types/planner').Rectangle>) => {
        if (templateId && currentImageId) {
          updateRectangle(templateId, currentImageId, id, updates);
        }
    }, [templateId, currentImageId, updateRectangle]);

    const deleteArea = useCallback((id: string) => {
        if (templateId && currentImageId) {
          deleteRectangle(templateId, currentImageId, id);
          if (selectedRectangleId === id) {
            setSelectedRectangleId(null);
          }
        }
    }, [templateId, currentImageId, deleteRectangle, selectedRectangleId, setSelectedRectangleId]);
      
    const updateAreaType = useCallback((id: string, type: FieldType) => {
        if (templateId && currentImageId) {
            updateRectangle(templateId, currentImageId, id, { fieldType: type });
        }
    }, [templateId, currentImageId, updateRectangle]);


    return {
      addArea,
      updateArea,
      deleteArea,
      updateAreaType,
    }
 
}
