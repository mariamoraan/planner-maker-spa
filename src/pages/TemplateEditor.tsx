import React, { useEffect } from 'react';
import { EditorSidebar } from '@/components/sidebar/EditorSidebar';
import { TemplateCanvas } from '@/components/canvas/TemplateCanvas';
import { EmptyCanvasState } from '@/components/canvas/ImageUploader';
import { GeneratorDialog } from '@/components/generator/GeneratorDialog';
import { useTemplateStore } from '@/stores/template-store';
import { motion } from 'framer-motion';
import { EditorBoard } from '@/components/editor-board/editor-board';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const TemplateEditor: React.FC = () => {
  
  const {
    templates,
    currentTemplateId,
    setCurrentTemplate,
    setCurrentImage,
    getCurrentTemplate,
    getCurrentImage,
  } = useTemplateStore();
  
  const currentTemplate = getCurrentTemplate();
  const currentImage = getCurrentImage();
  
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
      <EditorSidebar />
      
      {currentImage ? (
        <EditorBoard />
      ) : (
        <EmptyCanvasState />
      )}
      
      {currentTemplate && (
        <GeneratorDialog />
      )}
    </motion.div>
  );
};

export default TemplateEditor;
