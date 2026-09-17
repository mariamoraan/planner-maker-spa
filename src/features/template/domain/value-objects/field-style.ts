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

export type CompositePart =
  | { kind: 'weekday'; variant: 'full' }
  | { kind: 'day'; variant: 'numeric' }
  | { kind: 'month'; variant: 'numeric' | 'name' }
  | { kind: 'year'; variant: 'YYYY' | 'YY' }
  | { kind: 'weekNumber' }
  | { kind: 'literal'; value: string };

export type FontId =
  | 'playfair'
  | 'source-serif'
  | 'dm-sans'
  | 'gloria'
  | 'great-vibes'
  | 'lato';

/** Default for new planners (Amark brand serif). */
export const DEFAULT_PLANNER_FONT_ID: FontId = 'playfair';

/** Pre-brand default stamped on older blocks without `defaultFontId`. */
export const LEGACY_DEFAULT_FONT_ID: FontId = 'gloria';

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
