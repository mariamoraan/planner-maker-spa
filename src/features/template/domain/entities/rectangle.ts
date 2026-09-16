import type {
  FieldType,
  FormatVariant,
  FieldStyle,
  CompositePart,
} from '../value-objects/field-style';

export interface Rectangle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Degrees, clockwise (Konva / canvas Y-down). Omit or 0 = upright. */
  rotation?: number;
  fieldType: FieldType;
  order: number;
  formatVariant?: FormatVariant;
  style?: FieldStyle;
  compositeParts?: CompositePart[];
  gridGroupId?: string;
  gridCellIndex?: number;
}
