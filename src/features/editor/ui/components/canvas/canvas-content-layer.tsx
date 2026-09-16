import React from 'react';
import { Layer } from 'react-konva';
import type Konva from 'konva';
import type { PlannerLocale, TemplateImage, WeekStartsOn } from '@/features/template';
import { CanvasCameraGroup, type CanvasCamera } from './canvas-camera-group';
import { CanvasPageImage } from './canvas-page-image';
import { CanvasRectangleList } from './canvas-rectangle-list';
import type { DragState } from './canvas-interaction-types';

interface CanvasContentLayerProps {
  camera: CanvasCamera;
  image: CanvasImageSource | undefined;
  currentImage: TemplateImage;
  plannerLocale?: PlannerLocale;
  weekStartsOn?: WeekStartsOn;
  isSelectMode: boolean;
  showRectangleGuides: boolean;
  selectedRectangleIds: string[];
  isGridHandleDragging: boolean;
  dragState: DragState | null;
  previewPositions: Record<string, { x: number; y: number }>;
  previewSizes: Record<string, { width: number; height: number }>;
  onRectClick: (rectId: string, e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onDragStart: (rectId: string) => void;
  onDragMove: (rectId: string, e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragEnd: (rectId: string) => void;
  onTransformEnd: (rectId: string, e: Konva.KonvaEventObject<Event>) => void;
}

function camerasEqual(a: CanvasCamera, b: CanvasCamera): boolean {
  return (
    a.scale === b.scale && a.offset.x === b.offset.x && a.offset.y === b.offset.y
  );
}

export const CanvasContentLayer: React.FC<CanvasContentLayerProps> = React.memo(
  ({
    camera,
    image,
    currentImage,
    plannerLocale,
    weekStartsOn,
    isSelectMode,
    showRectangleGuides,
    selectedRectangleIds,
    isGridHandleDragging,
    dragState,
    previewPositions,
    previewSizes,
    onRectClick,
    onDragStart,
    onDragMove,
    onDragEnd,
    onTransformEnd,
  }) => (
    <Layer>
      <CanvasCameraGroup scale={camera.scale} offset={camera.offset}>
        {image && (
          <CanvasPageImage
            image={image}
            width={currentImage.width}
            height={currentImage.height}
          />
        )}
        <CanvasRectangleList
          currentImage={currentImage}
          plannerLocale={plannerLocale}
          weekStartsOn={weekStartsOn}
          isSelectMode={isSelectMode}
          showRectangleGuides={showRectangleGuides}
          selectedRectangleIds={selectedRectangleIds}
          isGridHandleDragging={isGridHandleDragging}
          dragState={dragState}
          previewPositions={previewPositions}
          previewSizes={previewSizes}
          onRectClick={onRectClick}
          onDragStart={onDragStart}
          onDragMove={onDragMove}
          onDragEnd={onDragEnd}
          onTransformEnd={onTransformEnd}
        />
      </CanvasCameraGroup>
    </Layer>
  ),
  (prev, next) =>
    camerasEqual(prev.camera, next.camera) &&
    prev.image === next.image &&
    prev.currentImage === next.currentImage &&
    prev.plannerLocale === next.plannerLocale &&
    prev.weekStartsOn === next.weekStartsOn &&
    prev.isSelectMode === next.isSelectMode &&
    prev.showRectangleGuides === next.showRectangleGuides &&
    prev.selectedRectangleIds === next.selectedRectangleIds &&
    prev.isGridHandleDragging === next.isGridHandleDragging &&
    prev.dragState === next.dragState &&
    prev.previewPositions === next.previewPositions &&
    prev.previewSizes === next.previewSizes &&
    prev.onRectClick === next.onRectClick &&
    prev.onDragStart === next.onDragStart &&
    prev.onDragMove === next.onDragMove &&
    prev.onDragEnd === next.onDragEnd &&
    prev.onTransformEnd === next.onTransformEnd,
);

CanvasContentLayer.displayName = 'CanvasContentLayer';
