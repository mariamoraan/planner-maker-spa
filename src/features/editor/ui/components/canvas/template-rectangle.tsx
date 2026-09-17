import { getEditorPreviewContext, getFieldValue } from "@/features/editor/domain/services/planner-utils";
import {
  buildKonvaFontStyle,
  resolveFieldStyle,
  resolveFontFamily,
  resolvePlannerDefaultFontId,
} from "@/features/editor/domain/services/field-style-config";
import { resolveFieldFontSize } from "@/features/editor/domain/services/resolve-field-font-size";
import { resolveLocale } from "@/features/template/domain/services/locale-config";
import { FIELD_TYPE_CONFIG, FieldType, PlannerLocale, Rectangle, TemplateImage, WeekStartsOn } from "@/features/template";
import { DEFAULT_WEEK_STARTS_ON } from "@/features/template/domain/services/locale-config";
import Konva from "konva";
import { useMemo, useRef } from "react";
import { Group, Rect, Text } from "react-konva";
import { useKonvaFade } from "./use-konva-fade";
import { useCurrentTemplate } from "@/features/editor/ui/hooks/use-current-template";
import { useEditorStore } from "@/features/editor/ui/stores/editor-store";

function measureKonvaTextWidth(
  text: string,
  fontSize: number,
  fontFamily: string,
  fontStyle: string,
): number {
  const probe = new Konva.Text({
    text,
    fontSize,
    fontFamily,
    fontStyle,
  });
  return probe.getTextWidth();
}

interface TemplateRectangleProps {
    rect: Rectangle;
    templateImage: TemplateImage;
    plannerLocale?: PlannerLocale;
    weekStartsOn?: WeekStartsOn;
    plannerStart?: Date;
    plannerEnd?: Date;
    scale: number;
    offset: { x: number; y: number };
    config: typeof FIELD_TYPE_CONFIG[FieldType];
    showRectangleGuides: boolean;
    isSelected?: boolean;
    isMarqueePreview?: boolean;
    previewPosition?: { x: number; y: number };
    previewSize?: { width: number; height: number };
    /** World-space rotation in degrees (includes grid group rotation). */
    renderRotation?: number;
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
    plannerStart,
    plannerEnd,
    scale,
    offset,
    config,
    showRectangleGuides,
    isSelected = false,
    isMarqueePreview = false,
    previewPosition,
    previewSize,
    renderRotation,
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
    const template = useCurrentTemplate();
    const plannerFontId = resolvePlannerDefaultFontId(template?.defaultFontId);
  
    useKonvaFade(
    styledContentRef,
    showRectangleGuides,
    );
    
    useKonvaFade(
    plainTextRef,
    !showRectangleGuides,
    );

    const previewAnchorDate = useEditorStore(state => state.previewAnchorDate);
    const previewPlannerRange = useEditorStore(state => state.previewPlannerRange);

    const previewContext = useMemo(
      () =>
        getEditorPreviewContext(
          templateImage,
          weekStartsOn,
          { plannerStart, plannerEnd },
          previewAnchorDate,
          previewPlannerRange,
        ),
      [templateImage, weekStartsOn, plannerStart, plannerEnd, previewAnchorDate, previewPlannerRange],
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
        weekStartsOn,
      }),
      [rect, templateImage, previewContext, dateLocale, weekStartsOn],
    );

    const style = useMemo(
      () => resolveFieldStyle(rect, plannerFontId),
      [rect, plannerFontId],
    );
    const fontFamily = resolveFontFamily(style.fontId);
    const fontStyle = buildKonvaFontStyle(style);
  
    const displayWidth = previewSize?.width ?? rect.width;
    const displayHeight = previewSize?.height ?? rect.height;
    const width = displayWidth * scale;
    const height = displayHeight * scale;
    const displayX = previewPosition?.x ?? rect.x;
    const displayY = previewPosition?.y ?? rect.y;
    const rotation = renderRotation ?? rect.rotation ?? 0;

    // Position by center so rotation / transformer stay stable.
    const centerX = offset.x + (displayX + displayWidth / 2) * scale;
    const centerY = offset.y + (displayY + displayHeight / 2) * scale;

    const fontSize = useMemo(
      () =>
        resolveFieldFontSize(width, height, fieldValue, (size, line) =>
          measureKonvaTextWidth(line, size, fontFamily, fontStyle),
        ),
      [width, height, fieldValue, fontFamily, fontStyle],
    );
  
    return (
      <Group
        id={`rect-${rect.id}`}
        x={centerX}
        y={centerY}
        offsetX={width / 2}
        offsetY={height / 2}
        width={width}
        height={height}
        rotation={rotation}
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
            strokeWidth={1}
            strokeEnabled={!rect.gridGroupId}
            cornerRadius={0}
          />
  
          <Text
            text={fieldValue}
            width={width}
            height={height}
            align={style.textAlign}
            verticalAlign="middle"
            fontSize={fontSize}
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
          fontSize={fontSize}
          fontFamily={fontFamily}
          fill={fieldColor}
          fontStyle={fontStyle}
          listening={false}
        />

        {isMarqueePreview && !isSelected && (
          <Rect
            width={width}
            height={height}
            stroke="hsla(215, 22%, 42%, 0.85)"
            strokeWidth={1}
            dash={[4, 3]}
            cornerRadius={0}
            listening={false}
          />
        )}

        {isSelected && (
          <Rect
            width={width}
            height={height}
            fill="hsla(172, 42%, 36%, 0.1)"
            stroke="hsl(172, 42%, 36%)"
            strokeWidth={1.5}
            cornerRadius={0}
            listening={false}
          />
        )}
      </Group>
    );
  };
