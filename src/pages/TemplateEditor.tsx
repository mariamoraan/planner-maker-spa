import React, { useCallback, useEffect } from 'react';
import { EditorSidebar } from '@/components/sidebar/EditorSidebar';
import { TemplateCanvas } from '@/components/canvas/TemplateCanvas';
import { EmptyCanvasState } from '@/components/canvas/ImageUploader';
import { GeneratorDialog } from '@/components/generator/GeneratorDialog';
import { useTemplateStore } from '@/stores/template-store';
import type { FieldType, TemplateType } from '@/types/planner';
import { motion } from 'framer-motion';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const TemplateEditor: React.FC = () => {
  
  const {
    templates,
    currentTemplateId,
    createTemplate,
    setCurrentTemplate,
    addImage,
    deleteImage,
    setCurrentImage,
    getCurrentTemplate,
    getCurrentImage,
  } = useTemplateStore();
  
  const currentTemplate = getCurrentTemplate();
  const currentImage = getCurrentImage();

 
  
  const handleCreateTemplate = useCallback((name: string) => {
    createTemplate(name);
  }, [createTemplate]);
  
  const handleImageAdd = useCallback((
    imageData: string,
    width: number,
    height: number,
    name: string,
    type: TemplateType
  ) => {
    if (currentTemplateId) {
      addImage({ templateId: currentTemplateId, imageData, width, height, name, type });
    }
  }, [currentTemplateId, addImage]);
  
  
  
  
  
  
  const handleImageDelete = useCallback((id: string) => {
    if (currentTemplateId) {
      deleteImage(currentTemplateId, id);
    }
  }, [currentTemplateId, deleteImage]);
  
  const handleEmptyUpload = useCallback((
    imageData: string,
    width: number,
    height: number,
    name: string
  ) => {
    if (!currentTemplateId) {
      // Create template first
      const templateId = createTemplate('My Planner');
      addImage({ 
        templateId,
        imageData, 
        width, 
        height, 
        name, 
        type: 'monthly-calendar' 
      });
    } else {
      addImage({ 
        templateId: currentTemplateId,
        imageData, 
        width, 
        height, 
        name, 
        type: 'monthly-calendar' 
      });
    }
  }, [currentTemplateId, createTemplate, addImage]);

  useEffect(() => {
    if(!currentTemplateId && templates?.length) {
      setCurrentTemplate(templates[0].id)
      setCurrentImage(templates[0].images[0].id ?? null)
    }
  },[templates, currentTemplateId] )
  
  return (
    <motion.div 
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true }}
    variants={fadeUp}
    transition={{ duration: 0.6 }}
    className="flex h-screen bg-background overflow-hidden"
    >
      <EditorSidebar
        onImageDelete={handleImageDelete}
        onImageAdd={handleImageAdd}
        onCreateTemplate={handleCreateTemplate}
      />
      
      {currentImage ? (
        <TemplateCanvas />
      ) : (
        <EmptyCanvasState 
          hasTemplates={templates?.length > 0} 
          onCreateTemplate={createTemplate} 
          onImageUpload={handleEmptyUpload} 
        />
      )}
      
      {currentTemplate && (
        <GeneratorDialog />
      )}
    </motion.div>
  );
};

export default TemplateEditor;
