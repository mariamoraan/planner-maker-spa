import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Transformer } from 'react-konva';
import useImage from 'use-image';
import { useTranslation } from 'react-i18next';
import type { Rectangle } from '@/types/planner';
import { FIELD_TYPE_CONFIG } from '@/types/planner';
import Konva from 'konva';
import { useTemplateStore } from '@/stores/template-store';
import { useManageAreas } from '@/hooks/use-manage-areas';
import { useCurrentImage } from '@/hooks/use-current-image';
import { useCurrentTemplate } from '@/hooks/use-current-template';
import { blockSelectionZoneProps } from '@/lib/block-selection';
import type { MeasureAnchor } from '@/lib/measure-utils';
import { createMeasureAnchor, getMovingAnchor } from '@/lib/measure-utils';
import { computeSnap, computeGroupSnap, computeGroupBounds, rectsIntersect, normalizeCoord, type SnapGuide } from '@/lib/canvas-snap';
import { canPanCanvas, clampCanvasPan, type CanvasPanContext } from '@/lib/canvas-pan';
import { SnapGuidesOverlay } from './snap-guides-overlay';
import { MeasureOverlay } from './measure-overlay';
import { CanvasFloatingControls } from './canvas-floating-controls';
import './template-canva.scss';
import { TemplateRectangle } from './template-rectangle';

interface DrawingRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface MarqueeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DragStartEntry {
  id: string;
  x: number;
  y: number;
}

interface DragOverlay {
  guides: SnapGuide[];
  previewPositions: Record<string, { x: number; y: number }>;
}

interface DragState {
  leaderId: string;
  movingIds: string[];
}

type MeasureState =
  | { phase: 'idle' }
  | { phase: 'first'; p1: MeasureAnchor }
  | { phase: 'done'; p1: MeasureAnchor; p2: MeasureAnchor };

function getBlockIdFromTarget(target: Konva.Node): string | undefined {
  let node: Konva.Node | null = target;
  while (node) {
    const id = node.id();
    if (id?.startsWith('rect-')) {
      return id.replace(/^rect-/, '');
    }
    node = node.getParent();
  }
  return undefined;
}

const PADDING = 16;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const ZOOM_STEP = 1.2;

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
}

export const TemplateCanvas: React.FC = () => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const dragGroupStartRef = useRef<DragStartEntry[] | null>(null);
  const dragGroupBoundsRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const dragDeltaRef = useRef<{ dx: number; dy: number } | null>(null);
  const marqueeStartRef = useRef<{ x: number; y: number } | null>(null);
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const spacePressedRef = useRef(false);
  const [dragState, setDragState] = useState<DragState | null>(null);

  const currentImage = useCurrentImage();
  const template = useCurrentTemplate();
  const { addArea, addAreas, updateArea, deleteAreas, moveAreas } = useManageAreas();

  const [image] = useImage(currentImage?.src ?? '');
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [fitScale, setFitScale] = useState(1);
  const [fitOffset, setFitOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);
  const [measureState, setMeasureState] = useState<MeasureState>({ phase: 'idle' });
  const [measurePreview, setMeasurePreview] = useState<MeasureAnchor | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingRect, setDrawingRect] = useState<DrawingRect | null>(null);
  const [copiedRects, setCopiedRects] = useState<Rectangle[]>([]);
  const [dragOverlay, setDragOverlay] = useState<DragOverlay | null>(null);
  const [marquee, setMarquee] = useState<MarqueeRect | null>(null);
  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false);
  const [marqueePreviewIds, setMarqueePreviewIds] = useState<string[]>([]);

  const selectedFieldType = useTemplateStore(state => state.selectedFieldType);
  const selectedRectangleIds = useTemplateStore(state => state.selectedRectangleIds);
  const setSelectedRectangleIds = useTemplateStore(state => state.setSelectedRectangleIds);
  const toggleRectangleInSelection = useTemplateStore(state => state.toggleRectangleInSelection);
  const addToSelection = useTemplateStore(state => state.addToSelection);
  const clearSelection = useTemplateStore(state => state.clearSelection);
  const showRectangleGuides = useTemplateStore(state => state.showRectangleGuides);
  const canvasTool = useTemplateStore(state => state.canvasTool);
  const setCanvasTool = useTemplateStore(state => state.setCanvasTool);

  const isSelectMode = canvasTool === 'select';
  const isPanMode = canvasTool === 'pan';
  const isMeasureMode = canvasTool === 'measure';
  const scale = fitScale * zoom;
  const offset = useMemo(
    () => ({ x: fitOffset.x + pan.x, y: fitOffset.y + pan.y }),
    [fitOffset, pan],
  );

  const panContext = useMemo<CanvasPanContext>(
    () => ({
      zoom,
      fitOffset,
      fitScale,
      imageWidth: currentImage?.width ?? 0,
      imageHeight: currentImage?.height ?? 0,
      stageWidth: stageSize.width,
      stageHeight: stageSize.height,
      padding: PADDING,
    }),
    [zoom, fitOffset, fitScale, currentImage?.width, currentImage?.height, stageSize.width, stageSize.height],
  );

  const applyPan = useCallback(
    (next: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => {
      setPan(prev => {
        const raw = typeof next === 'function' ? next(prev) : next;
        return clampCanvasPan(raw, panContext);
      });
    },
    [panContext],
  );

  const groupSelectionBounds = useMemo(() => {
    if (selectedRectangleIds.length < 2) return null;

    const selectedRects =
      currentImage?.rectangles?.filter(rect => selectedRectangleIds.includes(rect.id)) ?? [];
    if (selectedRects.length < 2) return null;

    const minX = Math.min(...selectedRects.map(rect => rect.x));
    const minY = Math.min(...selectedRects.map(rect => rect.y));
    const maxX = Math.max(...selectedRects.map(rect => rect.x + rect.width));
    const maxY = Math.max(...selectedRects.map(rect => rect.y + rect.height));
    const padding = 6;

    return {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2,
    };
  }, [selectedRectangleIds, currentImage?.rectangles]);

  useEffect(() => {
    if (!containerRef?.current || !currentImage?.width || !currentImage?.height) return;

    const updateSize = () => {
      const containerRect = containerRef.current!.getBoundingClientRect();
      const containerWidth = containerRect.width - PADDING * 2;
      const containerHeight = containerRect.height - PADDING * 2;

      const newFitScale = Math.min(
        containerWidth / currentImage.width,
        containerHeight / currentImage.height,
      );
      setFitScale(newFitScale);
      setStageSize({ width: containerRect.width, height: containerRect.height });
      setFitOffset({
        x: PADDING + (containerWidth - currentImage.width * newFitScale) / 2,
        y: PADDING + (containerHeight - currentImage.height * newFitScale) / 2,
      });
    };

    updateSize();

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(containerRef.current);

    window.addEventListener('resize', updateSize);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, [currentImage?.width, currentImage?.height]);

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setMeasureState({ phase: 'idle' });
    setMeasurePreview(null);
  }, [currentImage?.id]);

  useEffect(() => {
    setPan(prev => clampCanvasPan(prev, panContext));
  }, [panContext]);

  useEffect(() => {
    if (canvasTool !== 'measure') {
      setMeasureState({ phase: 'idle' });
      setMeasurePreview(null);
    }
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
        const selectedNode = stage.findOne(`#rect-${selectedRectangleIds[0]}`);
        transformerRef.current.nodes(selectedNode ? [selectedNode] : []);
      } else {
        transformerRef.current.nodes([]);
      }
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedRectangleIds, currentImage?.rectangles, isSelectMode]);

  const pointerToImage = useCallback(
    (pos: { x: number; y: number }) => ({
      x: (pos.x - offset.x) / scale,
      y: (pos.y - offset.y) / scale,
    }),
    [offset, scale],
  );

  const zoomToPoint = useCallback(
    (newZoom: number, pointer: { x: number; y: number }) => {
      const clampedZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoom));
      const oldScale = fitScale * zoom;
      const oldOffsetX = fitOffset.x + pan.x;
      const oldOffsetY = fitOffset.y + pan.y;
      const imageX = (pointer.x - oldOffsetX) / oldScale;
      const imageY = (pointer.y - oldOffsetY) / oldScale;
      const newScale = fitScale * clampedZoom;
      const newOffsetX = pointer.x - imageX * newScale;
      const newOffsetY = pointer.y - imageY * newScale;
      setZoom(clampedZoom);
      setPan(
        clampCanvasPan(
          {
            x: newOffsetX - fitOffset.x,
            y: newOffsetY - fitOffset.y,
          },
          {
            zoom: clampedZoom,
            fitOffset,
            fitScale,
            imageWidth: currentImage?.width ?? 0,
            imageHeight: currentImage?.height ?? 0,
            stageWidth: stageSize.width,
            stageHeight: stageSize.height,
            padding: PADDING,
          },
        ),
      );
    },
    [fitScale, fitOffset, pan, zoom, currentImage?.width, currentImage?.height, stageSize.width, stageSize.height],
  );

  const handleZoomIn = useCallback(() => {
    zoomToPoint(zoom * ZOOM_STEP, { x: stageSize.width / 2, y: stageSize.height / 2 });
  }, [zoom, zoomToPoint, stageSize]);

  const handleZoomOut = useCallback(() => {
    zoomToPoint(zoom / ZOOM_STEP, { x: stageSize.width / 2, y: stageSize.height / 2 });
  }, [zoom, zoomToPoint, stageSize]);

  const handleZoomReset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const rect = container.getBoundingClientRect();
        const pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        const delta = -e.deltaY * 0.001;
        zoomToPoint(zoom * (1 + delta), pointer);
        return;
      }

      if (e.deltaX !== 0 || e.deltaY !== 0) {
        e.preventDefault();
        if (!canPanCanvas(panContext)) return;
        applyPan(prev => ({
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
        }));
      }
    };

    const preventMiddleClick = (e: MouseEvent) => {
      if (e.button === 1) e.preventDefault();
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('mousedown', preventMiddleClick);
    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('mousedown', preventMiddleClick);
    };
  }, [zoom, zoomToPoint, panContext, applyPan]);

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

  const getMarqueeHitIds = useCallback(
    (marqueeRect: MarqueeRect) =>
      currentImage?.rectangles
        ?.filter(rect => rectsIntersect(marqueeRect, rect))
        .map(rect => rect.id) ?? [],
    [currentImage?.rectangles],
  );

  const handleMeasureClick = useCallback(
    (imagePos: { x: number; y: number }, blockId?: string) => {
      const rectangles = currentImage?.rectangles ?? [];
      const anchor = createMeasureAnchor(imagePos, blockId, rectangles);
      setMeasureState(prev => {
        if (prev.phase === 'first') {
          return { phase: 'done', p1: prev.p1, p2: anchor };
        }
        return { phase: 'first', p1: anchor };
      });
      setMeasurePreview(anchor);
    },
    [currentImage?.rectangles],
  );

  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = stageRef.current;
      if (!stage) return;
      const pos = stage.getPointerPosition();
      if (!pos) return;

      const isMiddleButton = e.evt.button === 1;
      const isSpacePan = spacePressedRef.current && e.evt.button === 0;

      if ((isMiddleButton || isSpacePan) && canPanCanvas(panContext)) {
        e.evt.preventDefault();
        setIsPanning(true);
        panStartRef.current = { x: pos.x, y: pos.y, panX: pan.x, panY: pan.y };
        return;
      }

      if (isMeasureMode) {
        handleMeasureClick(pointerToImage(pos), getBlockIdFromTarget(e.target));
        return;
      }

      if (isPanMode && e.evt.button === 0 && canPanCanvas(panContext)) {
        e.evt.preventDefault();
        setIsPanning(true);
        panStartRef.current = { x: pos.x, y: pos.y, panX: pan.x, panY: pan.y };
        return;
      }

      const clickedOnEmpty = e.target === e.target.getStage() || e.target.name() === 'background';

      if (!clickedOnEmpty || !isSelectMode) return;

      const imagePos = pointerToImage(pos);
      marqueeStartRef.current = imagePos;
      setIsMarqueeSelecting(true);
      setMarquee({ x: imagePos.x, y: imagePos.y, width: 0, height: 0 });
      setMarqueePreviewIds([]);

      if (!e.evt.shiftKey && !e.evt.metaKey && !e.evt.ctrlKey) {
        clearSelection();
      }
    },
    [isMeasureMode, isPanMode, isSelectMode, handleMeasureClick, pointerToImage, pan, panContext, clearSelection],
  );

  const handleMouseMove = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    if (isPanning && panStartRef.current) {
      const start = panStartRef.current;
      applyPan({
        x: start.panX + (pos.x - start.x),
        y: start.panY + (pos.y - start.y),
      });
      return;
    }

    if (isMeasureMode && measureState.phase !== 'idle') {
      const imagePos = pointerToImage(pos);
      setMeasurePreview({ x: imagePos.x, y: imagePos.y });
      return;
    }

    if (!isMarqueeSelecting || !marqueeStartRef.current) return;

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
  }, [
    isPanning,
    isMeasureMode,
    measureState.phase,
    isMarqueeSelecting,
    pointerToImage,
    getMarqueeHitIds,
    applyPan,
  ]);

  const handleMouseUp = useCallback(
    (e?: Konva.KonvaEventObject<MouseEvent>) => {
      if (isPanning) {
        setIsPanning(false);
        panStartRef.current = null;
        return;
      }

      if (isMarqueeSelecting) {
        const minSize = 4;
        if (marquee && marquee.width > minSize && marquee.height > minSize) {
          const hitIds = marqueePreviewIds.length > 0
            ? marqueePreviewIds
            : getMarqueeHitIds(marquee);

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
        return;
      }

      if (!isDrawing || !drawingRect) return;
      setIsDrawing(false);

      const minSize = 20;
      if (Math.abs(drawingRect.width) > minSize && Math.abs(drawingRect.height) > minSize) {
        const rect: Omit<Rectangle, 'id'> & { order: number } = {
          x: Math.round(drawingRect.width < 0 ? drawingRect.x + drawingRect.width : drawingRect.x),
          y: Math.round(drawingRect.height < 0 ? drawingRect.y + drawingRect.height : drawingRect.y),
          width: Math.round(Math.abs(drawingRect.width)),
          height: Math.round(Math.abs(drawingRect.height)),
          fieldType: selectedFieldType,
          order: currentImage?.rectangles?.length ?? 0,
        };
        addArea(rect);
      }

      setDrawingRect(null);
    },
    [
      isPanning,
      isMarqueeSelecting,
      marquee,
      marqueePreviewIds,
      getMarqueeHitIds,
      selectedRectangleIds,
      setSelectedRectangleIds,
      isDrawing,
      drawingRect,
      selectedFieldType,
      addArea,
      currentImage?.rectangles?.length,
    ],
  );

  const handleRectClick = useCallback(
    (rectId: string, e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (!isSelectMode) return;
      e.cancelBubble = true;
      const nativeEvent = e.evt;

      if (nativeEvent.shiftKey) {
        toggleRectangleInSelection(rectId);
      } else if (nativeEvent.metaKey || nativeEvent.ctrlKey) {
        addToSelection(rectId);
      } else {
        setSelectedRectangleIds([rectId]);
      }
    },
    [isSelectMode, toggleRectangleInSelection, addToSelection, setSelectedRectangleIds],
  );

  const handleDragStart = useCallback(
    (rectId: string) => {
      if (!isSelectMode) return;
      const rects = currentImage?.rectangles ?? [];
      const movingIds =
        selectedRectangleIds.includes(rectId) && selectedRectangleIds.length > 1
          ? selectedRectangleIds
          : [rectId];

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
      setDragState({ leaderId: rectId, movingIds });
      setDragOverlay({
        guides: [],
        previewPositions: Object.fromEntries(
          movingIds.map(id => {
            const rect = rects.find(r => r.id === id)!;
            return [id, { x: rect.x, y: rect.y }];
          }),
        ),
      });
    },
    [isSelectMode, currentImage?.rectangles, selectedRectangleIds],
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

  const handleDragEnd = useCallback(
    (_rectId: string) => {
      const startEntries = dragGroupStartRef.current;
      const delta = dragDeltaRef.current;
      if (!startEntries || !delta) return;

      if (delta.dx !== 0 || delta.dy !== 0) {
        const moves = startEntries.map(entry => ({
          id: entry.id,
          x: entry.x + delta.dx,
          y: entry.y + delta.dy,
        }));
        moveAreas(moves);
      }

      dragGroupStartRef.current = null;
      dragGroupBoundsRef.current = null;
      dragDeltaRef.current = null;
      setDragState(null);
      setDragOverlay(null);
    },
    [moveAreas],
  );

  const handleDragMove = useCallback(
    (rectId: string, e: Konva.KonvaEventObject<DragEvent>) => {
      const node = e.target;
      const movingRect = currentImage?.rectangles?.find(r => r.id === rectId);
      if (!movingRect) return;

      const startEntries = dragGroupStartRef.current ?? [{ id: rectId, x: movingRect.x, y: movingRect.y }];
      const leaderStart = startEntries.find(entry => entry.id === rectId) ?? startEntries[0];
      const groupBounds = dragGroupBoundsRef.current;

      const newX = (node.x() - offset.x) / scale;
      const newY = (node.y() - offset.y) / scale;
      const leaderDx = newX - leaderStart.x;
      const leaderDy = newY - leaderStart.y;

      const excludeIds = new Set(startEntries.map(entry => entry.id));
      const allBounds = (currentImage?.rectangles ?? []).map(r => ({
        id: r.id,
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
      }));

      const snapOptions = {
        enabled: !e.evt.shiftKey,
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
          leaderDx,
          leaderDy,
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
          newX,
          newY,
          allBounds,
          excludeIds,
          scale,
          snapOptions,
        );
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

      setDragOverlay({
        guides: snapResult.guides,
        previewPositions,
      });
    },
    [currentImage, scale, offset],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!stageRef.current) return;
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlKey = isMac ? e.metaKey : e.ctrlKey;
      if (isEditableTarget(e.target)) return;

      if (e.key === 'Escape') {
        if (isPanMode) {
          setCanvasTool('select');
          return;
        }
        if (isMeasureMode) {
          if (measureState.phase !== 'idle') {
            setMeasureState({ phase: 'idle' });
            setMeasurePreview(null);
            return;
          }
          setCanvasTool('select');
          return;
        }
        clearSelection();
        return;
      }

      if (ctrlKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        const allIds = currentImage?.rectangles?.map(r => r.id) ?? [];
        setSelectedRectangleIds(allIds);
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedRectangleIds.length > 0) {
        e.preventDefault();
        deleteAreas([...selectedRectangleIds]);
        return;
      }

      if (ctrlKey && (e.key === 'c' || e.key === 'C') && selectedRectangleIds.length > 0) {
        const rects =
          currentImage?.rectangles?.filter(r => selectedRectangleIds.includes(r.id)) ?? [];
        if (rects.length > 0) setCopiedRects(rects.map(r => ({ ...r })));
        return;
      }

      if (ctrlKey && (e.key === 'v' || e.key === 'V') && copiedRects.length > 0) {
        e.preventDefault();
        const stage = stageRef.current;
        const pos = stage.getPointerPosition();

        const minX = Math.min(...copiedRects.map(r => r.x));
        const minY = Math.min(...copiedRects.map(r => r.y));

        const pasteOriginX = pos ? (pos.x - offset.x) / scale : minX + 20;
        const pasteOriginY = pos ? (pos.y - offset.y) / scale : minY + 20;
        const offsetX = pasteOriginX - minX;
        const offsetY = pasteOriginY - minY;

        const newRects = copiedRects.map((rect, index) => {
          const { id: _ignored, ...rectData } = rect;
          return {
            ...rectData,
            x: Math.round(rect.x + offsetX),
            y: Math.round(rect.y + offsetY),
            order: (currentImage?.rectangles?.length ?? 0) + index,
          };
        });

        addAreas(newRects);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isPanMode,
    isMeasureMode,
    measureState.phase,
    setCanvasTool,
    selectedRectangleIds,
    currentImage?.rectangles,
    copiedRects,
    addAreas,
    deleteAreas,
    clearSelection,
    setSelectedRectangleIds,
    scale,
    offset,
  ]);

  const measureP1 = measureState.phase !== 'idle' ? measureState.p1 : null;
  const measureP2 =
    measureState.phase === 'done'
      ? measureState.p2
      : measureState.phase === 'first' && measurePreview
        ? measurePreview
        : null;
  const measureRects = useMemo(
    () => currentImage?.rectangles?.map(({ id, x, y }) => ({ id, x, y })) ?? [],
    [currentImage?.rectangles],
  );
  const movingBlockId =
    measureState.phase === 'done'
      ? getMovingAnchor(measureState.p1, measureState.p2)?.blockId
      : undefined;

  const handleMeasureAdjustApply = useCallback(
    (moves: { id: string; x: number; y: number }[]) => {
      moveAreas(moves);
    },
    [moveAreas],
  );

  const containerClassName = [
    'template-canva',
    isMeasureMode && 'template-canva--measure',
    isPanMode && 'template-canva--pan-tool',
    isPanning && 'template-canva--panning',
    spacePressed && 'template-canva--space-pan',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      key={currentImage?.id}
      ref={containerRef}
      className={containerClassName}
      {...blockSelectionZoneProps}
    >
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => handleMouseUp()}
        className="template-canva__stage"
      >
        <Layer>
          {image && (
            <KonvaImage
              image={image}
              width={currentImage?.width}
              height={currentImage?.height}
              scaleX={scale}
              scaleY={scale}
              x={offset.x}
              y={offset.y}
              shadowColor="rgba(0, 0, 0, 0.1)"
              shadowOffsetX={0}
              shadowOffsetY={4}
              shadowBlur={12}
              name="background"
            />
          )}

          {currentImage?.rectangles?.map(rect => {
            const config = FIELD_TYPE_CONFIG[rect.fieldType];
            const isSelected = selectedRectangleIds.includes(rect.id);
            const isMarqueePreview = marqueePreviewIds.includes(rect.id);
            const isGroupDragging = dragState !== null && dragState.movingIds.length > 1;
            const isDragLeader = dragState?.leaderId === rect.id;
            const draggable = isSelectMode && (!isGroupDragging || isDragLeader);
            return (
              <TemplateRectangle
                key={`${currentImage.id}-${rect.id}`}
                rect={rect}
                templateImage={currentImage}
                plannerLocale={template?.locale}
                weekStartsOn={template?.weekStartsOn}
                scale={scale}
                offset={offset}
                config={config}
                showRectangleGuides={showRectangleGuides}
                isSelected={isSelected}
                isMarqueePreview={isMarqueePreview}
                previewPosition={dragOverlay?.previewPositions[rect.id]}
                draggable={draggable}
                onClick={e => handleRectClick(rect.id, e)}
                onDragStart={() => handleDragStart(rect.id)}
                onDragMove={e => handleDragMove(rect.id, e)}
                onDragEnd={() => handleDragEnd(rect.id)}
                onTransformEnd={e => handleTransformEnd(rect.id, e)}
              />
            );
          })}

          {drawingRect && (
            <Rect
              x={offset.x + drawingRect.x * scale}
              y={offset.y + drawingRect.y * scale}
              width={drawingRect.width * scale}
              height={drawingRect.height * scale}
              fill={FIELD_TYPE_CONFIG[selectedFieldType!].bgColor}
              stroke={FIELD_TYPE_CONFIG[selectedFieldType!].color}
              strokeWidth={2}
              dash={[5, 5]}
              cornerRadius={4}
            />
          )}

          {marquee && (
            <Rect
              x={offset.x + marquee.x * scale}
              y={offset.y + marquee.y * scale}
              width={marquee.width * scale}
              height={marquee.height * scale}
              fill="rgba(0, 200, 255, 0.1)"
              stroke="rgba(0, 200, 255, 0.6)"
              strokeWidth={1}
              dash={[4, 4]}
            />
          )}

          {groupSelectionBounds && isSelectMode && (
            <Rect
              x={offset.x + groupSelectionBounds.x * scale}
              y={offset.y + groupSelectionBounds.y * scale}
              width={groupSelectionBounds.width * scale}
              height={groupSelectionBounds.height * scale}
              stroke="hsl(168, 76%, 42%)"
              strokeWidth={1.5}
              dash={[6, 4]}
              cornerRadius={6}
              listening={false}
            />
          )}

          <SnapGuidesOverlay guides={dragOverlay?.guides ?? []} scale={scale} offset={offset} />

          {measureP1 && measureP2 && (
            <MeasureOverlay
              p1={measureP1}
              p2={measureP2}
              rectangles={measureRects}
              movingBlockId={movingBlockId}
              scale={scale}
              offset={offset}
            />
          )}

          <Transformer
            ref={transformerRef}
            boundBoxFunc={(oldBox, newBox) =>
              newBox.width < 20 || newBox.height < 20 ? oldBox : newBox
            }
            rotateEnabled={false}
            anchorSize={8}
            borderStroke="hsl(168, 76%, 42%)"
            anchorFill="hsl(168, 76%, 42%)"
            anchorStroke="white"
          />
        </Layer>
      </Stage>

      <div className="template-canva__controls">
        <CanvasFloatingControls
          zoom={zoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onZoomReset={handleZoomReset}
          measureAdjust={
            measureState.phase === 'done'
              ? {
                  p1: measureState.p1,
                  p2: measureState.p2,
                  rectangles: measureRects,
                  selectedRectangleIds,
                  onApply: handleMeasureAdjustApply,
                }
              : undefined
          }
        />
      </div>
    </div>
  );
};
