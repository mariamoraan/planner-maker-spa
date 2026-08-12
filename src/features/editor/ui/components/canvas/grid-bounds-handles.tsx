import React, { useRef, useCallback } from 'react';
import { Group, Rect, Circle } from 'react-konva';
import type Konva from 'konva';
import {
  GRID_HANDLE_OUTSET,
  resizeGridBounds,
  translateGridBounds,
  type GridBounds,
  type GridBoundsHandle,
} from '@/features/editor/domain/services/grid-layout';
import {
  resolveDragAxisLock,
  type DragAxisLock,
} from '@/features/editor/domain/services/drag-axis-lock';

export type GridInteractionHandle = GridBoundsHandle | 'move';

interface GridBoundsHandlesProps {
  bounds: GridBounds;
  scale: number;
  offset: { x: number; y: number };
  minBounds?: { width: number; height: number };
  onBoundsChange: (bounds: GridBounds) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

const HANDLE_RADIUS = 9;
const MIN_BOUNDS = 40;

function toStage(value: number, scale: number, offsetValue: number): number {
  return offsetValue + value * scale;
}

function fromStage(value: number, scale: number, offsetValue: number): number {
  return (value - offsetValue) / scale;
}

function stopMouseDown(event: Konva.KonvaEventObject<MouseEvent>) {
  event.cancelBubble = true;
}

const CORNER_HANDLES: { handle: GridBoundsHandle; cursor: string }[] = [
  { handle: 'nw', cursor: 'nwse-resize' },
  { handle: 'ne', cursor: 'nesw-resize' },
  { handle: 'sw', cursor: 'nesw-resize' },
  { handle: 'se', cursor: 'nwse-resize' },
];

const EDGE_HANDLES: { handle: GridBoundsHandle; cursor: string }[] = [
  { handle: 'n', cursor: 'ns-resize' },
  { handle: 's', cursor: 'ns-resize' },
  { handle: 'w', cursor: 'ew-resize' },
  { handle: 'e', cursor: 'ew-resize' },
];

function handlePosition(
  bounds: GridBounds,
  handle: GridInteractionHandle,
  outset = GRID_HANDLE_OUTSET,
): { x: number; y: number } {
  const { x, y, width, height } = bounds;
  switch (handle) {
    case 'nw':
      return { x: x - outset, y: y - outset };
    case 'n':
      return { x: x + width / 2, y: y - outset };
    case 'ne':
      return { x: x + width + outset, y: y - outset };
    case 'w':
      return { x: x - outset, y: y + height / 2 };
    case 'move':
      return { x: x + width / 2, y: y + height / 2 };
    case 'e':
      return { x: x + width + outset, y: y + height / 2 };
    case 'sw':
      return { x: x - outset, y: y + height + outset };
    case 's':
      return { x: x + width / 2, y: y + height + outset };
    case 'se':
      return { x: x + width + outset, y: y + height + outset };
  }
}

export const GridBoundsHandles: React.FC<GridBoundsHandlesProps> = ({
  bounds,
  scale,
  offset,
  minBounds,
  onBoundsChange,
  onDragStart,
  onDragEnd,
}) => {
  const dragStartBounds = useRef<GridBounds | null>(null);
  const dragStartPointer = useRef<{ x: number; y: number } | null>(null);
  const dragAxisLockRef = useRef<DragAxisLock | null>(null);

  const beginDrag = useCallback(
    (handle: GridInteractionHandle) => (event: Konva.KonvaEventObject<DragEvent>) => {
      event.cancelBubble = true;
      dragStartBounds.current = { ...bounds };
      dragAxisLockRef.current = null;
      const stage = event.target.getStage();
      const pointer = stage?.getPointerPosition();
      dragStartPointer.current = pointer
        ? { x: fromStage(pointer.x, scale, offset.x), y: fromStage(pointer.y, scale, offset.y) }
        : null;
      onDragStart?.();
    },
    [bounds, scale, offset, onDragStart],
  );

  const endDrag = useCallback(
    (event: Konva.KonvaEventObject<DragEvent>) => {
      event.cancelBubble = true;
      dragStartBounds.current = null;
      dragStartPointer.current = null;
      dragAxisLockRef.current = null;
      onDragEnd?.();
    },
    [onDragEnd],
  );

  const onHandleDrag = useCallback(
    (handle: GridInteractionHandle) => (event: Konva.KonvaEventObject<DragEvent>) => {
      event.cancelBubble = true;

      const startBounds = dragStartBounds.current;
      const startPointer = dragStartPointer.current;
      if (!startBounds || !startPointer) return;

      const stage = event.target.getStage();
      const pointer = stage?.getPointerPosition();
      if (!pointer) return;

      const currentPointer = {
        x: fromStage(pointer.x, scale, offset.x),
        y: fromStage(pointer.y, scale, offset.y),
      };
      let dx = currentPointer.x - startPointer.x;
      let dy = currentPointer.y - startPointer.y;
      const symmetric = event.evt.shiftKey;

      if (handle === 'move') {
        const axisLocked = resolveDragAxisLock(
          dx,
          dy,
          event.evt.shiftKey,
          dragAxisLockRef.current,
        );
        dragAxisLockRef.current = axisLocked.lock;
        dx = axisLocked.dx;
        dy = axisLocked.dy;
        onBoundsChange(translateGridBounds(startBounds, dx, dy));
        return;
      }

      onBoundsChange(
        resizeGridBounds(startBounds, handle, { dx, dy }, {
          minWidth: minBounds?.width ?? MIN_BOUNDS,
          minHeight: minBounds?.height ?? MIN_BOUNDS,
          symmetric,
        }),
      );
    },
    [scale, offset, onBoundsChange, minBounds],
  );

  const frameX = toStage(bounds.x, scale, offset.x);
  const frameY = toStage(bounds.y, scale, offset.y);
  const frameW = bounds.width * scale;
  const frameH = bounds.height * scale;

  const renderHandle = (
    handle: GridInteractionHandle,
    cursor: string,
    pos: { x: number; y: number },
  ) => {
    const cx = toStage(pos.x, scale, offset.x);
    const cy = toStage(pos.y, scale, offset.y);

    return (
      <Circle
        key={handle}
        x={cx}
        y={cy}
        radius={HANDLE_RADIUS}
        hitStrokeWidth={14}
        fill="white"
        stroke="hsl(168, 76%, 42%)"
        strokeWidth={2}
        draggable
        dragBoundFunc={() => ({ x: cx, y: cy })}
        onMouseDown={stopMouseDown}
        onDragStart={beginDrag(handle)}
        onDragMove={onHandleDrag(handle)}
        onDragEnd={endDrag}
        onMouseEnter={e => {
          const container = e.target.getStage()?.container();
          if (container) container.style.cursor = cursor;
        }}
        onMouseLeave={e => {
          const container = e.target.getStage()?.container();
          if (container) container.style.cursor = 'default';
        }}
      />
    );
  };

  return (
    <Group>
      <Rect
        x={frameX}
        y={frameY}
        width={frameW}
        height={frameH}
        fill="rgba(0, 200, 180, 0.04)"
        stroke="hsl(168, 76%, 42%)"
        strokeWidth={1.5}
        dash={[6, 4]}
        draggable
        dragBoundFunc={() => ({ x: frameX, y: frameY })}
        onMouseDown={stopMouseDown}
        onDragStart={beginDrag('move')}
        onDragMove={onHandleDrag('move')}
        onDragEnd={endDrag}
        onMouseEnter={e => {
          const container = e.target.getStage()?.container();
          if (container) container.style.cursor = 'move';
        }}
        onMouseLeave={e => {
          const container = e.target.getStage()?.container();
          if (container) container.style.cursor = 'default';
        }}
      />

      {CORNER_HANDLES.map(({ handle, cursor }) =>
        renderHandle(handle, cursor, handlePosition(bounds, handle)),
      )}

      {EDGE_HANDLES.map(({ handle, cursor }) =>
        renderHandle(handle, cursor, handlePosition(bounds, handle)),
      )}
    </Group>
  );
};
