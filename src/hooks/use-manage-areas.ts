import { useTemplateStore } from '@/stores/template-store';
import { FieldType } from '@/types/planner';
import { useCallback } from 'react';

export const useManageAreas = () => {
    const {
    currentTemplateId,
    currentImageId,
    addRectangle,
    updateRectangle,
    deleteRectangle,
    } = useTemplateStore();

    const selectedRectangleId = useTemplateStore(state => state.selectedRectangleId)
    const setSelectedRectangleId = useTemplateStore(state => state.setSelectedRectangleId)
      
    const addArea = useCallback((rect: Omit<import('@/types/planner').Rectangle, 'id'>) => {
        if (currentTemplateId && currentImageId) {
          const id = addRectangle(currentTemplateId, currentImageId, rect);
          setSelectedRectangleId(id);
        }
    }, [currentTemplateId, currentImageId, addRectangle]);


    const updateArea = useCallback((id: string, updates: Partial<import('@/types/planner').Rectangle>) => {
        if (currentTemplateId && currentImageId) {
          updateRectangle(currentTemplateId, currentImageId, id, updates);
        }
    }, [currentTemplateId, currentImageId, updateRectangle]);

    const deleteArea = useCallback((id: string) => {
        if (currentTemplateId && currentImageId) {
          deleteRectangle(currentTemplateId, currentImageId, id);
          if (selectedRectangleId === id) {
            setSelectedRectangleId(null);
          }
        }
    }, [currentTemplateId, currentImageId, deleteRectangle, selectedRectangleId]);
      
    const updateAreaType = useCallback((id: string, type: FieldType) => {
        if (currentTemplateId && currentImageId) {
            updateRectangle(currentTemplateId, currentImageId, id, { fieldType: type });
        }
    }, [currentTemplateId, currentImageId, updateRectangle]);


    return {
      addArea,
      updateArea,
      deleteArea,
      updateAreaType,
    }
 
}