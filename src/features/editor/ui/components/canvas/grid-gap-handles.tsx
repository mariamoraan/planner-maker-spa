import React, { useRef, useCallback, useState, useEffect } from 'react';
import { Group, Rect, Text } from 'react-konva';
import type Konva from 'konva';
import {
  getGridGap,
  gapGutterBands,
  gridConfigFromGroup,
  scaleGridSettingsForGapChange,
  type GridBounds,
  type GridGapGutterBand,
} from '@/features/editor/domain/services/grid-layout';
import type { GridEditSettings } from '@/features/editor/domain/services/grid-edit-types';
import { normalizeGridSettings } from '@/features/editor/domain/services/grid-edit-types';
import {
  EDITOR_CHROME_INK,
  EDITOR_CHROME_INK_ACTIVE,
  EDITOR_CHROME_INK_GUTTER,
} from '@/features/editor/domain/constants/editor-chrome';

interface GridGapHandlesProps {
  bounds: GridBounds;
  settings: GridEditSettings;
  scale: number;
  offset: { x: number; y: number };
  onGapPreview: (previewSettings: Partial<GridEditSettings>) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

const GAP_HIT_MIN = 12;
const EDGE_STROKE = 2;
const GRID_COLOR = EDITOR_CHROME_INK;
const GRID_COLOR_ACTIVE = EDITOR_CHROME_INK_ACTIVE;
const GUTTER_FILL = EDITOR_CHROME_INK_GUTTER;

function toStage(value: number, scale: number, offsetValue: number): number {
  return offsetValue + value * scale;
}

function fromStage(value: number, scale: number, offsetValue: number): number {
  return (value - offsetValue) / scale;
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
  const gutters = gapGutterBands(config);
  const currentGap = getGridGap(bounds, normalized);

  const [activeAxis, setActiveAxis] = useState<'x' | 'y' | null>(null);
  const [hoveredAxis, setHoveredAxis] = useState<'x' | 'y' | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const dragAxisRef = useRef<'x' | 'y' | null>(null);
  const dragStartGap = useRef(currentGap);
  const dragStartSettings = useRef(normalized);
  const dragStartPointer = useRef<{ x: number; y: number } | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const scaleRef = useRef(scale);
  const offsetRef = useRef(offset);
  const boundsRef = useRef(bounds);
  const onGapPreviewRef = useRef(onGapPreview);
  const onDragEndRef = useRef(onDragEnd);

  scaleRef.current = scale;
  offsetRef.current = offset;
  boundsRef.current = bounds;
  onGapPreviewRef.current = onGapPreview;
  onDragEndRef.current = onDragEnd;

  const canDragX = normalized.cols >= 2;
  const canDragY = normalized.rows >= 2;
  const highlightedAxis = activeAxis ?? hoveredAxis;

  const applyGapFromPointer = useCallback((axis: 'x' | 'y', pointerImage: { x: number; y: number }) => {
    const startGap = dragStartGap.current;
    const startPointer = dragStartPointer.current;
    if (!startPointer) return;

    const settingsAtStart = dragStartSettings.current;
    const boundsNow = boundsRef.current;

    if (axis === 'x') {
      const dx = pointerImage.x - startPointer.x;
      const nextSettings = scaleGridSettingsForGapChange(boundsNow, settingsAtStart, {
        gapX: startGap.gapX + dx,
        gapY: startGap.gapY,
      });
      onGapPreviewRef.current({
        gap: { x: nextSettings.gapX, y: nextSettings.gapY },
        gapX: nextSettings.gapX,
        gapY: nextSettings.gapY,
        rectWidth: nextSettings.rectWidth,
        rectHeight: nextSettings.rectHeight,
        padding: nextSettings.padding,
      });
      return;
    }

    const dy = pointerImage.y - startPointer.y;
    const nextSettings = scaleGridSettingsForGapChange(boundsNow, settingsAtStart, {
      gapX: startGap.gapX,
      gapY: startGap.gapY + dy,
    });
    onGapPreviewRef.current({
      gap: { x: nextSettings.gapX, y: nextSettings.gapY },
      gapX: nextSettings.gapX,
      gapY: nextSettings.gapY,
      rectWidth: nextSettings.rectWidth,
      rectHeight: nextSettings.rectHeight,
      padding: nextSettings.padding,
    });
  }, []);

  const endPointerDrag = useCallback(() => {
    dragAxisRef.current = null;
    dragStartPointer.current = null;
    stageRef.current = null;
    setActiveAxis(null);
    onDragEndRef.current?.();
  }, []);

  useEffect(() => {
    if (activeAxis === null) return;

    const onMove = (event: MouseEvent) => {
      const axis = dragAxisRef.current;
      const stage = stageRef.current;
      if (!axis || !dragStartPointer.current || !stage) return;

      const rect = stage.container().getBoundingClientRect();
      applyGapFromPointer(axis, {
        x: fromStage(event.clientX - rect.left, scaleRef.current, offsetRef.current.x),
        y: fromStage(event.clientY - rect.top, scaleRef.current, offsetRef.current.y),
      });
    };

    const onUp = () => endPointerDrag();

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [activeAxis, applyGapFromPointer, endPointerDrag]);

  const beginPointerDrag = useCallback(
    (axis: 'x' | 'y') => (event: Konva.KonvaEventObject<MouseEvent>) => {
      event.cancelBubble = true;
      const stage = event.target.getStage();
      const pointer = stage?.getPointerPosition();
      if (!stage || !pointer) return;

      stageRef.current = stage;
      dragAxisRef.current = axis;
      setActiveAxis(axis);
      dragStartGap.current = { ...currentGap };
      dragStartSettings.current = normalized;
      dragStartPointer.current = {
        x: fromStage(pointer.x, scale, offset.x),
        y: fromStage(pointer.y, scale, offset.y),
      };
      onDragStart?.();
    },
    [currentGap, normalized, scale, offset, onDragStart],
  );

  const renderGutter = (gutter: GridGapGutterBand, cursor: string) => {
    const axis = gutter.axis;
    const showVisual =
      activeAxis === axis || (hoveredAxis === axis && hoveredIndex === gutter.index);
    const stroke = activeAxis === axis ? GRID_COLOR_ACTIVE : GRID_COLOR;

    if (axis === 'x') {
      const gutterW = Math.max(gutter.width, 0);
      const hitW = Math.max(gutterW * scale, GAP_HIT_MIN);
      const stageLeft = toStage(gutter.edge, scale, offset.x);
      const stageRight = toStage(gutter.edge + gutterW, scale, offset.x);
      const stageY = toStage(gutter.y, scale, offset.y);
      const stageH = gutter.height * scale;
      const hitX = toStage(gutter.edge + gutterW / 2, scale, offset.x) - hitW / 2;

      return (
        <Group key={`gap-x-${gutter.index}`}>
          {showVisual && (
            <Rect
              x={stageLeft}
              y={stageY}
              width={Math.max(stageRight - stageLeft, 2)}
              height={stageH}
              fill={GUTTER_FILL}
              listening={false}
            />
          )}
          {showVisual && (
            <>
              <Rect
                x={stageLeft - EDGE_STROKE / 2}
                y={stageY}
                width={EDGE_STROKE}
                height={stageH}
                fill={stroke}
                listening={false}
              />
              <Rect
                x={stageRight - EDGE_STROKE / 2}
                y={stageY}
                width={EDGE_STROKE}
                height={stageH}
                fill={stroke}
                listening={false}
              />
            </>
          )}
          <Rect
            x={hitX}
            y={stageY}
            width={hitW}
            height={stageH}
            fill="transparent"
            onMouseDown={beginPointerDrag('x')}
            onMouseEnter={e => {
              setHoveredAxis('x');
              setHoveredIndex(gutter.index);
              setStageCursor(e, cursor);
            }}
            onMouseLeave={e => {
              if (activeAxis === 'x') return;
              setHoveredAxis(prev => (prev === 'x' ? null : prev));
              setHoveredIndex(prev => (prev === gutter.index ? null : prev));
              setStageCursor(e, 'default');
            }}
          />
        </Group>
      );
    }

    const gutterH = Math.max(gutter.height, 0);
    const hitH = Math.max(gutterH * scale, GAP_HIT_MIN);
    const stageTop = toStage(gutter.edge, scale, offset.y);
    const stageBottom = toStage(gutter.edge + gutterH, scale, offset.y);
    const stageX = toStage(gutter.x, scale, offset.x);
    const stageW = gutter.width * scale;
    const hitY = toStage(gutter.edge + gutterH / 2, scale, offset.y) - hitH / 2;

    return (
      <Group key={`gap-y-${gutter.index}`}>
        {showVisual && (
          <Rect
            x={stageX}
            y={stageTop}
            width={stageW}
            height={Math.max(stageBottom - stageTop, 2)}
            fill={GUTTER_FILL}
            listening={false}
          />
        )}
        {showVisual && (
          <>
            <Rect
              x={stageX}
              y={stageTop - EDGE_STROKE / 2}
              width={stageW}
              height={EDGE_STROKE}
              fill={stroke}
              listening={false}
            />
            <Rect
              x={stageX}
              y={stageBottom - EDGE_STROKE / 2}
              width={stageW}
              height={EDGE_STROKE}
              fill={stroke}
              listening={false}
            />
          </>
        )}
        <Rect
          x={stageX}
          y={hitY}
          width={stageW}
          height={hitH}
          fill="transparent"
          onMouseDown={beginPointerDrag('y')}
          onMouseEnter={e => {
            setHoveredAxis('y');
            setHoveredIndex(gutter.index);
            setStageCursor(e, cursor);
          }}
          onMouseLeave={e => {
            if (activeAxis === 'y') return;
            setHoveredAxis(prev => (prev === 'y' ? null : prev));
            setHoveredIndex(prev => (prev === gutter.index ? null : prev));
            setStageCursor(e, 'default');
          }}
        />
      </Group>
    );
  };

  const renderGapLabel = () => {
    if (highlightedAxis === null) return null;

    const bands = highlightedAxis === 'x' ? gutters.vertical : gutters.horizontal;
    const index = hoveredIndex ?? 0;
    const gutter = bands[Math.min(Math.max(index, 0), Math.max(0, bands.length - 1))];
    if (!gutter) return null;

    const value = highlightedAxis === 'x' ? currentGap.gapX : currentGap.gapY;
    const text = `${Math.round(value)}px`;
    const pillW = text.length * 6.5 + 14;

    const midX =
      highlightedAxis === 'x'
        ? gutter.edge + Math.max(gutter.width, 0) / 2
        : gutter.x + gutter.width / 2;
    const midY =
      highlightedAxis === 'y'
        ? gutter.edge + Math.max(gutter.height, 0) / 2
        : gutter.y + gutter.height / 2;

    const sx = toStage(midX, scale, offset.x);
    const sy = toStage(midY, scale, offset.y);
    const labelY = highlightedAxis === 'x' ? toStage(gutter.y, scale, offset.y) - 22 : sy - 9;
    const labelX =
      highlightedAxis === 'x' ? sx - pillW / 2 : toStage(gutter.x, scale, offset.x) - pillW - 8;

    return (
      <Group listening={false}>
        <Rect
          x={labelX}
          y={labelY}
          width={pillW}
          height={18}
          fill={GRID_COLOR}
          cornerRadius={4}
          shadowColor="rgba(0,0,0,0.15)"
          shadowBlur={4}
          shadowOffsetY={1}
        />
        <Text
          x={labelX + 7}
          y={labelY + 3}
          text={text}
          fontSize={11}
          fill="white"
          fontStyle="600"
        />
      </Group>
    );
  };

  return (
    <Group>
      {canDragX && gutters.vertical.map(gutter => renderGutter(gutter, 'ew-resize'))}
      {canDragY && gutters.horizontal.map(gutter => renderGutter(gutter, 'ns-resize'))}
      {renderGapLabel()}
    </Group>
  );
};
