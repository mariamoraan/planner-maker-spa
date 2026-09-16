import React from 'react';
import { Group, Rect } from 'react-konva';
import type { GridBounds } from '@/features/editor/domain/services/grid-layout';

interface GridOverlayProps {
  bounds: GridBounds;
  scale: number;
  offset: { x: number; y: number };
  mode?: 'edit' | 'preview';
  rotation?: number;
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
  rotation = 0,
}) => {
  const isEditMode = mode === 'edit';

  const frameW = bounds.width * scale;
  const frameH = bounds.height * scale;
  const centerX = toStage(bounds.x + bounds.width / 2, scale, offset.x);
  const centerY = toStage(bounds.y + bounds.height / 2, scale, offset.y);

  return (
    <Group
      x={centerX}
      y={centerY}
      offsetX={frameW / 2}
      offsetY={frameH / 2}
      rotation={rotation}
      listening={false}
    >
      <Rect
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
