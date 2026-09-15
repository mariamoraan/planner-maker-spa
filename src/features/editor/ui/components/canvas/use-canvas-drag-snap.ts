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
import {
  resolveDragAxisLock,
  type DragAxisLock,
} from '@/features/editor/domain/services/drag-axis-lock';
import {
  getGridGroupMemberIds,
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
  const { updateArea, moveAreas } = useManageAreas();
  const { translateGridGroup } = useGridGroupOps();

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
      const groupId = resolveGridGroupId(rectId, rects, gridGroups);
      let movingIds: string[];

      if (groupId) {
        movingIds = getGridGroupMemberIds(groupId, rects, gridGroups);
        if (!movingIds.every(id => selectedRectangleIds.includes(id))) {
          setSelectedRectangleIds(movingIds);
        }
      } else {
        movingIds =
          selectedRectangleIds.includes(rectId) && selectedRectangleIds.length > 1
            ? selectedRectangleIds
            : [rectId];
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
      currentImage?.rectangles,
      currentImage?.gridGroups,
      selectedRectangleIds,
      setSelectedRectangleIds,
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

      const newX = (node.x() - offset.x) / scale;
      const newY = (node.y() - offset.y) / scale;
      const leaderDx = newX - leaderStart.x;
      const leaderDy = newY - leaderStart.y;

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
      node.position({
        x: offset.x + leaderSnappedX * scale,
        y: offset.y + leaderSnappedY * scale,
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
      if (!startEntries || !delta) return;

      if (delta.dx !== 0 || delta.dy !== 0) {
        const rects = currentImage?.rectangles ?? [];
        const gridGroups = currentImage?.gridGroups;
        const translatedGroups = new Set<string>();

        for (const entry of startEntries) {
          const groupId = resolveGridGroupId(entry.id, rects, gridGroups);
          if (groupId && !translatedGroups.has(groupId)) {
            translatedGroups.add(groupId);
            translateGridGroup(groupId, delta.dx, delta.dy);
          }
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
    [currentImage?.rectangles, currentImage?.gridGroups, moveAreas, translateGridGroup, clearDragOverlay],
  );

  const handleTransformEnd = useCallback(
    (rectId: string, e: Konva.KonvaEventObject<Event>) => {
      const node = e.target;

      const scaleX = node.scaleX();
      const scaleY = node.scaleY();

      node.scaleX(1);
      node.scaleY(1);

      updateArea(rectId, {
        x: normalizeCoord((node.x() - offset.x) / scale),
        y: normalizeCoord((node.y() - offset.y) / scale),
        width: Math.round((node.width() * scaleX) / scale),
        height: Math.round((node.height() * scaleY) / scale),
      });
    },
    [scale, offset, updateArea],
  );

  return {
    dragState,
    dragOverlay,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleTransformEnd,
  };
}
