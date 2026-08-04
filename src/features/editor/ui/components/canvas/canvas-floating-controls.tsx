import './canvas-floating-controls.scss';

import { CanvasViewToggles } from '@/features/editor/ui/components/shared/canvas-view-toggles';
import { MeasureAdjustPanel } from './measure-adjust-panel';
import { CanvasZoomControls } from './canvas-zoom-controls';
import type { MeasureAnchor, MeasureRect } from '@/features/editor/domain/services/measure-utils';

interface CanvasFloatingControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  hint?: string;
  measureAdjust?: {
    p1: MeasureAnchor;
    p2: MeasureAnchor;
    rectangles: MeasureRect[];
    selectedRectangleIds: string[];
    onApply: (moves: { id: string; x: number; y: number }[]) => void;
  };
}

export const CanvasFloatingControls = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  hint,
  measureAdjust,
}: CanvasFloatingControlsProps) => {
  return (
    <div className="canvas-floating-controls">
      {measureAdjust && (
        <MeasureAdjustPanel
          p1={measureAdjust.p1}
          p2={measureAdjust.p2}
          rectangles={measureAdjust.rectangles}
          selectedRectangleIds={measureAdjust.selectedRectangleIds}
          onApply={measureAdjust.onApply}
        />
      )}
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
