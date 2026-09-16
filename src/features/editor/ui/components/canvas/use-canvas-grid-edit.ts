import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type Konva from 'konva';
import type { TemplateImage } from '@/features/template';
import { useEditorStore } from '@/features/editor/ui/stores/editor-store';
import {
  type GridBounds,
  translateGridBounds,
} from '@/features/editor/domain/services/grid-layout';
import type { GridEditSettings } from '@/features/editor/domain/services/grid-edit-types';
import { normalizeGridSettings } from '@/features/editor/domain/services/grid-edit-types';
import {
  computePreviewPositionsForBounds,
  computePreviewPositionsForSettings,
  computePreviewRectSizesForSettings,
  minBoundsForContent,
  useGridGroupOps,
} from '@/features/editor/ui/hooks/use-grid-group-ops';
import { getGridGroupForSelection } from '@/features/editor/domain/services/grid-group';
import type { DragOverlay, DragState } from './canvas-interaction-types';

interface UseCanvasGridEditParams {
  currentImage: TemplateImage | null;
  selectedRectangleIds: string[];
  dragState: DragState | null;
  dragOverlay: DragOverlay | null;
  imageId: string | undefined;
  stageRef: RefObject<Konva.Stage | null>;
}

export function useCanvasGridEdit({
  currentImage,
  selectedRectangleIds,
  dragState,
  dragOverlay,
  imageId,
  stageRef,
}: UseCanvasGridEditParams) {
  const [gridBoundsPreview, setGridBoundsPreview] = useState<GridBounds | null>(null);
  const [gridSettingsPreview, setGridSettingsPreview] = useState<Partial<GridEditSettings> | null>(
    null,
  );
  const gridBoundsPreviewRef = useRef<GridBounds | null>(null);
  const gridSettingsPreviewRef = useRef<Partial<GridEditSettings> | null>(null);

  const { updateGroupBounds, updateGroupSettings } = useGridGroupOps();
  const setGridEditFocus = useEditorStore(state => state.setGridEditFocus);
  const gridEditFocus = useEditorStore(state => state.gridEditFocus);

  const lockedGridGroup = useMemo(() => {
    if (!currentImage) return null;
    return getGridGroupForSelection(selectedRectangleIds, currentImage.gridGroups);
  }, [currentImage, selectedRectangleIds]);

  useEffect(() => {
    setGridBoundsPreview(null);
    gridBoundsPreviewRef.current = null;
    setGridSettingsPreview(null);
    gridSettingsPreviewRef.current = null;
  }, [imageId]);

  useEffect(() => {
    if (!lockedGridGroup) {
      setGridBoundsPreview(null);
      gridBoundsPreviewRef.current = null;
      setGridSettingsPreview(null);
      gridSettingsPreviewRef.current = null;
      setGridEditFocus('grid');
      // Handles set container.style.cursor on hover; unmount skips mouseLeave.
      const container = stageRef.current?.container();
      if (container) container.style.cursor = '';
    }
  }, [lockedGridGroup?.id, setGridEditFocus, stageRef]);

  const gridPreviewPositions = useMemo(() => {
    if (!lockedGridGroup || !gridBoundsPreview) return {};
    return computePreviewPositionsForBounds(lockedGridGroup, gridBoundsPreview);
  }, [lockedGridGroup, gridBoundsPreview]);

  const activeGridSettings = useMemo(() => {
    if (!lockedGridGroup) return null;
    return normalizeGridSettings({ ...lockedGridGroup.settings, ...gridSettingsPreview });
  }, [lockedGridGroup, gridSettingsPreview]);

  const activeGridBounds = useMemo(() => {
    if (gridBoundsPreview) return gridBoundsPreview;
    if (!lockedGridGroup) return null;

    const delta = dragOverlay?.delta;
    if (dragState && delta && (delta.dx !== 0 || delta.dy !== 0)) {
      return translateGridBounds(lockedGridGroup.bounds, delta.dx, delta.dy);
    }

    return lockedGridGroup.bounds;
  }, [gridBoundsPreview, lockedGridGroup, dragState, dragOverlay]);

  const gridSettingsPreviewPositions = useMemo(() => {
    if (!lockedGridGroup || !activeGridBounds || !gridSettingsPreview || !activeGridSettings) {
      return {};
    }
    return computePreviewPositionsForSettings(
      lockedGridGroup,
      activeGridBounds,
      activeGridSettings,
    );
  }, [lockedGridGroup, activeGridBounds, gridSettingsPreview, activeGridSettings]);

  const gridSettingsPreviewSizes = useMemo(() => {
    if (!lockedGridGroup || !gridSettingsPreview || !activeGridSettings) {
      return {};
    }
    return computePreviewRectSizesForSettings(lockedGridGroup, activeGridSettings);
  }, [lockedGridGroup, gridSettingsPreview, activeGridSettings]);

  const gridMinBounds = useMemo(() => {
    if (!lockedGridGroup) return null;
    const settings = activeGridSettings ?? normalizeGridSettings(lockedGridGroup.settings);
    return minBoundsForContent(settings);
  }, [lockedGridGroup, activeGridSettings]);

  const isGridHandleDragging = gridBoundsPreview !== null || gridSettingsPreview !== null;

  const cancelGridPreview = useCallback(() => {
    setGridBoundsPreview(null);
    gridBoundsPreviewRef.current = null;
    setGridSettingsPreview(null);
    gridSettingsPreviewRef.current = null;
  }, []);

  const handleGridBoundsPreview = useCallback((bounds: GridBounds) => {
    gridBoundsPreviewRef.current = bounds;
    setGridBoundsPreview(bounds);
  }, []);

  const handleGridBoundsCommit = useCallback(() => {
    const bounds = gridBoundsPreviewRef.current;
    if (!bounds || !lockedGridGroup) {
      setGridBoundsPreview(null);
      gridBoundsPreviewRef.current = null;
      return;
    }
    updateGroupBounds(lockedGridGroup.id, bounds);
    setGridBoundsPreview(null);
    gridBoundsPreviewRef.current = null;
  }, [lockedGridGroup, updateGroupBounds]);

  const handleGridSettingsPreview = useCallback(
    (updates: Partial<GridEditSettings> & { gapX?: number; gapY?: number }) => {
      const { gapX: _gapX, gapY: _gapY, ...settingsUpdates } = updates;
      gridSettingsPreviewRef.current = {
        ...gridSettingsPreviewRef.current,
        ...settingsUpdates,
      };
      setGridSettingsPreview(prev => ({ ...prev, ...settingsUpdates }));
    },
    [],
  );

  const handleGridSettingsCommit = useCallback(() => {
    const updates = gridSettingsPreviewRef.current;
    if (!updates || !lockedGridGroup) {
      setGridSettingsPreview(null);
      gridSettingsPreviewRef.current = null;
      return;
    }
    updateGroupSettings(lockedGridGroup.id, updates);
    setGridSettingsPreview(null);
    gridSettingsPreviewRef.current = null;
  }, [lockedGridGroup, updateGroupSettings]);

  return {
    lockedGridGroup,
    gridEditFocus,
    setGridEditFocus,
    isGridHandleDragging,
    isGridGroupFullySelected: lockedGridGroup !== null,
    gridPreviewPositions,
    activeGridSettings,
    activeGridBounds,
    gridSettingsPreviewPositions,
    gridSettingsPreviewSizes,
    gridMinBounds,
    cancelGridPreview,
    handleGridBoundsPreview,
    handleGridBoundsCommit,
    handleGridSettingsPreview,
    handleGridSettingsCommit,
  };
}
