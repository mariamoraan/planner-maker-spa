import React from 'react';
import { Group, Line, Text, Rect } from 'react-konva';
import type { SnapGuide } from '@/features/editor/domain/services/canvas-snap';

interface SnapGuidesOverlayProps {
  guides: SnapGuide[];
  scale: number;
  offset: { x: number; y: number };
}

const ALIGN_COLOR = 'rgba(0, 200, 255, 0.8)';
const DISTANCE_COLOR = 'rgba(255, 80, 150, 0.9)';
const SPACING_COLOR = 'rgba(255, 80, 150, 0.9)';

function toStage(value: number, scale: number, offset: number): number {
  return offset + value * scale;
}

function GuideLabel({ x, y, text }: { x: number; y: number; text: string }) {
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

function GuideSegment({ guide, scale, offset }: { guide: SnapGuide; scale: number; offset: { x: number; y: number } }) {
  if (guide.type === 'align-x' && guide.x !== undefined) {
    const stageX = toStage(guide.x, scale, offset.x);
    const y1 = toStage(guide.y1 ?? 0, scale, offset.y);
    const y2 = toStage(guide.y2 ?? 0, scale, offset.y);
    return (
      <Line
        points={[stageX, y1, stageX, y2]}
        stroke={ALIGN_COLOR}
        strokeWidth={1}
        dash={[4, 4]}
      />
    );
  }

  if (guide.type === 'align-y' && guide.y !== undefined) {
    const stageY = toStage(guide.y, scale, offset.y);
    const x1 = toStage(guide.x1 ?? 0, scale, offset.x);
    const x2 = toStage(guide.x2 ?? 0, scale, offset.x);
    return (
      <Line
        points={[x1, stageY, x2, stageY]}
        stroke={ALIGN_COLOR}
        strokeWidth={1}
        dash={[4, 4]}
      />
    );
  }

  if (
    (guide.type === 'distance-h' || guide.type === 'spacing-h') &&
    guide.x1 !== undefined &&
    guide.x2 !== undefined
  ) {
    const color = guide.type === 'spacing-h' ? SPACING_COLOR : DISTANCE_COLOR;
    const strokeWidth = guide.type === 'spacing-h' ? 1.5 : 1;
    const stageY = toStage(guide.y ?? guide.y1 ?? 0, scale, offset.y);
    const x1 = toStage(guide.x1, scale, offset.x);
    const x2 = toStage(guide.x2, scale, offset.x);
    const midX = (x1 + x2) / 2;
    const segmentLength = Math.abs(x2 - x1);
    return (
      <Group>
        {segmentLength > 2 && (
          <>
            <Line points={[x1, stageY, x2, stageY]} stroke={color} strokeWidth={strokeWidth} />
            <Line points={[x1, stageY - 4, x1, stageY + 4]} stroke={color} strokeWidth={1} />
            <Line points={[x2, stageY - 4, x2, stageY + 4]} stroke={color} strokeWidth={1} />
          </>
        )}
        {guide.label && segmentLength > 8 && (
          <GuideLabel
            x={guide.labelX !== undefined ? toStage(guide.labelX, scale, offset.x) : midX}
            y={guide.labelY !== undefined ? toStage(guide.labelY, scale, offset.y) : stageY}
            text={`${Math.round(Math.abs(guide.x2 - guide.x1))}`}
          />
        )}
      </Group>
    );
  }

  if (
    (guide.type === 'distance-v' || guide.type === 'spacing-v') &&
    guide.y1 !== undefined &&
    guide.y2 !== undefined
  ) {
    const color = guide.type === 'spacing-v' ? SPACING_COLOR : DISTANCE_COLOR;
    const strokeWidth = guide.type === 'spacing-v' ? 1.5 : 1;
    const stageX = toStage(guide.x ?? guide.x1 ?? 0, scale, offset.x);
    const y1 = toStage(guide.y1, scale, offset.y);
    const y2 = toStage(guide.y2, scale, offset.y);
    const midY = (y1 + y2) / 2;
    const segmentLength = Math.abs(y2 - y1);
    return (
      <Group>
        {segmentLength > 2 && (
          <>
            <Line points={[stageX, y1, stageX, y2]} stroke={color} strokeWidth={strokeWidth} />
            <Line points={[stageX - 4, y1, stageX + 4, y1]} stroke={color} strokeWidth={1} />
            <Line points={[stageX - 4, y2, stageX + 4, y2]} stroke={color} strokeWidth={1} />
          </>
        )}
        {guide.label && segmentLength > 8 && (
          <GuideLabel
            x={guide.labelX !== undefined ? toStage(guide.labelX, scale, offset.x) : stageX}
            y={guide.labelY !== undefined ? toStage(guide.labelY, scale, offset.y) : midY}
            text={`${Math.round(Math.abs(guide.y2 - guide.y1))}`}
          />
        )}
      </Group>
    );
  }

  return null;
}

export const SnapGuidesOverlay: React.FC<SnapGuidesOverlayProps> = ({
  guides,
  scale,
  offset,
}) => {
  return (
    <Group listening={false}>
      {guides.map((guide, i) => (
        <Group key={`${guide.type}-${i}-${guide.x ?? guide.y ?? guide.x1 ?? guide.y1}`}>
          <GuideSegment guide={guide} scale={scale} offset={offset} />
        </Group>
      ))}
    </Group>
  );
};
