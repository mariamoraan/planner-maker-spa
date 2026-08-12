import type { GridAlignH, GridAlignV, GridEditSettings } from './grid-edit-types';
import { normalizeGridSettings } from './grid-edit-types';

export type { GridAlignH, GridAlignV };

export interface GridLayoutConfig {
  origin: { x: number; y: number };
  cols: number;
  rows: number;
  cellSize: { width: number; height: number };
  rectSize: { width: number; height: number };
  alignH?: GridAlignH;
  alignV?: GridAlignV;
  /** @deprecated Legacy — use alignH/alignV */
  align?: 'top-left' | 'center';
  padding?: { x: number; y: number };
}

export interface GridRectInput {
  id: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  order?: number;
}

export interface InferredGrid extends GridLayoutConfig {
  rectIds: string[];
}

const DEFAULT_PADDING = { x: 0, y: 0 };

function resolveAlignment(config: GridLayoutConfig): { alignH: GridAlignH; alignV: GridAlignV } {
  if (config.alignH && config.alignV) {
    return { alignH: config.alignH, alignV: config.alignV };
  }
  if (config.align === 'center') {
    return { alignH: 'center', alignV: 'center' };
  }
  return { alignH: 'left', alignV: 'top' };
}

function resolvePadding(config: GridLayoutConfig): { x: number; y: number } {
  const { alignH, alignV } = resolveAlignment(config);
  const padding = config.padding ?? DEFAULT_PADDING;
  const { cellSize, rectSize } = config;

  let x: number;
  if (alignH === 'left') {
    x = padding.x;
  } else if (alignH === 'center') {
    x = (cellSize.width - rectSize.width) / 2 + padding.x;
  } else {
    x = cellSize.width - rectSize.width - padding.x;
  }

  let y: number;
  if (alignV === 'top') {
    y = padding.y;
  } else if (alignV === 'center') {
    y = (cellSize.height - rectSize.height) / 2 + padding.y;
  } else {
    y = cellSize.height - rectSize.height - padding.y;
  }

  return { x: Math.round(x), y: Math.round(y) };
}

export function cellSlotOrigin(
  col: number,
  row: number,
  config: GridLayoutConfig,
): { x: number; y: number } {
  return {
    x: Math.round(config.origin.x + col * config.cellSize.width),
    y: Math.round(config.origin.y + row * config.cellSize.height),
  };
}

export function cellOrigin(
  col: number,
  row: number,
  config: GridLayoutConfig,
): { x: number; y: number } {
  const padding = resolvePadding(config);
  return {
    x: Math.round(config.origin.x + col * config.cellSize.width + padding.x),
    y: Math.round(config.origin.y + row * config.cellSize.height + padding.y),
  };
}

export function layoutGridRectangles<T>(
  count: number,
  config: GridLayoutConfig,
  factory: (index: number, position: { x: number; y: number; col: number; row: number }) => T,
): T[] {
  const { cols } = config;
  return Array.from({ length: count }, (_, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const position = cellOrigin(col, row, config);
    return factory(index, { ...position, col, row });
  });
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

function groupRows(rects: GridRectInput[]): GridRectInput[][] {
  const sorted = [...rects].sort((a, b) => a.y - b.y || a.x - b.x);
  const rows: GridRectInput[][] = [];
  const rowTolerance = 8;

  for (const rect of sorted) {
    const row = rows.find(group =>
      group.some(other => Math.abs(other.y - rect.y) <= rowTolerance),
    );
    if (row) {
      row.push(rect);
    } else {
      rows.push([rect]);
    }
  }

  return rows.map(row => row.sort((a, b) => a.x - b.x));
}

function inferCellPitch(values: number[]): number | null {
  if (values.length < 2) return null;
  const pitches: number[] = [];
  for (let i = 0; i < values.length - 1; i++) {
    const pitch = values[i + 1] - values[i];
    if (pitch > 0) pitches.push(Math.round(pitch));
  }
  if (pitches.length === 0) return null;
  return median(pitches);
}

export function inferGridFromRectangles(
  rects: GridRectInput[],
  options?: { cols?: number },
): InferredGrid | null {
  if (rects.length < 3) return null;

  const widths = [...new Set(rects.map(rect => rect.width).filter(w => w !== undefined))];
  const heights = [...new Set(rects.map(rect => rect.height).filter(h => h !== undefined))];
  if (widths.length > 1 || heights.length > 1) return null;

  const rectSize = {
    width: widths[0] ?? 48,
    height: heights[0] ?? 36,
  };

  const rows = groupRows(rects);
  const cols = options?.cols ?? rows[0]?.length ?? 0;
  if (cols < 2 || rows.length < 1) return null;

  const rowLengths = rows.map(row => row.length);
  const maxCols = Math.max(...rowLengths);
  if (maxCols !== cols) return null;

  const firstRow = rows[0];
  const cellWidth = inferCellPitch(firstRow.map(rect => rect.x));
  const cellHeight = inferCellPitch(rows.map(row => row[0]?.y ?? 0).filter(y => y > 0));

  if (!cellWidth || !cellHeight) return null;

  const sortedByOrder = [...rects].sort(
    (a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER),
  );
  const anchor = sortedByOrder[0] ?? firstRow[0];
  if (!anchor) return null;

  const origin = {
    x: anchor.x,
    y: anchor.y,
  };

  return {
    origin,
    cols,
    rows: rows.length,
    cellSize: { width: cellWidth, height: cellHeight },
    rectSize,
    alignH: 'left',
    alignV: 'top',
    padding: { x: 0, y: 0 },
    rectIds: sortedByOrder.map(rect => rect.id),
  };
}

export function gridPositionsFromConfig(
  rectIds: string[],
  config: GridLayoutConfig,
): { id: string; x: number; y: number }[] {
  const { cols } = config;
  return rectIds.map((id, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const position = cellOrigin(col, row, config);
    return { id, ...position };
  });
}

export function detectGridMeasureAxis(targetDx: number, targetDy: number): 'x' | 'y' | null {
  const absX = Math.abs(targetDx);
  const absY = Math.abs(targetDy);
  if (absX === 0 && absY === 0) return null;
  if (absY <= absX * 0.2) return 'x';
  if (absX <= absY * 0.2) return 'y';
  return null;
}

export interface GridBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const DEFAULT_GRID_GAP = 12;

export function defaultGridBounds(
  pageWidth: number,
  pageHeight: number,
  cols: number,
  rows: number,
  rectSize: { width: number; height: number },
  gap: { x: number; y: number } = { x: DEFAULT_GRID_GAP, y: DEFAULT_GRID_GAP },
): GridBounds {
  const pitchX = rectSize.width + gap.x;
  const pitchY = rectSize.height + gap.y;
  const width = pitchX * cols;
  const height = pitchY * rows;
  return {
    x: Math.round((pageWidth - width) / 2),
    y: Math.round((pageHeight - height) / 2),
    width: Math.round(width),
    height: Math.round(height),
  };
}

export function gridConfigFromBounds(
  bounds: GridBounds,
  cols: number,
  rows: number,
  rectSize: { width: number; height: number },
  alignment: 'top-left' | 'center' | { alignH: GridAlignH; alignV: GridAlignV } = 'top-left',
  padding?: { x: number; y: number },
): GridLayoutConfig {
  let alignH: GridAlignH;
  let alignV: GridAlignV;

  if (typeof alignment === 'object') {
    alignH = alignment.alignH;
    alignV = alignment.alignV;
  } else if (alignment === 'center') {
    alignH = 'center';
    alignV = 'center';
  } else {
    alignH = 'left';
    alignV = 'top';
  }

  return {
    origin: { x: bounds.x, y: bounds.y },
    cols,
    rows,
    cellSize: {
      width: bounds.width / cols,
      height: bounds.height / rows,
    },
    rectSize,
    alignH,
    alignV,
    padding,
  };
}

export interface GridSettingsInput {
  cols: number;
  rows: number;
  rectWidth: number;
  rectHeight: number;
  alignH?: GridAlignH;
  alignV?: GridAlignV;
  /** @deprecated Legacy — use alignH/alignV */
  align?: 'top-left' | 'center';
  padding?: { x: number; y: number };
}

export function gridConfigFromGroup(
  bounds: GridBounds,
  settings: GridSettingsInput,
): GridLayoutConfig {
  const normalized = normalizeGridSettings(settings as GridEditSettings);
  return gridConfigFromBounds(
    bounds,
    normalized.cols,
    normalized.rows,
    { width: normalized.rectWidth, height: normalized.rectHeight },
    { alignH: normalized.alignH, alignV: normalized.alignV },
    normalized.padding,
  );
}

const MIN_GRID_RECT_SIZE = 20;

export function clampGridRectSize(
  bounds: GridBounds,
  settings: Pick<GridSettingsInput, 'cols' | 'rows'>,
  size: { width: number; height: number },
): { width: number; height: number } {
  const maxWidth = Math.round(bounds.width / settings.cols);

  return {
    width: Math.min(maxWidth, Math.max(MIN_GRID_RECT_SIZE, Math.round(size.width))),
    height: Math.max(MIN_GRID_RECT_SIZE, Math.round(size.height)),
  };
}

export function clampGridPadding(
  bounds: GridBounds,
  settings: GridSettingsInput,
  padding: { x: number; y: number },
): { x: number; y: number } {
  const cellWidth = bounds.width / settings.cols;
  const cellHeight = bounds.height / settings.rows;
  const maxX = Math.max(0, Math.round(cellWidth - settings.rectWidth));
  const maxY = Math.max(0, Math.round(cellHeight - settings.rectHeight));

  return {
    x: Math.min(maxX, Math.max(0, Math.round(padding.x))),
    y: Math.min(maxY, Math.max(0, Math.round(padding.y))),
  };
}

export function inferPaddingFromRects(
  bounds: GridBounds,
  settings: GridSettingsInput,
  rects: GridRectInput[],
  rectIds: string[],
): { x: number; y: number } {
  const normalized = normalizeGridSettings(settings as GridEditSettings);
  if (normalized.alignH === 'center' && normalized.alignV === 'center') {
    return { x: 0, y: 0 };
  }

  const firstId = rectIds[0];
  const firstRect = rects.find(rect => rect.id === firstId);
  if (!firstRect) {
    return { x: 0, y: 0 };
  }

  const config = gridConfigFromGroup(bounds, normalized);
  const slot = cellSlotOrigin(0, 0, config);
  const blockOffsetX = Math.round(firstRect.x - slot.x);
  const blockOffsetY = Math.round(firstRect.y - slot.y);
  const cellW = config.cellSize.width;
  const cellH = config.cellSize.height;
  const rectW = normalized.rectWidth;
  const rectH = normalized.rectHeight;

  let paddingX: number;
  if (normalized.alignH === 'left') {
    paddingX = blockOffsetX;
  } else if (normalized.alignH === 'center') {
    paddingX = blockOffsetX - (cellW - rectW) / 2;
  } else {
    paddingX = cellW - rectW - blockOffsetX;
  }

  let paddingY: number;
  if (normalized.alignV === 'top') {
    paddingY = blockOffsetY;
  } else if (normalized.alignV === 'center') {
    paddingY = blockOffsetY - (cellH - rectH) / 2;
  } else {
    paddingY = cellH - rectH - blockOffsetY;
  }

  return clampGridPadding(bounds, normalized, {
    x: Math.round(paddingX),
    y: Math.round(paddingY),
  });
}

export function boundsFromRectangles(
  rects: Pick<GridRectInput, 'x' | 'y' | 'width' | 'height'>[],
): GridBounds | null {
  if (rects.length === 0) return null;

  const left = Math.min(...rects.map(rect => rect.x));
  const top = Math.min(...rects.map(rect => rect.y));
  const right = Math.max(...rects.map(rect => rect.x + (rect.width ?? 0)));
  const bottom = Math.max(...rects.map(rect => rect.y + (rect.height ?? 0)));

  return {
    x: Math.round(left),
    y: Math.round(top),
    width: Math.round(right - left),
    height: Math.round(bottom - top),
  };
}

export function redistributeGridMoves(
  rectIds: string[],
  bounds: GridBounds,
  config: Pick<GridLayoutConfig, 'cols' | 'rows' | 'rectSize' | 'alignH' | 'alignV' | 'align' | 'padding'>,
): { id: string; x: number; y: number }[] {
  const gridConfig = gridConfigFromBounds(
    bounds,
    config.cols,
    config.rows,
    config.rectSize,
    config.alignH && config.alignV
      ? { alignH: config.alignH, alignV: config.alignV }
      : config.align === 'center'
        ? 'center'
        : 'top-left',
    config.padding,
  );
  return gridPositionsFromConfig(rectIds, gridConfig);
}

export type GridBoundsHandle =
  | 'nw'
  | 'n'
  | 'ne'
  | 'w'
  | 'e'
  | 'sw'
  | 's'
  | 'se';

const DEFAULT_MIN_BOUNDS = 20;

export function translateGridBounds(bounds: GridBounds, dx: number, dy: number): GridBounds {
  return {
    x: Math.round(bounds.x + dx),
    y: Math.round(bounds.y + dy),
    width: bounds.width,
    height: bounds.height,
  };
}

export function gridBoundsFromAnchorBlock(
  block: { x: number; y: number; width: number; height: number },
  cols: number,
  rows: number,
): GridBounds {
  return {
    x: block.x,
    y: block.y,
    width: block.width * cols,
    height: block.height * rows,
  };
}

export function orderRectIdsRowMajor(rects: GridRectInput[]): string[] {
  const rows = groupRows(rects);
  return rows.flat().map(rect => rect.id);
}

export function inferGridDimensionsFromCount(count: number): { cols: number; rows: number } {
  const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
  const rows = Math.max(1, Math.ceil(count / cols));
  return { cols, rows };
}

export function medianRectSize(
  rects: Pick<GridRectInput, 'width' | 'height'>[],
): { width: number; height: number } {
  const widths = rects.map(rect => rect.width ?? 48);
  const heights = rects.map(rect => rect.height ?? 36);
  return {
    width: median(widths),
    height: median(heights),
  };
}

export function boundsFromRectanglesWithPadding(
  rects: Pick<GridRectInput, 'x' | 'y' | 'width' | 'height'>[],
  padding = 6,
): GridBounds | null {
  const bounds = boundsFromRectangles(rects);
  if (!bounds) return null;

  return {
    x: bounds.x - padding,
    y: bounds.y - padding,
    width: bounds.width + padding * 2,
    height: bounds.height + padding * 2,
  };
}

export function expandGridRectIds(
  currentIds: string[],
  targetCount: number,
): { keepIds: string[]; removeIds: string[]; slotsToCreate: number } {
  if (targetCount >= currentIds.length) {
    return {
      keepIds: currentIds,
      removeIds: [],
      slotsToCreate: targetCount - currentIds.length,
    };
  }

  return {
    keepIds: currentIds.slice(0, targetCount),
    removeIds: currentIds.slice(targetCount),
    slotsToCreate: 0,
  };
}

export function resizeGridBounds(
  bounds: GridBounds,
  handle: GridBoundsHandle,
  delta: { dx: number; dy: number },
  options?: { minWidth?: number; minHeight?: number; symmetric?: boolean },
): GridBounds {
  const minWidth = options?.minWidth ?? DEFAULT_MIN_BOUNDS;
  const minHeight = options?.minHeight ?? DEFAULT_MIN_BOUNDS;
  const { dx, dy } = delta;

  if (options?.symmetric) {
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    let nextWidth = bounds.width;
    let nextHeight = bounds.height;

    if (handle.includes('e') || handle === 'e') nextWidth = Math.max(minWidth, bounds.width + dx * 2);
    if (handle.includes('w') || handle === 'w') nextWidth = Math.max(minWidth, bounds.width - dx * 2);
    if (handle.includes('s') || handle === 's') nextHeight = Math.max(minHeight, bounds.height + dy * 2);
    if (handle.includes('n') || handle === 'n') nextHeight = Math.max(minHeight, bounds.height - dy * 2);

    return {
      x: Math.round(centerX - nextWidth / 2),
      y: Math.round(centerY - nextHeight / 2),
      width: Math.round(nextWidth),
      height: Math.round(nextHeight),
    };
  }

  let { x, y, width, height } = bounds;

  switch (handle) {
    case 'e':
      width = Math.max(minWidth, width + dx);
      break;
    case 'w':
      width = Math.max(minWidth, width - dx);
      x = bounds.x + bounds.width - width;
      break;
    case 's':
      height = Math.max(minHeight, height + dy);
      break;
    case 'n':
      height = Math.max(minHeight, height - dy);
      y = bounds.y + bounds.height - height;
      break;
    case 'se':
      width = Math.max(minWidth, width + dx);
      height = Math.max(minHeight, height + dy);
      break;
    case 'sw':
      width = Math.max(minWidth, width - dx);
      x = bounds.x + bounds.width - width;
      height = Math.max(minHeight, height + dy);
      break;
    case 'ne':
      width = Math.max(minWidth, width + dx);
      height = Math.max(minHeight, height - dy);
      y = bounds.y + bounds.height - height;
      break;
    case 'nw':
      width = Math.max(minWidth, width - dx);
      x = bounds.x + bounds.width - width;
      height = Math.max(minHeight, height - dy);
      y = bounds.y + bounds.height - height;
      break;
  }

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  };
}

export const GRID_HANDLE_OUTSET = 12;

export function pitchFromBounds(
  bounds: GridBounds,
  cols: number,
  rows: number,
): { pitchX: number; pitchY: number } {
  return {
    pitchX: bounds.width / cols,
    pitchY: bounds.height / rows,
  };
}

export function boundsFromPitch(
  origin: { x: number; y: number },
  cols: number,
  rows: number,
  pitchX: number,
  pitchY: number,
): GridBounds {
  return {
    x: Math.round(origin.x),
    y: Math.round(origin.y),
    width: Math.round(pitchX * cols),
    height: Math.round(pitchY * rows),
  };
}

export function gapFromPitch(
  pitch: { pitchX: number; pitchY: number },
  rectSize: { width: number; height: number },
): { gapX: number; gapY: number } {
  return {
    gapX: Math.round(pitch.pitchX - rectSize.width),
    gapY: Math.round(pitch.pitchY - rectSize.height),
  };
}

export function getGridGap(
  bounds: GridBounds,
  settings: GridSettingsInput,
): { gapX: number; gapY: number } {
  const normalized = normalizeGridSettings(settings as GridEditSettings);
  const pitch = pitchFromBounds(bounds, normalized.cols, normalized.rows);
  return gapFromPitch(pitch, {
    width: normalized.rectWidth,
    height: normalized.rectHeight,
  });
}

export function scaleGridSettingsForGapChange(
  bounds: GridBounds,
  settings: GridSettingsInput,
  targetGap: { gapX: number; gapY: number },
): {
  gapX: number;
  gapY: number;
  rectWidth: number;
  rectHeight: number;
  padding: { x: number; y: number };
} {
  const normalized = normalizeGridSettings(settings as GridEditSettings);
  const pitch = pitchFromBounds(bounds, normalized.cols, normalized.rows);

  const rectWidth = clampGridRectSize(bounds, normalized, {
    width: Math.round(pitch.pitchX - targetGap.gapX),
    height: normalized.rectHeight,
  }).width;

  const rectHeight = clampGridRectSize(bounds, normalized, {
    width: rectWidth,
    height: Math.round(pitch.pitchY - targetGap.gapY),
  }).height;

  const padding = clampGridPadding(
    bounds,
    { ...normalized, rectWidth, rectHeight },
    normalized.padding ?? { x: 0, y: 0 },
  );

  const nextGap = gapFromPitch(pitch, { width: rectWidth, height: rectHeight });

  return {
    gapX: nextGap.gapX,
    gapY: nextGap.gapY,
    rectWidth,
    rectHeight,
    padding,
  };
}

export function paddingFromBlockPosition(
  bounds: GridBounds,
  settings: GridSettingsInput,
  blockPos: { x: number; y: number },
): Partial<GridEditSettings> {
  const normalized = normalizeGridSettings(settings as GridEditSettings);
  const config = gridConfigFromGroup(bounds, normalized);
  const slotOrigin = cellSlotOrigin(0, 0, config);
  const blockOffsetX = blockPos.x - slotOrigin.x;
  const blockOffsetY = blockPos.y - slotOrigin.y;
  const cellW = config.cellSize.width;
  const cellH = config.cellSize.height;
  const rectW = normalized.rectWidth;
  const rectH = normalized.rectHeight;

  let paddingX: number;
  if (normalized.alignH === 'left') {
    paddingX = blockOffsetX;
  } else if (normalized.alignH === 'center') {
    paddingX = blockOffsetX - (cellW - rectW) / 2;
  } else {
    paddingX = cellW - rectW - blockOffsetX;
  }

  let paddingY: number;
  if (normalized.alignV === 'top') {
    paddingY = blockOffsetY;
  } else if (normalized.alignV === 'center') {
    paddingY = blockOffsetY - (cellH - rectH) / 2;
  } else {
    paddingY = cellH - rectH - blockOffsetY;
  }

  return {
    alignH: 'left',
    alignV: 'top',
    padding: clampGridPadding(bounds, normalized, {
      x: Math.round(paddingX),
      y: Math.round(paddingY),
    }),
  };
}

export type GridBlockResizeHandle = GridBoundsHandle;

export function resizeGridBlockFromHandle(
  startBlock: { x: number; y: number; width: number; height: number },
  handle: GridBlockResizeHandle,
  delta: { dx: number; dy: number },
  bounds: GridBounds,
  settings: GridSettingsInput,
): { settings: Partial<GridEditSettings> } {
  const normalized = normalizeGridSettings(settings as GridEditSettings);
  const { dx, dy } = delta;
  let x = startBlock.x;
  let y = startBlock.y;
  let width = startBlock.width;
  let height = startBlock.height;

  switch (handle) {
    case 'e':
      width = startBlock.width + dx;
      break;
    case 'w':
      width = startBlock.width - dx;
      x = startBlock.x + dx;
      break;
    case 's':
      height = startBlock.height + dy;
      break;
    case 'n':
      height = startBlock.height - dy;
      y = startBlock.y + dy;
      break;
    case 'se':
      width = startBlock.width + dx;
      height = startBlock.height + dy;
      break;
    case 'sw':
      width = startBlock.width - dx;
      height = startBlock.height + dy;
      x = startBlock.x + dx;
      break;
    case 'ne':
      width = startBlock.width + dx;
      height = startBlock.height - dy;
      y = startBlock.y + dy;
      break;
    case 'nw':
      width = startBlock.width - dx;
      height = startBlock.height - dy;
      x = startBlock.x + dx;
      y = startBlock.y + dy;
      break;
  }

  const clampedSize = clampGridRectSize(bounds, normalized, { width, height });

  if (handle.includes('w') || handle === 'w') {
    x = startBlock.x + startBlock.width - clampedSize.width;
  }
  if (handle.includes('n') || handle === 'n') {
    y = startBlock.y + startBlock.height - clampedSize.height;
  }

  const nextSettings: GridEditSettings = {
    ...normalized,
    rectWidth: clampedSize.width,
    rectHeight: clampedSize.height,
  };

  const positionUpdates = paddingFromBlockPosition(bounds, nextSettings, { x, y });

  return {
    settings: {
      rectWidth: clampedSize.width,
      rectHeight: clampedSize.height,
      ...positionUpdates,
    },
  };
}

export function gridLinePositions(config: GridLayoutConfig): {
  vertical: number[];
  horizontal: number[];
} {
  const { origin, cols, rows, cellSize } = config;
  return {
    vertical: Array.from({ length: cols + 1 }, (_, index) =>
      Math.round(origin.x + index * cellSize.width),
    ),
    horizontal: Array.from({ length: rows + 1 }, (_, index) =>
      Math.round(origin.y + index * cellSize.height),
    ),
  };
}

export interface GridDimensionLabelSpec {
  x: number;
  y: number;
  text: string;
}

export function gridDimensionLabels(
  config: GridLayoutConfig,
  rectSize: { width: number; height: number },
): {
  gapX: GridDimensionLabelSpec | null;
  gapY: GridDimensionLabelSpec | null;
  pitchX: GridDimensionLabelSpec | null;
  pitchY: GridDimensionLabelSpec | null;
} {
  const pitch = { pitchX: config.cellSize.width, pitchY: config.cellSize.height };
  const gap = gapFromPitch(pitch, rectSize);
  const cell00 = cellOrigin(0, 0, config);

  let gapX: GridDimensionLabelSpec | null = null;
  if (config.cols >= 2) {
    const cell10 = cellOrigin(1, 0, config);
    gapX = {
      x: (cell00.x + rectSize.width + cell10.x) / 2,
      y: config.origin.y,
      text: `${gap.gapX}px`,
    };
  }

  let gapY: GridDimensionLabelSpec | null = null;
  if (config.rows >= 2) {
    const cell01 = cellOrigin(0, 1, config);
    gapY = {
      x: config.origin.x,
      y: (cell00.y + rectSize.height + cell01.y) / 2,
      text: `${gap.gapY}px`,
    };
  }

  const pitchX: GridDimensionLabelSpec = {
    x: cell00.x + rectSize.width / 2,
    y: config.origin.y,
    text: `${Math.round(pitch.pitchX)}px`,
  };

  const pitchY: GridDimensionLabelSpec = {
    x: config.origin.x,
    y: cell00.y + rectSize.height / 2,
    text: `${Math.round(pitch.pitchY)}px`,
  };

  return { gapX, gapY, pitchX, pitchY };
}

export function boundsFromGap(
  bounds: GridBounds,
  cols: number,
  rows: number,
  gap: { gapX: number; gapY: number },
  rectSize: { width: number; height: number },
): GridBounds {
  const pitchX = Math.max(rectSize.width, rectSize.width + gap.gapX);
  const pitchY = Math.max(rectSize.height, rectSize.height + gap.gapY);
  return boundsFromPitch({ x: bounds.x, y: bounds.y }, cols, rows, pitchX, pitchY);
}

export function resizeGridPitch(
  bounds: GridBounds,
  cols: number,
  rows: number,
  axis: 'x' | 'y',
  delta: number,
  minPitch = 8,
): GridBounds {
  const pitch = pitchFromBounds(bounds, cols, rows);
  if (axis === 'x') {
    const nextPitchX = Math.max(minPitch, pitch.pitchX + delta);
    return boundsFromPitch({ x: bounds.x, y: bounds.y }, cols, rows, nextPitchX, pitch.pitchY);
  }
  const nextPitchY = Math.max(minPitch, pitch.pitchY + delta);
  return boundsFromPitch({ x: bounds.x, y: bounds.y }, cols, rows, pitch.pitchX, nextPitchY);
}

export function inferPitchFromRectangles(
  rects: GridRectInput[],
  cols: number,
  rows: number,
): { pitchX: number; pitchY: number; origin: { x: number; y: number } } | null {
  if (rects.length === 0) return null;

  const orderedIds = orderRectIdsRowMajor(rects);
  const sorted = orderedIds
    .map(id => rects.find(rect => rect.id === id))
    .filter((rect): rect is GridRectInput => rect !== undefined);

  if (sorted.length === 0) return null;

  const pitchesX: number[] = [];
  for (let index = 0; index < sorted.length - 1; index++) {
    const sameRow = Math.floor(index / cols) === Math.floor((index + 1) / cols);
    if (sameRow) {
      const dx = sorted[index + 1].x - sorted[index].x;
      if (dx > 0) pitchesX.push(Math.round(dx));
    }
  }

  const pitchesY: number[] = [];
  for (let row = 0; row < rows - 1; row++) {
    const top = sorted[row * cols];
    const bottom = sorted[(row + 1) * cols];
    if (top && bottom) {
      const dy = bottom.y - top.y;
      if (dy > 0) pitchesY.push(Math.round(dy));
    }
  }

  const first = sorted[0];
  const fallbackX = (first?.width ?? 48) + 8;
  const fallbackY = (first?.height ?? 36) + 8;

  return {
    pitchX: pitchesX.length > 0 ? median(pitchesX) : fallbackX,
    pitchY: pitchesY.length > 0 ? median(pitchesY) : fallbackY,
    origin: {
      x: Math.min(...sorted.map(rect => rect.x)),
      y: Math.min(...sorted.map(rect => rect.y)),
    },
  };
}

export function boundsFromInferredGrid(inferred: InferredGrid): GridBounds {
  return {
    x: inferred.origin.x,
    y: inferred.origin.y,
    width: inferred.cellSize.width * inferred.cols,
    height: inferred.cellSize.height * inferred.rows,
  };
}
