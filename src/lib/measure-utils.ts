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
