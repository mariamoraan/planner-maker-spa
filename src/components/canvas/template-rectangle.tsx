import { getEditorPreviewContext, getFieldValue } from "@/lib/planner-utils";
import { buildKonvaFontStyle, resolveFieldStyle, resolveFontFamily } from "@/lib/field-style-config";
import { resolveLocale } from "@/lib/locale-config";
import { FIELD_TYPE_CONFIG, FieldType, PlannerLocale, Rectangle, TemplateImage } from "@/types/planner";
import Konva from "konva";
import { useMemo, useRef } from "react";
import { Group, Rect, Text } from "react-konva";
import { useKonvaFade } from "./use-konva-fade";

interface TemplateRectangleProps {
    rect: Rectangle;
    templateImage: TemplateImage;
    plannerLocale?: PlannerLocale;
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
    templateImage,
    plannerLocale = 'es',
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

    const previewContext = useMemo(
      () => getEditorPreviewContext(templateImage),
      [templateImage],
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
            text={fieldValue}
            width={width}
            height={height}
            align="center"
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
          align="center"
          verticalAlign="middle"
          fontSize={height * 0.7}
          fontFamily={fontFamily}
          fill={fieldColor}
          fontStyle={fontStyle}
          listening={false}
        />
      </Group>
    );
  };
