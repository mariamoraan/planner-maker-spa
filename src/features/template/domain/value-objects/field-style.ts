export type FieldType =
  | 'year'
  | 'month'
  | 'day'
  | 'startDay'
  | 'endDay'
  | 'weekNumber'
  | 'composite';

export type YearFormatVariant = 'YYYY' | 'YY';
export type MonthFormatVariant = 'numeric' | 'name';
export type DayFormatVariant = 'numeric' | 'weekdayName';

/** Formats for startDay/endDay. Legacy `numeric` is treated as `dayNumeric` when reading. */
export type StartEndFormatVariant =
  | 'dayNumeric'
  | 'weekdayName'
  | 'monthNumeric'
  | 'monthName'
  | 'YYYY'
  | 'YY'
  | 'numeric';

export type FormatVariant =
  | YearFormatVariant
  | MonthFormatVariant
  | DayFormatVariant
  | StartEndFormatVariant;

/** Which date a composite token reads from (default / omit = page anchor). */
export type CompositeDateSource = 'current' | 'start' | 'end';

export type CompositePart =
  | { kind: 'weekday'; variant: 'full'; source?: CompositeDateSource; id?: string }
  | { kind: 'day'; variant: 'numeric'; source?: CompositeDateSource; id?: string }
  | { kind: 'month'; variant: 'numeric' | 'name'; source?: CompositeDateSource; id?: string }
  | { kind: 'year'; variant: 'YYYY' | 'YY'; source?: CompositeDateSource; id?: string }
  | { kind: 'weekNumber'; source?: CompositeDateSource; id?: string }
  | { kind: 'linebreak'; id?: string }
  | { kind: 'literal'; value: string; id?: string };

export type BuiltInFontId =
  | 'montserrat'
  | 'poppins'
  | 'lato'
  | 'open-sans'
  | 'raleway'
  | 'roboto'
  | 'playfair'
  | 'cormorant-garamond'
  | 'lora'
  | 'quicksand'
  | 'bebas-neue'
  | 'dancing-script'
  | 'pacifico'
  | 'sacramento'
  | 'amatic-sc'
  | 'source-serif'
  | 'dm-sans'
  | 'gloria'
  | 'great-vibes';

export type CustomFontId = `custom:${string}`;

export type FontId = BuiltInFontId | CustomFontId;

const CUSTOM_FONT_ID_PREFIX = 'custom:' as const;

export function isCustomFontId(fontId: string): fontId is CustomFontId {
  return fontId.startsWith(CUSTOM_FONT_ID_PREFIX) && fontId.length > CUSTOM_FONT_ID_PREFIX.length;
}

export function toCustomFontId(familyId: string): CustomFontId {
  if (isCustomFontId(familyId)) return familyId;
  return `${CUSTOM_FONT_ID_PREFIX}${familyId}`;
}

export function parseCustomFontId(fontId: CustomFontId): string {
  return fontId.slice(CUSTOM_FONT_ID_PREFIX.length);
}

/** Default for new planners and new blocks. */
export const DEFAULT_PLANNER_FONT_ID: BuiltInFontId = 'montserrat';

/** Pre-brand default stamped on older blocks without `defaultFontId`. */
export const LEGACY_DEFAULT_FONT_ID: BuiltInFontId = 'gloria';

export type TextCase = 'default' | 'uppercase' | 'lowercase' | 'capitalize';

export type TextAlign = 'left' | 'center' | 'right';

export interface FieldStyle {
  color: string;
  fontId: FontId;
  bold: boolean;
  italic: boolean;
  textCase: TextCase;
  textAlign: TextAlign;
}
