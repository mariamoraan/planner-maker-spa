import React from 'react';
import { Group, Rect, Text } from 'react-konva';
import type { GridGroup } from '@/features/template';
import { boundsFromRectanglesWithPadding } from '@/features/editor/domain/services/grid-layout';
import {
  EDITOR_CHROME_INK,
  EDITOR_CHROME_INK_FILL,
} from '@/features/editor/domain/constants/editor-chrome';

interface GridGroupOverlayProps {
  group: GridGroup;
  rectangles: { id: string; x: number; y: number; width: number; height: number }[];
  scale: number;
  offset: { x: number; y: number };
}

function toStage(value: number, scale: number, offsetValue: number): number {
  return offsetValue + value * scale;
}

export const GridGroupOverlay: React.FC<GridGroupOverlayProps> = ({
  group,
  rectangles,
  scale,
  offset,
}) => {
  const memberRects = rectangles.filter(rect => group.rectIds.includes(rect.id));
  const bounds = boundsFromRectanglesWithPadding(memberRects, 8);
  if (!bounds) return null;

  const frameX = toStage(bounds.x, scale, offset.x);
  const frameY = toStage(bounds.y, scale, offset.y);
  const label = `${group.cols}×${group.rows}`;

  return (
    <Group listening={false}>
      <Rect
        x={frameX}
        y={frameY}
        width={bounds.width * scale}
        height={bounds.height * scale}
        stroke={EDITOR_CHROME_INK}
        strokeWidth={1.5}
        dash={[6, 4]}
        cornerRadius={0}
        fill={EDITOR_CHROME_INK_FILL}
      />
      <Rect
        x={frameX + 8}
        y={frameY - 22}
        width={label.length * 7 + 24}
        height={18}
        fill={EDITOR_CHROME_INK}
        cornerRadius={0}
      />
      <Text
        x={frameX + 16}
        y={frameY - 19}
        text={label}
        fontSize={11}
        fill="white"
        fontStyle="bold"
      />
    </Group>
  );
};
