import React from 'react';
import { Group, Line, Rect } from 'react-konva';
import {
  cellOrigin,
  gridConfigFromBounds,
  gridLinePositions,
  type GridBounds,
} from '@/features/editor/domain/services/grid-layout';
import type { ActiveGridGutter } from './grid-bounds-handles';
import type { GridEditSettings } from '@/features/editor/domain/services/grid-edit-types';

interface GridOverlayProps {
  bounds: GridBounds;
  settings: GridEditSettings;
  scale: number;
  offset: { x: number; y: number };
  activeGutter?: ActiveGridGutter;
  mode?: 'edit' | 'preview';
}

function toStage(value: number, scale: number, offsetValue: number): number {
  return offsetValue + value * scale;
}

export const GridOverlay: React.FC<GridOverlayProps> = ({
  bounds,
  settings,
  scale,
  offset,
  activeGutter = null,
  mode = 'edit',
}) => {
  const isEditMode = mode === 'edit';
  const rectSize = { width: settings.rectWidth, height: settings.rectHeight };
  const config = gridConfigFromBounds(
    bounds,
    settings.cols,
    settings.rows,
    rectSize,
    settings.align,
    settings.padding,
  );
  const lines = gridLinePositions(config);

  const frameX = toStage(bounds.x, scale, offset.x);
  const frameY = toStage(bounds.y, scale, offset.y);
  const frameW = bounds.width * scale;
  const frameH = bounds.height * scale;

  const verticalLines = lines.vertical.map((x, index) => {
    const isGutter = index === 1 && activeGutter === 'x';
    const stageX = toStage(x, scale, offset.x);
    return (
      <Line
        key={`v-${index}`}
        points={[stageX, frameY, stageX, frameY + frameH]}
        stroke={isGutter ? 'hsl(168, 90%, 38%)' : 'hsl(168, 76%, 42%)'}
        strokeWidth={isGutter ? 3 : isEditMode ? 1 : 0.8}
        opacity={isGutter ? 1 : isEditMode ? 0.7 : 0.5}
        listening={false}
      />
    );
  });

  const horizontalLines = lines.horizontal.map((y, index) => {
    const isGutter = index === 1 && activeGutter === 'y';
    const stageY = toStage(y, scale, offset.y);
    return (
      <Line
        key={`h-${index}`}
        points={[frameX, stageY, frameX + frameW, stageY]}
        stroke={isGutter ? 'hsl(168, 90%, 38%)' : 'hsl(168, 76%, 42%)'}
        strokeWidth={isGutter ? 3 : isEditMode ? 1 : 0.8}
        opacity={isGutter ? 1 : isEditMode ? 0.7 : 0.5}
        listening={false}
      />
    );
  });

  const cellPreviews = Array.from({ length: settings.cols * settings.rows }, (_, index) => {
    const col = index % settings.cols;
    const row = Math.floor(index / settings.cols);
    const position = cellOrigin(col, row, config);
    return (
      <Rect
        key={`cell-${index}`}
        x={toStage(position.x, scale, offset.x)}
        y={toStage(position.y, scale, offset.y)}
        width={settings.rectWidth * scale}
        height={settings.rectHeight * scale}
        fill="rgba(0, 200, 180, 0.12)"
        stroke="hsl(168, 76%, 42%)"
        strokeWidth={1}
        dash={[4, 4]}
        cornerRadius={3}
        listening={false}
      />
    );
  });

  return (
    <Group listening={false}>
      {!isEditMode && (
        <Rect
          x={frameX}
          y={frameY}
          width={frameW}
          height={frameH}
          fill="rgba(0, 200, 180, 0.06)"
          stroke="hsl(168, 76%, 42%)"
          strokeWidth={1.5}
          dash={[6, 4]}
          listening={false}
        />
      )}
      {isEditMode && verticalLines}
      {isEditMode && horizontalLines}
      {isEditMode && cellPreviews}
    </Group>
  );
};
