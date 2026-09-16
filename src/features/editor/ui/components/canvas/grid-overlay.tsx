import React from 'react';
import { Group, Rect } from 'react-konva';
import type { GridBounds } from '@/features/editor/domain/services/grid-layout';

interface GridOverlayProps {
  bounds: GridBounds;
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
  scale,
  offset,
  mode = 'edit',
}) => {
  const isEditMode = mode === 'edit';

  const frameX = toStage(bounds.x, scale, offset.x);
  const frameY = toStage(bounds.y, scale, offset.y);
  const frameW = bounds.width * scale;
  const frameH = bounds.height * scale;

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
    </Group>
  );
};
