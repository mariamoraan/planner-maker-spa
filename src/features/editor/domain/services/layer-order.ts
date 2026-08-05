import type { GridGroup, Rectangle } from '@/features/template';
import { findGridGroupForRect } from './grid-group';

export interface LayerUnit {
  ids: string[];
}

export type LayerOperation = 'forward' | 'backward' | 'front' | 'back';

export function buildLayerUnits(
  rectangles: Rectangle[],
  gridGroups?: Record<string, GridGroup>,
): LayerUnit[] {
  const processedGroups = new Set<string>();
  const units: LayerUnit[] = [];

  for (const rect of rectangles) {
    const group = rect.gridGroupId
      ? gridGroups?.[rect.gridGroupId]
      : findGridGroupForRect(rect.id, gridGroups);

    if (group) {
      if (processedGroups.has(group.id)) continue;
      processedGroups.add(group.id);
      const ids = rectangles.filter(r => group.rectIds.includes(r.id)).map(r => r.id);
      units.push({ ids });
    } else {
      units.push({ ids: [rect.id] });
    }
  }

  return units;
}

export function resolveLayerUnits(
  rectangles: Rectangle[],
  gridGroups: Record<string, GridGroup> | undefined,
  selectedIds: string[],
): LayerUnit[] {
  const units = buildLayerUnits(rectangles, gridGroups);
  const selectedSet = new Set(selectedIds);

  return units.filter(unit => unit.ids.some(id => selectedSet.has(id)));
}

function selectedUnitIndices(units: LayerUnit[], selectedIds: string[]): Set<number> {
  const selectedSet = new Set(selectedIds);
  const indices = new Set<number>();
  units.forEach((unit, index) => {
    if (unit.ids.some(id => selectedSet.has(id))) {
      indices.add(index);
    }
  });
  return indices;
}

function findContiguousBlock(
  indices: Set<number>,
  anchor: number,
  maxIndex: number,
): { start: number; end: number } {
  let start = anchor;
  let end = anchor;
  while (start > 0 && indices.has(start - 1)) start -= 1;
  while (end < maxIndex && indices.has(end + 1)) end += 1;
  return { start, end };
}

function unitsToRectangles(units: LayerUnit[], rectangleMap: Map<string, Rectangle>): Rectangle[] {
  const result: Rectangle[] = [];
  for (const unit of units) {
    for (const id of unit.ids) {
      const rect = rectangleMap.get(id);
      if (rect) result.push(rect);
    }
  }
  return result;
}

export function applyLayerOperation(
  rectangles: Rectangle[],
  gridGroups: Record<string, GridGroup> | undefined,
  selectedIds: string[],
  operation: LayerOperation,
): Rectangle[] | null {
  if (selectedIds.length === 0 || rectangles.length === 0) return null;

  const units = buildLayerUnits(rectangles, gridGroups);
  const selectedIndices = selectedUnitIndices(units, selectedIds);
  if (selectedIndices.size === 0) return null;

  const nextUnits = [...units];

  switch (operation) {
    case 'forward': {
      const maxIdx = Math.max(...selectedIndices);
      if (maxIdx >= units.length - 1) return null;
      const { end } = findContiguousBlock(selectedIndices, maxIdx, units.length - 1);
      if (end >= units.length - 1) return null;
      const temp = nextUnits[end];
      nextUnits[end] = nextUnits[end + 1];
      nextUnits[end + 1] = temp;
      break;
    }
    case 'backward': {
      const minIdx = Math.min(...selectedIndices);
      if (minIdx <= 0) return null;
      const { start } = findContiguousBlock(selectedIndices, minIdx, units.length - 1);
      if (start <= 0) return null;
      const temp = nextUnits[start];
      nextUnits[start] = nextUnits[start - 1];
      nextUnits[start - 1] = temp;
      break;
    }
    case 'front': {
      const selected = nextUnits.filter((_, index) => selectedIndices.has(index));
      const remaining = nextUnits.filter((_, index) => !selectedIndices.has(index));
      nextUnits.splice(0, nextUnits.length, ...remaining, ...selected);
      break;
    }
    case 'back': {
      const selected = nextUnits.filter((_, index) => selectedIndices.has(index));
      const remaining = nextUnits.filter((_, index) => !selectedIndices.has(index));
      nextUnits.splice(0, nextUnits.length, ...selected, ...remaining);
      break;
    }
  }

  const rectMap = new Map(rectangles.map(rect => [rect.id, rect]));
  const result = unitsToRectangles(nextUnits, rectMap);
  if (result.length !== rectangles.length) return null;

  const beforeIds = rectangles.map(rect => rect.id).join(',');
  const afterIds = result.map(rect => rect.id).join(',');
  if (beforeIds === afterIds) return null;

  return result;
}

export function canLayerOperation(
  rectangles: Rectangle[],
  gridGroups: Record<string, GridGroup> | undefined,
  selectedIds: string[],
  operation: LayerOperation,
): boolean {
  return applyLayerOperation(rectangles, gridGroups, selectedIds, operation) !== null;
}

export function pointInRectangle(
  point: { x: number; y: number },
  rect: Pick<Rectangle, 'x' | 'y' | 'width' | 'height'>,
): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

/** Returns the topmost rectangle at a point (last in array = front). */
export function findTopmostRectangleAtPoint(
  point: { x: number; y: number },
  rectangles: Rectangle[],
): Rectangle | null {
  for (let index = rectangles.length - 1; index >= 0; index -= 1) {
    if (pointInRectangle(point, rectangles[index])) {
      return rectangles[index];
    }
  }
  return null;
}
