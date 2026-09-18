import type {
  FieldStyle,
  FieldType,
  FontId,
  FormatVariant,
  Rectangle,
  TextAlign,
  TextCase,
  YearFormatVariant,
  MonthFormatVariant,
  DayFormatVariant,
  StartEndFormatVariant,
} from '@/features/template'
import {
  DEFAULT_PLANNER_FONT_ID,
  LEGACY_DEFAULT_FONT_ID,
  isCustomFontId,
  parseCustomFontId,
} from '@/features/template'
import { cssFamilyNameForCustomFont } from '@/features/fonts/domain/entities/custom-font-family';

export const MAIN_COLOR = '#1f2a3d';
export const SECONDARY_COLOR = '#929599';

export interface FontOption {
  id: FontId;
  label: string;
  family: string;
}

export interface ColorPreset {
  id: string;
  label: string;
  value: string;
}

export interface FormatOption {
  id: FormatVariant;
  label: string;
  preview: string;
}

export interface TextCaseOption {
  id: TextCase;
  label: string;
  preview: string;
}

export interface TextAlignOption {
  id: TextAlign;
  label: string;
}

export const TEXT_CASE_REGISTRY: readonly TextCaseOption[] = [
  { id: 'default', label: 'Original', preview: 'Ab' },
  { id: 'capitalize', label: 'Capitalizado', preview: 'Aa' },
  { id: 'uppercase', label: 'Mayúsculas', preview: 'AA' },
  { id: 'lowercase', label: 'Minúsculas', preview: 'aa' },
] as const;

export const TEXT_ALIGN_REGISTRY: readonly TextAlignOption[] = [
  { id: 'left', label: 'Izquierda' },
  { id: 'center', label: 'Centro' },
  { id: 'right', label: 'Derecha' },
] as const;

export const FONT_REGISTRY: readonly FontOption[] = [
  { id: 'montserrat', label: 'Montserrat', family: 'Montserrat' },
  { id: 'poppins', label: 'Poppins', family: 'Poppins' },
  { id: 'lato', label: 'Lato', family: 'Lato' },
  { id: 'open-sans', label: 'Open Sans', family: 'Open Sans' },
  { id: 'raleway', label: 'Raleway', family: 'Raleway' },
  { id: 'roboto', label: 'Roboto', family: 'Roboto' },
  { id: 'playfair', label: 'Playfair Display', family: 'Playfair Display' },
  { id: 'cormorant-garamond', label: 'Cormorant Garamond', family: 'Cormorant Garamond' },
  { id: 'lora', label: 'Lora', family: 'Lora' },
  { id: 'quicksand', label: 'Quicksand', family: 'Quicksand' },
  { id: 'bebas-neue', label: 'Bebas Neue', family: 'Bebas Neue' },
  { id: 'dancing-script', label: 'Dancing Script', family: 'Dancing Script' },
  { id: 'pacifico', label: 'Pacifico', family: 'Pacifico' },
  { id: 'sacramento', label: 'Sacramento', family: 'Sacramento' },
  { id: 'amatic-sc', label: 'Amatic SC', family: 'Amatic SC' },
  { id: 'source-serif', label: 'Source Serif', family: 'Source Serif 4' },
  { id: 'dm-sans', label: 'DM Sans', family: 'DM Sans' },
  { id: 'gloria', label: 'Gloria', family: 'Gloria Hallelujah' },
  { id: 'great-vibes', label: 'Great Vibes', family: 'Great Vibes' },
] as const;

export const COLOR_PRESET_REGISTRY: readonly ColorPreset[] = [
  { id: 'black', label: 'Negro', value: MAIN_COLOR },
  { id: 'gray', label: 'Gris', value: SECONDARY_COLOR },
  { id: 'white', label: 'Blanco', value: '#ffffff' },
] as const;

const YEAR_FORMAT_OPTIONS: readonly FormatOption[] = [
  { id: 'YYYY', label: '4 dígitos', preview: '2026' },
  { id: 'YY', label: '2 dígitos', preview: '26' },
] as const;

const MONTH_FORMAT_OPTIONS: readonly FormatOption[] = [
  { id: 'numeric', label: 'Número', preview: '5' },
  { id: 'name', label: 'Texto', preview: 'mayo' },
] as const;

const DAY_FORMAT_OPTIONS: readonly FormatOption[] = [
  { id: 'numeric', label: 'Número', preview: '15' },
  { id: 'weekdayName', label: 'Texto', preview: 'jueves' },
] as const;

const START_END_FORMAT_OPTIONS: readonly FormatOption[] = [
  { id: 'dayNumeric', label: 'Día nº', preview: '15' },
  { id: 'weekdayName', label: 'Día texto', preview: 'jueves' },
  { id: 'monthNumeric', label: 'Mes nº', preview: '5' },
  { id: 'monthName', label: 'Mes texto', preview: 'mayo' },
  { id: 'YYYY', label: 'Año 4', preview: '2026' },
  { id: 'YY', label: 'Año 2', preview: '26' },
] as const;

/** Date-part choice for startDay/endDay (format popover section 1). */
export type StartEndDatePart = 'day' | 'month' | 'year';

export const START_END_DATE_PART_OPTIONS: readonly { id: StartEndDatePart; label: string }[] = [
  { id: 'day', label: 'Día' },
  { id: 'month', label: 'Mes' },
  { id: 'year', label: 'Año' },
] as const;

const START_END_DAY_FORMAT_OPTIONS: readonly FormatOption[] = [
  { id: 'dayNumeric', label: 'Número', preview: '15' },
  { id: 'weekdayName', label: 'Texto', preview: 'jueves' },
] as const;

const START_END_MONTH_FORMAT_OPTIONS: readonly FormatOption[] = [
  { id: 'monthNumeric', label: 'Número', preview: '5' },
  { id: 'monthName', label: 'Texto', preview: 'mayo' },
] as const;

export function getStartEndDatePart(variant: FormatVariant): StartEndDatePart {
  const normalized = normalizeStartEndFormatVariant(variant);
  if (normalized === 'dayNumeric' || normalized === 'weekdayName') return 'day';
  if (normalized === 'monthNumeric' || normalized === 'monthName') return 'month';
  return 'year';
}

export function getDefaultStartEndVariantForPart(
  part: StartEndDatePart,
): Exclude<StartEndFormatVariant, 'numeric'> {
  switch (part) {
    case 'day':
      return 'dayNumeric';
    case 'month':
      return 'monthName';
    case 'year':
      return 'YYYY';
  }
}

export function getStartEndFormatOptionsForPart(part: StartEndDatePart): readonly FormatOption[] {
  switch (part) {
    case 'day':
      return START_END_DAY_FORMAT_OPTIONS;
    case 'month':
      return START_END_MONTH_FORMAT_OPTIONS;
    case 'year':
      return YEAR_FORMAT_OPTIONS;
  }
}

export function getStartEndPartLabel(part: StartEndDatePart): string {
  return START_END_DATE_PART_OPTIONS.find(option => option.id === part)?.label ?? 'Día';
}

export const FIELD_FORMAT_REGISTRY: Record<FieldType, readonly FormatOption[]> = {
  year: YEAR_FORMAT_OPTIONS,
  month: MONTH_FORMAT_OPTIONS,
  day: DAY_FORMAT_OPTIONS,
  startDay: START_END_FORMAT_OPTIONS,
  endDay: START_END_FORMAT_OPTIONS,
  weekNumber: [],
  composite: [],
};

const DEFAULT_FORMAT_BY_FIELD_TYPE: Record<FieldType, FormatVariant> = {
  year: 'YYYY',
  month: 'name',
  day: 'numeric',
  startDay: 'dayNumeric',
  endDay: 'dayNumeric',
  weekNumber: 'numeric',
  composite: 'numeric',
};

export function getDefaultFormatVariant(fieldType: FieldType): FormatVariant {
  return DEFAULT_FORMAT_BY_FIELD_TYPE[fieldType];
}

export function getDefaultFieldStyle(fontId: FontId = DEFAULT_PLANNER_FONT_ID): FieldStyle {
  return {
    color: MAIN_COLOR,
    fontId,
    bold: false,
    italic: false,
    textCase: 'capitalize',
    textAlign: 'center',
  };
}

export function resolvePlannerDefaultFontId(
  defaultFontId: FontId | undefined,
): FontId {
  return defaultFontId ?? LEGACY_DEFAULT_FONT_ID;
}

export function normalizeStartEndFormatVariant(
  variant: FormatVariant,
): Exclude<StartEndFormatVariant, 'numeric'> {
  if (variant === 'numeric') return 'dayNumeric';
  if (variant === 'name') return 'monthName';
  if (
    variant === 'dayNumeric' ||
    variant === 'weekdayName' ||
    variant === 'monthNumeric' ||
    variant === 'monthName' ||
    variant === 'YYYY' ||
    variant === 'YY'
  ) {
    return variant;
  }
  return 'dayNumeric';
}

export function getFormatVariant(rectangle: Rectangle): FormatVariant {
  const raw = rectangle.formatVariant ?? getDefaultFormatVariant(rectangle.fieldType);
  if (rectangle.fieldType === 'startDay' || rectangle.fieldType === 'endDay') {
    return normalizeStartEndFormatVariant(raw);
  }
  return raw;
}

export function resolveFieldStyle(
  rectangle: Rectangle,
  plannerDefaultFontId: FontId = DEFAULT_PLANNER_FONT_ID,
): FieldStyle {
  return {
    ...getDefaultFieldStyle(plannerDefaultFontId),
    ...rectangle.style,
  };
}

export function resolveFontFamily(fontId: FontId): string {
  if (isCustomFontId(fontId)) {
    return cssFamilyNameForCustomFont(parseCustomFontId(fontId));
  }
  const font = FONT_REGISTRY.find(f => f.id === fontId);
  return font?.family ?? FONT_REGISTRY[0].family;
}

export function isValidHexColor(value: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value);
}

export const MAX_CUSTOM_COLORS = 20;

/** Expand `#rgb` → `#rrggbb` and lowercase. Returns null if invalid. */
export function normalizeHexColor(value: string): string | null {
  const trimmed = value.trim();
  if (!isValidHexColor(trimmed)) return null;
  const hex = trimmed.slice(1).toLowerCase();
  if (hex.length === 3) {
    return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
  }
  return `#${hex}`;
}

export function isColorPresetValue(value: string): boolean {
  const normalized = normalizeHexColor(value);
  if (!normalized) return false;
  return COLOR_PRESET_REGISTRY.some(
    preset => normalizeHexColor(preset.value) === normalized,
  );
}

/** Prepend color (skip presets), dedupe, keep most recent first, cap at max. */
export function upsertCustomColor(
  existing: string[],
  color: string,
  max: number = MAX_CUSTOM_COLORS,
): string[] {
  const normalized = normalizeHexColor(color);
  if (!normalized || isColorPresetValue(normalized)) return existing;
  const without = existing.filter(c => normalizeHexColor(c) !== normalized);
  return [normalized, ...without].slice(0, max);
}

export function isYearFormatVariant(value: FormatVariant): value is YearFormatVariant {
  return value === 'YYYY' || value === 'YY';
}

export function isMonthFormatVariant(value: FormatVariant): value is MonthFormatVariant {
  return value === 'numeric' || value === 'name';
}

export function isDayFormatVariant(value: FormatVariant): value is DayFormatVariant {
  return value === 'numeric' || value === 'weekdayName';
}

export function buildKonvaFontStyle(style: FieldStyle): string {
  const parts: string[] = [];
  if (style.italic) parts.push('italic');
  if (style.bold) parts.push('bold');
  return parts.length > 0 ? parts.join(' ') : 'normal';
}

export function buildCanvasFont(style: FieldStyle, fontSize: number): string {
  const fontStyle = style.italic ? 'italic' : 'normal';
  const fontWeight = style.bold ? 'bold' : 'normal';
  const family = resolveFontFamily(style.fontId);
  return `${fontStyle} ${fontWeight} ${fontSize}px "${family}", system-ui, -apple-system, sans-serif`;
}

export function resolveCanvasTextX(x: number, width: number, textAlign: TextAlign): number {
  const padding = width * 0.05;
  switch (textAlign) {
    case 'left':
      return x + padding;
    case 'right':
      return x + width - padding;
    case 'center':
    default:
      return x + width / 2;
  }
}

/**
 * Alphabetic baseline Y matching Konva's non-legacy verticalAlign="middle"
 * (fontBoundingBox metrics, same as measureSize('M')).
 */
export function resolveCanvasTextY(
  y: number,
  height: number,
  metrics: Pick<
    TextMetrics,
    | 'fontBoundingBoxAscent'
    | 'fontBoundingBoxDescent'
    | 'actualBoundingBoxAscent'
    | 'actualBoundingBoxDescent'
  >,
): number {
  const ascent = metrics.fontBoundingBoxAscent ?? metrics.actualBoundingBoxAscent ?? 0;
  const descent = metrics.fontBoundingBoxDescent ?? metrics.actualBoundingBoxDescent ?? 0;
  return y + height / 2 + (ascent - descent) / 2;
}

function capitalizeWord(word: string, locale = 'es'): string {
  if (!word) return word;
  return word.charAt(0).toLocaleUpperCase(locale) + word.slice(1).toLocaleLowerCase(locale);
}

function applyTextCaseToLine(line: string, textCase: TextCase, locale = 'es'): string {
  switch (textCase) {
    case 'uppercase':
      return line.toLocaleUpperCase(locale);
    case 'lowercase':
      return line.toLocaleLowerCase(locale);
    case 'capitalize':
      return line
        .split(/\s+/)
        .filter(Boolean)
        .map(word => capitalizeWord(word, locale))
        .join(' ');
    default:
      return line;
  }
}

export function applyTextCase(value: string, textCase: TextCase, locale = 'es'): string {
  if (!value.includes('\n')) {
    return applyTextCaseToLine(value, textCase, locale);
  }
  return value
    .split('\n')
    .map(line => applyTextCaseToLine(line, textCase, locale))
    .join('\n');
}

export function formatFieldValue(value: string, style: FieldStyle, locale = 'es'): string {
  return applyTextCase(value, style.textCase, locale);
}
