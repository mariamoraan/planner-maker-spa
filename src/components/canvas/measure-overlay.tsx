import React from 'react';
import { Group, Line, Text, Rect, Circle } from 'react-konva';
import { computeMeasureMetrics, type Point } from '@/lib/measure-utils';

interface MeasureOverlayProps {
  p1: Point;
  p2: Point;
  scale: number;
  offset: { x: number; y: number };
}

const MEASURE_COLOR = 'rgba(255, 80, 150, 0.9)';
const DIAGONAL_COLOR = 'rgba(0, 200, 255, 0.8)';

function toStage(value: number, scale: number, offset: number): number {
  return offset + value * scale;
}

function MeasureLabel({ x, y, text }: { x: number; y: number; text: string }) {
  const padding = 4;
  const fontSize = 11;
  const textWidth = text.length * 7 + padding * 2;
  const textHeight = fontSize + padding * 2;

  return (
    <Group x={x - textWidth / 2} y={y - textHeight / 2}>
      <Rect
        width={textWidth}
        height={textHeight}
        fill="rgba(255, 80, 150, 0.95)"
        cornerRadius={3}
      />
      <Text
        text={text}
        width={textWidth}
        height={textHeight}
        align="center"
        verticalAlign="middle"
        fontSize={fontSize}
        fill="white"
        fontStyle="bold"
        listening={false}
      />
    </Group>
  );
}

function PointMarker({ x, y }: { x: number; y: number }) {
  return (
    <>
      <Circle x={x} y={y} radius={5} fill={MEASURE_COLOR} stroke="white" strokeWidth={1.5} />
      <Line
        points={[x - 8, y, x + 8, y, x, y - 8, x, y + 8]}
        stroke="white"
        strokeWidth={1}
      />
    </>
  );
}

export const MeasureOverlay: React.FC<MeasureOverlayProps> = ({ p1, p2, scale, offset }) => {
  const metrics = computeMeasureMetrics(p1, p2);
  const absDx = Math.abs(metrics.dx);
  const absDy = Math.abs(metrics.dy);

  const stageP1 = {
    x: toStage(p1.x, scale, offset.x),
    y: toStage(p1.y, scale, offset.y),
  };
  const stageP2 = {
    x: toStage(p2.x, scale, offset.x),
    y: toStage(p2.y, scale, offset.y),
  };
  const corner = { x: stageP2.x, y: stageP1.y };

  const midDiagonal = {
    x: (stageP1.x + stageP2.x) / 2,
    y: (stageP1.y + stageP2.y) / 2,
  };

  return (
    <Group listening={false}>
      <PointMarker x={stageP1.x} y={stageP1.y} />
      <PointMarker x={stageP2.x} y={stageP2.y} />

      <Line
        points={[stageP1.x, stageP1.y, stageP2.x, stageP2.y]}
        stroke={DIAGONAL_COLOR}
        strokeWidth={1}
        dash={[4, 4]}
      />

      {absDx > 1 && (
        <Group>
          <Line
            points={[stageP1.x, stageP1.y, corner.x, corner.y]}
            stroke={MEASURE_COLOR}
            strokeWidth={1}
          />
          <Line
            points={[stageP1.x, stageP1.y - 4, stageP1.x, stageP1.y + 4]}
            stroke={MEASURE_COLOR}
            strokeWidth={1}
          />
          <Line
            points={[corner.x, corner.y - 4, corner.x, corner.y + 4]}
            stroke={MEASURE_COLOR}
            strokeWidth={1}
          />
          <MeasureLabel
            x={(stageP1.x + corner.x) / 2}
            y={stageP1.y - 14}
            text={`Δx ${Math.round(absDx)}`}
          />
        </Group>
      )}

      {absDy > 1 && (
        <Group>
          <Line
            points={[corner.x, corner.y, stageP2.x, stageP2.y]}
            stroke={MEASURE_COLOR}
            strokeWidth={1}
          />
          <Line
            points={[corner.x - 4, corner.y, corner.x + 4, corner.y]}
            stroke={MEASURE_COLOR}
            strokeWidth={1}
          />
          <Line
            points={[stageP2.x - 4, stageP2.y, stageP2.x + 4, stageP2.y]}
            stroke={MEASURE_COLOR}
            strokeWidth={1}
          />
          <MeasureLabel
            x={stageP2.x + (metrics.dx >= 0 ? 28 : -28)}
            y={(corner.y + stageP2.y) / 2}
            text={`Δy ${Math.round(absDy)}`}
          />
        </Group>
      )}

      {metrics.distance > 1 && (
        <MeasureLabel
          x={midDiagonal.x}
          y={midDiagonal.y - 14}
          text={`${Math.round(metrics.distance)} px`}
        />
      )}
    </Group>
  );
};
