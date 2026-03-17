import { useTemplateStore } from "@/stores/template-store";
import { TemplateType } from "@/types/planner";
import { useCallback } from "react";

export const useManageImages = () => {
    const {
        currentTemplateId,
        addImage: addImageToStore,
        deleteImage: deleteImageStore,
        createTemplate
      } = useTemplateStore();

    const deleteImage = useCallback((id: string) => {
        if (currentTemplateId) {
            deleteImageStore(currentTemplateId, id);
        }
    }, [currentTemplateId, deleteImageStore]);

    const addImage = useCallback((
        imageData: string,
        width: number,
        height: number,
        name: string,
        type: TemplateType
      ) => {
        if (currentTemplateId) {
            addImageToStore({ templateId: currentTemplateId, imageData, width, height, name, type });
        }
      }, [currentTemplateId, addImageToStore]);

    const uploadImageToEmptyCanvas = useCallback((
    imageData: string,
    width: number,
    height: number,
    name: string
    ) => {
    if (!currentTemplateId) {
        // Create template first
        const templateId = createTemplate('My Planner');
        addImageToStore({ 
        templateId,
        imageData, 
        width, 
        height, 
        name, 
        type: 'monthly-calendar' 
        });
    } else {
        addImageToStore({ 
        templateId: currentTemplateId,
        imageData, 
        width, 
        height, 
        name, 
        type: 'monthly-calendar' 
        });
    }
    }, [currentTemplateId, createTemplate, addImage]);

    return {
        addImage,
        deleteImage,
        uploadImageToEmptyCanvas
    }
}