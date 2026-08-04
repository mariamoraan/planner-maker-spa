export type FieldType = 'year' | 'month' | 'day' | 'startDay' | 'endDay';

export type YearFormatVariant = 'YYYY' | 'YY';
export type MonthFormatVariant = 'numeric' | 'name';
export type DayFormatVariant = 'numeric' | 'weekdayName';

export type FormatVariant =
  | YearFormatVariant
  | MonthFormatVariant
  | DayFormatVariant;

export type FontId = 'gloria' | 'great-vibes' | 'lato';

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
