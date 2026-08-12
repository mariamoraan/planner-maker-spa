import React from 'react';
import { Group, Rect } from 'react-konva';
import type Konva from 'konva';
import {
  cellOrigin,
  gridConfigFromGroup,
  type GridBounds,
} from '@/features/editor/domain/services/grid-layout';
import type { GridEditFocus } from '@/features/editor/ui/stores/editor-store';
import type { GridEditSettings } from '@/features/editor/domain/services/grid-edit-types';

interface GridFocusZonesProps {
  bounds: GridBounds;
  settings: GridEditSettings;
  scale: number;
  offset: { x: number; y: number };
  focus: GridEditFocus;
  onFocusChange: (focus: GridEditFocus) => void;
}

function toStage(value: number, scale: number, offsetValue: number): number {
  return offsetValue + value * scale;
}

function stopMouseDown(event: Konva.KonvaEventObject<MouseEvent>) {
  event.cancelBubble = true;
}

function setStageCursor(event: Konva.KonvaEventObject<MouseEvent>, cursor: string) {
  const container = event.target.getStage()?.container();
  if (container) container.style.cursor = cursor;
}

function switchToBlock(event: Konva.KonvaEventObject<MouseEvent>, onFocusChange: (focus: GridEditFocus) => void) {
  event.cancelBubble = true;
  onFocusChange('block');
}

function switchToGrid(event: Konva.KonvaEventObject<MouseEvent>, onFocusChange: (focus: GridEditFocus) => void) {
  event.cancelBubble = true;
  onFocusChange('grid');
}

export const GridFocusZones: React.FC<GridFocusZonesProps> = ({
  bounds,
  settings,
  scale,
  offset,
  focus,
  onFocusChange,
}) => {
  const config = gridConfigFromGroup(bounds, settings);

  if (focus === 'grid') {
    const block = cellOrigin(0, 0, config);
    const bx = toStage(block.x, scale, offset.x);
    const by = toStage(block.y, scale, offset.y);
    const bw = settings.rectWidth * scale;
    const bh = settings.rectHeight * scale;

    return (
      <Group>
        <Rect
          x={bx}
          y={by}
          width={bw}
          height={bh}
          fill="transparent"
          onMouseDown={stopMouseDown}
          onClick={e => switchToBlock(e, onFocusChange)}
          onMouseEnter={e => setStageCursor(e, 'pointer')}
          onMouseLeave={e => setStageCursor(e, 'default')}
        />
      </Group>
    );
  }

  const zones = Array.from({ length: settings.cols * settings.rows }, (_, index) => {
    const col = index % settings.cols;
    const row = Math.floor(index / settings.cols);
    const isAnchorCell = col === 0 && row === 0;
    if (isAnchorCell) return null;

    const block = cellOrigin(col, row, config);
    return (
      <Rect
        key={`focus-${index}`}
        x={toStage(block.x, scale, offset.x)}
        y={toStage(block.y, scale, offset.y)}
        width={settings.rectWidth * scale}
        height={settings.rectHeight * scale}
        fill="transparent"
        onMouseDown={stopMouseDown}
        onClick={e => switchToGrid(e, onFocusChange)}
        onMouseEnter={e => setStageCursor(e, 'pointer')}
        onMouseLeave={e => setStageCursor(e, 'default')}
      />
    );
  });

  const anchorBlock = cellOrigin(0, 0, config);
  const sx = toStage(anchorBlock.x, scale, offset.x);
  const sy = toStage(anchorBlock.y, scale, offset.y);
  const sw = settings.rectWidth * scale;
  const sh = settings.rectHeight * scale;

  return (
    <Group>
      {zones}
      <Rect
        x={sx}
        y={sy}
        width={sw}
        height={sh}
        fill="transparent"
        onMouseDown={stopMouseDown}
        onDblClick={e => switchToGrid(e, onFocusChange)}
        onMouseEnter={e => setStageCursor(e, 'default')}
      />
    </Group>
  );
};
