import type {
  FieldStyle,
  FieldType,
  FontId,
  FormatVariant,
  Rectangle,
  TextCase,
  YearFormatVariant,
  MonthFormatVariant,
  DayFormatVariant,
} from '@/types/planner';

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

export const TEXT_CASE_REGISTRY: readonly TextCaseOption[] = [
  { id: 'default', label: 'Original', preview: 'Ab' },
  { id: 'capitalize', label: 'Capitalizado', preview: 'Aa' },
  { id: 'uppercase', label: 'Mayúsculas', preview: 'AA' },
  { id: 'lowercase', label: 'Minúsculas', preview: 'aa' },
] as const;

export const FONT_REGISTRY: readonly FontOption[] = [
  { id: 'gloria', label: 'Gloria', family: 'Gloria Hallelujah' },
  { id: 'great-vibes', label: 'Great Vibes', family: 'Great Vibes' },
  { id: 'lato', label: 'Lato', family: 'Lato' },
] as const;

export const COLOR_PRESET_REGISTRY: readonly ColorPreset[] = [
  { id: 'black', label: 'Negro', value: MAIN_COLOR },
  { id: 'gray', label: 'Gris', value: SECONDARY_COLOR },
  { id: 'white', label: 'Blanco', value: '#ffffff' },
] as const;

const YEAR_FORMAT_OPTIONS: readonly FormatOption[] = [
  { id: 'YYYY', label: '2026', preview: '2026' },
  { id: 'YY', label: '26', preview: '26' },
] as const;

const MONTH_FORMAT_OPTIONS: readonly FormatOption[] = [
  { id: 'numeric', label: '5', preview: '5' },
  { id: 'name', label: 'mayo', preview: 'mayo' },
] as const;

const DAY_FORMAT_OPTIONS: readonly FormatOption[] = [
  { id: 'numeric', label: '15', preview: '15' },
  { id: 'weekdayName', label: 'jueves', preview: 'jueves' },
] as const;

export const FIELD_FORMAT_REGISTRY: Record<FieldType, readonly FormatOption[]> = {
  year: YEAR_FORMAT_OPTIONS,
  month: MONTH_FORMAT_OPTIONS,
  day: DAY_FORMAT_OPTIONS,
  startDay: DAY_FORMAT_OPTIONS,
  endDay: DAY_FORMAT_OPTIONS,
};

const DEFAULT_FORMAT_BY_FIELD_TYPE: Record<FieldType, FormatVariant> = {
  year: 'YYYY',
  month: 'name',
  day: 'numeric',
  startDay: 'numeric',
  endDay: 'numeric',
};

export function getDefaultFormatVariant(fieldType: FieldType): FormatVariant {
  return DEFAULT_FORMAT_BY_FIELD_TYPE[fieldType];
}

export function getDefaultFieldStyle(): FieldStyle {
  return {
    color: MAIN_COLOR,
    fontId: 'gloria',
    bold: false,
    italic: false,
    textCase: 'capitalize',
  };
}

export function getFormatVariant(rectangle: Rectangle): FormatVariant {
  if (rectangle.formatVariant) {
    return rectangle.formatVariant;
  }
  return getDefaultFormatVariant(rectangle.fieldType);
}

export function resolveFieldStyle(rectangle: Rectangle): FieldStyle {
  return {
    ...getDefaultFieldStyle(),
    ...rectangle.style,
  };
}

export function resolveFontFamily(fontId: FontId): string {
  const font = FONT_REGISTRY.find(f => f.id === fontId);
  return font?.family ?? FONT_REGISTRY[0].family;
}

export function isValidHexColor(value: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value);
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

function capitalizeWord(word: string, locale = 'es'): string {
  if (!word) return word;
  return word.charAt(0).toLocaleUpperCase(locale) + word.slice(1).toLocaleLowerCase(locale);
}

export function applyTextCase(value: string, textCase: TextCase, locale = 'es'): string {
  switch (textCase) {
    case 'uppercase':
      return value.toLocaleUpperCase(locale);
    case 'lowercase':
      return value.toLocaleLowerCase(locale);
    case 'capitalize':
      return value
        .split(/\s+/)
        .filter(Boolean)
        .map(word => capitalizeWord(word, locale))
        .join(' ');
    default:
      return value;
  }
}

export function formatFieldValue(value: string, style: FieldStyle, locale = 'es'): string {
  return applyTextCase(value, style.textCase, locale);
}
