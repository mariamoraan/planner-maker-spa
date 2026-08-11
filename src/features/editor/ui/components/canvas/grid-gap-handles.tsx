import React, { useRef, useCallback, useState } from 'react';
import { Group, Rect, Text } from 'react-konva';
import type Konva from 'konva';
import {
  getGridGap,
  gridConfigFromGroup,
  gridDimensionLabels,
  gridLinePositions,
  scaleGridSettingsForGapChange,
  type GridBounds,
} from '@/features/editor/domain/services/grid-layout';
import type { GridEditSettings } from '@/features/editor/domain/services/grid-edit-types';
import { normalizeGridSettings } from '@/features/editor/domain/services/grid-edit-types';

interface GridGapHandlesProps {
  bounds: GridBounds;
  settings: GridEditSettings;
  scale: number;
  offset: { x: number; y: number };
  onGapPreview: (previewSettings: Partial<GridEditSettings>) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

const GAP_HIT_WIDTH = 12;
const GRID_COLOR = 'hsl(168, 76%, 42%)';
const GRID_COLOR_ACTIVE = 'hsl(168, 76%, 36%)';

function toStage(value: number, scale: number, offsetValue: number): number {
  return offsetValue + value * scale;
}

function fromStage(value: number, scale: number, offsetValue: number): number {
  return (value - offsetValue) / scale;
}

function stopMouseDown(event: Konva.KonvaEventObject<MouseEvent>) {
  event.cancelBubble = true;
}

function setStageCursor(event: Konva.KonvaEventObject<MouseEvent>, cursor: string) {
  const container = event.target.getStage()?.container();
  if (container) container.style.cursor = cursor;
}

export const GridGapHandles: React.FC<GridGapHandlesProps> = ({
  bounds,
  settings,
  scale,
  offset,
  onGapPreview,
  onDragStart,
  onDragEnd,
}) => {
  const normalized = normalizeGridSettings(settings);
  const config = gridConfigFromGroup(bounds, normalized);
  const lines = gridLinePositions(config);
  const currentGap = getGridGap(bounds, normalized);
  const labels = gridDimensionLabels(config, {
    width: normalized.rectWidth,
    height: normalized.rectHeight,
  });

  const [activeAxis, setActiveAxis] = useState<'x' | 'y' | null>(null);
  const [hoveredAxis, setHoveredAxis] = useState<'x' | 'y' | null>(null);

  const dragStartGap = useRef(currentGap);
  const dragStartPointer = useRef<{ x: number; y: number } | null>(null);

  const canDragX = normalized.cols >= 2;
  const canDragY = normalized.rows >= 2;

  const beginDrag = useCallback(
    (axis: 'x' | 'y') => (event: Konva.KonvaEventObject<DragEvent>) => {
      event.cancelBubble = true;
      setActiveAxis(axis);
      dragStartGap.current = { ...currentGap };
      const stage = event.target.getStage();
      const pointer = stage?.getPointerPosition();
      dragStartPointer.current = pointer
        ? { x: fromStage(pointer.x, scale, offset.x), y: fromStage(pointer.y, scale, offset.y) }
        : null;
      onDragStart?.();
    },
    [currentGap, scale, offset, onDragStart],
  );

  const endDrag = useCallback(
    (event: Konva.KonvaEventObject<DragEvent>) => {
      event.cancelBubble = true;
      setActiveAxis(null);
      dragStartPointer.current = null;
      onDragEnd?.();
    },
    [onDragEnd],
  );

  const onGapDrag = useCallback(
    (axis: 'x' | 'y') => (event: Konva.KonvaEventObject<DragEvent>) => {
      event.cancelBubble = true;
      const startGap = dragStartGap.current;
      const startPointer = dragStartPointer.current;
      if (!startPointer) return;

      const stage = event.target.getStage();
      const pointer = stage?.getPointerPosition();
      if (!pointer) return;

      const currentPointer = {
        x: fromStage(pointer.x, scale, offset.x),
        y: fromStage(pointer.y, scale, offset.y),
      };

      if (axis === 'x') {
        const dx = currentPointer.x - startPointer.x;
        const nextSettings = scaleGridSettingsForGapChange(bounds, normalized, {
          gapX: startGap.gapX + dx,
          gapY: startGap.gapY,
        });
        onGapPreview({
          gapX: nextSettings.gapX,
          gapY: nextSettings.gapY,
          rectWidth: nextSettings.rectWidth,
          rectHeight: nextSettings.rectHeight,
          padding: nextSettings.padding,
        });
        return;
      }

      const dy = currentPointer.y - startPointer.y;
      const nextSettings = scaleGridSettingsForGapChange(bounds, normalized, {
        gapX: startGap.gapX,
        gapY: startGap.gapY + dy,
      });
      onGapPreview({
        gapX: nextSettings.gapX,
        gapY: nextSettings.gapY,
        rectWidth: nextSettings.rectWidth,
        rectHeight: nextSettings.rectHeight,
        padding: nextSettings.padding,
      });
    },
    [bounds, normalized, scale, offset, onGapPreview],
  );

  const renderGapHandle = (
    axis: 'x' | 'y',
    linePos: number,
    cursor: string,
  ) => {
    const isActive = activeAxis === axis;
    const isHovered = hoveredAxis === axis;
    const highlighted = isActive || isHovered;

    if (axis === 'x') {
      const stageX = toStage(linePos, scale, offset.x);
      const stageY = toStage(bounds.y, scale, offset.y);
      const stageH = bounds.height * scale;

      return (
        <Group key="gap-x">
          <Rect
            x={stageX - (highlighted ? 1.5 : 0.75)}
            y={stageY}
            width={highlighted ? 3 : 1.5}
            height={stageH}
            fill={highlighted ? GRID_COLOR_ACTIVE : GRID_COLOR}
            opacity={highlighted ? 0.85 : 0.45}
            listening={false}
          />
          <Rect
            x={stageX - GAP_HIT_WIDTH / 2}
            y={stageY}
            width={GAP_HIT_WIDTH}
            height={stageH}
            fill="transparent"
            draggable
            dragBoundFunc={() => ({ x: stageX - GAP_HIT_WIDTH / 2, y: stageY })}
            onMouseDown={stopMouseDown}
            onDragStart={beginDrag('x')}
            onDragMove={onGapDrag('x')}
            onDragEnd={endDrag}
            onMouseEnter={e => {
              setHoveredAxis('x');
              setStageCursor(e, cursor);
            }}
            onMouseLeave={e => {
              setHoveredAxis(prev => (prev === 'x' ? null : prev));
              setStageCursor(e, 'default');
            }}
          />
        </Group>
      );
    }

    const stageY = toStage(linePos, scale, offset.y);
    const stageX = toStage(bounds.x, scale, offset.x);
    const stageW = bounds.width * scale;

    return (
      <Group key="gap-y">
        <Rect
          x={stageX}
          y={stageY - (highlighted ? 1.5 : 0.75)}
          width={stageW}
          height={highlighted ? 3 : 1.5}
          fill={highlighted ? GRID_COLOR_ACTIVE : GRID_COLOR}
          opacity={highlighted ? 0.85 : 0.45}
          listening={false}
        />
        <Rect
          x={stageX}
          y={stageY - GAP_HIT_WIDTH / 2}
          width={stageW}
          height={GAP_HIT_WIDTH}
          fill="transparent"
          draggable
          dragBoundFunc={() => ({ x: stageX, y: stageY - GAP_HIT_WIDTH / 2 })}
          onMouseDown={stopMouseDown}
          onDragStart={beginDrag('y')}
          onDragMove={onGapDrag('y')}
          onDragEnd={endDrag}
          onMouseEnter={e => {
            setHoveredAxis('y');
            setStageCursor(e, cursor);
          }}
          onMouseLeave={e => {
            setHoveredAxis(prev => (prev === 'y' ? null : prev));
            setStageCursor(e, 'default');
          }}
        />
      </Group>
    );
  };

  const renderLabel = (
    label: { x: number; y: number; text: string } | null,
    key: string,
  ) => {
    if (!label) return null;
    const sx = toStage(label.x, scale, offset.x);
    const sy = toStage(label.y, scale, offset.y);
    const pillW = label.text.length * 6.5 + 14;

    return (
      <Group key={key} listening={false}>
        <Rect
          x={sx - pillW / 2}
          y={sy - 20}
          width={pillW}
          height={18}
          fill={GRID_COLOR}
          cornerRadius={4}
          shadowColor="rgba(0,0,0,0.15)"
          shadowBlur={4}
          shadowOffsetY={1}
        />
        <Text
          x={sx - pillW / 2 + 7}
          y={sy - 17}
          text={label.text}
          fontSize={11}
          fill="white"
          fontStyle="600"
        />
      </Group>
    );
  };

  const showLabels = activeAxis !== null;

  return (
    <Group>
      {canDragX && lines.vertical.length >= 2 && renderGapHandle('x', lines.vertical[1]!, 'ew-resize')}
      {canDragY && lines.horizontal.length >= 2 && renderGapHandle('y', lines.horizontal[1]!, 'ns-resize')}
      {showLabels && (
        <>
          {activeAxis === 'x' && renderLabel(labels.gapX, 'gap-x-label')}
          {activeAxis === 'y' && renderLabel(labels.gapY, 'gap-y-label')}
        </>
      )}
    </Group>
  );
};
