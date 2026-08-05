import './canvas-floating-controls.scss';

import { CanvasViewToggles } from '@/features/editor/ui/components/shared/canvas-view-toggles';
import { CanvasZoomControls } from './canvas-zoom-controls';

interface CanvasFloatingControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  hint?: string;
}

export const CanvasFloatingControls = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  hint,
}: CanvasFloatingControlsProps) => {
  return (
    <div className="canvas-floating-controls">
      {hint && <p className="canvas-floating-controls__hint">{hint}</p>}
      <div className="canvas-floating-controls__dock">
        <CanvasViewToggles variant="floating" />
        <div className="canvas-floating-controls__divider" />
        <CanvasZoomControls
          variant="floating"
          zoom={zoom}
          onZoomIn={onZoomIn}
          onZoomOut={onZoomOut}
          onZoomReset={onZoomReset}
        />
      </div>
    </div>
  );
};
