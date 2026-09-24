import type {
  BindingGroup,
  BindingSourceKind,
  FieldType,
  GridGroup,
  Rectangle,
  TemplateImage,
  TemplateType,
} from '@/features/template';
import { generateId } from '@/features/template/domain/services/id-generator';

export function createBindingGroupId(): string {
  return `bind-${generateId()}`;
}

export function defaultBindingSourceForPage(pageType: TemplateType): BindingSourceKind {
  switch (pageType) {
    case 'yearly-calendar':
      return 'yearMonths';
    case 'monthly-calendar':
      return 'monthDays';
    case 'weekly-calendar':
      return 'weekDays';
    case 'daily-page':
      return 'monthDays';
    default:
      return 'page';
  }
}

/** Default binding for a new grid, considering the cells' field type. */
export function defaultGridBindingSource(
  pageType: TemplateType,
  fieldType?: FieldType,
): BindingSourceKind {
  if (pageType === 'yearly-calendar') {
    if (fieldType === 'day') return 'monthDays';
    return 'yearMonths';
  }
  return defaultBindingSourceForPage(pageType);
}

/** Field types that should bind to the day sequence on calendar pages. */
function usesDaySequenceBinding(fieldType: FieldType): boolean {
  return fieldType === 'day';
}

/**
 * Default for a newly created loose (non-grid) block.
 * Day cells join the month/week sequence; titles and range fields stay on page.
 * On yearly pages, month blocks join the yearMonths sequence.
 */
export function defaultLooseBlockBindingSource(
  pageType: TemplateType,
  fieldType?: FieldType,
): BindingSourceKind {
  if (pageType === 'yearly-calendar') {
    if (fieldType === 'month') return 'yearMonths';
    if (fieldType === 'day') return 'monthDays';
    return 'page';
  }

  if (fieldType !== undefined && !usesDaySequenceBinding(fieldType)) {
    return 'page';
  }

  switch (pageType) {
    case 'monthly-calendar':
      return 'monthDays';
    case 'weekly-calendar':
      return 'weekDays';
    case 'daily-page':
      return 'page';
    default:
      return 'page';
  }
}

/** Pages where the user can pick page / month / week / year date roles. */
export function pageAllowsDateRoleChoice(pageType: TemplateType): boolean {
  return (
    pageType === 'daily-page' ||
    pageType === 'monthly-calendar' ||
    pageType === 'weekly-calendar' ||
    pageType === 'yearly-calendar'
  );
}

/** Suggested role when turning a selection into a calendar (not for loose blocks). */
export function suggestedCalendarRoleForPage(pageType: TemplateType): BindingSourceKind {
  return defaultBindingSourceForPage(pageType);
}

export const CALENDAR_ROLE_OPTIONS: BindingSourceKind[] = [
  'page',
  'monthDays',
  'weekDays',
  'yearMonths',
];

export function calendarRoleOptionsForPage(pageType: TemplateType): BindingSourceKind[] {
  if (pageType === 'yearly-calendar') {
    return ['page', 'yearMonths', 'monthDays'];
  }
  return ['page', 'monthDays', 'weekDays'];
}

export function calendarRoleLabelKey(source: BindingSourceKind): string {
  switch (source) {
    case 'page':
      return 'editor.calendarRolePage';
    case 'monthDays':
      return 'editor.calendarRoleMonth';
    case 'weekDays':
      return 'editor.calendarRoleWeek';
    case 'yearMonths':
      return 'editor.calendarRoleYear';
  }
}

export function calendarRoleShortKey(source: BindingSourceKind): string {
  switch (source) {
    case 'page':
      return 'editor.calendarRolePageShort';
    case 'monthDays':
      return 'editor.calendarRoleMonthShort';
    case 'weekDays':
      return 'editor.calendarRoleWeekShort';
    case 'yearMonths':
      return 'editor.calendarRoleYearShort';
  }
}

/** Collect yearMonthIndex values already taken by monthDays bindings. */
export function usedYearMonthIndices(
  ...groupMaps: Array<Record<string, BindingGroup> | undefined>
): Set<number> {
  const used = new Set<number>();
  for (const map of groupMaps) {
    for (const group of Object.values(map ?? {})) {
      if (group.source === 'monthDays' && group.yearMonthIndex != null) {
        used.add(group.yearMonthIndex);
      }
    }
  }
  return used;
}

export function nextFreeYearMonthIndexFromUsed(used: Set<number>): number {
  for (let i = 0; i < 12; i++) {
    if (!used.has(i)) return i;
  }
  return 0;
}

/** Lowest free 0–11 month slot among monthDays groups that already have an index. */
export function nextFreeYearMonthIndex(
  ...groupMaps: Array<Record<string, BindingGroup> | undefined>
): number {
  return nextFreeYearMonthIndexFromUsed(usedYearMonthIndices(...groupMaps));
}

export type YearMonthIndexOptions = {
  /** Binding groups on the other face of a contiguous yearly spread. */
  siblingBindingGroups?: Record<string, BindingGroup>;
  /** Prefer this slot when free (paste/transfer of an existing month grid). */
  preferredYearMonthIndex?: number;
};

/** Attach yearMonthIndex when creating/switching to monthDays on a yearly page. */
export function withYearMonthIndexForPage(
  group: BindingGroup,
  pageType: TemplateType,
  bindingGroups: Record<string, BindingGroup> | undefined,
  options?: YearMonthIndexOptions,
): BindingGroup {
  if (pageType !== 'yearly-calendar' || group.source !== 'monthDays') {
    if (group.yearMonthIndex == null) return group;
    const { yearMonthIndex: _i, ...rest } = group;
    return rest;
  }
  if (group.yearMonthIndex != null) return group;

  const used = usedYearMonthIndices(bindingGroups, options?.siblingBindingGroups);
  const preferred = options?.preferredYearMonthIndex;
  const yearMonthIndex =
    preferred != null && preferred >= 0 && preferred <= 11 && !used.has(preferred)
      ? preferred
      : nextFreeYearMonthIndexFromUsed(used);

  return {
    ...group,
    yearMonthIndex,
  };
}

/**
 * Keep left-face month slots; reassign right-face monthDays that collide
 * (common after pasting/moving half a yearly layout onto the other spread face).
 */
export function rebalanceYearMonthIndicesAcrossSpread(
  left: TemplateImage,
  right: TemplateImage,
): { left: TemplateImage; right: TemplateImage; changed: boolean } {
  if (left.type !== 'yearly-calendar' || right.type !== 'yearly-calendar') {
    return { left, right, changed: false };
  }
  if (!right.bindingGroups) return { left, right, changed: false };

  const rightMonthGroups = Object.values(right.bindingGroups)
    .filter(group => group.source === 'monthDays')
    .sort((a, b) => {
      const indexA = a.yearMonthIndex ?? 999;
      const indexB = b.yearMonthIndex ?? 999;
      if (indexA !== indexB) return indexA - indexB;
      return a.id.localeCompare(b.id);
    });

  if (rightMonthGroups.length === 0) return { left, right, changed: false };

  const used = usedYearMonthIndices(left.bindingGroups);
  let nextBindings = right.bindingGroups;
  let changed = false;

  for (const group of rightMonthGroups) {
    const current = group.yearMonthIndex;
    if (current != null && !used.has(current)) {
      used.add(current);
      continue;
    }
    const nextIndex = nextFreeYearMonthIndexFromUsed(used);
    used.add(nextIndex);
    if (nextBindings === right.bindingGroups) {
      nextBindings = { ...right.bindingGroups };
    }
    nextBindings[group.id] = { ...group, yearMonthIndex: nextIndex };
    changed = true;
  }

  if (!changed) return { left, right, changed: false };
  return {
    left,
    right: { ...right, bindingGroups: nextBindings },
    changed: true,
  };
}

/** Rebalance monthDays indices on every yearly contiguous spread in the template. */
export function repairYearMonthIndicesInImages(images: TemplateImage[]): TemplateImage[] {
  const byId = new Map(images.map(image => [image.id, image]));
  let changed = false;

  for (const image of images) {
    if (!image.spreadId || image.spreadFace !== 'left') continue;
    const mate = images.find(
      other => other.spreadId === image.spreadId && other.id !== image.id,
    );
    if (!mate || mate.spreadFace !== 'right') continue;

    const left = byId.get(image.id) ?? image;
    const right = byId.get(mate.id) ?? mate;
    const result = rebalanceYearMonthIndicesAcrossSpread(left, right);
    if (!result.changed) continue;
    changed = true;
    byId.set(result.left.id, result.left);
    byId.set(result.right.id, result.right);
  }

  if (!changed) return images;
  return images.map(image => byId.get(image.id) ?? image);
}

/** Non-grid binding group with the given sequence source, if any. */
export function findLooseSequenceBindingId(
  templateImage: TemplateImage,
  source: BindingSourceKind,
): string | undefined {
  if (source === 'page' || !templateImage.bindingGroups) return undefined;

  const gridBound = new Set(
    Object.values(templateImage.gridGroups ?? {})
      .map(g => g.bindingGroupId)
      .filter((id): id is string => Boolean(id)),
  );

  return Object.values(templateImage.bindingGroups).find(
    group => group.source === source && !gridBound.has(group.id),
  )?.id;
}

export function createBindingGroup(
  source: BindingSourceKind,
  options?: { id?: string; name?: string; yearMonthIndex?: number },
): BindingGroup {
  const group: BindingGroup = {
    id: options?.id ?? createBindingGroupId(),
    source,
  };
  if (options?.name) group.name = options.name;
  if (options?.yearMonthIndex != null) group.yearMonthIndex = options.yearMonthIndex;
  return group;
}

export function upsertBindingGroup(
  bindingGroups: Record<string, BindingGroup> | undefined,
  group: BindingGroup,
): Record<string, BindingGroup> {
  return { ...bindingGroups, [group.id]: group };
}

export function removeBindingGroup(
  bindingGroups: Record<string, BindingGroup> | undefined,
  groupId: string,
): Record<string, BindingGroup> | undefined {
  if (!bindingGroups?.[groupId]) return bindingGroups;
  const next = { ...bindingGroups };
  delete next[groupId];
  return Object.keys(next).length > 0 ? next : undefined;
}

export function getBindingGroupMembers(
  bindingGroupId: string,
  rectangles: Rectangle[],
): Rectangle[] {
  return rectangles
    .filter(rect => rect.bindingGroupId === bindingGroupId)
    .sort((a, b) => {
      const indexA = a.sequenceIndex ?? a.gridCellIndex ?? a.order;
      const indexB = b.sequenceIndex ?? b.gridCellIndex ?? b.order;
      if (indexA !== indexB) return indexA - indexB;
      return a.order - b.order;
    });
}

export function getSequenceIndex(
  rectangle: Rectangle,
  rectangles: Rectangle[],
): number {
  if (rectangle.sequenceIndex != null) return rectangle.sequenceIndex;
  if (rectangle.gridCellIndex != null) return rectangle.gridCellIndex;
  if (!rectangle.bindingGroupId) return 0;
  const members = getBindingGroupMembers(rectangle.bindingGroupId, rectangles);
  const index = members.findIndex(member => member.id === rectangle.id);
  return index >= 0 ? index : 0;
}

export function resolveBindingGroup(
  rectangle: Rectangle,
  templateImage: TemplateImage,
): BindingGroup | null {
  if (!rectangle.bindingGroupId) return null;
  return templateImage.bindingGroups?.[rectangle.bindingGroupId] ?? null;
}

export function resolveEffectiveBindingSource(
  rectangle: Rectangle,
  templateImage: TemplateImage,
): BindingSourceKind {
  return resolveBindingGroup(rectangle, templateImage)?.source ?? 'page';
}

export function assignRectsToBindingGroup(
  rectangles: Rectangle[],
  bindingGroupId: string,
  rectIds: string[],
  options?: { setSequenceFromOrder?: boolean },
): Rectangle[] {
  const idSet = new Set(rectIds);
  const ordered = rectIds
    .map(id => rectangles.find(rect => rect.id === id))
    .filter((rect): rect is Rectangle => Boolean(rect));

  return rectangles.map(rect => {
    if (!idSet.has(rect.id)) return rect;
    const sequenceIndex = options?.setSequenceFromOrder
      ? ordered.findIndex(member => member.id === rect.id)
      : (rect.sequenceIndex ??
        rect.gridCellIndex ??
        ordered.findIndex(member => member.id === rect.id));
    return {
      ...rect,
      bindingGroupId,
      sequenceIndex: sequenceIndex >= 0 ? sequenceIndex : 0,
    };
  });
}

export function clearBindingGroupFromRects(
  rectangles: Rectangle[],
  bindingGroupId: string,
): Rectangle[] {
  return rectangles.map(rect => {
    if (rect.bindingGroupId !== bindingGroupId) return rect;
    const { bindingGroupId: _b, sequenceIndex: _s, ...rest } = rect;
    return rest;
  });
}

/** Ensure grids and legacy day sequences have BindingGroups. Idempotent. */
export function repairBindingMetadata(templateImage: TemplateImage): {
  rectangles: Rectangle[];
  gridGroups: Record<string, GridGroup> | undefined;
  bindingGroups: Record<string, BindingGroup> | undefined;
  changed: boolean;
} {
  let rectangles = templateImage.rectangles;
  let gridGroups = templateImage.gridGroups;
  let bindingGroups = templateImage.bindingGroups
    ? { ...templateImage.bindingGroups }
    : undefined;
  let changed = false;

  const ensureGroupsMap = () => {
    if (!bindingGroups) bindingGroups = {};
    return bindingGroups;
  };

  if (gridGroups) {
    let nextGridGroups = gridGroups;
    for (const group of Object.values(gridGroups)) {
      if (group.bindingGroupId && bindingGroups?.[group.bindingGroupId]) {
        const missingMembers = rectangles.some(
          rect =>
            group.rectIds.includes(rect.id) &&
            rect.bindingGroupId !== group.bindingGroupId,
        );
        if (!missingMembers) continue;

        rectangles = assignRectsToBindingGroup(
          rectangles,
          group.bindingGroupId,
          group.rectIds,
        );
        changed = true;
        continue;
      }

      const source = defaultBindingSourceForPage(templateImage.type);
      const binding = withYearMonthIndexForPage(
        createBindingGroup(source, {
          id: `bind-${group.id}`,
          name: templateImage.type === 'daily-page' ? 'Calendar' : undefined,
        }),
        templateImage.type,
        ensureGroupsMap(),
      );
      ensureGroupsMap()[binding.id] = binding;
      nextGridGroups = {
        ...nextGridGroups,
        [group.id]: { ...group, bindingGroupId: binding.id },
      };
      rectangles = assignRectsToBindingGroup(rectangles, binding.id, group.rectIds);
      changed = true;
    }
    if (nextGridGroups !== gridGroups) {
      gridGroups = nextGridGroups;
    }
  }

  const unboundDays = rectangles.filter(
    rect => rect.fieldType === 'day' && !rect.bindingGroupId,
  );

  if (
    unboundDays.length > 0 &&
    (templateImage.type === 'monthly-calendar' ||
      templateImage.type === 'weekly-calendar' ||
      templateImage.type === 'yearly-calendar')
  ) {
    const source: BindingSourceKind =
      templateImage.type === 'weekly-calendar'
        ? 'weekDays'
        : templateImage.type === 'yearly-calendar'
          ? 'monthDays'
          : 'monthDays';
    const binding = withYearMonthIndexForPage(
      createBindingGroup(source, {
        id: `bind-legacy-days-${templateImage.id}`,
      }),
      templateImage.type,
      ensureGroupsMap(),
    );
    ensureGroupsMap()[binding.id] = binding;
    const orderedIds = [...unboundDays]
      .sort((a, b) => a.order - b.order)
      .map(rect => rect.id);
    rectangles = assignRectsToBindingGroup(rectangles, binding.id, orderedIds, {
      setSequenceFromOrder: true,
    });
    changed = true;
  }

  if (bindingGroups) {
    const referenced = new Set<string>();
    for (const rect of rectangles) {
      if (rect.bindingGroupId) referenced.add(rect.bindingGroupId);
    }
    if (gridGroups) {
      for (const group of Object.values(gridGroups)) {
        if (group.bindingGroupId) referenced.add(group.bindingGroupId);
      }
    }
    const pruned: Record<string, BindingGroup> = {};
    for (const [id, group] of Object.entries(bindingGroups)) {
      if (referenced.has(id)) pruned[id] = group;
      else changed = true;
    }
    bindingGroups = Object.keys(pruned).length > 0 ? pruned : undefined;
  }

  return { rectangles, gridGroups, bindingGroups, changed };
}

export function withRepairedBindingMetadata(image: TemplateImage): TemplateImage {
  const repaired = repairBindingMetadata(image);
  if (!repaired.changed) return image;
  return {
    ...image,
    rectangles: repaired.rectangles,
    gridGroups: repaired.gridGroups,
    bindingGroups: repaired.bindingGroups,
  };
}

/** 1-based sequence index for UI; 0 means page binding (no sequence). */
export function getBindingDisplayIndex(
  rectangle: Rectangle,
  templateImage: TemplateImage,
): number {
  const source = resolveEffectiveBindingSource(rectangle, templateImage);
  if (source === 'page') return 0;
  return getSequenceIndex(rectangle, templateImage.rectangles) + 1;
}
