import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type Konva from 'konva';
import {
  canPanCanvas,
  clampCanvasPan,
  computeCenteredFitOffset,
  type CanvasPanContext,
} from '@/features/editor/domain/services/canvas-pan';
import {
  clampZoom,
  resolveWheelAction,
  ZOOM_STEP,
} from '@/features/editor/domain/services/canvas-viewport';
import { CANVAS_PADDING, isEditableTarget } from './canvas-interaction-types';

interface UseCanvasViewportParams {
  containerRef: RefObject<HTMLDivElement | null>;
  imageWidth: number;
  imageHeight: number;
  imageId: string | undefined;
}

export function useCanvasViewport({
  containerRef,
  imageWidth,
  imageHeight,
  imageId,
}: UseCanvasViewportParams) {
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const spacePressedRef = useRef(false);
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const fitScaleRef = useRef(1);
  const stageSizeRef = useRef({ width: 800, height: 600 });
  const imageSizeRef = useRef({ width: 0, height: 0 });

  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [fitScale, setFitScale] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);

  const scale = fitScale * zoom;

  const setZoomWriteThrough = useCallback((value: number) => {
    zoomRef.current = value;
    setZoom(value);
  }, []);

  const setPanWriteThrough = useCallback((value: { x: number; y: number }) => {
    panRef.current = value;
    setPan(value);
  }, []);

  const setFitScaleWriteThrough = useCallback((value: number) => {
    fitScaleRef.current = value;
    setFitScale(value);
  }, []);

  const setStageSizeWriteThrough = useCallback((value: { width: number; height: number }) => {
    stageSizeRef.current = value;
    setStageSize(value);
  }, []);

  imageSizeRef.current = { width: imageWidth, height: imageHeight };

  const buildPanContext = useCallback(
    (nextZoom: number): CanvasPanContext => {
      const base = {
        zoom: nextZoom,
        fitScale: fitScaleRef.current,
        imageWidth: imageSizeRef.current.width,
        imageHeight: imageSizeRef.current.height,
        stageWidth: stageSizeRef.current.width,
        stageHeight: stageSizeRef.current.height,
        padding: CANVAS_PADDING,
      };
      return {
        ...base,
        fitOffset: computeCenteredFitOffset(base),
      };
    },
    [],
  );

  const fitOffset = useMemo(
    () =>
      computeCenteredFitOffset({
        zoom,
        fitScale,
        imageWidth,
        imageHeight,
        stageWidth: stageSize.width,
        stageHeight: stageSize.height,
        padding: CANVAS_PADDING,
      }),
    [zoom, fitScale, imageWidth, imageHeight, stageSize.width, stageSize.height],
  );

  const offset = useMemo(
    () => ({ x: fitOffset.x + pan.x, y: fitOffset.y + pan.y }),
    [fitOffset, pan],
  );

  const panContext = useMemo<CanvasPanContext>(
    () => ({
      zoom,
      fitOffset,
      fitScale,
      imageWidth,
      imageHeight,
      stageWidth: stageSize.width,
      stageHeight: stageSize.height,
      padding: CANVAS_PADDING,
    }),
    [zoom, fitOffset, fitScale, imageWidth, imageHeight, stageSize.width, stageSize.height],
  );

  const getPanContext = useCallback((): CanvasPanContext => buildPanContext(zoomRef.current), [buildPanContext]);

  const applyPan = useCallback(
    (next: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => {
      setPan(prev => {
        const raw = typeof next === 'function' ? next(prev) : next;
        const clamped = clampCanvasPan(raw, getPanContext());
        panRef.current = clamped;
        return clamped;
      });
    },
    [getPanContext],
  );

  useEffect(() => {
    if (!containerRef.current || !imageWidth || !imageHeight) return;

    const updateSize = () => {
      const container = containerRef.current;
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      const containerWidth = containerRect.width - CANVAS_PADDING * 2;
      const containerHeight = containerRect.height - CANVAS_PADDING * 2;

      const newFitScale = Math.min(
        containerWidth / imageWidth,
        containerHeight / imageHeight,
      );
      setFitScaleWriteThrough(newFitScale);
      setStageSizeWriteThrough({ width: containerRect.width, height: containerRect.height });
    };

    updateSize();

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(containerRef.current);

    window.addEventListener('resize', updateSize);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, [
    containerRef,
    imageWidth,
    imageHeight,
    setFitScaleWriteThrough,
    setStageSizeWriteThrough,
  ]);

  useEffect(() => {
    setZoomWriteThrough(1);
    setPanWriteThrough({ x: 0, y: 0 });
  }, [imageId, setZoomWriteThrough, setPanWriteThrough]);

  useEffect(() => {
    setPan(prev => {
      const clamped = clampCanvasPan(prev, panContext);
      panRef.current = clamped;
      return clamped;
    });
  }, [panContext]);

  const pointerToImage = useCallback(
    (pos: { x: number; y: number }) => ({
      x: (pos.x - offset.x) / scale,
      y: (pos.y - offset.y) / scale,
    }),
    [offset, scale],
  );

  const zoomToPoint = useCallback((newZoom: number, pointer: { x: number; y: number }) => {
    const currentFitScale = fitScaleRef.current;
    const currentZoom = zoomRef.current;
    const currentPan = panRef.current;
    const { width: imgW, height: imgH } = imageSizeRef.current;
    const stage = stageSizeRef.current;

    const clampedZoom = clampZoom(newZoom);
    const oldContext = {
      zoom: currentZoom,
      fitScale: currentFitScale,
      imageWidth: imgW,
      imageHeight: imgH,
      stageWidth: stage.width,
      stageHeight: stage.height,
      padding: CANVAS_PADDING,
    };
    const oldFitOffset = computeCenteredFitOffset(oldContext);
    const oldScale = currentFitScale * currentZoom;
    const oldOffsetX = oldFitOffset.x + currentPan.x;
    const oldOffsetY = oldFitOffset.y + currentPan.y;
    const imageX = (pointer.x - oldOffsetX) / oldScale;
    const imageY = (pointer.y - oldOffsetY) / oldScale;

    const newFitOffset = computeCenteredFitOffset({ ...oldContext, zoom: clampedZoom });
    const newScale = currentFitScale * clampedZoom;
    const newOffsetX = pointer.x - imageX * newScale;
    const newOffsetY = pointer.y - imageY * newScale;
    const clampedPan = clampCanvasPan(
      {
        x: newOffsetX - newFitOffset.x,
        y: newOffsetY - newFitOffset.y,
      },
      buildPanContext(clampedZoom),
    );

    setZoomWriteThrough(clampedZoom);
    setPanWriteThrough(clampedPan);
  }, [buildPanContext, setZoomWriteThrough, setPanWriteThrough]);

  const handleZoomIn = useCallback(() => {
    zoomToPoint(zoom * ZOOM_STEP, { x: stageSize.width / 2, y: stageSize.height / 2 });
  }, [zoom, zoomToPoint, stageSize]);

  const handleZoomOut = useCallback(() => {
    zoomToPoint(zoom / ZOOM_STEP, { x: stageSize.width / 2, y: stageSize.height / 2 });
  }, [zoom, zoomToPoint, stageSize]);

  const handleZoomReset = useCallback(() => {
    setZoomWriteThrough(1);
    setPanWriteThrough({ x: 0, y: 0 });
  }, [setZoomWriteThrough, setPanWriteThrough]);

  const zoomToPointRef = useRef(zoomToPoint);
  zoomToPointRef.current = zoomToPoint;
  const applyPanRef = useRef(applyPan);
  applyPanRef.current = applyPan;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // Ctrl/Cmd+wheel and trackpad pinch drive browser page zoom; cancel early.
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const action = resolveWheelAction(e, getPanContext());
        if (action.type !== 'zoom') return;

        const rect = container.getBoundingClientRect();
        const pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        zoomToPointRef.current(zoomRef.current * action.zoomFactor, pointer);
        return;
      }

      const action = resolveWheelAction(e, getPanContext());
      if (action.type !== 'pan') return;

      e.preventDefault();
      applyPanRef.current(prev => ({
        x: prev.x - action.deltaX,
        y: prev.y - action.deltaY,
      }));
    };

    const preventGestureZoom = (e: Event) => {
      e.preventDefault();
    };

    const preventMiddleClick = (e: MouseEvent) => {
      if (e.button === 1) e.preventDefault();
    };

    const gestureEvents = ['gesturestart', 'gesturechange', 'gestureend'] as const;

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('mousedown', preventMiddleClick);
    for (const type of gestureEvents) {
      container.addEventListener(type, preventGestureZoom);
    }
    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('mousedown', preventMiddleClick);
      for (const type of gestureEvents) {
        container.removeEventListener(type, preventGestureZoom);
      }
    };
  }, [containerRef, getPanContext]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || isEditableTarget(e.target)) return;
      e.preventDefault();
      spacePressedRef.current = true;
      setSpacePressed(true);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      spacePressedRef.current = false;
      setSpacePressed(false);
      setIsPanning(false);
      panStartRef.current = null;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const beginPan = useCallback(
    (pointer: { x: number; y: number }) => {
      if (!canPanCanvas(panContext)) return false;
      setIsPanning(true);
      panStartRef.current = { x: pointer.x, y: pointer.y, panX: pan.x, panY: pan.y };
      return true;
    },
    [panContext, pan.x, pan.y],
  );

  const movePan = useCallback(
    (pointer: { x: number; y: number }) => {
      if (!isPanning || !panStartRef.current) return false;
      const start = panStartRef.current;
      applyPan({
        x: start.panX + (pointer.x - start.x),
        y: start.panY + (pointer.y - start.y),
      });
      return true;
    },
    [isPanning, applyPan],
  );

  const endPan = useCallback(() => {
    if (!isPanning) return false;
    setIsPanning(false);
    panStartRef.current = null;
    return true;
  }, [isPanning]);

  const shouldBeginPan = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>, isPanMode: boolean) => {
      const isMiddleButton = e.evt.button === 1;
      const isSpacePan = spacePressedRef.current && e.evt.button === 0;
      if (isMiddleButton || isSpacePan) return true;
      if (isPanMode && e.evt.button === 0) return true;
      return false;
    },
    [],
  );

  return {
    stageSize,
    scale,
    offset,
    zoom,
    pan,
    panContext,
    isPanning,
    spacePressed,
    pointerToImage,
    beginPan,
    movePan,
    endPan,
    shouldBeginPan,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
  };
}
