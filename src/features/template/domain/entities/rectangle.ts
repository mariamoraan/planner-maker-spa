import type { FieldType, FormatVariant, FieldStyle } from '../value-objects/field-style';

export interface Rectangle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fieldType: FieldType;
  order: number;
  formatVariant?: FormatVariant;
  style?: FieldStyle;
  gridGroupId?: string;
  gridCellIndex?: number;
}
