import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import useImage from 'use-image';
import type Konva from 'konva';
import { useEditorStore } from '@/features/editor/ui/stores/editor-store';
import { useCurrentImage } from '@/features/editor/ui/hooks/use-current-image';
import { useTemplatePage } from '@/features/editor/ui/hooks/use-template-page';
import { useCurrentTemplate } from '@/features/editor/ui/hooks/use-current-template';
import { useCanvasViewport } from './use-canvas-viewport';
import { useCanvasSelection } from './use-canvas-selection';
import { useCanvasDragSnap } from './use-canvas-drag-snap';
import { useCanvasGridEdit } from './use-canvas-grid-edit';
import { useCanvasKeyboard } from './use-canvas-keyboard';

function useCanvasImageSrc(src?: string, srcAlt?: string): string {
  const [active, setActive] = useState(src ?? '');

  useEffect(() => {
    if (!src) {
      setActive('');
      return;
    }

    let cancelled = false;
    setActive(src);

    const probe = new Image();
    probe.referrerPolicy = 'no-referrer';
    probe.onload = () => {
      if (!cancelled) setActive(src);
    };
    probe.onerror = () => {
      if (cancelled) return;
      if (srcAlt && srcAlt !== src) setActive(srcAlt);
    };
    probe.src = src;

    return () => {
      cancelled = true;
    };
  }, [src, srcAlt]);

  return active;
}

interface UseTemplateCanvasControllerParams {
  containerRef: RefObject<HTMLDivElement | null>;
  stageRef: RefObject<Konva.Stage | null>;
  transformerRef: RefObject<Konva.Transformer | null>;
  /** When set, render this page instead of the editor's current image. */
  pageId?: string;
  /** When false, show page content without edit interactions. */
  interactive?: boolean;
}

export function useTemplateCanvasController({
  containerRef,
  stageRef,
  transformerRef,
  pageId,
  interactive = true,
}: UseTemplateCanvasControllerParams) {
  const isGridHandleDraggingRef = useRef(false);

  const editorCurrentImage = useCurrentImage();
  const pageOverride = useTemplatePage(pageId);
  const currentImage = pageId ? pageOverride : editorCurrentImage;
  const template = useCurrentTemplate();
  const displaySrc = useCanvasImageSrc(currentImage?.src, currentImage?.srcAlt);
  const [image] = useImage(displaySrc);

  const canvasTool = useEditorStore(state => state.canvasTool);
  const showRectangleGuides = useEditorStore(state => state.showRectangleGuides);
  const isSelectMode = interactive && canvasTool === 'select';
  const isPanMode = interactive && canvasTool === 'pan';

  const viewport = useCanvasViewport({
    containerRef,
    imageWidth: currentImage?.width ?? 0,
    imageHeight: currentImage?.height ?? 0,
    imageId: currentImage?.id,
  });

  const selection = useCanvasSelection({
    stageRef,
    transformerRef,
    currentImage: interactive ? currentImage : null,
    isSelectMode,
    isGridHandleDraggingRef,
    pointerToImage: viewport.pointerToImage,
  });

  const drag = useCanvasDragSnap({
    currentImage: interactive ? currentImage : null,
    isSelectMode,
    isGridHandleDraggingRef,
    scale: viewport.scale,
    offset: viewport.offset,
  });

  const grid = useCanvasGridEdit({
    currentImage: interactive ? currentImage : null,
    selectedRectangleIds: interactive ? selection.selectedRectangleIds : [],
    dragState: drag.dragState,
    dragOverlay: drag.dragOverlay,
    imageId: interactive ? currentImage?.id : undefined,
    stageRef,
  });

  isGridHandleDraggingRef.current = grid.isGridHandleDragging;

  useCanvasKeyboard({
    stageRef,
    currentImage: interactive ? currentImage : null,
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

  const noop = useCallback(() => {}, []);

  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!interactive) return;
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
    [interactive, stageRef, shouldBeginPan, beginPan, isPanMode, handleEmptyMouseDown],
  );

  const handleMouseMove = useCallback(() => {
    if (!interactive) return;
    const stage = stageRef.current;
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    if (movePan(pos)) return;
    handleMarqueeMove(pos);
  }, [interactive, stageRef, movePan, handleMarqueeMove]);

  const handleMouseUp = useCallback(
    (e?: Konva.KonvaEventObject<MouseEvent>) => {
      if (!interactive) return;
      if (endPan()) return;
      handleMarqueeUp(e);
    },
    [interactive, endPan, handleMarqueeUp],
  );

  const containerClassName = [
    'template-canva',
    !interactive && 'template-canva--readonly',
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
    interactive,
    isSelectMode,
    showRectangleGuides: interactive && showRectangleGuides,
    viewport,
    selection,
    drag,
    grid,
    containerClassName,
    handleMouseDown: interactive ? handleMouseDown : noop,
    handleMouseMove: interactive ? handleMouseMove : noop,
    handleMouseUp: interactive ? handleMouseUp : noop,
  };
}
