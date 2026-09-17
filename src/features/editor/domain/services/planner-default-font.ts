import type { FontId, Rectangle } from '@/features/template';
import { getDefaultFieldStyle } from './field-style-config';

/**
 * Blocks that still use the previous planner default (or have no font stamped)
 * follow the new general typography. Explicit per-block overrides are left alone.
 */
export function shouldFollowPlannerFont(
  rectangle: Rectangle,
  previousDefaultFontId: FontId,
): boolean {
  const fontId = rectangle.style?.fontId;
  return fontId == null || fontId === previousDefaultFontId;
}

export function applyPlannerFontToRectangle(
  rectangle: Rectangle,
  nextFontId: FontId,
): Rectangle {
  const base = getDefaultFieldStyle(nextFontId);
  return {
    ...rectangle,
    style: {
      ...base,
      ...rectangle.style,
      fontId: nextFontId,
    },
  };
}
