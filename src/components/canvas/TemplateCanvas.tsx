import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Transformer, Line } from 'react-konva';
import useImage from 'use-image';
import type { Rectangle, FieldType } from '@/types/planner';
import { FIELD_TYPE_CONFIG } from '@/types/planner';
import type Konva from 'konva';

interface TemplateCanvasProps {
  imageData: string;
  imageWidth: number;
  imageHeight: number;
  rectangles: Rectangle[];
  selectedFieldType?: FieldType;
  selectedRectangleId: string | null;
  onRectangleAdd: (rect: Omit<Rectangle, 'id'> & { order: number }) => void;
  onRectangleUpdate: (id: string, updates: Partial<Rectangle>) => void;
  onRectangleSelect: (id: string | null) => void;
  onRectangleDelete: (id: string) => void;
}

interface DrawingRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface GuideLine {
  x?: number;
  y?: number;
}

export const TemplateCanvas: React.FC<TemplateCanvasProps> = ({
  imageData,
  imageWidth,
  imageHeight,
  rectangles,
  selectedFieldType,
  selectedRectangleId,
  onRectangleAdd,
  onRectangleUpdate,
  onRectangleSelect,
  onRectangleDelete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  const [image] = useImage(imageData);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 }); // offset global para centrar
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingRect, setDrawingRect] = useState<DrawingRect | null>(null);
  const [copiedRect, setCopiedRect] = useState<Rectangle | null>(null);
  const [guides, setGuides] = useState<GuideLine[]>([]);

  const SNAP_THRESHOLD = 10;
  const PADDING = 16; // el padding de tu wrapper p-4

  /** AJUSTAR IMAGEN AL CONTENEDOR */
  useEffect(() => {
    if (!containerRef.current || !imageWidth || !imageHeight) return;

    const updateSize = () => {
      // Tamaño disponible restando padding
      const containerRect = containerRef.current!.getBoundingClientRect();
      const containerWidth = containerRect.width - PADDING * 2;
      const containerHeight = containerRect.height - PADDING * 2;

      // Scale para fit-to-contain
      const newScale = Math.min(containerWidth / imageWidth, containerHeight / imageHeight);
      setScale(newScale);

      // Stage ocupa TODO el contenedor
      setStageSize({ width: containerRect.width, height: containerRect.height });

      // Offset para centrar la imagen dentro del stage
      setOffset({
        x: PADDING + (containerWidth - imageWidth * newScale) / 2,
        y: PADDING + (containerHeight - imageHeight * newScale) / 2,
      });
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [imageWidth, imageHeight]);

  /** TRANSFORMER */
  useEffect(() => {
    if (transformerRef.current && stageRef.current) {
      const stage = stageRef.current;
      const selectedNode = stage.findOne(`#rect-${selectedRectangleId}`);
      transformerRef.current.nodes(selectedNode ? [selectedNode] : []);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedRectangleId]);

  /** MOUSE DRAW */
  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if(!selectedFieldType) return;
      const clickedOnEmpty = e.target === e.target.getStage() || e.target.name() === 'background';
      if (!clickedOnEmpty) return;

      onRectangleSelect(null);
      const stage = stageRef.current;
      if (!stage) return;
      const pos = stage.getPointerPosition();
      if (!pos) return;

      setIsDrawing(true);
      setDrawingRect({
        x: (pos.x - offset.x) / scale,
        y: (pos.y - offset.y) / scale,
        width: 0,
        height: 0,
      });
    },
    [scale, offset, onRectangleSelect, selectedFieldType]
  );

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!isDrawing || !drawingRect) return;
      const stage = stageRef.current;
      if (!stage) return;
      const pos = stage.getPointerPosition();
      if (!pos) return;

      setDrawingRect({
        ...drawingRect,
        width: (pos.x - offset.x) / scale - drawingRect.x,
        height: (pos.y - offset.y) / scale - drawingRect.y,
      });
    },
    [isDrawing, drawingRect, scale, offset]
  );

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !drawingRect) return;
    setIsDrawing(false);

    const minSize = 20;
    if (Math.abs(drawingRect.width) > minSize && Math.abs(drawingRect.height) > minSize) {
      const rect: Omit<Rectangle, 'id'> & { order: number } = {
        x: drawingRect.width < 0 ? drawingRect.x + drawingRect.width : drawingRect.x,
        y: drawingRect.height < 0 ? drawingRect.y + drawingRect.height : drawingRect.y,
        width: Math.abs(drawingRect.width),
        height: Math.abs(drawingRect.height),
        fieldType: selectedFieldType,
        order: rectangles.length,
      };
      onRectangleAdd(rect);
    }

    setDrawingRect(null);
  }, [isDrawing, drawingRect, selectedFieldType, onRectangleAdd, rectangles.length]);

  /** RECT CLICK */
  const handleRectClick = useCallback((rectId: string) => {
    onRectangleSelect(rectId);
  }, [onRectangleSelect]);

  /** TRANSFORM & DRAG */
  const handleTransformEnd = useCallback(
    (rectId: string, e: Konva.KonvaEventObject<Event>) => {
      const node = e.target;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      node.scaleX(1);
      node.scaleY(1);

      onRectangleUpdate(rectId, {
        x: (node.x() - offset.x) / scale,
        y: (node.y() - offset.y) / scale,
        width: (node.width() * scaleX) / scale,
        height: (node.height() * scaleY) / scale,
      });
    },
    [scale, offset, onRectangleUpdate]
  );

  const handleDragEnd = useCallback(
    (rectId: string, e: Konva.KonvaEventObject<DragEvent>) => {
      onRectangleUpdate(rectId, {
        x: (e.target.x() - offset.x) / scale,
        y: (e.target.y() - offset.y) / scale,
      });
      setGuides([]);
    },
    [scale, offset, onRectangleUpdate]
  );

  /** SNAP + distribución igual */
  const handleDragMove = useCallback(
    (rectId: string, e: Konva.KonvaEventObject<DragEvent>) => {
      const node = e.target;
      const movingRect = rectangles.find(r => r.id === rectId);
      if (!movingRect) return;

      let newX = (node.x() - offset.x) / scale;
      let newY = (node.y() - offset.y) / scale;
      const newGuides: GuideLine[] = [];

      rectangles.forEach(r => {
        if (r.id === rectId) return;

        // SNAP horizontal
        if (Math.abs(r.x - newX) < SNAP_THRESHOLD) {
          newX = r.x;
          newGuides.push({ x: r.x });
        }
        if (Math.abs(r.x + r.width - (newX + movingRect.width)) < SNAP_THRESHOLD) {
          newX = r.x + r.width - movingRect.width;
          newGuides.push({ x: r.x + r.width });
        }
        if (Math.abs(r.x + r.width / 2 - (newX + movingRect.width / 2)) < SNAP_THRESHOLD) {
          newX = r.x + r.width / 2 - movingRect.width / 2;
          newGuides.push({ x: r.x + r.width / 2 });
        }

        // SNAP vertical
        if (Math.abs(r.y - newY) < SNAP_THRESHOLD) {
          newY = r.y;
          newGuides.push({ y: r.y });
        }
        if (Math.abs(r.y + r.height - (newY + movingRect.height)) < SNAP_THRESHOLD) {
          newY = r.y + r.height - movingRect.height;
          newGuides.push({ y: r.y + r.height });
        }
        if (Math.abs(r.y + r.height / 2 - (newY + movingRect.height / 2)) < SNAP_THRESHOLD) {
          newY = r.y + r.height / 2 - movingRect.height / 2;
          newGuides.push({ y: r.y + r.height / 2 });
        }
      });

      node.x(offset.x + newX * scale);
      node.y(offset.y + newY * scale);
      setGuides(newGuides);
    },
    [rectangles, scale, offset]
  );

  /** TECLADO: DELETE / COPY / PASTE */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!stageRef.current) return;
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlKey = isMac ? e.metaKey : e.ctrlKey;

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedRectangleId) {
        onRectangleDelete(selectedRectangleId);
        const remaining = rectangles
          .filter(r => r.id !== selectedRectangleId)
          .map((r, index) => ({ ...r, order: index }));
        remaining.forEach(r => onRectangleUpdate(r.id, { order: r.order }));
      }

      if (ctrlKey && (e.key === 'c' || e.key === 'C') && selectedRectangleId) {
        const rect = rectangles.find(r => r.id === selectedRectangleId);
        if (rect) setCopiedRect({ ...rect });
      }

      if (ctrlKey && (e.key === 'v' || e.key === 'V') && copiedRect) {
        const stage = stageRef.current;
        const pos = stage.getPointerPosition();
        if (!pos) return;
        const newRect = {
          ...copiedRect,
          id: crypto.randomUUID(),
          x: (pos.x - offset.x) / scale,
          y: (pos.y - offset.y) / scale,
          order: rectangles.length,
        };
        onRectangleAdd(newRect);
        onRectangleSelect(newRect.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedRectangleId, rectangles, copiedRect, onRectangleAdd, onRectangleDelete, onRectangleUpdate, onRectangleSelect, scale, offset]);

  /** RENDER */
  return (
    <div ref={containerRef} className="flex-1 flex items-center justify-center canvas-workspace overflow-hidden">
      <div className="shadow-elevated rounded-lg overflow-hidden bg-card p-4">
        <Stage
          ref={stageRef}
          width={stageSize.width}
          height={stageSize.height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <Layer>
            {image && (
              <KonvaImage
                image={image}
                width={imageWidth}
                height={imageHeight}
                scaleX={scale}
                scaleY={scale}
                x={offset.x}
                y={offset.y}
                name="background"
              />
            )}

            {rectangles.map(rect => {
              const config = FIELD_TYPE_CONFIG[rect.fieldType];
              return (
                <Rect
                  key={rect.id}
                  id={`rect-${rect.id}`}
                  x={offset.x + rect.x * scale}
                  y={offset.y + rect.y * scale}
                  width={rect.width * scale}
                  height={rect.height * scale}
                  fill={config.bgColor}
                  stroke={config.color}
                  strokeWidth={2}
                  cornerRadius={4}
                  draggable
                  onClick={() => handleRectClick(rect.id)}
                  onTap={() => handleRectClick(rect.id)}
                  onDragMove={e => handleDragMove(rect.id, e)}
                  onDragEnd={e => handleDragEnd(rect.id, e)}
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
                fill={FIELD_TYPE_CONFIG[selectedFieldType].bgColor}
                stroke={FIELD_TYPE_CONFIG[selectedFieldType].color}
                strokeWidth={2}
                dash={[5, 5]}
                cornerRadius={4}
              />
            )}

            {guides.map((g, i) => (
              <Line
                key={i}
                points={
                  g.x
                    ? [offset.x + g.x * scale, 0, offset.x + g.x * scale, stageSize.height]
                    : [0, offset.y + g.y! * scale, stageSize.width, offset.y + g.y! * scale]
                }
                stroke="rgba(0, 200, 255, 0.6)"
                strokeWidth={1}
                dash={[4, 4]}
              />
            ))}

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
      </div>
    </div>
  );
};
