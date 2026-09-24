import type {
  BindingGroup,
  GridGroup,
  Rectangle,
  TemplateType,
} from '@/features/template';
import { generateId } from '@/features/template/domain/services/id-generator';
import {
  createBindingGroupId,
  withYearMonthIndexForPage,
} from '@/features/editor/domain/services/binding-group';
import { createGridGroupId } from '@/features/editor/domain/services/grid-group';

export interface PreparePasteInput {
  copiedRects: Rectangle[];
  offsetX: number;
  offsetY: number;
  /** Number of rectangles already on the page (for `order`). */
  existingRectCount: number;
  sourceGridGroups?: Record<string, GridGroup>;
  sourceBindingGroups?: Record<string, BindingGroup>;
  /** Binding groups already on the page — used to allocate yearMonthIndex. */
  existingBindingGroups?: Record<string, BindingGroup>;
  /**
   * Binding groups on the other face of a contiguous yearly spread (or leftover
   * groups on the source page when transferring). Reserved so month slots don't
   * collide across the spread.
   */
  siblingBindingGroups?: Record<string, BindingGroup>;
  pageType: TemplateType;
}

export interface PreparePasteResult {
  rectangles: Rectangle[];
  gridGroups: Record<string, GridGroup>;
  bindingGroups: Record<string, BindingGroup>;
}

/**
 * Clone copied rectangles for paste with fresh ids, grid groups, and binding
 * groups so the paste is independent of the originals.
 */
export function preparePastedSelection({
  copiedRects,
  offsetX,
  offsetY,
  existingRectCount,
  sourceGridGroups,
  sourceBindingGroups,
  existingBindingGroups,
  siblingBindingGroups,
  pageType,
}: PreparePasteInput): PreparePasteResult {
  const gridIdMap = new Map<string, string>();
  const bindingIdMap = new Map<string, string>();
  const newBindingGroups: Record<string, BindingGroup> = {};
  const allocationPool: Record<string, BindingGroup> = {
    ...(existingBindingGroups ?? {}),
  };

  const ensureBindingId = (oldId: string): string => {
    const existing = bindingIdMap.get(oldId);
    if (existing) return existing;

    const source = sourceBindingGroups?.[oldId];
    const newId = createBindingGroupId();
    bindingIdMap.set(oldId, newId);

    const cloned = withYearMonthIndexForPage(
      {
        id: newId,
        source: source?.source ?? 'page',
        ...(source?.name ? { name: source.name } : {}),
        // Drop old yearMonthIndex so allocation can prefer or replace it.
      },
      pageType,
      allocationPool,
      {
        siblingBindingGroups,
        preferredYearMonthIndex: source?.yearMonthIndex,
      },
    );
    newBindingGroups[newId] = cloned;
    allocationPool[newId] = cloned;
    return newId;
  };

  const ensureGridId = (oldId: string): string => {
    const existing = gridIdMap.get(oldId);
    if (existing) return existing;
    const newId = createGridGroupId();
    gridIdMap.set(oldId, newId);
    return newId;
  };

  // Pre-map ids referenced by copied rects (and by their grid's binding).
  for (const rect of copiedRects) {
    if (rect.gridGroupId) ensureGridId(rect.gridGroupId);
    if (rect.bindingGroupId) ensureBindingId(rect.bindingGroupId);
  }
  for (const oldGridId of gridIdMap.keys()) {
    const sourceGrid = sourceGridGroups?.[oldGridId];
    if (sourceGrid?.bindingGroupId) {
      ensureBindingId(sourceGrid.bindingGroupId);
    }
  }

  const oldIdToNewId = new Map<string, string>();
  const rectangles: Rectangle[] = copiedRects.map((rect, index) => {
    const newId = generateId();
    oldIdToNewId.set(rect.id, newId);
    const { id: _oldId, ...rest } = rect;
    return {
      ...rest,
      id: newId,
      x: Math.round(rect.x + offsetX),
      y: Math.round(rect.y + offsetY),
      order: existingRectCount + index,
      ...(rect.gridGroupId
        ? { gridGroupId: ensureGridId(rect.gridGroupId) }
        : {}),
      ...(rect.bindingGroupId
        ? { bindingGroupId: ensureBindingId(rect.bindingGroupId) }
        : {}),
    };
  });

  const newGridGroups: Record<string, GridGroup> = {};
  for (const [oldGridId, newGridId] of gridIdMap) {
    const sourceGrid = sourceGridGroups?.[oldGridId];
    const memberNewIds = copiedRects
      .filter(r => r.gridGroupId === oldGridId)
      .map(r => oldIdToNewId.get(r.id)!)
      .filter(Boolean);

    if (memberNewIds.length === 0) continue;

    const pastedMembers = rectangles.filter(r => memberNewIds.includes(r.id));
    const bounds = sourceGrid
      ? {
          x: Math.round(sourceGrid.bounds.x + offsetX),
          y: Math.round(sourceGrid.bounds.y + offsetY),
          width: sourceGrid.bounds.width,
          height: sourceGrid.bounds.height,
        }
      : boundsFromRects(pastedMembers);

    const bindingGroupId = sourceGrid?.bindingGroupId
      ? ensureBindingId(sourceGrid.bindingGroupId)
      : pastedMembers.find(r => r.bindingGroupId)?.bindingGroupId;

    const group: GridGroup = {
      id: newGridId,
      rectIds: memberNewIds,
      cols: sourceGrid?.cols ?? inferCols(pastedMembers),
      rows: sourceGrid?.rows ?? 1,
      bounds,
      settings: sourceGrid
        ? { ...sourceGrid.settings }
        : {
            cols: inferCols(pastedMembers),
            rows: 1,
            rectWidth: pastedMembers[0]?.width ?? 10,
            rectHeight: pastedMembers[0]?.height ?? 10,
            alignH: 'left',
            alignV: 'top',
          },
      ...(sourceGrid?.rotation != null ? { rotation: sourceGrid.rotation } : {}),
      ...(bindingGroupId ? { bindingGroupId } : {}),
    };
    newGridGroups[newGridId] = group;
  }

  return {
    rectangles,
    gridGroups: newGridGroups,
    bindingGroups: newBindingGroups,
  };
}

function boundsFromRects(rects: Rectangle[]): GridGroup['bounds'] {
  const minX = Math.min(...rects.map(r => r.x));
  const minY = Math.min(...rects.map(r => r.y));
  const maxX = Math.max(...rects.map(r => r.x + r.width));
  const maxY = Math.max(...rects.map(r => r.y + r.height));
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function inferCols(rects: Rectangle[]): number {
  if (rects.length === 0) return 1;
  const ys = new Set(rects.map(r => r.y));
  if (ys.size <= 1) return rects.length;
  return Math.max(1, Math.round(rects.length / ys.size));
}
