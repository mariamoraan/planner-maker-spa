import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type Konva from 'konva';
import type { TemplateImage } from '@/features/template';
import { preparePastedSelection } from '@/features/editor/domain/services/clone-for-paste';
import { getGridGroupForSelection } from '@/features/editor/domain/services/grid-group';
import { getSpreadMate } from '@/features/template/domain/services/template-spread';
import { useEditorStore } from '@/features/editor/ui/stores/editor-store';
import { useGridGroupOps } from '@/features/editor/ui/hooks/use-grid-group-ops';
import { useManageAreas } from '@/features/editor/ui/hooks/use-manage-areas';
import { useCurrentTemplate } from '@/features/editor/ui/hooks/use-current-template';
import { isEditableTarget } from './canvas-interaction-types';

interface UseCanvasKeyboardParams {
  stageRef: RefObject<Konva.Stage | null>;
  currentImage: TemplateImage | null;
  scale: number;
  offset: { x: number; y: number };
  isPanMode: boolean;
  isGridHandleDragging: boolean;
  onCancelGridPreview: () => void;
  /** When false, no window keydown listener (inactive spread face). */
  enabled?: boolean;
}

export function useCanvasKeyboard({
  stageRef,
  currentImage,
  scale,
  offset,
  isPanMode,
  isGridHandleDragging,
  onCancelGridPreview,
  enabled = true,
}: UseCanvasKeyboardParams) {
  const template = useCurrentTemplate();
  const selectedRectangleIds = useEditorStore(state => state.selectedRectangleIds);
  const setSelectedRectangleIds = useEditorStore(state => state.setSelectedRectangleIds);
  const clearSelection = useEditorStore(state => state.clearSelection);
  const setCanvasTool = useEditorStore(state => state.setCanvasTool);
  const setBlockClipboard = useEditorStore(state => state.setBlockClipboard);
  const { addAreas, deleteAreas, updatePageGridState } = useManageAreas();
  const { deleteGridGroup } = useGridGroupOps();

  const selectedRectangleIdsRef = useRef(selectedRectangleIds);
  selectedRectangleIdsRef.current = selectedRectangleIds;
  const rectanglesRef = useRef(currentImage?.rectangles);
  rectanglesRef.current = currentImage?.rectangles;
  const gridGroupsRef = useRef(currentImage?.gridGroups);
  gridGroupsRef.current = currentImage?.gridGroups;
  const bindingGroupsRef = useRef(currentImage?.bindingGroups);
  bindingGroupsRef.current = currentImage?.bindingGroups;
  const siblingBindingGroupsRef = useRef(
    currentImage ? getSpreadMate(currentImage, template?.images ?? [])?.bindingGroups : undefined,
  );
  siblingBindingGroupsRef.current = currentImage
    ? getSpreadMate(currentImage, template?.images ?? [])?.bindingGroups
    : undefined;
  const pageTypeRef = useRef(currentImage?.type);
  pageTypeRef.current = currentImage?.type;
  const imageIdRef = useRef(currentImage?.id);
  imageIdRef.current = currentImage?.id;
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  const offsetRef = useRef(offset);
  offsetRef.current = offset;
  const isPanModeRef = useRef(isPanMode);
  isPanModeRef.current = isPanMode;
  const isGridHandleDraggingRef = useRef(isGridHandleDragging);
  isGridHandleDraggingRef.current = isGridHandleDragging;
  const onCancelGridPreviewRef = useRef(onCancelGridPreview);
  onCancelGridPreviewRef.current = onCancelGridPreview;
  const deleteGridGroupRef = useRef(deleteGridGroup);
  deleteGridGroupRef.current = deleteGridGroup;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!stageRef.current || !imageIdRef.current) return;
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlKey = isMac ? e.metaKey : e.ctrlKey;
      if (isEditableTarget(e.target)) return;

      if (e.key === 'Escape') {
        if (isGridHandleDraggingRef.current) {
          onCancelGridPreviewRef.current();
          return;
        }
        if (isPanModeRef.current) {
          setCanvasTool('select');
          return;
        }
        clearSelection();
        return;
      }

      const selectedIds = selectedRectangleIdsRef.current;
      const rectangles = rectanglesRef.current;

      if (ctrlKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        const allIds = rectangles?.map(r => r.id) ?? [];
        setSelectedRectangleIds(allIds);
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        e.preventDefault();
        const lockedGrid = getGridGroupForSelection(selectedIds, gridGroupsRef.current);
        if (lockedGrid) {
          deleteGridGroupRef.current(lockedGrid.id);
        } else {
          deleteAreas([...selectedIds]);
        }
        return;
      }

      if (ctrlKey && (e.key === 'c' || e.key === 'C') && selectedIds.length > 0) {
        const rects = rectangles?.filter(r => selectedIds.includes(r.id)) ?? [];
        if (rects.length === 0 || !imageIdRef.current) return;

        const usedGridIds = new Set(
          rects.map(r => r.gridGroupId).filter((id): id is string => Boolean(id)),
        );
        const usedBindingIds = new Set(
          rects.map(r => r.bindingGroupId).filter((id): id is string => Boolean(id)),
        );
        for (const gridId of usedGridIds) {
          const bindingId = gridGroupsRef.current?.[gridId]?.bindingGroupId;
          if (bindingId) usedBindingIds.add(bindingId);
        }

        const gridGroups = gridGroupsRef.current;
        const bindingGroups = bindingGroupsRef.current;
        setBlockClipboard({
          sourceImageId: imageIdRef.current,
          rectangles: rects.map(r => ({ ...r })),
          ...(usedGridIds.size > 0 && gridGroups
            ? {
                gridGroups: Object.fromEntries(
                  [...usedGridIds]
                    .map(id => [id, gridGroups[id]] as const)
                    .filter((entry): entry is [string, NonNullable<typeof entry[1]>] =>
                      Boolean(entry[1]),
                    ),
                ),
              }
            : {}),
          ...(usedBindingIds.size > 0 && bindingGroups
            ? {
                bindingGroups: Object.fromEntries(
                  [...usedBindingIds]
                    .map(id => [id, bindingGroups[id]] as const)
                    .filter((entry): entry is [string, NonNullable<typeof entry[1]>] =>
                      Boolean(entry[1]),
                    ),
                ),
              }
            : {}),
        });
        return;
      }

      const clipboard = useEditorStore.getState().blockClipboard;
      if (ctrlKey && (e.key === 'v' || e.key === 'V') && clipboard && clipboard.rectangles.length > 0) {
        e.preventDefault();
        const stage = stageRef.current;
        const pos = stage.getPointerPosition();
        const currentScale = scaleRef.current;
        const currentOffset = offsetRef.current;
        const pageType = pageTypeRef.current;
        if (!pageType) return;

        const copied = clipboard.rectangles;
        const minX = Math.min(...copied.map(r => r.x));
        const minY = Math.min(...copied.map(r => r.y));

        const pasteOriginX = pos ? (pos.x - currentOffset.x) / currentScale : minX + 20;
        const pasteOriginY = pos ? (pos.y - currentOffset.y) / currentScale : minY + 20;
        const offsetX = pasteOriginX - minX;
        const offsetY = pasteOriginY - minY;

        const needsGroupClone = copied.some(
          r => r.gridGroupId != null || r.bindingGroupId != null,
        );

        if (!needsGroupClone) {
          const newRects = copied.map((rect, index) => {
            const { id: _ignored, ...rectData } = rect;
            return {
              ...rectData,
              x: Math.round(rect.x + offsetX),
              y: Math.round(rect.y + offsetY),
              order: (rectangles?.length ?? 0) + index,
            };
          });
          addAreas(newRects);
          return;
        }

        const pasted = preparePastedSelection({
          copiedRects: copied,
          offsetX,
          offsetY,
          existingRectCount: rectangles?.length ?? 0,
          sourceGridGroups: clipboard.gridGroups,
          sourceBindingGroups: clipboard.bindingGroups,
          existingBindingGroups: bindingGroupsRef.current,
          siblingBindingGroups: siblingBindingGroupsRef.current,
          pageType,
        });

        updatePageGridState({
          rectangles: [...(rectangles ?? []), ...pasted.rectangles],
          gridGroups: {
            ...(gridGroupsRef.current ?? {}),
            ...pasted.gridGroups,
          },
          bindingGroups: {
            ...(bindingGroupsRef.current ?? {}),
            ...pasted.bindingGroups,
          },
        });
        setSelectedRectangleIds(pasted.rectangles.map(r => r.id));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    enabled,
    stageRef,
    setCanvasTool,
    clearSelection,
    setSelectedRectangleIds,
    setBlockClipboard,
    deleteAreas,
    addAreas,
    updatePageGridState,
  ]);
}
