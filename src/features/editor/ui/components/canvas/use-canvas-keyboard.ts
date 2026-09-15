import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type Konva from 'konva';
import type { Rectangle, TemplateImage } from '@/features/template';
import { useEditorStore } from '@/features/editor/ui/stores/editor-store';
import { useManageAreas } from '@/features/editor/ui/hooks/use-manage-areas';
import { isEditableTarget } from './canvas-interaction-types';

interface UseCanvasKeyboardParams {
  stageRef: RefObject<Konva.Stage | null>;
  currentImage: TemplateImage | null;
  scale: number;
  offset: { x: number; y: number };
  isPanMode: boolean;
  isGridHandleDragging: boolean;
  onCancelGridPreview: () => void;
}

export function useCanvasKeyboard({
  stageRef,
  currentImage,
  scale,
  offset,
  isPanMode,
  isGridHandleDragging,
  onCancelGridPreview,
}: UseCanvasKeyboardParams) {
  const [copiedRects, setCopiedRects] = useState<Rectangle[]>([]);

  const selectedRectangleIds = useEditorStore(state => state.selectedRectangleIds);
  const setSelectedRectangleIds = useEditorStore(state => state.setSelectedRectangleIds);
  const clearSelection = useEditorStore(state => state.clearSelection);
  const setCanvasTool = useEditorStore(state => state.setCanvasTool);
  const { addAreas, deleteAreas } = useManageAreas();

  const selectedRectangleIdsRef = useRef(selectedRectangleIds);
  selectedRectangleIdsRef.current = selectedRectangleIds;
  const rectanglesRef = useRef(currentImage?.rectangles);
  rectanglesRef.current = currentImage?.rectangles;
  const copiedRectsRef = useRef(copiedRects);
  copiedRectsRef.current = copiedRects;
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!stageRef.current) return;
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
        deleteAreas([...selectedIds]);
        return;
      }

      if (ctrlKey && (e.key === 'c' || e.key === 'C') && selectedIds.length > 0) {
        const rects = rectangles?.filter(r => selectedIds.includes(r.id)) ?? [];
        if (rects.length > 0) setCopiedRects(rects.map(r => ({ ...r })));
        return;
      }

      const copied = copiedRectsRef.current;
      if (ctrlKey && (e.key === 'v' || e.key === 'V') && copied.length > 0) {
        e.preventDefault();
        const stage = stageRef.current;
        const pos = stage.getPointerPosition();
        const currentScale = scaleRef.current;
        const currentOffset = offsetRef.current;

        const minX = Math.min(...copied.map(r => r.x));
        const minY = Math.min(...copied.map(r => r.y));

        const pasteOriginX = pos ? (pos.x - currentOffset.x) / currentScale : minX + 20;
        const pasteOriginY = pos ? (pos.y - currentOffset.y) / currentScale : minY + 20;
        const offsetX = pasteOriginX - minX;
        const offsetY = pasteOriginY - minY;

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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    stageRef,
    setCanvasTool,
    clearSelection,
    setSelectedRectangleIds,
    deleteAreas,
    addAreas,
  ]);
}
