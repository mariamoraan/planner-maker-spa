import { useCallback, useRef } from 'react';
import type { RefObject } from 'react';
import useImage from 'use-image';
import type Konva from 'konva';
import { useEditorStore } from '@/features/editor/ui/stores/editor-store';
import { useCurrentImage } from '@/features/editor/ui/hooks/use-current-image';
import { useCurrentTemplate } from '@/features/editor/ui/hooks/use-current-template';
import { useCanvasViewport } from './use-canvas-viewport';
import { useCanvasSelection } from './use-canvas-selection';
import { useCanvasDragSnap } from './use-canvas-drag-snap';
import { useCanvasGridEdit } from './use-canvas-grid-edit';
import { useCanvasKeyboard } from './use-canvas-keyboard';

interface UseTemplateCanvasControllerParams {
  containerRef: RefObject<HTMLDivElement | null>;
  stageRef: RefObject<Konva.Stage | null>;
  transformerRef: RefObject<Konva.Transformer | null>;
}

export function useTemplateCanvasController({
  containerRef,
  stageRef,
  transformerRef,
}: UseTemplateCanvasControllerParams) {
  const isGridHandleDraggingRef = useRef(false);

  const currentImage = useCurrentImage();
  const template = useCurrentTemplate();
  const [image] = useImage(currentImage?.src ?? '');

  const canvasTool = useEditorStore(state => state.canvasTool);
  const showRectangleGuides = useEditorStore(state => state.showRectangleGuides);
  const isSelectMode = canvasTool === 'select';
  const isPanMode = canvasTool === 'pan';

  const viewport = useCanvasViewport({
    containerRef,
    imageWidth: currentImage?.width ?? 0,
    imageHeight: currentImage?.height ?? 0,
    imageId: currentImage?.id,
  });

  const selection = useCanvasSelection({
    stageRef,
    transformerRef,
    currentImage,
    isSelectMode,
    isGridHandleDraggingRef,
    pointerToImage: viewport.pointerToImage,
  });

  const drag = useCanvasDragSnap({
    currentImage,
    isSelectMode,
    isGridHandleDraggingRef,
    scale: viewport.scale,
    offset: viewport.offset,
  });

  const grid = useCanvasGridEdit({
    currentImage,
    selectedRectangleIds: selection.selectedRectangleIds,
    dragState: drag.dragState,
    dragOverlay: drag.dragOverlay,
    imageId: currentImage?.id,
    stageRef,
  });

  isGridHandleDraggingRef.current = grid.isGridHandleDragging;

  useCanvasKeyboard({
    stageRef,
    currentImage,
    scale: viewport.scale,
    offset: viewport.offset,
    isPanMode,
    isGridHandleDragging: grid.isGridHandleDragging,
    onCancelGridPreview: grid.cancelGridPreview,
  });

  const {
    shouldBeginPan,
    beginPan,
    movePan,
    endPan,
  } = viewport;
  const {
    handleEmptyMouseDown,
    handleMarqueeMove,
    handleMarqueeUp,
  } = selection;

  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = stageRef.current;
      if (!stage) return;
      const pos = stage.getPointerPosition();
      if (!pos) return;

      if (shouldBeginPan(e, isPanMode) && beginPan(pos)) {
        e.evt.preventDefault();
        return;
      }

      handleEmptyMouseDown(e);
    },
    [stageRef, shouldBeginPan, beginPan, isPanMode, handleEmptyMouseDown],
  );

  const handleMouseMove = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    if (movePan(pos)) return;
    handleMarqueeMove(pos);
  }, [stageRef, movePan, handleMarqueeMove]);

  const handleMouseUp = useCallback(
    (e?: Konva.KonvaEventObject<MouseEvent>) => {
      if (endPan()) return;
      handleMarqueeUp(e);
    },
    [endPan, handleMarqueeUp],
  );

  const containerClassName = [
    'template-canva',
    grid.lockedGridGroup !== null && 'template-canva--grid',
    isPanMode && 'template-canva--pan-tool',
    viewport.isPanning && 'template-canva--panning',
    viewport.spacePressed && 'template-canva--space-pan',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    currentImage,
    template,
    image,
    isSelectMode,
    showRectangleGuides,
    viewport,
    selection,
    drag,
    grid,
    containerClassName,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  };
}
