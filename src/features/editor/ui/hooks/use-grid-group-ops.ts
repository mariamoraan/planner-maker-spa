import { useCallback } from 'react';
import type { FieldStyle, FieldType, FormatVariant, GridGroup, Rectangle } from '@/features/template';
import { generateId } from '@/features/template/domain/services/id-generator';
import {
  boundsFromInferredGrid,
  boundsFromPitch,
  boundsFromRectanglesWithPadding,
  clampGridPadding,
  clampGridRectSize,
  defaultGridBounds,
  expandGridRectIds,
  gridConfigFromBounds,
  inferGridDimensionsFromCount,
  inferGridFromRectangles,
  inferPaddingFromRects,
  inferPitchFromRectangles,
  medianRectSize,
  orderRectIdsRowMajor,
  redistributeGridMoves,
  type GridBounds,
} from '@/features/editor/domain/services/grid-layout';
import { buildGridRectangles } from '@/features/editor/domain/services/grid-rectangle-builder';
import type { GridEditSettings } from '@/features/editor/domain/services/grid-edit-types';
import {
  assignRectsToGroup,
  buildGridGroup,
  clearGridGroupFromRects,
  removeGridGroup,
  translateGridGroupState,
  upsertGridGroup,
} from '@/features/editor/domain/services/grid-group';
import { useEditorStore } from '@/features/editor/ui/stores/editor-store';
import { useManageAreas } from '@/features/editor/ui/hooks/use-manage-areas';
import { useCurrentImage } from '@/features/editor/ui/hooks/use-current-image';
import { getDefaultFormatVariant, resolveFieldStyle } from '@/features/editor/domain/services/field-style-config';

function applyGridLayout(
  rectangles: Rectangle[],
  rectIds: string[],
  bounds: GridBounds,
  settings: GridEditSettings,
): Rectangle[] {
  const moves = redistributeGridMoves(rectIds, bounds, {
    cols: settings.cols,
    rows: settings.rows,
    rectSize: { width: settings.rectWidth, height: settings.rectHeight },
    align: settings.align,
    padding: settings.padding,
  });

  let next = [...rectangles];
  for (const move of moves) {
    next = next.map(rect =>
      rect.id === move.id
        ? {
            ...rect,
            x: move.x,
            y: move.y,
            width: settings.rectWidth,
            height: settings.rectHeight,
          }
        : rect,
    );
  }
  return next;
}

function syncGridCellCountLocal(
  rectangles: Rectangle[],
  rectIds: string[],
  bounds: GridBounds,
  settings: GridEditSettings,
  templateRect: Rectangle | undefined,
  baseOrder: number,
): { rectangles: Rectangle[]; rectIds: string[] } {
  const targetCount = settings.cols * settings.rows;
  const { keepIds, removeIds, slotsToCreate } = expandGridRectIds(rectIds, targetCount);

  let nextRects = rectangles.filter(rect => !removeIds.includes(rect.id));
  let nextIds = keepIds;

  if (slotsToCreate > 0 && templateRect) {
    const config = gridConfigFromBounds(
      bounds,
      settings.cols,
      settings.rows,
      { width: settings.rectWidth, height: settings.rectHeight },
      settings.align,
      settings.padding,
    );

    const newRects = buildGridRectangles(
      config,
      templateRect.fieldType,
      baseOrder,
      templateRect.formatVariant,
    )
      .slice(keepIds.length, targetCount)
      .map(rect => ({
        ...rect,
        id: generateId(),
        formatVariant: templateRect.formatVariant,
        style: templateRect.style,
      }));

    nextRects = [...nextRects, ...newRects];
    nextIds = [...nextIds, ...newRects.map(rect => rect.id)];
  }

  return { rectangles: nextRects, rectIds: nextIds };
}

function persistGroup(
  rectangles: Rectangle[],
  group: GridGroup,
  gridGroups: Record<string, GridGroup> | undefined,
  updatePageGridState: (updates: {
    rectangles: Rectangle[];
    gridGroups?: Record<string, GridGroup> | null;
  }) => void,
  setSelectedRectangleIds: (ids: string[]) => void,
) {
  const assigned = assignRectsToGroup(rectangles, group);
  const nextGridGroups = upsertGridGroup(gridGroups, group);
  updatePageGridState({ rectangles: assigned, gridGroups: nextGridGroups });
  setSelectedRectangleIds(group.rectIds);
}

export const DEFAULT_GRID_COLS = 4;
export const DEFAULT_GRID_ROWS = 4;
export const DEFAULT_GRID_RECT_SIZE = { width: 48, height: 36 };

export function useGridGroupOps() {
  const currentImage = useCurrentImage();
  const setSelectedRectangleIds = useEditorStore(state => state.setSelectedRectangleIds);
  const { updatePageGridState } = useManageAreas();

  const createGrid = useCallback(
    (bounds: GridBounds, settings: GridEditSettings, fieldType: FieldType) => {
      if (!currentImage) return;

      const config = gridConfigFromBounds(
        bounds,
        settings.cols,
        settings.rows,
        { width: settings.rectWidth, height: settings.rectHeight },
        settings.align,
        settings.padding ?? { x: 0, y: 0 },
      );

      const rects = buildGridRectangles(config, fieldType, currentImage.rectangles.length);
      const rectsWithIds: Rectangle[] = rects.map(rect => ({
        ...rect,
        id: generateId(),
      }));
      const rectIds = rectsWithIds.map(rect => rect.id);
      const nextRects = [...currentImage.rectangles, ...rectsWithIds];
      const group = buildGridGroup(rectIds, bounds, settings);

      persistGroup(
        nextRects,
        group,
        currentImage.gridGroups,
        updatePageGridState,
        setSelectedRectangleIds,
      );
    },
    [currentImage, updatePageGridState, setSelectedRectangleIds],
  );

  const createDefaultGrid = useCallback(
    (fieldType: FieldType) => {
      if (!currentImage) return;

      const settings: GridEditSettings = {
        cols: DEFAULT_GRID_COLS,
        rows: DEFAULT_GRID_ROWS,
        align: 'top-left',
        rectWidth: DEFAULT_GRID_RECT_SIZE.width,
        rectHeight: DEFAULT_GRID_RECT_SIZE.height,
        padding: { x: 0, y: 0 },
      };

      const bounds = defaultGridBounds(
        currentImage.width,
        currentImage.height,
        settings.cols,
        settings.rows,
        DEFAULT_GRID_RECT_SIZE,
      );

      createGrid(bounds, settings, fieldType);
    },
    [currentImage, createGrid],
  );

  const groupSelectionAsGrid = useCallback(
    (selectedIds: string[]) => {
      if (!currentImage || selectedIds.length < 2) return;

      const selectedRects = currentImage.rectangles.filter(rect => selectedIds.includes(rect.id));
      const inferred = inferGridFromRectangles(selectedRects);
      const rectIds = inferred?.rectIds ?? orderRectIdsRowMajor(selectedRects);
      const dims = inferred
        ? { cols: inferred.cols, rows: inferred.rows }
        : inferGridDimensionsFromCount(selectedRects.length);

      let bounds: GridBounds | null;
      if (inferred) {
        bounds = boundsFromInferredGrid(inferred);
      } else {
        const pitchInfo = inferPitchFromRectangles(selectedRects, dims.cols, dims.rows);
        if (pitchInfo) {
          bounds = boundsFromPitch(
            pitchInfo.origin,
            dims.cols,
            dims.rows,
            pitchInfo.pitchX,
            pitchInfo.pitchY,
          );
        } else {
          bounds = boundsFromRectanglesWithPadding(selectedRects);
        }
      }

      if (!bounds) return;

      const settings: GridEditSettings = {
        cols: dims.cols,
        rows: dims.rows,
        align: inferred?.align ?? 'top-left',
        rectWidth: inferred?.rectSize.width ?? medianRectSize(selectedRects).width,
        rectHeight: inferred?.rectSize.height ?? medianRectSize(selectedRects).height,
        padding: inferPaddingFromRects(bounds, {
          cols: dims.cols,
          rows: dims.rows,
          align: inferred?.align ?? 'top-left',
          rectWidth: inferred?.rectSize.width ?? medianRectSize(selectedRects).width,
          rectHeight: inferred?.rectSize.height ?? medianRectSize(selectedRects).height,
        }, selectedRects, rectIds),
      };

      const layoutRects = applyGridLayout(currentImage.rectangles, rectIds, bounds, settings);
      const group = buildGridGroup(rectIds, bounds, settings);
      persistGroup(
        layoutRects,
        group,
        currentImage.gridGroups,
        updatePageGridState,
        setSelectedRectangleIds,
      );
    },
    [currentImage, updatePageGridState, setSelectedRectangleIds],
  );

  const ungroupGridGroup = useCallback(
    (groupId: string) => {
      if (!currentImage) return;

      const group = currentImage.gridGroups?.[groupId];
      if (!group) return;

      const nextRects = clearGridGroupFromRects(currentImage.rectangles, groupId);
      const nextGridGroups = removeGridGroup(currentImage.gridGroups, groupId);

      updatePageGridState({
        rectangles: nextRects,
        gridGroups: nextGridGroups ?? null,
      });
      setSelectedRectangleIds(group.rectIds);
    },
    [currentImage, updatePageGridState, setSelectedRectangleIds],
  );

  const updateGroupSettings = useCallback(
    (groupId: string, updates: Partial<GridEditSettings>) => {
      if (!currentImage) return;

      const group = currentImage.gridGroups?.[groupId];
      if (!group) return;

      const nextSettings: GridEditSettings = { ...group.settings, ...updates };
      if (updates.rectWidth !== undefined || updates.rectHeight !== undefined) {
        const clampedSize = clampGridRectSize(group.bounds, nextSettings, {
          width: updates.rectWidth ?? nextSettings.rectWidth,
          height: updates.rectHeight ?? nextSettings.rectHeight,
        });
        nextSettings.rectWidth = clampedSize.width;
        nextSettings.rectHeight = clampedSize.height;
        nextSettings.padding = clampGridPadding(
          group.bounds,
          nextSettings,
          nextSettings.padding ?? { x: 0, y: 0 },
        );
      }
      if (updates.padding !== undefined) {
        nextSettings.padding = clampGridPadding(
          group.bounds,
          nextSettings,
          updates.padding,
        );
      }
      const templateRect = currentImage.rectangles.find(r => r.id === group.rectIds[0]);

      let rectIds = group.rectIds;
      let nextRects = currentImage.rectangles;
      const colsOrRowsChanged =
        updates.cols !== undefined || updates.rows !== undefined;

      if (colsOrRowsChanged) {
        const synced = syncGridCellCountLocal(
          currentImage.rectangles,
          group.rectIds,
          group.bounds,
          nextSettings,
          templateRect,
          currentImage.rectangles.length,
        );
        rectIds = synced.rectIds;
        nextRects = synced.rectangles;
      }

      if (
        colsOrRowsChanged ||
        updates.rectWidth !== undefined ||
        updates.rectHeight !== undefined ||
        updates.align !== undefined ||
        updates.padding !== undefined
      ) {
        nextRects = applyGridLayout(nextRects, rectIds, group.bounds, nextSettings);
      }

      const nextGroup = buildGridGroup(rectIds, group.bounds, nextSettings, groupId);
      persistGroup(
        nextRects,
        nextGroup,
        currentImage.gridGroups,
        updatePageGridState,
        setSelectedRectangleIds,
      );
    },
    [currentImage, updatePageGridState, setSelectedRectangleIds],
  );

  const updateGroupBounds = useCallback(
    (groupId: string, bounds: GridBounds) => {
      if (!currentImage) return;

      const group = currentImage.gridGroups?.[groupId];
      if (!group) return;

      const nextRects = applyGridLayout(
        currentImage.rectangles,
        group.rectIds,
        bounds,
        group.settings,
      );
      const nextGroup = buildGridGroup(group.rectIds, bounds, group.settings, groupId);

      persistGroup(
        nextRects,
        nextGroup,
        currentImage.gridGroups,
        updatePageGridState,
        setSelectedRectangleIds,
      );
    },
    [currentImage, updatePageGridState, setSelectedRectangleIds],
  );

  const translateGridGroup = useCallback(
    (groupId: string, dx: number, dy: number) => {
      if (!currentImage) return;

      const result = translateGridGroupState(
        currentImage.rectangles,
        currentImage.gridGroups,
        groupId,
        dx,
        dy,
      );
      if (!result) return;

      updatePageGridState(result);
      setSelectedRectangleIds(
        currentImage.gridGroups?.[groupId]?.rectIds ?? [],
      );
    },
    [currentImage, updatePageGridState, setSelectedRectangleIds],
  );

  const updateGroupFieldType = useCallback(
    (groupId: string, fieldType: FieldType) => {
      if (!currentImage) return;

      const group = currentImage.gridGroups?.[groupId];
      if (!group) return;

      const variant = getDefaultFormatVariant(fieldType);
      const nextRects = currentImage.rectangles.map(rect => {
        if (!group.rectIds.includes(rect.id)) return rect;
        return { ...rect, fieldType, formatVariant: variant };
      });

      updatePageGridState({ rectangles: nextRects, gridGroups: currentImage.gridGroups });
    },
    [currentImage, updatePageGridState],
  );

  const updateGroupStyle = useCallback(
    (groupId: string, updates: Partial<FieldStyle>) => {
      if (!currentImage) return;

      const group = currentImage.gridGroups?.[groupId];
      if (!group) return;

      const templateRect = currentImage.rectangles.find(r => r.id === group.rectIds[0]);
      if (!templateRect) return;

      const baseStyle = resolveFieldStyle(templateRect);
      const nextStyle = { ...baseStyle, ...updates };

      const nextRects = currentImage.rectangles.map(rect => {
        if (!group.rectIds.includes(rect.id)) return rect;
        return { ...rect, style: nextStyle };
      });

      updatePageGridState({ rectangles: nextRects, gridGroups: currentImage.gridGroups });
    },
    [currentImage, updatePageGridState],
  );

  const updateGroupFormatVariant = useCallback(
    (groupId: string, variant: FormatVariant) => {
      if (!currentImage) return;

      const group = currentImage.gridGroups?.[groupId];
      if (!group) return;

      const nextRects = currentImage.rectangles.map(rect => {
        if (!group.rectIds.includes(rect.id)) return rect;
        return { ...rect, formatVariant: variant };
      });

      updatePageGridState({ rectangles: nextRects, gridGroups: currentImage.gridGroups });
    },
    [currentImage, updatePageGridState],
  );

  return {
    createGrid,
    createDefaultGrid,
    groupSelectionAsGrid,
    ungroupGridGroup,
    updateGroupSettings,
    updateGroupBounds,
    translateGridGroup,
    updateGroupFieldType,
    updateGroupStyle,
    updateGroupFormatVariant,
  };
}

export function computePreviewPositionsForBounds(
  group: GridGroup,
  bounds: GridBounds,
): Record<string, { x: number; y: number }> {
  const moves = redistributeGridMoves(group.rectIds, bounds, {
    cols: group.settings.cols,
    rows: group.settings.rows,
    rectSize: {
      width: group.settings.rectWidth,
      height: group.settings.rectHeight,
    },
    align: group.settings.align,
    padding: group.settings.padding,
  });

  const map: Record<string, { x: number; y: number }> = {};
  for (const move of moves) {
    map[move.id] = { x: move.x, y: move.y };
  }
  return map;
}
