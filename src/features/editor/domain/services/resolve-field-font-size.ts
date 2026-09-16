const FONT_SIZE_RATIO = 0.7;
const WIDTH_MARGIN = 0.9;
const MIN_FONT_SIZE = 4;

/**
 * Font size derived from box height, shrunk so single-line text fits within
 * ~90% of the box width (same margin as export fillText maxWidth).
 */
export function resolveFieldFontSize(
  width: number,
  height: number,
  text: string,
  measureWidth: (fontSize: number) => number,
): number {
  if (width <= 0 || height <= 0) return MIN_FONT_SIZE;

  let fontSize = height * FONT_SIZE_RATIO;
  if (!text) return Math.max(MIN_FONT_SIZE, fontSize);

  const maxWidth = width * WIDTH_MARGIN;
  const measured = measureWidth(fontSize);
  if (measured <= maxWidth) return Math.max(MIN_FONT_SIZE, fontSize);

  fontSize = fontSize * (maxWidth / measured);
  return Math.max(MIN_FONT_SIZE, fontSize);
}
