import React, { useRef } from 'react';
import { Stage, Layer } from 'react-konva';
import type Konva from 'konva';
import { blockSelectionZoneProps } from '@/features/editor/domain/services/block-selection';
import { CanvasFloatingControls } from './canvas-floating-controls';
import { CanvasPageImage } from './canvas-page-image';
import { CanvasRectangleList } from './canvas-rectangle-list';
import { CanvasSelectionOverlays } from './canvas-selection-overlays';
import { CanvasGridEditLayer } from './canvas-grid-edit-layer';
import { useTemplateCanvasController } from './use-template-canvas-controller';
import './template-canva.scss';

export const TemplateCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  const c = useTemplateCanvasController({
    containerRef,
    stageRef,
    transformerRef,
  });

  const { scale, offset } = c.viewport;

  return (
    <div
      key={c.currentImage?.id}
      ref={containerRef}
      className={c.containerClassName}
      {...blockSelectionZoneProps}
    >
      <Stage
        ref={stageRef}
        width={c.viewport.stageSize.width}
        height={c.viewport.stageSize.height}
        onMouseDown={c.handleMouseDown}
        onMouseMove={c.handleMouseMove}
        onMouseUp={c.handleMouseUp}
        onMouseLeave={() => c.handleMouseUp()}
        className="template-canva__stage"
      >
        <Layer>
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
              scale={scale}
              offset={offset}
              isSelectMode={c.isSelectMode}
              showRectangleGuides={c.showRectangleGuides}
              selectedRectangleIds={c.selection.selectedRectangleIds}
              marqueePreviewIds={c.selection.marqueePreviewIds}
              isGridHandleDragging={c.grid.isGridHandleDragging}
              dragState={c.drag.dragState}
              dragOverlay={c.drag.dragOverlay}
              gridPreviewPositions={c.grid.gridPreviewPositions}
              gridSettingsPreviewPositions={c.grid.gridSettingsPreviewPositions}
              gridSettingsPreviewSizes={c.grid.gridSettingsPreviewSizes}
              onRectClick={c.selection.handleRectClick}
              onDragStart={c.drag.handleDragStart}
              onDragMove={c.drag.handleDragMove}
              onDragEnd={c.drag.handleDragEnd}
              onTransformEnd={c.drag.handleTransformEnd}
            />
          )}

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
        </Layer>

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
      </Stage>

      <div className="template-canva__controls">
        <CanvasFloatingControls
          zoom={c.viewport.zoom}
          onZoomIn={c.viewport.handleZoomIn}
          onZoomOut={c.viewport.handleZoomOut}
          onZoomReset={c.viewport.handleZoomReset}
        />
      </div>
    </div>
  );
};
