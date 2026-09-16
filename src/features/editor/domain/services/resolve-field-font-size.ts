const FONT_SIZE_RATIO = 0.7;
const WIDTH_MARGIN = 0.9;
const MIN_FONT_SIZE = 4;

/**
 * Font size derived from box height (divided by line count for multiline),
 * then shrunk so the widest line fits within ~90% of the box width.
 */
export function resolveFieldFontSize(
  width: number,
  height: number,
  text: string,
  measureWidth: (fontSize: number, line: string) => number,
): number {
  if (width <= 0 || height <= 0) return MIN_FONT_SIZE;

  const lines = text.length > 0 ? text.split('\n') : [''];
  const lineCount = Math.max(1, lines.length);
  let fontSize = (height / lineCount) * FONT_SIZE_RATIO;
  if (!text) return Math.max(MIN_FONT_SIZE, fontSize);

  const maxWidth = width * WIDTH_MARGIN;
  let widest = 0;
  for (const line of lines) {
    widest = Math.max(widest, measureWidth(fontSize, line));
  }
  if (widest <= maxWidth) return Math.max(MIN_FONT_SIZE, fontSize);

  fontSize = fontSize * (maxWidth / widest);
  return Math.max(MIN_FONT_SIZE, fontSize);
}
