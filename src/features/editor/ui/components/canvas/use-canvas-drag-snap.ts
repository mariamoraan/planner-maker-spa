import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type Konva from 'konva';
import type { TemplateImage } from '@/features/template';
import { useEditorStore } from '@/features/editor/ui/stores/editor-store';
import { useManageAreas } from '@/features/editor/ui/hooks/use-manage-areas';
import { useGridGroupOps } from '@/features/editor/ui/hooks/use-grid-group-ops';
import {
  computeSnap,
  computeGroupSnap,
  computeGroupBounds,
  normalizeCoord,
} from '@/features/editor/domain/services/canvas-snap';
import { normalizeRotation, rotatePointAround, rectCenter } from '@/features/editor/domain/services/block-geometry';
import {
  resolveDragAxisLock,
  type DragAxisLock,
} from '@/features/editor/domain/services/drag-axis-lock';
import {
  resolveDragMovingIds,
  resolveGridGroupId,
} from '@/features/editor/domain/services/grid-group';
import {
  filterSnapGuidesForAxisLock,
  type DragOverlay,
  type DragStartEntry,
  type DragState,
} from './canvas-interaction-types';

interface UseCanvasDragSnapParams {
  currentImage: TemplateImage | null;
  isSelectMode: boolean;
  /** Late-bound: grid-edit updates this after drag mounts. */
  isGridHandleDraggingRef: RefObject<boolean>;
  scale: number;
  offset: { x: number; y: number };
}

export function useCanvasDragSnap({
  currentImage,
  isSelectMode,
  isGridHandleDraggingRef,
  scale,
  offset,
}: UseCanvasDragSnapParams) {
  const dragGroupStartRef = useRef<DragStartEntry[] | null>(null);
  const dragGroupBoundsRef = useRef<{ x: number; y: number; width: number; height: number } | null>(
    null,
  );
  const dragDeltaRef = useRef<{ dx: number; dy: number } | null>(null);
  const dragAxisLockRef = useRef<DragAxisLock | null>(null);
  const dragOverlayRafRef = useRef<number | null>(null);
  const pendingOverlayRef = useRef<DragOverlay | null>(null);

  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragOverlay, setDragOverlay] = useState<DragOverlay | null>(null);

  const selectedRectangleIds = useEditorStore(state => state.selectedRectangleIds);
  const setSelectedRectangleIds = useEditorStore(state => state.setSelectedRectangleIds);
  const setActiveBlockDrag = useEditorStore(state => state.setActiveBlockDrag);
  const { updateArea, moveAreas, transferAreas } = useManageAreas();
  const { translateGridGroups } = useGridGroupOps();

  useEffect(() => {
    return () => {
      if (dragOverlayRafRef.current !== null) {
        cancelAnimationFrame(dragOverlayRafRef.current);
      }
    };
  }, []);

  const scheduleDragOverlay = useCallback((overlay: DragOverlay) => {
    pendingOverlayRef.current = overlay;
    if (dragOverlayRafRef.current !== null) return;

    dragOverlayRafRef.current = requestAnimationFrame(() => {
      dragOverlayRafRef.current = null;
      if (pendingOverlayRef.current) {
        setDragOverlay(pendingOverlayRef.current);
      }
    });
  }, []);

  const clearDragOverlay = useCallback(() => {
    if (dragOverlayRafRef.current !== null) {
      cancelAnimationFrame(dragOverlayRafRef.current);
      dragOverlayRafRef.current = null;
    }
    pendingOverlayRef.current = null;
    setDragOverlay(null);
  }, []);

  const handleDragStart = useCallback(
    (rectId: string) => {
      if (!isSelectMode || isGridHandleDraggingRef.current) return;
      const rects = currentImage?.rectangles ?? [];
      const gridGroups = currentImage?.gridGroups;
      const movingIds = resolveDragMovingIds(rectId, selectedRectangleIds, rects, gridGroups);

      // Sync selection when drag expands a single grid cell to its full group,
      // or fills in missing members of a multi-select.
      const selectedSet = new Set(selectedRectangleIds);
      if (
        movingIds.length !== selectedRectangleIds.length ||
        movingIds.some(id => !selectedSet.has(id))
      ) {
        setSelectedRectangleIds(movingIds);
      }

      dragGroupStartRef.current = movingIds.map(id => {
        const rect = rects.find(r => r.id === id)!;
        return { id, x: rect.x, y: rect.y };
      });
      dragGroupBoundsRef.current =
        movingIds.length > 1
          ? computeGroupBounds(
              rects.map(r => ({
                id: r.id,
                x: r.x,
                y: r.y,
                width: r.width,
                height: r.height,
              })),
              movingIds,
            )
          : null;
      dragDeltaRef.current = { dx: 0, dy: 0 };
      dragAxisLockRef.current = null;
      setDragState({ leaderId: rectId, movingIds });
      if (currentImage?.id) {
        setActiveBlockDrag({
          sourceImageId: currentImage.id,
          movingIds,
          startPositions: movingIds.map(id => {
            const rect = rects.find(r => r.id === id)!;
            return {
              id,
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height,
            };
          }),
        });
      }
      setDragOverlay({
        guides: [],
        previewPositions: Object.fromEntries(
          movingIds.map(id => {
            const rect = rects.find(r => r.id === id)!;
            return [id, { x: rect.x, y: rect.y }];
          }),
        ),
        delta: { dx: 0, dy: 0 },
      });
    },
    [
      isSelectMode,
      isGridHandleDraggingRef,
      currentImage?.id,
      currentImage?.rectangles,
      currentImage?.gridGroups,
      selectedRectangleIds,
      setSelectedRectangleIds,
      setActiveBlockDrag,
    ],
  );

  const handleDragMove = useCallback(
    (rectId: string, e: Konva.KonvaEventObject<DragEvent>) => {
      const node = e.target;
      const movingRect = currentImage?.rectangles?.find(r => r.id === rectId);
      if (!movingRect) return;

      const startEntries =
        dragGroupStartRef.current ?? [{ id: rectId, x: movingRect.x, y: movingRect.y }];
      const leaderStart = startEntries.find(entry => entry.id === rectId) ?? startEntries[0];
      const groupBounds = dragGroupBoundsRef.current;

      // Node is positioned by center in world space (TemplateRectangle).
      const worldCenter = {
        x: (node.x() - offset.x) / scale,
        y: (node.y() - offset.y) / scale,
      };

      const leaderGroupId = resolveGridGroupId(
        rectId,
        currentImage?.rectangles ?? [],
        currentImage?.gridGroups,
      );
      const leaderGroup = leaderGroupId
        ? currentImage?.gridGroups?.[leaderGroupId]
        : undefined;
      const groupRotation = leaderGroup?.rotation ?? 0;

      let leaderDx: number;
      let leaderDy: number;
      if (groupRotation && leaderGroup) {
        // World translation equals local translation for a rigid rotate+translate.
        const startLocalCenter = {
          x: leaderStart.x + movingRect.width / 2,
          y: leaderStart.y + movingRect.height / 2,
        };
        const startWorldCenter = rotatePointAround(
          startLocalCenter,
          rectCenter(leaderGroup.bounds),
          groupRotation,
        );
        leaderDx = worldCenter.x - startWorldCenter.x;
        leaderDy = worldCenter.y - startWorldCenter.y;
      } else {
        const newX = worldCenter.x - movingRect.width / 2;
        const newY = worldCenter.y - movingRect.height / 2;
        leaderDx = newX - leaderStart.x;
        leaderDy = newY - leaderStart.y;
      }

      const axisLocked = resolveDragAxisLock(
        leaderDx,
        leaderDy,
        e.evt.shiftKey,
        dragAxisLockRef.current,
      );
      dragAxisLockRef.current = axisLocked.lock;

      const constrainedX = leaderStart.x + axisLocked.dx;
      const constrainedY = leaderStart.y + axisLocked.dy;

      const excludeIds = new Set(startEntries.map(entry => entry.id));
      const allBounds = (currentImage?.rectangles ?? []).map(r => ({
        id: r.id,
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
      }));

      const snapOptions = {
        enabled: true,
        canvasBounds: currentImage
          ? { width: currentImage.width, height: currentImage.height }
          : undefined,
      };

      let snapResult;
      if (groupBounds && startEntries.length > 1) {
        const members = startEntries.map(entry => {
          const rect = allBounds.find(r => r.id === entry.id)!;
          return {
            id: entry.id,
            startX: entry.x,
            startY: entry.y,
            width: rect.width,
            height: rect.height,
          };
        });
        snapResult = computeGroupSnap(
          members,
          axisLocked.dx,
          axisLocked.dy,
          allBounds,
          excludeIds,
          scale,
          snapOptions,
        );
      } else {
        const movingBounds = {
          id: movingRect.id,
          x: movingRect.x,
          y: movingRect.y,
          width: movingRect.width,
          height: movingRect.height,
        };
        snapResult = computeSnap(
          movingBounds,
          constrainedX,
          constrainedY,
          allBounds,
          excludeIds,
          scale,
          snapOptions,
        );
      }

      if (axisLocked.lock === 'x') {
        snapResult = {
          ...snapResult,
          y: groupBounds?.y ?? leaderStart.y,
          guides: filterSnapGuidesForAxisLock(snapResult.guides, 'x'),
        };
      } else if (axisLocked.lock === 'y') {
        snapResult = {
          ...snapResult,
          x: groupBounds?.x ?? leaderStart.x,
          guides: filterSnapGuidesForAxisLock(snapResult.guides, 'y'),
        };
      }

      const deltaX = groupBounds ? snapResult.x - groupBounds.x : snapResult.x - leaderStart.x;
      const deltaY = groupBounds ? snapResult.y - groupBounds.y : snapResult.y - leaderStart.y;
      dragDeltaRef.current = { dx: deltaX, dy: deltaY };

      const leaderSnappedX = leaderStart.x + deltaX;
      const leaderSnappedY = leaderStart.y + deltaY;

      let snappedWorldCenter = {
        x: leaderSnappedX + movingRect.width / 2,
        y: leaderSnappedY + movingRect.height / 2,
      };
      if (groupRotation && leaderGroup) {
        const movedBounds = {
          ...leaderGroup.bounds,
          x: leaderGroup.bounds.x + deltaX,
          y: leaderGroup.bounds.y + deltaY,
        };
        snappedWorldCenter = rotatePointAround(
          snappedWorldCenter,
          rectCenter(movedBounds),
          groupRotation,
        );
      }

      node.position({
        x: offset.x + snappedWorldCenter.x * scale,
        y: offset.y + snappedWorldCenter.y * scale,
      });

      const previewPositions: Record<string, { x: number; y: number }> = {};
      for (const entry of startEntries) {
        previewPositions[entry.id] = {
          x: entry.x + deltaX,
          y: entry.y + deltaY,
        };
      }

      scheduleDragOverlay({
        guides: snapResult.guides,
        previewPositions,
        delta: { dx: deltaX, dy: deltaY },
      });
    },
    [currentImage, scale, offset, scheduleDragOverlay],
  );

  const handleDragEnd = useCallback(
    (_rectId: string) => {
      const startEntries = dragGroupStartRef.current;
      const delta = dragDeltaRef.current;

      const pendingDrop = useEditorStore.getState().pendingCrossFaceDrop;
      const activeDrag = useEditorStore.getState().activeBlockDrag;

      if (
        pendingDrop &&
        activeDrag &&
        pendingDrop.targetImageId !== activeDrag.sourceImageId
      ) {
        transferAreas({
          fromImageId: activeDrag.sourceImageId,
          toImageId: pendingDrop.targetImageId,
          rectangleIds: activeDrag.movingIds,
          positions: pendingDrop.positions,
        });
        useEditorStore.getState().setPendingCrossFaceDrop(null);
        useEditorStore.getState().setActiveBlockDrag(null);
        dragGroupStartRef.current = null;
        dragGroupBoundsRef.current = null;
        dragDeltaRef.current = null;
        dragAxisLockRef.current = null;
        setDragState(null);
        clearDragOverlay();
        return;
      }

      useEditorStore.getState().setPendingCrossFaceDrop(null);
      useEditorStore.getState().setActiveBlockDrag(null);

      if (!startEntries || !delta) {
        setDragState(null);
        clearDragOverlay();
        return;
      }

      if (delta.dx !== 0 || delta.dy !== 0) {
        const rects = currentImage?.rectangles ?? [];
        const gridGroups = currentImage?.gridGroups;
        const groupIds: string[] = [];
        const seenGroups = new Set<string>();

        for (const entry of startEntries) {
          const groupId = resolveGridGroupId(entry.id, rects, gridGroups);
          if (groupId && !seenGroups.has(groupId)) {
            seenGroups.add(groupId);
            groupIds.push(groupId);
          }
        }

        if (groupIds.length > 0) {
          translateGridGroups(
            groupIds,
            delta.dx,
            delta.dy,
            startEntries.map(entry => entry.id),
          );
        }

        const nonGridMoves = startEntries
          .filter(entry => !resolveGridGroupId(entry.id, rects, gridGroups))
          .map(entry => ({
            id: entry.id,
            x: entry.x + delta.dx,
            y: entry.y + delta.dy,
          }));

        if (nonGridMoves.length > 0) {
          moveAreas(nonGridMoves);
        }
      }

      dragGroupStartRef.current = null;
      dragGroupBoundsRef.current = null;
      dragDeltaRef.current = null;
      dragAxisLockRef.current = null;
      setDragState(null);
      clearDragOverlay();
    },
    [
      currentImage?.rectangles,
      currentImage?.gridGroups,
      moveAreas,
      transferAreas,
      translateGridGroups,
      clearDragOverlay,
    ],
  );

  const handleTransformEnd = useCallback(
    (rectId: string, e: Konva.KonvaEventObject<Event>) => {
      const node = e.target;
      const movingRect = currentImage?.rectangles?.find(r => r.id === rectId);
      if (!movingRect) return;

      const scaleX = node.scaleX();
      const scaleY = node.scaleY();

      node.scaleX(1);
      node.scaleY(1);

      const nextWidth = Math.max(20, Math.round((node.width() * scaleX) / scale));
      const nextHeight = Math.max(20, Math.round((node.height() * scaleY) / scale));
      // Node x/y are the visual center (TemplateRectangle uses offset to center).
      const centerX = (node.x() - offset.x) / scale;
      const centerY = (node.y() - offset.y) / scale;

      updateArea(rectId, {
        x: normalizeCoord(centerX - nextWidth / 2),
        y: normalizeCoord(centerY - nextHeight / 2),
        width: nextWidth,
        height: nextHeight,
        rotation: normalizeRotation(node.rotation()),
      });
    },
    [scale, offset, updateArea, currentImage?.rectangles],
  );

  /** Move selection from the floating handle (image-space total delta from gesture start). */
  const beginExternalMove = useCallback(
    (rectId: string) => {
      handleDragStart(rectId);
    },
    [handleDragStart],
  );

  const updateExternalMove = useCallback(
    (totalDx: number, totalDy: number, shiftKey: boolean) => {
      const startEntries = dragGroupStartRef.current;
      if (!startEntries || startEntries.length === 0) return;

      const leaderStart = startEntries[0];
      const movingRect = currentImage?.rectangles?.find(r => r.id === leaderStart.id);
      if (!movingRect) return;

      const groupBounds = dragGroupBoundsRef.current;
      const axisLocked = resolveDragAxisLock(
        totalDx,
        totalDy,
        shiftKey,
        dragAxisLockRef.current,
      );
      dragAxisLockRef.current = axisLocked.lock;

      const excludeIds = new Set(startEntries.map(entry => entry.id));
      const allBounds = (currentImage?.rectangles ?? []).map(r => ({
        id: r.id,
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
      }));

      const snapOptions = {
        enabled: true,
        canvasBounds: currentImage
          ? { width: currentImage.width, height: currentImage.height }
          : undefined,
      };

      let snapResult;
      if (groupBounds && startEntries.length > 1) {
        const members = startEntries.map(entry => {
          const rect = allBounds.find(r => r.id === entry.id)!;
          return {
            id: entry.id,
            startX: entry.x,
            startY: entry.y,
            width: rect.width,
            height: rect.height,
          };
        });
        snapResult = computeGroupSnap(
          members,
          axisLocked.dx,
          axisLocked.dy,
          allBounds,
          excludeIds,
          scale,
          snapOptions,
        );
      } else {
        snapResult = computeSnap(
          {
            id: movingRect.id,
            x: movingRect.x,
            y: movingRect.y,
            width: movingRect.width,
            height: movingRect.height,
          },
          leaderStart.x + axisLocked.dx,
          leaderStart.y + axisLocked.dy,
          allBounds,
          excludeIds,
          scale,
          snapOptions,
        );
      }

      if (axisLocked.lock === 'x') {
        snapResult = {
          ...snapResult,
          y: groupBounds?.y ?? leaderStart.y,
          guides: filterSnapGuidesForAxisLock(snapResult.guides, 'x'),
        };
      } else if (axisLocked.lock === 'y') {
        snapResult = {
          ...snapResult,
          x: groupBounds?.x ?? leaderStart.x,
          guides: filterSnapGuidesForAxisLock(snapResult.guides, 'y'),
        };
      }

      const deltaX = groupBounds ? snapResult.x - groupBounds.x : snapResult.x - leaderStart.x;
      const deltaY = groupBounds ? snapResult.y - groupBounds.y : snapResult.y - leaderStart.y;
      dragDeltaRef.current = { dx: deltaX, dy: deltaY };

      const previewPositions: Record<string, { x: number; y: number }> = {};
      for (const entry of startEntries) {
        previewPositions[entry.id] = {
          x: entry.x + deltaX,
          y: entry.y + deltaY,
        };
      }

      scheduleDragOverlay({
        guides: snapResult.guides,
        previewPositions,
        delta: { dx: deltaX, dy: deltaY },
      });
    },
    [currentImage, scale, scheduleDragOverlay],
  );

  const endExternalMove = useCallback(() => {
    handleDragEnd(dragGroupStartRef.current?.[0]?.id ?? '');
  }, [handleDragEnd]);

  return {
    dragState,
    dragOverlay,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleTransformEnd,
    beginExternalMove,
    updateExternalMove,
    endExternalMove,
  };
}
