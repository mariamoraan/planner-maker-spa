import React from 'react';
import type Konva from 'konva';
import {
  FIELD_TYPE_CONFIG,
  type PlannerLocale,
  type TemplateImage,
  type WeekStartsOn,
} from '@/features/template';
import { TemplateRectangle } from './template-rectangle';
import type { DragOverlay, DragState } from './canvas-interaction-types';

interface CanvasRectangleListProps {
  currentImage: TemplateImage;
  plannerLocale?: PlannerLocale;
  weekStartsOn?: WeekStartsOn;
  scale: number;
  offset: { x: number; y: number };
  isSelectMode: boolean;
  showRectangleGuides: boolean;
  selectedRectangleIds: string[];
  marqueePreviewIds: string[];
  isGridHandleDragging: boolean;
  dragState: DragState | null;
  dragOverlay: DragOverlay | null;
  gridPreviewPositions: Record<string, { x: number; y: number }>;
  gridSettingsPreviewPositions: Record<string, { x: number; y: number }>;
  gridSettingsPreviewSizes: Record<string, { width: number; height: number }>;
  onRectClick: (rectId: string, e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onDragStart: (rectId: string) => void;
  onDragMove: (rectId: string, e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragEnd: (rectId: string) => void;
  onTransformEnd: (rectId: string, e: Konva.KonvaEventObject<Event>) => void;
}

export const CanvasRectangleList: React.FC<CanvasRectangleListProps> = ({
  currentImage,
  plannerLocale,
  weekStartsOn,
  scale,
  offset,
  isSelectMode,
  showRectangleGuides,
  selectedRectangleIds,
  marqueePreviewIds,
  isGridHandleDragging,
  dragState,
  dragOverlay,
  gridPreviewPositions,
  gridSettingsPreviewPositions,
  gridSettingsPreviewSizes,
  onRectClick,
  onDragStart,
  onDragMove,
  onDragEnd,
  onTransformEnd,
}) => (
  <>
    {currentImage.rectangles?.map(rect => {
      const config = FIELD_TYPE_CONFIG[rect.fieldType];
      const isSelected = selectedRectangleIds.includes(rect.id);
      const isMarqueePreview = marqueePreviewIds.includes(rect.id);
      const isGroupDragging = dragState !== null && dragState.movingIds.length > 1;
      const isDragLeader = dragState?.leaderId === rect.id;
      const draggable =
        isSelectMode && !isGridHandleDragging && (!isGroupDragging || isDragLeader);
      const previewPosition =
        gridPreviewPositions[rect.id] ??
        gridSettingsPreviewPositions[rect.id] ??
        dragOverlay?.previewPositions[rect.id];
      const previewSize = gridSettingsPreviewSizes[rect.id];

      return (
        <TemplateRectangle
          key={`${currentImage.id}-${rect.id}`}
          rect={rect}
          templateImage={currentImage}
          plannerLocale={plannerLocale}
          weekStartsOn={weekStartsOn}
          scale={scale}
          offset={offset}
          config={config}
          showRectangleGuides={showRectangleGuides}
          isSelected={isSelected}
          isMarqueePreview={isMarqueePreview}
          previewPosition={previewPosition}
          previewSize={previewSize}
          draggable={draggable}
          listening
          onClick={e => onRectClick(rect.id, e)}
          onDragStart={() => onDragStart(rect.id)}
          onDragMove={e => onDragMove(rect.id, e)}
          onDragEnd={() => onDragEnd(rect.id)}
          onTransformEnd={e => onTransformEnd(rect.id, e)}
        />
      );
    })}
  </>
);
