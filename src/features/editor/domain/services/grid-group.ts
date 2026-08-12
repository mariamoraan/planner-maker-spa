import type { FieldType, GridGroup, Rectangle } from '@/features/template';
import { generateId } from '@/features/template/domain/services/id-generator';
import type { GridEditSettings } from './grid-edit-types';
import { normalizeGridSettings, toPersistedGridSettings } from './grid-edit-types';
import { translateGridBounds, type GridBounds } from './grid-layout';

export function createGridGroupId(): string {
  return `grid-${generateId()}`;
}

export function findGridGroupForRect(
  rectId: string,
  gridGroups: Record<string, GridGroup> | undefined,
): GridGroup | null {
  if (!gridGroups) return null;
  return Object.values(gridGroups).find(group => group.rectIds.includes(rectId)) ?? null;
}

export function pointInGridBounds(
  point: { x: number; y: number },
  bounds: GridBounds,
): boolean {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
}

export function findGridGroupAtPoint(
  point: { x: number; y: number },
  gridGroups: Record<string, GridGroup> | undefined,
): GridGroup | null {
  if (!gridGroups) return null;

  const groups = Object.values(gridGroups).sort(
    (a, b) => a.bounds.width * a.bounds.height - b.bounds.width * b.bounds.height,
  );

  return groups.find(group => pointInGridBounds(point, group.bounds)) ?? null;
}

export function resolveGridGroupId(
  rectId: string,
  rectangles: Rectangle[],
  gridGroups?: Record<string, GridGroup>,
): string | undefined {
  const rect = rectangles.find(r => r.id === rectId);
  if (rect?.gridGroupId) return rect.gridGroupId;
  return findGridGroupForRect(rectId, gridGroups)?.id;
}

export function getGridGroupFieldType(
  group: GridGroup,
  rectangles: Rectangle[],
  gridGroups?: Record<string, GridGroup>,
): FieldType | undefined {
  const memberIds = getGridGroupMemberIds(group.id, rectangles, gridGroups);
  if (memberIds.length === 0) return undefined;

  return rectangles.find(rect => rect.id === memberIds[0])?.fieldType;
}

export function getGridGroupMemberIds(
  groupId: string,
  rectangles: Rectangle[],
  gridGroups?: Record<string, GridGroup>,
): string[] {
  const fromRects = rectangles
    .filter(rect => rect.gridGroupId === groupId)
    .sort((a, b) => (a.gridCellIndex ?? 0) - (b.gridCellIndex ?? 0))
    .map(rect => rect.id);

  if (fromRects.length > 0) return fromRects;

  const group = gridGroups?.[groupId];
  if (!group) return [];

  return group.rectIds
    .map(id => {
      const rect = rectangles.find(r => r.id === id);
      return { id, index: rect?.gridCellIndex ?? group.rectIds.indexOf(id) };
    })
    .sort((a, b) => a.index - b.index)
    .map(entry => entry.id);
}

export function expandSelectionToGridGroups(
  selectedIds: string[],
  rectangles: Rectangle[],
  gridGroups?: Record<string, GridGroup>,
): string[] {
  const expanded = new Set<string>();

  for (const id of selectedIds) {
    const groupId = resolveGridGroupId(id, rectangles, gridGroups);
    if (groupId) {
      getGridGroupMemberIds(groupId, rectangles, gridGroups).forEach(memberId =>
        expanded.add(memberId),
      );
    } else {
      expanded.add(id);
    }
  }

  return [...expanded];
}

export function repairGridGroupSettings(
  gridGroups: Record<string, GridGroup> | undefined,
): Record<string, GridGroup> | undefined {
  if (!gridGroups) return gridGroups;

  let changed = false;
  const next: Record<string, GridGroup> = {};

  for (const [id, group] of Object.entries(gridGroups)) {
    const normalized = toPersistedGridSettings(normalizeGridSettings(group.settings));
    const hasLegacyAlign = group.settings.align !== undefined;
    const needsUpdate =
      hasLegacyAlign ||
      group.settings.alignH !== normalized.alignH ||
      group.settings.alignV !== normalized.alignV;

    if (needsUpdate) {
      changed = true;
      next[id] = { ...group, settings: normalized };
    } else {
      next[id] = group;
    }
  }

  return changed ? next : gridGroups;
}

export function repairGridMetadata(
  rectangles: Rectangle[],
  gridGroups: Record<string, GridGroup> | undefined,
): Rectangle[] {
  if (!gridGroups || Object.keys(gridGroups).length === 0) return rectangles;

  let changed = false;
  const next = rectangles.map(rect => {
    for (const group of Object.values(gridGroups)) {
      const cellIndex = group.rectIds.indexOf(rect.id);
      if (cellIndex === -1) continue;
      if (rect.gridGroupId === group.id && rect.gridCellIndex === cellIndex) return rect;
      changed = true;
      return {
        ...rect,
        gridGroupId: group.id,
        gridCellIndex: cellIndex,
      };
    }
    return rect;
  });

  return changed ? next : rectangles;
}

export function getGridGroupForSelection(
  selectedIds: string[],
  gridGroups: Record<string, GridGroup> | undefined,
): GridGroup | null {
  if (!gridGroups || selectedIds.length === 0) return null;

  const groupIds = new Set(
    selectedIds
      .map(id => gridGroups && Object.values(gridGroups).find(g => g.rectIds.includes(id))?.id)
      .filter((id): id is string => Boolean(id)),
  );

  if (groupIds.size !== 1) return null;
  const groupId = [...groupIds][0];
  const group = groupId ? gridGroups[groupId] ?? null : null;
  if (!group || !isFullGridGroupSelected(selectedIds, group)) return null;
  return group;
}

export function isFullGridGroupSelected(
  selectedIds: string[],
  group: GridGroup,
): boolean {
  if (selectedIds.length !== group.rectIds.length) return false;
  return group.rectIds.every(id => selectedIds.includes(id));
}

export function isSelectionLockedGridGroup(
  selectedIds: string[],
  rectangles: Rectangle[],
  gridGroups: Record<string, GridGroup> | undefined,
): boolean {
  return getGridGroupForSelection(selectedIds, gridGroups) !== null;
}

export function buildGridGroup(
  rectIds: string[],
  bounds: GridBounds,
  settings: GridEditSettings,
  groupId?: string,
): GridGroup {
  return {
    id: groupId ?? createGridGroupId(),
    rectIds: [...rectIds],
    cols: settings.cols,
    rows: settings.rows,
    bounds: { ...bounds },
    settings: toPersistedGridSettings(normalizeGridSettings(settings)),
  };
}

export function assignRectsToGroup(
  rectangles: Rectangle[],
  group: GridGroup,
): Rectangle[] {
  return rectangles.map(rect => {
    const cellIndex = group.rectIds.indexOf(rect.id);
    if (cellIndex === -1) return rect;
    return {
      ...rect,
      gridGroupId: group.id,
      gridCellIndex: cellIndex,
    };
  });
}

export function clearGridGroupFromRects(
  rectangles: Rectangle[],
  groupId: string,
): Rectangle[] {
  return rectangles.map(rect => {
    if (rect.gridGroupId !== groupId) return rect;
    const { gridGroupId: _g, gridCellIndex: _c, ...rest } = rect;
    return rest;
  });
}

export function removeGridGroup(
  gridGroups: Record<string, GridGroup> | undefined,
  groupId: string,
): Record<string, GridGroup> | undefined {
  if (!gridGroups || !gridGroups[groupId]) return gridGroups;
  const next = { ...gridGroups };
  delete next[groupId];
  return Object.keys(next).length > 0 ? next : undefined;
}

export function upsertGridGroup(
  gridGroups: Record<string, GridGroup> | undefined,
  group: GridGroup,
): Record<string, GridGroup> {
  return { ...gridGroups, [group.id]: group };
}

export function translateGridGroupState(
  rectangles: Rectangle[],
  gridGroups: Record<string, GridGroup> | undefined,
  groupId: string,
  dx: number,
  dy: number,
): { rectangles: Rectangle[]; gridGroups: Record<string, GridGroup> } | null {
  if (dx === 0 && dy === 0) return null;

  const group = gridGroups?.[groupId];
  if (!group) return null;

  const nextBounds = translateGridBounds(group.bounds, dx, dy);
  const nextRects = rectangles.map(rect => {
    if (!group.rectIds.includes(rect.id)) return rect;
    return { ...rect, x: Math.round(rect.x + dx), y: Math.round(rect.y + dy) };
  });
  const nextGroup = buildGridGroup(group.rectIds, nextBounds, group.settings, groupId);
  const assigned = assignRectsToGroup(nextRects, nextGroup);
  const nextGridGroups = upsertGridGroup(gridGroups, nextGroup);

  return { rectangles: assigned, gridGroups: nextGridGroups };
}

export function canGroupSelection(selectedIds: string[], rectangles: Rectangle[]): boolean {
  if (selectedIds.length < 2) return false;
  const hasGrouped = selectedIds.some(id => {
    const rect = rectangles.find(r => r.id === id);
    return Boolean(rect?.gridGroupId);
  });
  return !hasGrouped;
}
