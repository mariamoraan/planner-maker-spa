import React, { useEffect, useState } from 'react';
import { EmptyCanvasState } from '@/components/canvas/ImageUploader';
import { GeneratorDialog } from '@/components/generator/planner-generator-dialog';
import { useTemplateStore } from '@/stores/template-store';
import { motion } from 'framer-motion';
import { EditorBoard } from '@/components/editor-board/editor-board';
import { Navigate } from 'react-router-dom';
import { PATHS } from '@/core/routes/paths';
import { useTemplateId } from '@/hooks/use-template-id';
import { useCurrentTemplate } from '@/hooks/use-current-template';
import { useCurrentImage } from '@/hooks/use-current-image';
import './template-editor.scss';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const TemplateEditor: React.FC = () => {
  const templateId = useTemplateId();
  const currentTemplate = useCurrentTemplate();
  const currentImage = useCurrentImage();
  const loadTemplateImages = useTemplateStore(state => state.loadTemplateImages);
  const normalizeImageOrder = useTemplateStore(state => state.normalizeImageOrder);
  const setCurrentImage = useTemplateStore(state => state.setCurrentImage);
  const currentImageId = useTemplateStore(state => state.currentImageId);
  const [isLoadingImages, setIsLoadingImages] = useState<boolean>(false);
  
  useEffect(() => {
    const handleLoadImages = async() => {
      if (!templateId) return;
      setIsLoadingImages(true)
      await loadTemplateImages(templateId)
      normalizeImageOrder(templateId)
      setIsLoadingImages(false)
    }
    handleLoadImages();
  }, [templateId, loadTemplateImages, normalizeImageOrder]);

  useEffect(() => {
    if (!templateId || !currentTemplate) return;
    const firstImageId = currentTemplate.images[0]?.id ?? null;
    const imageBelongsToTemplate = currentTemplate.images.some(img => img.id === currentImageId);
    if (!imageBelongsToTemplate && firstImageId) {
      setCurrentImage(firstImageId);
    }
  }, [templateId, currentTemplate, currentImageId, setCurrentImage]);

  if (isLoadingImages) {
    return null;
  }

  if (!templateId || !currentTemplate) {
    return <Navigate to={PATHS.home} replace />;
  }

  return (
    <motion.div 
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true }}
    variants={fadeUp}
    transition={{ duration: 0.6 }}
    className="template-editor"
    >
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
