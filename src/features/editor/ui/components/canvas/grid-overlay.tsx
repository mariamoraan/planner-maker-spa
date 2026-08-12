import React from 'react';
import { Group, Line, Rect } from 'react-konva';
import {
  cellOrigin,
  cellSlotOrigin,
  gapLinePositions,
  gridConfigFromGroup,
  type GridBounds,
} from '@/features/editor/domain/services/grid-layout';
import type { GridEditSettings } from '@/features/editor/domain/services/grid-edit-types';
import { normalizeGridSettings } from '@/features/editor/domain/services/grid-edit-types';

interface GridOverlayProps {
  bounds: GridBounds;
  settings: GridEditSettings;
  scale: number;
  offset: { x: number; y: number };
  mode?: 'edit' | 'preview';
}

const GRID_STROKE = 'hsl(168, 76%, 42%)';

function toStage(value: number, scale: number, offsetValue: number): number {
  return offsetValue + value * scale;
}

export const GridOverlay: React.FC<GridOverlayProps> = ({
  bounds,
  settings,
  scale,
  offset,
  mode = 'edit',
}) => {
  const normalized = normalizeGridSettings(settings);
  const isEditMode = mode === 'edit';
  const config = gridConfigFromGroup(bounds, normalized);

  const frameX = toStage(bounds.x, scale, offset.x);
  const frameY = toStage(bounds.y, scale, offset.y);
  const frameW = bounds.width * scale;
  const frameH = bounds.height * scale;
  const frameRight = frameX + frameW;
  const frameBottom = frameY + frameH;

  const { vertical, horizontal } = gapLinePositions(config);

  const cellPreviews = Array.from({ length: normalized.cols * normalized.rows }, (_, index) => {
    const col = index % normalized.cols;
    const row = Math.floor(index / normalized.cols);
    const blockPosition = cellOrigin(col, row, config);
    return (
      <Rect
        key={`cell-${index}`}
        x={toStage(blockPosition.x, scale, offset.x)}
        y={toStage(blockPosition.y, scale, offset.y)}
        width={settings.rectWidth * scale}
        height={settings.rectHeight * scale}
        fill="rgba(0, 200, 180, 0.12)"
        listening={false}
      />
    );
  });

  const gridLines = isEditMode ? (
    <>
      {vertical.map(x => (
        <Line
          key={`grid-v-${x}`}
          points={[toStage(x, scale, offset.x), frameY, toStage(x, scale, offset.x), frameBottom]}
          stroke={GRID_STROKE}
          strokeWidth={1}
          listening={false}
        />
      ))}
      {horizontal.map(y => (
        <Line
          key={`grid-h-${y}`}
          points={[frameX, toStage(y, scale, offset.y), frameRight, toStage(y, scale, offset.y)]}
          stroke={GRID_STROKE}
          strokeWidth={1}
          listening={false}
        />
      ))}
    </>
  ) : null;

  return (
    <Group listening={false}>
      <Rect
        x={frameX}
        y={frameY}
        width={frameW}
        height={frameH}
        fill={isEditMode ? 'transparent' : 'rgba(0, 200, 180, 0.06)'}
        stroke={GRID_STROKE}
        strokeWidth={1.5}
        dash={isEditMode ? undefined : [6, 4]}
        listening={false}
      />
      {isEditMode && cellPreviews}
      {gridLines}
    </Group>
  );
};
