import { MONTH_NAMES } from "@/lib/planner-utils";
import { FIELD_TYPE_CONFIG, FieldType, Rectangle } from "@/types/planner";
import Konva from "konva";
import { useRef } from "react";
import { Group, Rect, Text } from "react-konva";
import { useKonvaFade } from "./use-konva-fade";

const date = new Date();
const today = new Date(date.getFullYear(), date.getMonth(), 1);

const RECTANGLE_PLACEHOLDERS: Record<FieldType, string> = {
    'year': today.getFullYear().toString(),
    'day': today.getDate().toString(),
    'endDay': today.getDate().toString(),
    'startDay': today.getDate().toString(),
    'month': MONTH_NAMES[today.getMonth()],
  }
  
  const getRectanglePlaceholder = (fieldType: FieldType, offset?: number) => {
    if(fieldType === 'day') {
      const shiftedDate = new Date(date.getFullYear(), date.getMonth(), 1);
      shiftedDate.setDate(shiftedDate.getDate() + offset);
      return shiftedDate.getDate().toString();
    }
    if(fieldType === 'endDay') {
      const shiftedDate = new Date(date.getFullYear(), date.getMonth(), 1);
      shiftedDate.setDate(shiftedDate.getDate() + 6);
      return shiftedDate.getDate().toString(); 
    }
    else {
      return RECTANGLE_PLACEHOLDERS[fieldType]
    }
  }

interface TemplateRectangleProps {
    rect: Rectangle;
    index?: number;
    scale: number;
    offset: { x: number; y: number };
    config: typeof FIELD_TYPE_CONFIG[FieldType];
    showRectangleGuides: boolean;
    onClick: () => void;
    onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => void;
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
    onTransformEnd: (e: Konva.KonvaEventObject<Event>) => void;
}
  
export const TemplateRectangle: React.FC<TemplateRectangleProps> = ({
    rect,
    index = 0,
    scale,
    offset,
    config,
    showRectangleGuides,
    onClick,
    onDragMove,
    onDragEnd,
    onTransformEnd,
  }) => {
    const styledContentRef = useRef<Konva.Group>(null);
    const plainTextRef = useRef<Konva.Text>(null);
  
    useKonvaFade(
    styledContentRef,
    showRectangleGuides,
    );
    
    useKonvaFade(
    plainTextRef,
    !showRectangleGuides,
    );
  
    const width = rect.width * scale;
    const height = rect.height * scale;
  
    return (
      <Group
        id={`rect-${rect.id}`}
        x={offset.x + rect.x * scale}
        y={offset.y + rect.y * scale}
        width={width}
        height={height}
        draggable
        onClick={onClick}
        onTap={onClick}
        onDragMove={onDragMove}
        onDragEnd={onDragEnd}
        onTransformEnd={onTransformEnd}
      >
        <Group
          ref={styledContentRef}
        >
          <Rect
            width={width}
            height={height}
            fill={config.bgColor}
            stroke={config.color}
            strokeWidth={2}
            cornerRadius={4}
          />
  
          <Text
            text={getRectanglePlaceholder(rect.fieldType, index)}
            width={width}
            height={height}
            align="center"
            verticalAlign="middle"
            fontSize={height * 0.7}
            fontFamily="Gloria Hallelujah"
            fill={config.color}
            fontStyle="bold"
            listening={false}
          />
        </Group>
  
        <Text
          ref={plainTextRef}
          text={getRectanglePlaceholder(rect.fieldType, index)}
          width={width}
          height={height}
          align="center"
          verticalAlign="middle"
          fontSize={height * 0.7}
          fontFamily="Gloria Hallelujah"
          fill="black"
          fontStyle="normal"
          listening={false}
        />
      </Group>
    );
  };