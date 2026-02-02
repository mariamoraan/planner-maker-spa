import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Transformer } from 'react-konva';
import useImage from 'use-image';
import type { Rectangle, FieldType } from '@/types/planner';
import { FIELD_TYPE_CONFIG } from '@/types/planner';
import { generateId } from '@/lib/planner-utils';
import type Konva from 'konva';

interface TemplateCanvasProps {
  imageData: string;
  imageWidth: number;
  imageHeight: number;
  rectangles: Rectangle[];
  selectedFieldType: FieldType;
  selectedRectangleId: string | null;
  onRectangleAdd: (rect: Omit<Rectangle, 'id'>) => void;
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
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingRect, setDrawingRect] = useState<DrawingRect | null>(null);
  
  // Calculate scale to fit image in container
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current && imageWidth && imageHeight) {
        const containerWidth = containerRef.current.offsetWidth;
        const containerHeight = containerRef.current.offsetHeight;
        
        const scaleX = containerWidth / imageWidth;
        const scaleY = containerHeight / imageHeight;
        const newScale = Math.min(scaleX, scaleY, 1);
        
        setScale(newScale);
        setStageSize({
          width: imageWidth * newScale,
          height: imageHeight * newScale,
        });
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [imageWidth, imageHeight]);
  
  // Update transformer when selection changes
  useEffect(() => {
    if (transformerRef.current && stageRef.current) {
      const stage = stageRef.current;
      const selectedNode = stage.findOne(`#rect-${selectedRectangleId}`);
      
      if (selectedNode) {
        transformerRef.current.nodes([selectedNode]);
        transformerRef.current.getLayer()?.batchDraw();
      } else {
        transformerRef.current.nodes([]);
        transformerRef.current.getLayer()?.batchDraw();
      }
    }
  }, [selectedRectangleId]);
  
  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    // Check if clicking on empty space (not on a rectangle)
    const clickedOnEmpty = e.target === e.target.getStage() || e.target.name() === 'background';
    
    if (clickedOnEmpty) {
      onRectangleSelect(null);
      
      const stage = stageRef.current;
      if (!stage) return;
      
      const pos = stage.getPointerPosition();
      if (!pos) return;
      
      setIsDrawing(true);
      setDrawingRect({
        x: pos.x / scale,
        y: pos.y / scale,
        width: 0,
        height: 0,
      });
    }
  }, [scale, onRectangleSelect]);
  
  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isDrawing || !drawingRect) return;
    
    const stage = stageRef.current;
    if (!stage) return;
    
    const pos = stage.getPointerPosition();
    if (!pos) return;
    
    setDrawingRect({
      ...drawingRect,
      width: pos.x / scale - drawingRect.x,
      height: pos.y / scale - drawingRect.y,
    });
  }, [isDrawing, drawingRect, scale]);
  
  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !drawingRect) return;
    
    setIsDrawing(false);
    
    // Only create rectangle if it has meaningful size
    const minSize = 20;
    if (Math.abs(drawingRect.width) > minSize && Math.abs(drawingRect.height) > minSize) {
      // Normalize negative dimensions
      const rect = {
        x: drawingRect.width < 0 ? drawingRect.x + drawingRect.width : drawingRect.x,
        y: drawingRect.height < 0 ? drawingRect.y + drawingRect.height : drawingRect.y,
        width: Math.abs(drawingRect.width),
        height: Math.abs(drawingRect.height),
        fieldType: selectedFieldType,
      };
      
      onRectangleAdd(rect);
    }
    
    setDrawingRect(null);
  }, [isDrawing, drawingRect, selectedFieldType, onRectangleAdd]);
  
  const handleRectClick = useCallback((rectId: string) => {
    onRectangleSelect(rectId);
  }, [onRectangleSelect]);
  
  const handleTransformEnd = useCallback((rectId: string, e: Konva.KonvaEventObject<Event>) => {
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    
    // Reset scale and apply to width/height
    node.scaleX(1);
    node.scaleY(1);
    
    onRectangleUpdate(rectId, {
      x: node.x() / scale,
      y: node.y() / scale,
      width: (node.width() * scaleX) / scale,
      height: (node.height() * scaleY) / scale,
    });
  }, [scale, onRectangleUpdate]);
  
  const handleDragEnd = useCallback((rectId: string, e: Konva.KonvaEventObject<DragEvent>) => {
    onRectangleUpdate(rectId, {
      x: e.target.x() / scale,
      y: e.target.y() / scale,
    });
  }, [scale, onRectangleUpdate]);
  
  // Handle keyboard delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedRectangleId) {
        onRectangleDelete(selectedRectangleId);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedRectangleId, onRectangleDelete]);
  
  return (
    <div 
      ref={containerRef} 
      className="flex-1 flex items-center justify-center canvas-workspace overflow-hidden p-4"
    >
      <div className="shadow-elevated rounded-lg overflow-hidden bg-card">
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
            {/* Background image */}
            {image && (
              <KonvaImage
                image={image}
                width={stageSize.width}
                height={stageSize.height}
                name="background"
              />
            )}
            
            {/* Existing rectangles */}
            {rectangles.map(rect => {
              const config = FIELD_TYPE_CONFIG[rect.fieldType];
              return (
                <Rect
                  key={rect.id}
                  id={`rect-${rect.id}`}
                  x={rect.x * scale}
                  y={rect.y * scale}
                  width={rect.width * scale}
                  height={rect.height * scale}
                  fill={config.bgColor}
                  stroke={config.color}
                  strokeWidth={2}
                  cornerRadius={4}
                  draggable
                  onClick={() => handleRectClick(rect.id)}
                  onTap={() => handleRectClick(rect.id)}
                  onDragEnd={(e) => handleDragEnd(rect.id, e)}
                  onTransformEnd={(e) => handleTransformEnd(rect.id, e)}
                />
              );
            })}
            
            {/* Drawing rectangle */}
            {drawingRect && (
              <Rect
                x={drawingRect.x * scale}
                y={drawingRect.y * scale}
                width={drawingRect.width * scale}
                height={drawingRect.height * scale}
                fill={FIELD_TYPE_CONFIG[selectedFieldType].bgColor}
                stroke={FIELD_TYPE_CONFIG[selectedFieldType].color}
                strokeWidth={2}
                dash={[5, 5]}
                cornerRadius={4}
              />
            )}
            
            {/* Transformer for selected rectangle */}
            <Transformer
              ref={transformerRef}
              boundBoxFunc={(oldBox, newBox) => {
                // Limit resize to minimum size
                if (newBox.width < 20 || newBox.height < 20) {
                  return oldBox;
                }
                return newBox;
              }}
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
