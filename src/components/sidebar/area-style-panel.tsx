import { useCurrentImage } from '@/hooks/use-current-image';
import { useTemplateStore } from '@/stores/template-store';
import { AreaStyleControls } from '@/components/shared/area-style-controls';

export const AreaStylePanel = () => {
  const selectedRectangleId = useTemplateStore(state => state.selectedRectangleId);
  const currentImage = useCurrentImage();

  const selectedRectangle = selectedRectangleId
    ? currentImage?.rectangles.find(r => r.id === selectedRectangleId)
    : null;

  if (!selectedRectangle || !currentImage) {
    return null;
  }

  return <AreaStyleControls rectangle={selectedRectangle} variant="sidebar" />;
};
