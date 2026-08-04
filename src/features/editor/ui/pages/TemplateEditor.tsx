import React, { useEffect, useState } from 'react';
import { useEditorStore } from '@/features/editor/ui/stores/editor-store';
import { MissingPageImage } from '@/features/editor/ui/components/canvas/missing-page-image';
import { EmptyCanvasState } from '@/features/editor/ui/components/canvas/ImageUploader';
import { GeneratorDialog } from '@/features/export/ui/components/planner-generator-dialog/planner-generator-dialog';
import { ExportProgressCard } from '@/features/export/ui/components/export-progress-card/export-progress-card';
import { useTemplateStore } from '@/features/template/ui/stores/template-store';
import { motion } from 'framer-motion';
import { EditorBoard } from '@/features/editor/ui/components/editor-board/editor-board';
import { Navigate } from 'react-router-dom';
import { PATHS } from '@/core/routes/paths';
import { useTemplateId } from '@/features/editor/ui/hooks/use-template-id';
import { useCurrentTemplate } from '@/features/editor/ui/hooks/use-current-template';
import { useCurrentImage } from '@/features/editor/ui/hooks/use-current-image';
import { useEditorViewportSupport } from '@/features/editor/ui/hooks/use-editor-viewport-support';
import { UnsupportedViewport } from '@/features/editor/ui/components/editor-board/unsupported-viewport';
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
  const currentImageId = useEditorStore(state => state.currentImageId);
  const [isLoadingImages, setIsLoadingImages] = useState<boolean>(false);
  const { isSupported } = useEditorViewportSupport();
  
  useEffect(() => {
    let cancelled = false;

    const handleLoadImages = async () => {
      if (!templateId) return;
      setIsLoadingImages(true);
      await loadTemplateImages(templateId);
      if (cancelled) return;
      normalizeImageOrder(templateId);
      if (!cancelled) {
        setIsLoadingImages(false);
      }
    };

    void handleLoadImages();

    return () => {
      cancelled = true;
    };
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

  if (!isSupported) {
    return <UnsupportedViewport />;
  }

  return (
    <div className="template-editor">
      <motion.div
        className="template-editor__inner"
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        transition={{ duration: 0.6 }}
      >
        {currentImage ? (
          currentImage.missingLocalAsset && !currentImage.src ? (
            <MissingPageImage pageId={currentImage.id} pageName={currentImage.name} />
          ) : (
            <EditorBoard />
          )
        ) : (
          <EmptyCanvasState />
        )}

        {currentTemplate && (
          <>
            <GeneratorDialog />
            <ExportProgressCard />
          </>
        )}
      </motion.div>
    </div>
  );
};

export default TemplateEditor;
