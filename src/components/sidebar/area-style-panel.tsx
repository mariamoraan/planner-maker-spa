import { useCurrentImage } from '@/hooks/use-current-image';
import { useTemplateStore } from '@/stores/template-store';
import { AreaStyleControls } from '@/components/shared/area-style-controls';

export const AreaStylePanel = () => {
  const selectedRectangleIds = useTemplateStore(state => state.selectedRectangleIds);
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
