export interface CanvasPanContext {
  zoom: number;
  fitOffset: { x: number; y: number };
  fitScale: number;
  imageWidth: number;
  imageHeight: number;
  stageWidth: number;
  stageHeight: number;
  padding: number;
}

export function canPanCanvas(context: CanvasPanContext): boolean {
  return context.zoom > 1 && context.imageWidth > 0 && context.imageHeight > 0;
}

function clampAxis(value: number, min: number, max: number): number {
  if (min > max) return 0;
  return Math.min(max, Math.max(min, value));
}

export function clampCanvasPan(
  pan: { x: number; y: number },
  context: CanvasPanContext,
): { x: number; y: number } {
  if (!canPanCanvas(context)) {
    return { x: 0, y: 0 };
  }

  const scale = context.fitScale * context.zoom;
  const imageWidth = context.imageWidth * scale;
  const imageHeight = context.imageHeight * scale;

  const viewLeft = context.padding;
  const viewTop = context.padding;
  const viewRight = context.stageWidth - context.padding;
  const viewBottom = context.stageHeight - context.padding;

  const minPanX = viewRight - context.fitOffset.x - imageWidth;
  const maxPanX = viewLeft - context.fitOffset.x;
  const minPanY = viewBottom - context.fitOffset.y - imageHeight;
  const maxPanY = viewTop - context.fitOffset.y;

  return {
    x: clampAxis(pan.x, minPanX, maxPanX),
    y: clampAxis(pan.y, minPanY, maxPanY),
  };
}
