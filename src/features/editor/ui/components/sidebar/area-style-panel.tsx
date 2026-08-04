import { useCurrentImage } from '@/features/editor/ui/hooks/use-current-image';
import { useEditorStore } from '@/features/editor/ui/stores/editor-store';
import { useTemplateStore } from '@/features/template/ui/stores/template-store';
import { AreaStyleControls } from '@/features/editor/ui/components/shared/area-style-controls';

export const AreaStylePanel = () => {
  const selectedRectangleIds = useEditorStore(state => state.selectedRectangleIds);
  const selectedRectangleId = selectedRectangleIds.length === 1 ? selectedRectangleIds[0] : null;
  const currentImage = useCurrentImage();

  const selectedRectangle = selectedRectangleId
    ? currentImage?.rectangles.find(r => r.id === selectedRectangleId)
    : null;

  if (!selectedRectangle || !currentImage) {
    return null;
  }

  return <AreaStyleControls rectangle={selectedRectangle} variant="sidebar" />;
};
