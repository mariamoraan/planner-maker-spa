import type { BindingGroup, GridGroup, Rectangle, TemplateType } from '@/features/template';
import { preparePastedSelection } from '@/features/editor/domain/services/clone-for-paste';

export type PageContentSnapshot = {
  rectangles: Rectangle[];
  gridGroups?: Record<string, GridGroup>;
  bindingGroups?: Record<string, BindingGroup>;
};

export type TransferAreasInput = {
  from: PageContentSnapshot & { width: number; height: number; type: TemplateType };
  to: PageContentSnapshot & { width: number; height: number; type: TemplateType };
  rectangleIds: string[];
  /** Destination positions keyed by source rectangle id. */
  positions: Record<string, { x: number; y: number }>;
};

export type TransferAreasResult = {
  fromAfter: PageContentSnapshot;
  toAfter: PageContentSnapshot;
  pastedIds: string[];
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function pruneUnusedBindingGroups(
  rectangles: Rectangle[],
  gridGroups: Record<string, GridGroup> | undefined,
  bindingGroups: Record<string, BindingGroup> | undefined,
): Record<string, BindingGroup> | undefined {
  if (!bindingGroups) return undefined;
  const used = new Set<string>();
  for (const rect of rectangles) {
    if (rect.bindingGroupId) used.add(rect.bindingGroupId);
  }
  for (const group of Object.values(gridGroups ?? {})) {
    if (group.bindingGroupId) used.add(group.bindingGroupId);
  }
  const next: Record<string, BindingGroup> = {};
  for (const [id, group] of Object.entries(bindingGroups)) {
    if (used.has(id)) next[id] = group;
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

/**
 * Compute source/destination page snapshots after moving selected rects
 * (and their grid/binding groups) from one page to another.
 */
export function computeTransferAreas({
  from,
  to,
  rectangleIds,
  positions,
}: TransferAreasInput): TransferAreasResult | null {
  const idSet = new Set(rectangleIds);
  const moving = from.rectangles.filter(r => idSet.has(r.id));
  if (moving.length === 0) return null;

  const positioned = moving.map(rect => {
    const target = positions[rect.id] ?? { x: rect.x, y: rect.y };
    return {
      ...rect,
      x: clamp(Math.round(target.x), 0, Math.max(0, to.width - rect.width)),
      y: clamp(Math.round(target.y), 0, Math.max(0, to.height - rect.height)),
    };
  });

  const pasteMinX = Math.min(...positioned.map(r => r.x));
  const pasteMinY = Math.min(...positioned.map(r => r.y));

  const movingBindingIds = new Set<string>();
  for (const rect of moving) {
    if (rect.bindingGroupId) movingBindingIds.add(rect.bindingGroupId);
  }
  for (const group of Object.values(from.gridGroups ?? {})) {
    if (group.rectIds.some(id => idSet.has(id)) && group.bindingGroupId) {
      movingBindingIds.add(group.bindingGroupId);
    }
  }

  const leftoverSourceBindings: Record<string, BindingGroup> = {};
  for (const [id, group] of Object.entries(from.bindingGroups ?? {})) {
    if (!movingBindingIds.has(id)) leftoverSourceBindings[id] = group;
  }

  const pasted = preparePastedSelection({
    copiedRects: positioned.map(r => ({
      ...r,
      x: r.x - pasteMinX,
      y: r.y - pasteMinY,
    })),
    offsetX: pasteMinX,
    offsetY: pasteMinY,
    existingRectCount: to.rectangles.length,
    sourceGridGroups: from.gridGroups,
    sourceBindingGroups: from.bindingGroups,
    existingBindingGroups: to.bindingGroups,
    siblingBindingGroups: leftoverSourceBindings,
    pageType: to.type,
  });

  const remainingRects = from.rectangles.filter(r => !idSet.has(r.id));

  let fromGridGroups = from.gridGroups;
  if (fromGridGroups) {
    const next: Record<string, GridGroup> = {};
    for (const [gid, group] of Object.entries(fromGridGroups)) {
      const remainingMembers = group.rectIds.filter(id => !idSet.has(id));
      if (remainingMembers.length === 0) continue;
      next[gid] =
        remainingMembers.length === group.rectIds.length
          ? group
          : { ...group, rectIds: remainingMembers };
    }
    fromGridGroups = Object.keys(next).length > 0 ? next : undefined;
  }

  const fromBindingGroups = pruneUnusedBindingGroups(
    remainingRects,
    fromGridGroups,
    from.bindingGroups,
  );

  const toAfterGrids = {
    ...(to.gridGroups ?? {}),
    ...pasted.gridGroups,
  };
  const toAfterBindings = {
    ...(to.bindingGroups ?? {}),
    ...pasted.bindingGroups,
  };

  return {
    fromAfter: {
      rectangles: remainingRects,
      gridGroups: fromGridGroups,
      bindingGroups: fromBindingGroups,
    },
    toAfter: {
      rectangles: [...to.rectangles, ...pasted.rectangles],
      gridGroups: Object.keys(toAfterGrids).length > 0 ? toAfterGrids : undefined,
      bindingGroups: Object.keys(toAfterBindings).length > 0 ? toAfterBindings : undefined,
    },
    pastedIds: pasted.rectangles.map(r => r.id),
  };
}
