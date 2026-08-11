import React, { useRef, useCallback, useState } from 'react';
import { Group, Rect, Circle } from 'react-konva';
import type Konva from 'konva';
import {
  cellOrigin,
  cellSlotOrigin,
  clampGridPadding,
  gridConfigFromGroup,
  resizeGridBlockFromHandle,
  type GridBlockResizeHandle,
  type GridBounds,
} from '@/features/editor/domain/services/grid-layout';
import type { GridEditSettings } from '@/features/editor/domain/services/grid-edit-types';
import { normalizeGridSettings } from '@/features/editor/domain/services/grid-edit-types';

export type GridBlockHandle = GridBlockResizeHandle | 'move';

interface GridBlockHandlesProps {
  bounds: GridBounds;
  settings: GridEditSettings;
  scale: number;
  offset: { x: number; y: number };
  onSettingsChange: (updates: Partial<GridEditSettings>) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

const HANDLE_RADIUS = 7;
const HANDLE_RADIUS_HOVER = 9;
const GRID_COLOR = 'hsl(168, 76%, 42%)';

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

const CORNER_HANDLES: { handle: GridBlockResizeHandle; cursor: string }[] = [
  { handle: 'nw', cursor: 'nwse-resize' },
  { handle: 'ne', cursor: 'nesw-resize' },
  { handle: 'sw', cursor: 'nesw-resize' },
  { handle: 'se', cursor: 'nwse-resize' },
];

const EDGE_HANDLES: { handle: GridBlockResizeHandle; cursor: string }[] = [
  { handle: 'n', cursor: 'ns-resize' },
  { handle: 's', cursor: 'ns-resize' },
  { handle: 'w', cursor: 'ew-resize' },
  { handle: 'e', cursor: 'ew-resize' },
];

function handlePosition(
  block: { x: number; y: number; width: number; height: number },
  handle: GridBlockHandle,
): { x: number; y: number } {
  const { x, y, width, height } = block;
  switch (handle) {
    case 'nw':
      return { x, y };
    case 'n':
      return { x: x + width / 2, y };
    case 'ne':
      return { x: x + width, y };
    case 'w':
      return { x, y: y + height / 2 };
    case 'move':
      return { x: x + width / 2, y: y + height / 2 };
    case 'e':
      return { x: x + width, y: y + height / 2 };
    case 'sw':
      return { x, y: y + height };
    case 's':
      return { x: x + width / 2, y: y + height };
    case 'se':
      return { x: x + width, y: y + height };
  }
}

function paddingFromBlockPosition(
  bounds: GridBounds,
  settings: GridEditSettings,
  blockPos: { x: number; y: number },
): Partial<GridEditSettings> {
  const config = gridConfigFromGroup(bounds, settings);
  const slotOrigin = cellSlotOrigin(0, 0, config);
  const offsetX = Math.round(blockPos.x - slotOrigin.x);
  const offsetY = Math.round(blockPos.y - slotOrigin.y);

  return {
    alignH: 'left',
    alignV: 'top',
    padding: clampGridPadding(
      bounds,
      { ...settings, alignH: 'left', alignV: 'top' },
      { x: offsetX, y: offsetY },
    ),
  };
}

export const GridBlockHandles: React.FC<GridBlockHandlesProps> = ({
  bounds,
  settings,
  scale,
  offset,
  onSettingsChange,
  onDragStart,
  onDragEnd,
}) => {
  const normalized = normalizeGridSettings(settings);
  const config = gridConfigFromGroup(bounds, normalized);
  const blockOrigin = cellOrigin(0, 0, config);
  const block = {
    x: blockOrigin.x,
    y: blockOrigin.y,
    width: normalized.rectWidth,
    height: normalized.rectHeight,
  };

  const [hoveredHandle, setHoveredHandle] = useState<GridBlockHandle | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const dragStartBlock = useRef(block);
  const dragStartSettings = useRef(normalized);
  const dragStartPointer = useRef<{ x: number; y: number } | null>(null);

  const beginDrag = useCallback(
    (handle: GridBlockHandle) => (event: Konva.KonvaEventObject<DragEvent>) => {
      event.cancelBubble = true;
      setIsDragging(true);
      dragStartBlock.current = { ...block };
      dragStartSettings.current = { ...normalized };
      const stage = event.target.getStage();
      const pointer = stage?.getPointerPosition();
      dragStartPointer.current = pointer
        ? { x: fromStage(pointer.x, scale, offset.x), y: fromStage(pointer.y, scale, offset.y) }
        : null;
      onDragStart?.();
    },
    [block, normalized, scale, offset, onDragStart],
  );

  const endDrag = useCallback(
    (event: Konva.KonvaEventObject<DragEvent>) => {
      event.cancelBubble = true;
      setIsDragging(false);
      dragStartPointer.current = null;
      onDragEnd?.();
    },
    [onDragEnd],
  );

  const onHandleDrag = useCallback(
    (handle: GridBlockHandle) => (event: Konva.KonvaEventObject<DragEvent>) => {
      event.cancelBubble = true;

      const startBlock = dragStartBlock.current;
      const startSettings = dragStartSettings.current;
      const startPointer = dragStartPointer.current;
      if (!startPointer) return;

      const stage = event.target.getStage();
      const pointer = stage?.getPointerPosition();
      if (!pointer) return;

      const currentPointer = {
        x: fromStage(pointer.x, scale, offset.x),
        y: fromStage(pointer.y, scale, offset.y),
      };
      const dx = currentPointer.x - startPointer.x;
      const dy = currentPointer.y - startPointer.y;

      if (handle === 'move') {
        onSettingsChange(
          paddingFromBlockPosition(bounds, startSettings, {
            x: startBlock.x + dx,
            y: startBlock.y + dy,
          }),
        );
        return;
      }

      const result = resizeGridBlockFromHandle(
        startBlock,
        handle,
        { dx, dy },
        bounds,
        startSettings,
      );

      onSettingsChange(result.settings);
    },
    [bounds, scale, offset, onSettingsChange],
  );

  const frameX = toStage(block.x, scale, offset.x);
  const frameY = toStage(block.y, scale, offset.y);
  const frameW = block.width * scale;
  const frameH = block.height * scale;

  const renderHandle = (
    handle: GridBlockHandle,
    cursor: string,
    pos: { x: number; y: number },
  ) => {
    const cx = toStage(pos.x, scale, offset.x);
    const cy = toStage(pos.y, scale, offset.y);
    const isHovered = hoveredHandle === handle;
    const radius = isHovered || isDragging ? HANDLE_RADIUS_HOVER : HANDLE_RADIUS;

    return (
      <Circle
        key={handle}
        x={cx}
        y={cy}
        radius={radius}
        hitStrokeWidth={14}
        fill="white"
        stroke={GRID_COLOR}
        strokeWidth={isHovered ? 2.5 : 2}
        shadowColor={isHovered ? 'rgba(0, 180, 160, 0.35)' : undefined}
        shadowBlur={isHovered ? 8 : 0}
        draggable
        dragBoundFunc={() => ({ x: cx, y: cy })}
        onMouseDown={stopMouseDown}
        onDragStart={beginDrag(handle)}
        onDragMove={onHandleDrag(handle)}
        onDragEnd={endDrag}
        onMouseEnter={e => {
          setHoveredHandle(handle);
          setStageCursor(e, cursor);
        }}
        onMouseLeave={e => {
          setHoveredHandle(prev => (prev === handle ? null : prev));
          setStageCursor(e, 'default');
        }}
      />
    );
  };

  const isFrameHovered = hoveredHandle === 'move';

  return (
    <Group>
      <Rect
        x={frameX}
        y={frameY}
        width={frameW}
        height={frameH}
        fill={isFrameHovered || isDragging ? 'rgba(0, 200, 180, 0.12)' : 'rgba(0, 200, 180, 0.08)'}
        stroke={GRID_COLOR}
        strokeWidth={isFrameHovered || isDragging ? 2 : 1.5}
        draggable
        dragBoundFunc={() => ({ x: frameX, y: frameY })}
        onMouseDown={stopMouseDown}
        onDragStart={beginDrag('move')}
        onDragMove={onHandleDrag('move')}
        onDragEnd={endDrag}
        onMouseEnter={e => {
          setHoveredHandle('move');
          setStageCursor(e, 'move');
        }}
        onMouseLeave={e => {
          setHoveredHandle(prev => (prev === 'move' ? null : prev));
          setStageCursor(e, 'default');
        }}
      />

      {CORNER_HANDLES.map(({ handle, cursor }) =>
        renderHandle(handle, cursor, handlePosition(block, handle)),
      )}

      {EDGE_HANDLES.map(({ handle, cursor }) =>
        renderHandle(handle, cursor, handlePosition(block, handle)),
      )}
    </Group>
  );
};
