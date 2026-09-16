import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type Konva from 'konva';
import type { GridGroup, TemplateImage } from '@/features/template';
import { useEditorStore } from '@/features/editor/ui/stores/editor-store';
import { rectsIntersect } from '@/features/editor/domain/services/canvas-snap';
import { findTopmostRectangleAtPoint } from '@/features/editor/domain/services/layer-order';
import {
  expandSelectionToGridGroups,
  findGridGroupAtPoint,
  getGridGroupForSelection,
  getGridGroupMemberIds,
  isSelectionLockedGridGroup,
  resolveGridGroupId,
} from '@/features/editor/domain/services/grid-group';
import { aabbFromRects, resolveWorldRect } from '@/features/editor/domain/services/block-geometry';
import type { MarqueeRect } from './canvas-interaction-types';

interface UseCanvasSelectionParams {
  stageRef: RefObject<Konva.Stage | null>;
  transformerRef: RefObject<Konva.Transformer | null>;
  currentImage: TemplateImage | null;
  isSelectMode: boolean;
  /** Late-bound: grid-edit updates this after selection mounts. */
  isGridHandleDraggingRef: RefObject<boolean>;
  pointerToImage: (pos: { x: number; y: number }) => { x: number; y: number };
}

export function useCanvasSelection({
  stageRef,
  transformerRef,
  currentImage,
  isSelectMode,
  isGridHandleDraggingRef,
  pointerToImage,
}: UseCanvasSelectionParams) {
  const marqueeStartRef = useRef<{ x: number; y: number } | null>(null);
  const [marquee, setMarquee] = useState<MarqueeRect | null>(null);
  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false);
  const [marqueePreviewIds, setMarqueePreviewIds] = useState<string[]>([]);

  const selectedRectangleIds = useEditorStore(state => state.selectedRectangleIds);
  const setSelectedRectangleIds = useEditorStore(state => state.setSelectedRectangleIds);
  const clearSelection = useEditorStore(state => state.clearSelection);
  const canvasTool = useEditorStore(state => state.canvasTool);

  const groupSelectionBounds = useMemo(() => {
    if (selectedRectangleIds.length < 2) return null;
    if (
      isSelectionLockedGridGroup(
        selectedRectangleIds,
        currentImage?.rectangles ?? [],
        currentImage?.gridGroups,
      )
    ) {
      return null;
    }

    const selectedRects =
      currentImage?.rectangles?.filter(rect => selectedRectangleIds.includes(rect.id)) ?? [];
    if (selectedRects.length < 2) return null;

    const worldRects = selectedRects.map(rect =>
      resolveWorldRect(rect, currentImage?.gridGroups),
    );
    const box = aabbFromRects(worldRects);
    if (!box) return null;
    const padding = 6;

    return {
      x: box.x - padding,
      y: box.y - padding,
      width: box.width + padding * 2,
      height: box.height + padding * 2,
    };
  }, [selectedRectangleIds, currentImage?.rectangles, currentImage?.gridGroups]);

  const lockedGridGroup = useMemo(() => {
    if (!currentImage) return null;
    return getGridGroupForSelection(selectedRectangleIds, currentImage.gridGroups);
  }, [currentImage, selectedRectangleIds]);

  const isGridGroupFullySelected = lockedGridGroup !== null;

  useEffect(() => {
    if (canvasTool !== 'select') {
      setIsMarqueeSelecting(false);
      setMarquee(null);
      setMarqueePreviewIds([]);
      marqueeStartRef.current = null;
    }
  }, [canvasTool]);

  useEffect(() => {
    if (transformerRef.current && stageRef.current) {
      const stage = stageRef.current;
      if (isSelectMode && selectedRectangleIds.length === 1) {
        const selectedRect = currentImage?.rectangles.find(r => r.id === selectedRectangleIds[0]);
        const isGridMember = selectedRect
          ? Boolean(
              resolveGridGroupId(
                selectedRect.id,
                currentImage?.rectangles ?? [],
                currentImage?.gridGroups,
              ),
            )
          : false;
        const selectedNode = isGridMember
          ? null
          : stage.findOne(`#rect-${selectedRectangleIds[0]}`);
        transformerRef.current.nodes(selectedNode ? [selectedNode] : []);
      } else {
        transformerRef.current.nodes([]);
      }
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [
    selectedRectangleIds,
    currentImage?.rectangles,
    currentImage?.gridGroups,
    isSelectMode,
    stageRef,
    transformerRef,
  ]);

  const getMarqueeHitIds = useCallback(
    (marqueeRect: MarqueeRect) => {
      const rawIds =
        currentImage?.rectangles
          ?.filter(rect => rectsIntersect(marqueeRect, rect))
          .map(rect => rect.id) ?? [];
      return expandSelectionToGridGroups(
        rawIds,
        currentImage?.rectangles ?? [],
        currentImage?.gridGroups,
      );
    },
    [currentImage?.rectangles, currentImage?.gridGroups],
  );

  const toggleGridGroupSelection = useCallback(
    (group: GridGroup, nativeEvent: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }) => {
      const rects = currentImage?.rectangles ?? [];
      const gridGroups = currentImage?.gridGroups;
      const memberIds = getGridGroupMemberIds(group.id, rects, gridGroups);
      const ids = memberIds.length > 0 ? memberIds : group.rectIds;

      if (nativeEvent.shiftKey || nativeEvent.metaKey || nativeEvent.ctrlKey) {
        const allMembersSelected = ids.every(id => selectedRectangleIds.includes(id));
        if (allMembersSelected) {
          setSelectedRectangleIds(selectedRectangleIds.filter(id => !ids.includes(id)));
        } else {
          setSelectedRectangleIds([...new Set([...selectedRectangleIds, ...ids])]);
        }
      } else {
        setSelectedRectangleIds(ids);
      }
    },
    [
      selectedRectangleIds,
      setSelectedRectangleIds,
      currentImage?.rectangles,
      currentImage?.gridGroups,
    ],
  );

  const handleEmptyMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = stageRef.current;
      if (!stage) return false;
      const pos = stage.getPointerPosition();
      if (!pos) return false;

      if (isGridHandleDraggingRef.current) return false;

      const clickedOnEmpty = e.target === e.target.getStage() || e.target.name() === 'background';
      if (!clickedOnEmpty || !isSelectMode) return false;

      const imagePos = pointerToImage(pos);
      const groupAtPoint = findGridGroupAtPoint(imagePos, currentImage?.gridGroups);

      if (groupAtPoint) {
        const topRect = findTopmostRectangleAtPoint(imagePos, currentImage?.rectangles ?? []);
        const topRectBelongsToGroup =
          topRect !== null && groupAtPoint.rectIds.includes(topRect.id);

        if (!topRect || topRectBelongsToGroup) {
          toggleGridGroupSelection(groupAtPoint, e.evt);
          return true;
        }
      }

      const wasGridSelected = isGridGroupFullySelected;

      if (!e.evt.shiftKey && !e.evt.metaKey && !e.evt.ctrlKey) {
        clearSelection();
      }

      if (wasGridSelected) return true;

      marqueeStartRef.current = imagePos;
      setIsMarqueeSelecting(true);
      setMarquee({ x: imagePos.x, y: imagePos.y, width: 0, height: 0 });
      setMarqueePreviewIds([]);
      return true;
    },
    [
      stageRef,
      isGridHandleDraggingRef,
      isSelectMode,
      isGridGroupFullySelected,
      pointerToImage,
      clearSelection,
      currentImage?.gridGroups,
      currentImage?.rectangles,
      toggleGridGroupSelection,
    ],
  );

  const handleMarqueeMove = useCallback(
    (pos: { x: number; y: number }) => {
      if (!isMarqueeSelecting || !marqueeStartRef.current) return false;

      const imagePos = pointerToImage(pos);
      const start = marqueeStartRef.current;
      const nextMarquee: MarqueeRect = {
        x: Math.min(start.x, imagePos.x),
        y: Math.min(start.y, imagePos.y),
        width: Math.abs(imagePos.x - start.x),
        height: Math.abs(imagePos.y - start.y),
      };

      setMarquee(nextMarquee);
      setMarqueePreviewIds(getMarqueeHitIds(nextMarquee));
      return true;
    },
    [isMarqueeSelecting, pointerToImage, getMarqueeHitIds],
  );

  const handleMarqueeUp = useCallback(
    (e?: Konva.KonvaEventObject<MouseEvent>) => {
      if (!isMarqueeSelecting) return false;

      const minSize = 4;
      if (marquee && marquee.width > minSize && marquee.height > minSize) {
        const hitIds =
          marqueePreviewIds.length > 0 ? marqueePreviewIds : getMarqueeHitIds(marquee);

        if (hitIds.length > 0) {
          if (e?.evt.shiftKey || e?.evt.metaKey || e?.evt.ctrlKey) {
            const merged = new Set([...selectedRectangleIds, ...hitIds]);
            setSelectedRectangleIds([...merged]);
          } else {
            setSelectedRectangleIds(hitIds);
          }
        }
      }

      setIsMarqueeSelecting(false);
      setMarquee(null);
      setMarqueePreviewIds([]);
      marqueeStartRef.current = null;
      return true;
    },
    [
      isMarqueeSelecting,
      marquee,
      marqueePreviewIds,
      getMarqueeHitIds,
      selectedRectangleIds,
      setSelectedRectangleIds,
    ],
  );

  const handleRectClick = useCallback(
    (rectId: string, e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (!isSelectMode || isGridHandleDraggingRef.current) return;
      e.cancelBubble = true;
      const nativeEvent = e.evt;
      const rects = currentImage?.rectangles ?? [];
      const gridGroups = currentImage?.gridGroups;
      const groupId = resolveGridGroupId(rectId, rects, gridGroups);
      const memberIds = groupId
        ? getGridGroupMemberIds(groupId, rects, gridGroups)
        : [rectId];

      if (nativeEvent.shiftKey) {
        const allMembersSelected = memberIds.every(id => selectedRectangleIds.includes(id));
        if (allMembersSelected) {
          setSelectedRectangleIds(selectedRectangleIds.filter(id => !memberIds.includes(id)));
        } else {
          setSelectedRectangleIds([...new Set([...selectedRectangleIds, ...memberIds])]);
        }
      } else if (nativeEvent.metaKey || nativeEvent.ctrlKey) {
        const allMembersSelected = memberIds.every(id => selectedRectangleIds.includes(id));
        if (!allMembersSelected) {
          setSelectedRectangleIds([...new Set([...selectedRectangleIds, ...memberIds])]);
        }
      } else {
        setSelectedRectangleIds(memberIds);
      }
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

  return {
    marquee,
    marqueePreviewIds,
    selectedRectangleIds,
    groupSelectionBounds,
    lockedGridGroup,
    isGridGroupFullySelected,
    handleEmptyMouseDown,
    handleMarqueeMove,
    handleMarqueeUp,
    handleRectClick,
  };
}
