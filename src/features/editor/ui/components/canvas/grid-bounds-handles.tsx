import React, { useRef, useCallback } from 'react';
import { Group, Rect, Circle, Line, Text } from 'react-konva';
import type Konva from 'konva';
import {
  GRID_HANDLE_OUTSET,
  resizeGridBounds,
  resizeGridPitch,
  translateGridBounds,
  pitchFromBounds,
  type GridBounds,
  type GridBoundsHandle,
} from '@/features/editor/domain/services/grid-layout';

export type GridInteractionHandle = GridBoundsHandle | 'move' | 'gutterX' | 'gutterY';
export type ActiveGridGutter = 'x' | 'y' | null;

interface GridBoundsHandlesProps {
  bounds: GridBounds;
  cols: number;
  rows: number;
  scale: number;
  offset: { x: number; y: number };
  onBoundsChange: (bounds: GridBounds) => void;
  onActiveGutterChange?: (gutter: ActiveGridGutter) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

const HANDLE_RADIUS = 9;
const MIN_BOUNDS = 40;
const MIN_PITCH = 8;
const GUTTER_HIT = 18;
const PILL_W = 28;
const PILL_H = 18;

function toStage(value: number, scale: number, offsetValue: number): number {
  return offsetValue + value * scale;
}

function fromStage(value: number, scale: number, offsetValue: number): number {
  return (value - offsetValue) / scale;
}

function resetDragNode(event: Konva.KonvaEventObject<DragEvent>) {
  event.target.position({ x: 0, y: 0 });
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
  cols,
  rows,
  scale,
  offset,
  onBoundsChange,
  onActiveGutterChange,
  onDragStart,
  onDragEnd,
}) => {
  const dragStartBounds = useRef<GridBounds | null>(null);
  const dragStartPointer = useRef<{ x: number; y: number } | null>(null);

  const gutterXPosition = () => {
    const pitch = pitchFromBounds(bounds, cols, rows);
    return bounds.x + pitch.pitchX;
  };

  const gutterYPosition = () => {
    const pitch = pitchFromBounds(bounds, cols, rows);
    return bounds.y + pitch.pitchY;
  };

  const beginDrag = useCallback(
    (handle: GridInteractionHandle) => (event: Konva.KonvaEventObject<DragEvent>) => {
      event.cancelBubble = true;
      dragStartBounds.current = { ...bounds };
      const stage = event.target.getStage();
      const pointer = stage?.getPointerPosition();
      dragStartPointer.current = pointer
        ? { x: fromStage(pointer.x, scale, offset.x), y: fromStage(pointer.y, scale, offset.y) }
        : null;
      if (handle === 'gutterX') onActiveGutterChange?.('x');
      if (handle === 'gutterY') onActiveGutterChange?.('y');
      onDragStart?.();
    },
    [bounds, scale, offset, onDragStart, onActiveGutterChange],
  );

  const endDrag = useCallback(
    (event: Konva.KonvaEventObject<DragEvent>) => {
      event.cancelBubble = true;
      resetDragNode(event);
      dragStartBounds.current = null;
      dragStartPointer.current = null;
      onActiveGutterChange?.(null);
      onDragEnd?.();
    },
    [onDragEnd, onActiveGutterChange],
  );

  const onHandleDrag = useCallback(
    (handle: GridInteractionHandle) => (event: Konva.KonvaEventObject<DragEvent>) => {
      event.cancelBubble = true;
      resetDragNode(event);

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
      const dx = currentPointer.x - startPointer.x;
      const dy = currentPointer.y - startPointer.y;
      const symmetric = event.evt.shiftKey;

      if (handle === 'move') {
        onBoundsChange(translateGridBounds(startBounds, dx, dy));
        return;
      }

      if (handle === 'gutterX') {
        onBoundsChange(resizeGridPitch(startBounds, cols, rows, 'x', dx, MIN_PITCH));
        return;
      }

      if (handle === 'gutterY') {
        onBoundsChange(resizeGridPitch(startBounds, cols, rows, 'y', dy, MIN_PITCH));
        return;
      }

      onBoundsChange(
        resizeGridBounds(startBounds, handle, { dx, dy }, {
          minWidth: MIN_BOUNDS,
          minHeight: MIN_BOUNDS,
          symmetric,
        }),
      );
    },
    [scale, offset, onBoundsChange, cols, rows],
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

  const renderGutterPill = (
    handle: 'gutterX' | 'gutterY',
    centerX: number,
    centerY: number,
    label: string,
    cursor: string,
  ) => {
    const cx = toStage(centerX, scale, offset.x);
    const cy = toStage(centerY, scale, offset.y);

    return (
      <Group
        key={handle}
        x={cx}
        y={cy}
        draggable
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
      >
        <Rect
          x={-PILL_W / 2}
          y={-PILL_H / 2}
          width={PILL_W}
          height={PILL_H}
          fill="hsl(168, 76%, 42%)"
          cornerRadius={9}
          shadowColor="rgba(0,0,0,0.2)"
          shadowBlur={4}
          shadowOffsetY={1}
        />
        <Text
          x={-PILL_W / 2}
          y={-5}
          width={PILL_W}
          align="center"
          text={label}
          fontSize={12}
          fill="white"
          fontStyle="bold"
        />
      </Group>
    );
  };

  const showGutterX = cols >= 2;
  const showGutterY = rows >= 2;
  const gutterX = gutterXPosition();
  const gutterY = gutterYPosition();

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

      {showGutterX && (
        <>
          <Line
            points={[
              toStage(gutterX, scale, offset.x),
              toStage(bounds.y, scale, offset.y),
              toStage(gutterX, scale, offset.x),
              toStage(bounds.y + bounds.height, scale, offset.y),
            ]}
            stroke="hsl(168, 90%, 38%)"
            strokeWidth={3}
            dash={[6, 4]}
            hitStrokeWidth={GUTTER_HIT}
            draggable
            onMouseDown={stopMouseDown}
            onDragStart={beginDrag('gutterX')}
            onDragMove={onHandleDrag('gutterX')}
            onDragEnd={endDrag}
          />
          {renderGutterPill(
            'gutterX',
            gutterX,
            bounds.y + bounds.height / 2,
            '↔',
            'ew-resize',
          )}
        </>
      )}

      {showGutterY && (
        <>
          <Line
            points={[
              toStage(bounds.x, scale, offset.x),
              toStage(gutterY, scale, offset.y),
              toStage(bounds.x + bounds.width, scale, offset.x),
              toStage(gutterY, scale, offset.y),
            ]}
            stroke="hsl(168, 90%, 38%)"
            strokeWidth={3}
            dash={[6, 4]}
            hitStrokeWidth={GUTTER_HIT}
            draggable
            onMouseDown={stopMouseDown}
            onDragStart={beginDrag('gutterY')}
            onDragMove={onHandleDrag('gutterY')}
            onDragEnd={endDrag}
          />
          {renderGutterPill(
            'gutterY',
            bounds.x + bounds.width / 2,
            gutterY,
            '↕',
            'ns-resize',
          )}
        </>
      )}

      {CORNER_HANDLES.map(({ handle, cursor }) =>
        renderHandle(handle, cursor, handlePosition(bounds, handle)),
      )}

      {EDGE_HANDLES.map(({ handle, cursor }) =>
        renderHandle(handle, cursor, handlePosition(bounds, handle)),
      )}
    </Group>
  );
};
