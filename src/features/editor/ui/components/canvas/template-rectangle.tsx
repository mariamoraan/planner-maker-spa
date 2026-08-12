import { getEditorPreviewContext, getFieldValue } from "@/features/editor/domain/services/planner-utils";
import { buildKonvaFontStyle, resolveFieldStyle, resolveFontFamily } from "@/features/editor/domain/services/field-style-config";
import { resolveLocale } from "@/features/template/domain/services/locale-config";
import { FIELD_TYPE_CONFIG, FieldType, PlannerLocale, Rectangle, TemplateImage, WeekStartsOn } from "@/features/template";
import { DEFAULT_WEEK_STARTS_ON } from "@/features/template/domain/services/locale-config";
import Konva from "konva";
import { useMemo, useRef } from "react";
import { Group, Rect, Text } from "react-konva";
import { useKonvaFade } from "./use-konva-fade";

interface TemplateRectangleProps {
    rect: Rectangle;
    templateImage: TemplateImage;
    plannerLocale?: PlannerLocale;
    weekStartsOn?: WeekStartsOn;
    scale: number;
    offset: { x: number; y: number };
    config: typeof FIELD_TYPE_CONFIG[FieldType];
    showRectangleGuides: boolean;
    isSelected?: boolean;
    isMarqueePreview?: boolean;
    previewPosition?: { x: number; y: number };
    previewSize?: { width: number; height: number };
    draggable?: boolean;
    listening?: boolean;
    onClick: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
    onDragStart?: () => void;
    onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => void;
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
    onTransformEnd: (e: Konva.KonvaEventObject<Event>) => void;
}
  
export const TemplateRectangle: React.FC<TemplateRectangleProps> = ({
    rect,
    templateImage,
    plannerLocale = 'es',
    weekStartsOn = DEFAULT_WEEK_STARTS_ON,
    scale,
    offset,
    config,
    showRectangleGuides,
    isSelected = false,
    isMarqueePreview = false,
    previewPosition,
    previewSize,
    draggable = true,
    listening = true,
    onClick,
    onDragStart,
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

    const previewContext = useMemo(
      () => getEditorPreviewContext(templateImage, weekStartsOn),
      [templateImage, weekStartsOn],
    );

    const dateLocale = useMemo(() => resolveLocale(plannerLocale), [plannerLocale]);

    const { fieldValue, fieldColor } = useMemo(
      () => getFieldValue({
        fieldType: rect.fieldType,
        context: previewContext,
        templateImage,
        rectangle: rect,
        fillIncompleteWeeks: true,
        fillIncompleteMonths: true,
        locale: dateLocale,
      }),
      [rect, templateImage, previewContext, dateLocale],
    );

    const style = useMemo(() => resolveFieldStyle(rect), [rect]);
    const fontFamily = resolveFontFamily(style.fontId);
    const fontStyle = buildKonvaFontStyle(style);
  
    const displayWidth = previewSize?.width ?? rect.width;
    const displayHeight = previewSize?.height ?? rect.height;
    const width = displayWidth * scale;
    const height = displayHeight * scale;
    const displayX = previewPosition?.x ?? rect.x;
    const displayY = previewPosition?.y ?? rect.y;
  
    return (
      <Group
        id={`rect-${rect.id}`}
        x={offset.x + displayX * scale}
        y={offset.y + displayY * scale}
        width={width}
        height={height}
        draggable={draggable}
        listening={listening}
        onClick={onClick}
        onTap={onClick}
        onDragStart={onDragStart}
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
            text={fieldValue}
            width={width}
            height={height}
            align={style.textAlign}
            verticalAlign="middle"
            fontSize={height * 0.7}
            fontFamily={fontFamily}
            fill={config.color}
            fontStyle={fontStyle}
            listening={false}
          />
        </Group>
  
        <Text
          ref={plainTextRef}
          text={fieldValue}
          width={width}
          height={height}
          align={style.textAlign}
          verticalAlign="middle"
          fontSize={height * 0.7}
          fontFamily={fontFamily}
          fill={fieldColor}
          fontStyle={fontStyle}
          listening={false}
        />

        {isMarqueePreview && !isSelected && (
          <Rect
            width={width}
            height={height}
            stroke="rgba(0, 200, 255, 0.9)"
            strokeWidth={2}
            dash={[6, 4]}
            cornerRadius={4}
            listening={false}
          />
        )}

        {isSelected && (
          <Rect
            width={width}
            height={height}
            fill="rgba(22, 163, 136, 0.12)"
            stroke="hsl(168, 76%, 42%)"
            strokeWidth={2}
            cornerRadius={4}
            listening={false}
          />
        )}
      </Group>
    );
  };
