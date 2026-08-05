import {
  detectGridMeasureAxis,
  gridPositionsFromConfig,
  inferGridFromRectangles,
  type GridLayoutConfig,
} from './grid-layout';

export interface Point {
  x: number;
  y: number;
}

export interface MeasureMetrics {
  dx: number;
  dy: number;
  distance: number;
}

export interface MeasureAnchor {
  x: number;
  y: number;
  blockId?: string;
  offsetInBlock?: { x: number; y: number };
}

export interface MeasureRect {
  id: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  order?: number;
}

export interface MeasureAdjustMove {
  id: string;
  x: number;
  y: number;
}

export function computeMeasureMetrics(p1: Point, p2: Point): MeasureMetrics {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return { dx, dy, distance: Math.hypot(dx, dy) };
}

export function resolveAnchorPoint(anchor: MeasureAnchor, rectangles: MeasureRect[]): Point {
  if (!anchor.blockId) {
    return { x: anchor.x, y: anchor.y };
  }

  const block = rectangles.find(rect => rect.id === anchor.blockId);
  if (!block || !anchor.offsetInBlock) {
    return { x: anchor.x, y: anchor.y };
  }

  return {
    x: block.x + anchor.offsetInBlock.x,
    y: block.y + anchor.offsetInBlock.y,
  };
}

export function getMovingAnchor(p1: MeasureAnchor, p2: MeasureAnchor): MeasureAnchor | null {
  if (p2.blockId) return p2;
  if (p1.blockId) return p1;
  return null;
}

export function getFixedAnchor(p1: MeasureAnchor, p2: MeasureAnchor): MeasureAnchor {
  const moving = getMovingAnchor(p1, p2);
  return moving === p2 ? p1 : p2;
}

export function getMovingBlockIds(movingBlockId: string, selectedIds: string[]): string[] {
  if (selectedIds.includes(movingBlockId) && selectedIds.length > 1) {
    return selectedIds;
  }
  return [movingBlockId];
}

export function computeMeasureAdjustMoves(
  fixed: MeasureAnchor,
  moving: MeasureAnchor,
  movingIds: string[],
  targetDx: number,
  targetDy: number,
  rectangles: MeasureRect[],
): MeasureAdjustMove[] {
  if (!moving.blockId || !moving.offsetInBlock) return [];

  const movingBlock = rectangles.find(rect => rect.id === moving.blockId);
  if (!movingBlock) return [];

  const fixedPoint = resolveAnchorPoint(fixed, rectangles);
  const newMovingPoint = {
    x: fixedPoint.x + targetDx,
    y: fixedPoint.y + targetDy,
  };
  const newOrigin = {
    x: newMovingPoint.x - moving.offsetInBlock.x,
    y: newMovingPoint.y - moving.offsetInBlock.y,
  };
  const deltaX = newOrigin.x - movingBlock.x;
  const deltaY = newOrigin.y - movingBlock.y;

  if (deltaX === 0 && deltaY === 0) return [];

  return movingIds
    .map(id => {
      const rect = rectangles.find(r => r.id === id);
      if (!rect) return null;
      return {
        id,
        x: Math.round(rect.x + deltaX),
        y: Math.round(rect.y + deltaY),
      };
    })
    .filter((move): move is MeasureAdjustMove => move !== null);
}

export function overlayDeltaToAdjustTarget(
  p1: MeasureAnchor,
  p2: MeasureAnchor,
  overlayDx: number,
  overlayDy: number,
): { targetDx: number; targetDy: number } {
  const moving = getMovingAnchor(p1, p2);
  if (moving === p2) {
    return { targetDx: overlayDx, targetDy: overlayDy };
  }
  return { targetDx: -overlayDx, targetDy: -overlayDy };
}

export function createMeasureAnchor(
  imagePos: Point,
  blockId: string | undefined,
  rectangles: MeasureRect[],
): MeasureAnchor {
  const rect = blockId ? rectangles.find(r => r.id === blockId) : undefined;
  return {
    x: imagePos.x,
    y: imagePos.y,
    blockId,
    offsetInBlock: rect ? { x: imagePos.x - rect.x, y: imagePos.y - rect.y } : undefined,
  };
}

export function canApplyGridMeasureAdjust(
  selectedIds: string[],
  rectangles: MeasureRect[],
  targetDx: number,
  targetDy: number,
  options?: { cols?: number },
): boolean {
  if (selectedIds.length < 3) return false;
  if (detectGridMeasureAxis(targetDx, targetDy) === null) return false;
  const selectedRects = rectangles.filter(rect => selectedIds.includes(rect.id));
  return inferGridFromRectangles(selectedRects, options) !== null;
}

export function computeGridMeasureAdjustMoves(
  fixed: MeasureAnchor,
  moving: MeasureAnchor,
  selectedIds: string[],
  targetDx: number,
  targetDy: number,
  rectangles: MeasureRect[],
  options?: { cols?: number },
): MeasureAdjustMove[] | null {
  if (!moving.blockId || !fixed.blockId) return null;

  const selectedRects = rectangles.filter(rect => selectedIds.includes(rect.id));
  if (selectedRects.length < 3) return null;

  const inferred = inferGridFromRectangles(selectedRects, options);
  if (!inferred) return null;

  const axis = detectGridMeasureAxis(targetDx, targetDy);
  if (!axis) return null;

  const fixedBlock = rectangles.find(rect => rect.id === fixed.blockId);
  const movingBlock = rectangles.find(rect => rect.id === moving.blockId);
  if (!fixedBlock || !movingBlock) return null;

  const fixedIndex = inferred.rectIds.indexOf(fixedBlock.id);
  const movingIndex = inferred.rectIds.indexOf(movingBlock.id);
  if (fixedIndex < 0 || movingIndex < 0) return null;

  const fixedCol = fixedIndex % inferred.cols;
  const fixedRow = Math.floor(fixedIndex / inferred.cols);
  const movingCol = movingIndex % inferred.cols;
  const movingRow = Math.floor(movingIndex / inferred.cols);

  const fixedOffset = fixed.offsetInBlock ?? { x: 0, y: 0 };
  const movingOffset = moving.offsetInBlock ?? { x: 0, y: 0 };
  const padding = inferred.padding ?? { x: 0, y: 0 };

  let nextConfig: GridLayoutConfig;

  if (axis === 'x') {
    if (fixedRow !== movingRow) return null;
    const colDelta = movingCol - fixedCol;
    if (colDelta === 0) return null;

    const newCellWidth = (targetDx - (movingOffset.x - fixedOffset.x)) / colDelta;
    if (newCellWidth <= 0) return null;

    nextConfig = {
      ...inferred,
      origin: {
        x: fixedBlock.x - fixedCol * newCellWidth - padding.x,
        y: fixedBlock.y - fixedRow * inferred.cellSize.height - padding.y,
      },
      cellSize: {
        width: newCellWidth,
        height: inferred.cellSize.height,
      },
    };
  } else {
    if (fixedCol !== movingCol) return null;
    const rowDelta = movingRow - fixedRow;
    if (rowDelta === 0) return null;

    const newCellHeight = (targetDy - (movingOffset.y - fixedOffset.y)) / rowDelta;
    if (newCellHeight <= 0) return null;

    nextConfig = {
      ...inferred,
      origin: {
        x: fixedBlock.x - fixedCol * inferred.cellSize.width - padding.x,
        y: fixedBlock.y - fixedRow * newCellHeight - padding.y,
      },
      cellSize: {
        width: inferred.cellSize.width,
        height: newCellHeight,
      },
    };
  }

  const nextPositions = gridPositionsFromConfig(inferred.rectIds, nextConfig);
  const moves = nextPositions
    .map(next => {
      const current = rectangles.find(rect => rect.id === next.id);
      if (!current) return null;
      if (current.x === next.x && current.y === next.y) return null;
      return next;
    })
    .filter((move): move is MeasureAdjustMove => move !== null);

  return moves.length > 0 ? moves : null;
}

export function computeMeasureAdjustMovesWithGrid(
  fixed: MeasureAnchor,
  moving: MeasureAnchor,
  movingIds: string[],
  targetDx: number,
  targetDy: number,
  rectangles: MeasureRect[],
  options?: { cols?: number; applyToGrid?: boolean },
): MeasureAdjustMove[] {
  if (options?.applyToGrid !== false && movingIds.length >= 3) {
    const gridMoves = computeGridMeasureAdjustMoves(
      fixed,
      moving,
      movingIds,
      targetDx,
      targetDy,
      rectangles,
      options,
    );
    if (gridMoves !== null) return gridMoves;
  }

  return computeMeasureAdjustMoves(
    fixed,
    moving,
    movingIds,
    targetDx,
    targetDy,
    rectangles,
  );
}
