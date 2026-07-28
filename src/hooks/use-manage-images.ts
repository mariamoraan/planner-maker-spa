import { useTemplateStore } from "@/stores/template-store";
import { TemplateType } from "@/types/planner";
import { useCallback } from "react";
import { useTemplateId } from "./use-template-id";

export const useManageImages = () => {
    const templateId = useTemplateId();
    const {
        addImage: addImageToStore,
        deleteImage: deleteImageStore,
      } = useTemplateStore();

    const deleteImage = useCallback((id: string) => {
        if (templateId) {
            deleteImageStore(templateId, id);
        }
    }, [templateId, deleteImageStore]);

    const addImage = useCallback((
        imageData: string,
        width: number,
        height: number,
        name: string,
        type: TemplateType
      ) => {
        if (templateId) {
            addImageToStore({ templateId, imageData, width, height, name, type });
        }
      }, [templateId, addImageToStore]);

    const uploadImageToEmptyCanvas = useCallback((
    imageData: string,
    width: number,
    height: number,
    name: string
    ) => {
    if (templateId) {
        addImageToStore({ 
        templateId,
        imageData, 
        width, 
        height, 
        name, 
        type: 'monthly-calendar' 
        });
    }
    }, [templateId, addImageToStore]);

    return {
        addImage,
        deleteImage,
        uploadImageToEmptyCanvas
    }
}
