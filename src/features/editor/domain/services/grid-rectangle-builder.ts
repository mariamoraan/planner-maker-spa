import type { FieldType, FormatVariant, Rectangle } from '@/features/template';
import { getDefaultFieldStyle, getDefaultFormatVariant } from './field-style-config';
import { layoutGridRectangles, type GridLayoutConfig } from './grid-layout';

export function buildGridRectangles(
  config: GridLayoutConfig,
  fieldType: FieldType,
  baseOrder: number,
  formatVariant?: FormatVariant,
): Omit<Rectangle, 'id'>[] {
  const count = config.cols * config.rows;
  const variant = formatVariant ?? getDefaultFormatVariant(fieldType);
  const style = getDefaultFieldStyle();

  return layoutGridRectangles(count, config, (index, { x, y }) => ({
    x,
    y,
    width: config.rectSize.width,
    height: config.rectSize.height,
    fieldType,
    order: baseOrder + index,
    formatVariant: variant,
    style,
  }));
}
