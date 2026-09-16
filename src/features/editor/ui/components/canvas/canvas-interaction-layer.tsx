import React from 'react';
import type { RefObject } from 'react';
import { Layer, Rect, Transformer } from 'react-konva';
import type Konva from 'konva';
import type { SnapGuide } from '@/features/editor/domain/services/canvas-snap';
import type { Rectangle } from '@/features/template';
import { CanvasCameraGroup, type CanvasCamera, screenPx } from './canvas-camera-group';
import { SnapGuidesOverlay } from './snap-guides-overlay';
import type { MarqueeRect } from './canvas-interaction-types';

interface CanvasInteractionLayerProps {
  camera: CanvasCamera;
  isSelectMode: boolean;
  marquee: MarqueeRect | null;
  marqueePreviewIds: string[];
  rectangles: Rectangle[];
  groupSelectionBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  isGridGroupFullySelected: boolean;
  snapGuides: SnapGuide[];
  transformerRef: RefObject<Konva.Transformer | null>;
}

function camerasEqual(a: CanvasCamera, b: CanvasCamera): boolean {
  return (
    a.scale === b.scale && a.offset.x === b.offset.x && a.offset.y === b.offset.y
  );
}

export const CanvasInteractionLayer: React.FC<CanvasInteractionLayerProps> = React.memo(
  ({
    camera,
    isSelectMode,
    marquee,
    marqueePreviewIds,
    rectangles,
    groupSelectionBounds,
    isGridGroupFullySelected,
    snapGuides,
    transformerRef,
  }) => {
    const inv = 1 / camera.scale;
    const previewRects = marqueePreviewIds
      .map(id => rectangles.find(rect => rect.id === id))
      .filter((rect): rect is Rectangle => Boolean(rect));

    return (
      <Layer>
        <CanvasCameraGroup scale={camera.scale} offset={camera.offset}>
          {marquee && (
            <Rect
              x={marquee.x}
              y={marquee.y}
              width={marquee.width}
              height={marquee.height}
              fill="rgba(0, 200, 255, 0.1)"
              stroke="rgba(0, 200, 255, 0.6)"
              strokeWidth={screenPx(1, camera.scale)}
              dash={[4 * inv, 4 * inv]}
              listening={false}
            />
          )}

          {previewRects.map(rect => (
            <Rect
              key={`marquee-preview-${rect.id}`}
              x={rect.x}
              y={rect.y}
              width={rect.width}
              height={rect.height}
              stroke="rgba(0, 200, 255, 0.9)"
              strokeWidth={screenPx(2, camera.scale)}
              dash={[6 * inv, 4 * inv]}
              cornerRadius={4 * inv}
              listening={false}
            />
          ))}

          {groupSelectionBounds && isSelectMode && !isGridGroupFullySelected && (
            <Rect
              x={groupSelectionBounds.x}
              y={groupSelectionBounds.y}
              width={groupSelectionBounds.width}
              height={groupSelectionBounds.height}
              stroke="hsl(168, 76%, 42%)"
              strokeWidth={screenPx(1.5, camera.scale)}
              dash={[6 * inv, 4 * inv]}
              cornerRadius={6 * inv}
              listening={false}
            />
          )}

          <SnapGuidesOverlay guides={snapGuides} scale={camera.scale} />

          <Transformer
            ref={transformerRef}
            boundBoxFunc={(oldBox, newBox) =>
              newBox.width < 20 || newBox.height < 20 ? oldBox : newBox
            }
            rotateEnabled={false}
            anchorSize={8}
            borderStroke="hsl(168, 76%, 42%)"
            anchorFill="hsl(168, 76%, 42%)"
            anchorStroke="white"
          />
        </CanvasCameraGroup>
      </Layer>
    );
  },
  (prev, next) =>
    camerasEqual(prev.camera, next.camera) &&
    prev.isSelectMode === next.isSelectMode &&
    prev.marquee === next.marquee &&
    prev.marqueePreviewIds === next.marqueePreviewIds &&
    prev.rectangles === next.rectangles &&
    prev.groupSelectionBounds === next.groupSelectionBounds &&
    prev.isGridGroupFullySelected === next.isGridGroupFullySelected &&
    prev.snapGuides === next.snapGuides &&
    prev.transformerRef === next.transformerRef,
);

CanvasInteractionLayer.displayName = 'CanvasInteractionLayer';
