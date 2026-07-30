import React, { useMemo } from 'react';
import { Group, Line } from 'react-konva';

interface GridOverlayProps {
  width: number;
  height: number;
  gridSize: number;
  scale: number;
  offset: { x: number; y: number };
}

const MINOR_STROKE = 'rgba(0, 180, 220, 0.75)';
const MAJOR_STROKE = 'rgba(0, 140, 180, 0.9)';
const MAJOR_EVERY = 5;

function toStage(value: number, scale: number, offset: number): number {
  return offset + value * scale;
}

function isMajorLine(index: number): boolean {
  return index % MAJOR_EVERY === 0;
}

export const GridOverlay: React.FC<GridOverlayProps> = ({
  width,
  height,
  gridSize,
  scale,
  offset,
}) => {
  const stageWidth = width * scale;
  const stageHeight = height * scale;
  const originX = offset.x;
  const originY = offset.y;
  const minorStrokeWidth = Math.max(1.5, 1 / scale);
  const majorStrokeWidth = minorStrokeWidth * 2;

  const verticalLines = useMemo(() => {
    const lines: { points: number[]; major: boolean }[] = [];
    let index = 0;
    for (let x = 0; x <= width; x += gridSize) {
      const stageX = toStage(x, scale, offset.x);
      lines.push({
        points: [stageX, originY, stageX, originY + stageHeight],
        major: isMajorLine(index),
      });
      index += 1;
    }
    return lines;
  }, [width, gridSize, scale, offset.x, originY, stageHeight]);

  const horizontalLines = useMemo(() => {
    const lines: { points: number[]; major: boolean }[] = [];
    let index = 0;
    for (let y = 0; y <= height; y += gridSize) {
      const stageY = toStage(y, scale, offset.y);
      lines.push({
        points: [originX, stageY, originX + stageWidth, stageY],
        major: isMajorLine(index),
      });
      index += 1;
    }
    return lines;
  }, [height, gridSize, scale, offset.y, originX, stageWidth]);

  return (
    <Group listening={false}>
      {verticalLines.map((line, index) => (
        <Line
          key={`grid-v-${index}`}
          points={line.points}
          stroke={line.major ? MAJOR_STROKE : MINOR_STROKE}
          strokeWidth={line.major ? majorStrokeWidth : minorStrokeWidth}
          strokeScaleEnabled={false}
          perfectDrawEnabled={false}
          listening={false}
        />
      ))}
      {horizontalLines.map((line, index) => (
        <Line
          key={`grid-h-${index}`}
          points={line.points}
          stroke={line.major ? MAJOR_STROKE : MINOR_STROKE}
          strokeWidth={line.major ? majorStrokeWidth : minorStrokeWidth}
          strokeScaleEnabled={false}
          perfectDrawEnabled={false}
          listening={false}
        />
      ))}
    </Group>
  );
};
