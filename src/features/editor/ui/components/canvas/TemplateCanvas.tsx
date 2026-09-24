import React, { useCallback, useRef, useState } from 'react';
import { Stage, Layer } from 'react-konva';
import type Konva from 'konva';
import { blockSelectionZoneProps } from '@/features/editor/domain/services/block-selection';
import { useManageAreas } from '@/features/editor/ui/hooks/use-manage-areas';
import { useGridGroupOps } from '@/features/editor/ui/hooks/use-grid-group-ops';
import { CanvasFloatingControls } from './canvas-floating-controls';
import { CanvasPageImage } from './canvas-page-image';
import { CanvasRectangleList } from './canvas-rectangle-list';
import { CanvasSelectionOverlays } from './canvas-selection-overlays';
import { CanvasGridEditLayer } from './canvas-grid-edit-layer';
import { GridAddDimensionControls } from './grid-add-dimension-controls';
import { GridCellGuides } from './grid-cell-guides';
import { SelectionActionHandles } from './selection-action-handles';
import { useTemplateCanvasController } from './use-template-canvas-controller';
import './template-canva.scss';

interface TemplateCanvasProps {
  pageId?: string;
  interactive?: boolean;
}

export const TemplateCanvas: React.FC<TemplateCanvasProps> = ({
  pageId,
  interactive = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const [rotationPreview, setRotationPreview] = useState<number | null>(null);
  const { updateArea } = useManageAreas();
  const { rotateGridGroup } = useGridGroupOps();

  const c = useTemplateCanvasController({
    containerRef,
    stageRef,
    transformerRef,
    pageId,
    interactive,
  });

  const { scale, offset } = c.viewport;

  const handleRotateCommit = useCallback(
    (payload: { kind: 'rect' | 'grid'; id: string; rotation: number }) => {
      if (!interactive) return;
      if (payload.kind === 'grid') {
        rotateGridGroup(payload.id, payload.rotation);
      } else {
        updateArea(payload.id, { rotation: payload.rotation });
      }
    },
    [interactive, rotateGridGroup, updateArea],
  );

  const emptyIds: string[] = [];
  const emptyPositions: Record<string, { x: number; y: number }> = {};
  const emptySizes: Record<string, { width: number; height: number }> = {};
  const selectedIds = interactive ? c.selection.selectedRectangleIds : emptyIds;
  const noopRect = useCallback(() => {}, []);
  const noopRectEvent = useCallback(
    (_rectId: string, _e?: Konva.KonvaEventObject<MouseEvent | TouchEvent | DragEvent | Event>) => {},
    [],
  );

  return (
    <div
      ref={containerRef}
      className={c.containerClassName}
      {...(interactive ? blockSelectionZoneProps : {})}
    >
      <Stage
        key={c.currentImage?.id}
        ref={stageRef}
        width={c.viewport.stageSize.width}
        height={c.viewport.stageSize.height}
        onMouseDown={c.handleMouseDown}
        onMouseMove={c.handleMouseMove}
        onMouseUp={c.handleMouseUp}
        onMouseLeave={() => c.handleMouseUp()}
        listening={interactive}
        className="template-canva__stage"
      >
        <Layer listening={interactive}>
          {c.image && c.currentImage && (
            <CanvasPageImage
              image={c.image}
              width={c.currentImage.width}
              height={c.currentImage.height}
              scale={scale}
              offset={offset}
            />
          )}

          {c.currentImage && (
            <CanvasRectangleList
              currentImage={c.currentImage}
              plannerLocale={c.template?.locale}
              weekStartsOn={c.template?.weekStartsOn}
              plannerStart={c.template?.startDate}
              plannerEnd={c.template?.endDate}
              scale={scale}
              offset={offset}
              isSelectMode={c.isSelectMode}
              showRectangleGuides={c.showRectangleGuides}
              selectedRectangleIds={selectedIds}
              marqueePreviewIds={interactive ? c.selection.marqueePreviewIds : emptyIds}
              isGridHandleDragging={interactive && c.grid.isGridHandleDragging}
              dragState={interactive ? c.drag.dragState : null}
              dragOverlay={interactive ? c.drag.dragOverlay : null}
              gridPreviewPositions={
                interactive ? c.grid.gridPreviewPositions : emptyPositions
              }
              gridSettingsPreviewPositions={
                interactive ? c.grid.gridSettingsPreviewPositions : emptyPositions
              }
              gridSettingsPreviewSizes={
                interactive ? c.grid.gridSettingsPreviewSizes : emptySizes
              }
              rotationPreview={interactive ? rotationPreview : null}
              rotationPreviewTargetIds={selectedIds}
              onRectClick={interactive ? c.selection.handleRectClick : noopRectEvent}
              onDragStart={interactive ? c.drag.handleDragStart : noopRect}
              onDragMove={interactive ? c.drag.handleDragMove : noopRectEvent}
              onDragEnd={interactive ? c.drag.handleDragEnd : noopRect}
              onTransformEnd={interactive ? c.drag.handleTransformEnd : noopRectEvent}
            />
          )}

          {interactive &&
            c.currentImage &&
            (c.showRectangleGuides || c.grid.lockedGridGroup) && (
              <GridCellGuides
                gridGroups={c.currentImage.gridGroups}
                scale={scale}
                offset={offset}
                onlyGroupId={c.showRectangleGuides ? null : c.grid.lockedGridGroup?.id}
                previewGroupId={c.grid.lockedGridGroup?.id}
                previewBounds={c.grid.activeGridBounds}
                previewSettings={c.grid.activeGridSettings}
              />
            )}

          {interactive ? (
            <CanvasSelectionOverlays
              scale={scale}
              offset={offset}
              isSelectMode={c.isSelectMode}
              marquee={c.selection.marquee}
              groupSelectionBounds={c.selection.groupSelectionBounds}
              isGridGroupFullySelected={c.selection.isGridGroupFullySelected}
              snapGuides={c.drag.dragOverlay?.guides ?? []}
              transformerRef={transformerRef}
            />
          ) : null}
        </Layer>

        {interactive ? (
          <CanvasGridEditLayer
            lockedGridGroup={c.grid.lockedGridGroup}
            activeGridBounds={c.grid.activeGridBounds}
            activeGridSettings={c.grid.activeGridSettings}
            gridEditFocus={c.grid.gridEditFocus}
            setGridEditFocus={c.grid.setGridEditFocus}
            gridMinBounds={c.grid.gridMinBounds}
            scale={scale}
            offset={offset}
            onBoundsChange={c.grid.handleGridBoundsPreview}
            onBoundsCommit={c.grid.handleGridBoundsCommit}
            onSettingsPreview={c.grid.handleGridSettingsPreview}
            onSettingsCommit={c.grid.handleGridSettingsCommit}
          />
        ) : null}
      </Stage>

      {interactive &&
        c.grid.lockedGridGroup &&
        c.grid.activeGridBounds &&
        c.grid.activeGridSettings &&
        c.grid.gridEditFocus === 'grid' &&
        !c.grid.lockedGridGroup.rotation && (
          <GridAddDimensionControls
            groupId={c.grid.lockedGridGroup.id}
            bounds={c.grid.activeGridBounds}
            scale={scale}
            offset={offset}
            stageSize={c.viewport.stageSize}
            cols={c.grid.activeGridSettings.cols}
            rows={c.grid.activeGridSettings.rows}
          />
        )}

      {interactive && c.currentImage && (
        <SelectionActionHandles
          currentImage={c.currentImage}
          selectedRectangleIds={selectedIds}
          isSelectMode={c.isSelectMode}
          scale={scale}
          offset={offset}
          stageSize={c.viewport.stageSize}
          dragOverlay={c.drag.dragOverlay}
          pointerToImage={c.viewport.pointerToImage}
          getStageElement={() => stageRef.current?.container() ?? null}
          onRotateCommit={handleRotateCommit}
          onMoveStart={c.drag.beginExternalMove}
          onMoveUpdate={c.drag.updateExternalMove}
          onMoveEnd={c.drag.endExternalMove}
          rotationPreview={rotationPreview}
          onRotationPreview={setRotationPreview}
        />
      )}

      {interactive ? (
        <div className="template-canva__controls">
          <CanvasFloatingControls
            zoom={c.viewport.zoom}
            onZoomIn={c.viewport.handleZoomIn}
            onZoomOut={c.viewport.handleZoomOut}
            onZoomReset={c.viewport.handleZoomReset}
          />
        </div>
      ) : null}
    </div>
  );
};
