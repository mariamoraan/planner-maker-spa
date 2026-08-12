import React from 'react';
import { Group, Rect } from 'react-konva';
import {
  cellOrigin,
  cellSlotOrigin,
  cellSlotSize,
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

  const gap = normalized.gap ?? { x: 0, y: 0 };
  const slotSize = cellSlotSize(bounds, normalized.cols, normalized.rows, gap);

  const cellPreviews = Array.from({ length: normalized.cols * normalized.rows }, (_, index) => {
    const col = index % normalized.cols;
    const row = Math.floor(index / normalized.cols);
    const slotPosition = cellSlotOrigin(col, row, config);
    const blockPosition = cellOrigin(col, row, config);
    return (
      <React.Fragment key={`cell-${index}`}>
        <Rect
          x={toStage(slotPosition.x, scale, offset.x)}
          y={toStage(slotPosition.y, scale, offset.y)}
          width={slotSize.width * scale}
          height={slotSize.height * scale}
          stroke="hsl(168, 76%, 42%)"
          strokeWidth={1}
          dash={[4, 4]}
          cornerRadius={3}
          listening={false}
        />
        <Rect
          x={toStage(blockPosition.x, scale, offset.x)}
          y={toStage(blockPosition.y, scale, offset.y)}
          width={settings.rectWidth * scale}
          height={settings.rectHeight * scale}
          fill="rgba(0, 200, 180, 0.12)"
          listening={false}
        />
      </React.Fragment>
    );
  });

  return (
    <Group listening={false}>
      <Rect
        x={frameX}
        y={frameY}
        width={frameW}
        height={frameH}
        fill={isEditMode ? 'transparent' : 'rgba(0, 200, 180, 0.06)'}
        stroke="hsl(168, 76%, 42%)"
        strokeWidth={isEditMode ? 1.5 : 1.5}
        dash={isEditMode ? undefined : [6, 4]}
        listening={false}
      />
      {isEditMode && cellPreviews}
    </Group>
  );
};
