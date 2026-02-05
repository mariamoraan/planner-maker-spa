import React, { useState, useCallback, useEffect } from 'react';
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
  const [selectedFieldType, setSelectedFieldType] = useState<FieldType | undefined>();
  const [selectedRectangleId, setSelectedRectangleId] = useState<string | null>(null);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  
  const {
    templates,
    currentTemplateId,
    currentImageId,
    createTemplate,
    setCurrentTemplate,
    addImage,
    deleteImage,
    setCurrentImage,
    addRectangle,
    updateRectangle,
    deleteRectangle,
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
  
  const handleRectangleAdd = useCallback((rect: Omit<import('@/types/planner').Rectangle, 'id'>) => {
    if (currentTemplateId && currentImageId) {
      const id = addRectangle(currentTemplateId, currentImageId, rect);
      setSelectedRectangleId(id);
    }
  }, [currentTemplateId, currentImageId, addRectangle]);
  
  const handleRectangleUpdate = useCallback((id: string, updates: Partial<import('@/types/planner').Rectangle>) => {
    if (currentTemplateId && currentImageId) {
      updateRectangle(currentTemplateId, currentImageId, id, updates);
    }
  }, [currentTemplateId, currentImageId, updateRectangle]);
  
  const handleRectangleDelete = useCallback((id: string) => {
    if (currentTemplateId && currentImageId) {
      deleteRectangle(currentTemplateId, currentImageId, id);
      if (selectedRectangleId === id) {
        setSelectedRectangleId(null);
      }
    }
  }, [currentTemplateId, currentImageId, deleteRectangle, selectedRectangleId]);
  
  const handleRectangleUpdateType = useCallback((id: string, type: FieldType) => {
    if (currentTemplateId && currentImageId) {
      updateRectangle(currentTemplateId, currentImageId, id, { fieldType: type });
    }
  }, [currentTemplateId, currentImageId, updateRectangle]);
  
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
        template={currentTemplate}
        currentImage={currentImage}
        selectedFieldType={selectedFieldType}
        selectedRectangleId={selectedRectangleId}
        onFieldTypeChange={setSelectedFieldType}
        onRectangleSelect={setSelectedRectangleId}
        onRectangleDelete={handleRectangleDelete}
        onRectangleUpdateType={handleRectangleUpdateType}
        onImageSelect={setCurrentImage}
        onImageDelete={handleImageDelete}
        onImageAdd={handleImageAdd}
        onCreateTemplate={handleCreateTemplate}
        onGeneratePlanner={() => setGeneratorOpen(true)}
      />
      
      {currentImage ? (
        <TemplateCanvas
          imageData={currentImage.src}
          imageWidth={currentImage.width}
          imageHeight={currentImage.height}
          rectangles={currentImage.rectangles}
          selectedFieldType={selectedFieldType}
          selectedRectangleId={selectedRectangleId}
          onRectangleAdd={handleRectangleAdd}
          onRectangleUpdate={handleRectangleUpdate}
          onRectangleSelect={setSelectedRectangleId}
          onRectangleDelete={handleRectangleDelete}
        />
      ) : (
        <EmptyCanvasState 
          hasTemplates={templates?.length > 0} 
          onCreateTemplate={createTemplate} 
          onImageUpload={handleEmptyUpload} 
        />
      )}
      
      {currentTemplate && (
        <GeneratorDialog
          open={generatorOpen}
          onOpenChange={setGeneratorOpen}
        />
      )}
    </motion.div>
  );
};

export default TemplateEditor;
