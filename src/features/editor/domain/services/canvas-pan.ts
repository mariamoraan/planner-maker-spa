/** Matches KonvaImage shadowBlur in TemplateCanvas — used for pan edge padding. */
export const CANVAS_IMAGE_SHADOW_BLUR = 12;

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

export interface CanvasPanBounds {
  minPanX: number;
  maxPanX: number;
  minPanY: number;
  maxPanY: number;
}

export interface PanAxisRange {
  low: number;
  high: number;
  hasRange: boolean;
}

function getViewSize(context: CanvasPanContext): { width: number; height: number } {
  return {
    width: context.stageWidth - context.padding * 2,
    height: context.stageHeight - context.padding * 2,
  };
}

function getScaledImageSize(context: CanvasPanContext): { width: number; height: number } {
  const scale = context.fitScale * context.zoom;
  return {
    width: context.imageWidth * scale,
    height: context.imageHeight * scale,
  };
}

const PAN_EDGE_EPSILON = 0.5;

export function getPanAxisRange(boundA: number, boundB: number): PanAxisRange {
  const low = Math.min(boundA, boundB);
  const high = Math.max(boundA, boundB);
  return { low, high, hasRange: boundA < boundB };
}

function axisOverflowsFromBounds(
  context: CanvasPanContext,
  axis: 'x' | 'y',
): boolean {
  const raw = getRawCanvasPanBounds(context);
  const { width: scaledWidth, height: scaledHeight } = getScaledImageSize(context);
  const viewLeft = context.padding;
  const viewTop = context.padding;
  const viewRight = context.stageWidth - context.padding;
  const viewBottom = context.stageHeight - context.padding;

  if (axis === 'x') {
    const { minPanX, maxPanX } = raw;
    if (minPanX < maxPanX) return true;

    const left = context.fitOffset.x;
    const right = left + scaledWidth;
    return right > viewRight + PAN_EDGE_EPSILON || left < viewLeft - PAN_EDGE_EPSILON;
  }

  const { minPanY, maxPanY } = raw;
  if (minPanY < maxPanY) return true;

  const top = context.fitOffset.y;
  const bottom = top + scaledHeight;
  return bottom > viewBottom + PAN_EDGE_EPSILON || top < viewTop - PAN_EDGE_EPSILON;
}

export function horizontalOverflows(context: CanvasPanContext): boolean {
  if (context.imageWidth <= 0) return false;
  return axisOverflowsFromBounds(context, 'x');
}

export function verticalOverflows(context: CanvasPanContext): boolean {
  if (context.imageHeight <= 0) return false;
  return axisOverflowsFromBounds(context, 'y');
}

export function imageOverflowsViewport(context: CanvasPanContext): boolean {
  return horizontalOverflows(context) || verticalOverflows(context);
}

export function canPanCanvas(context: CanvasPanContext): boolean {
  return imageOverflowsViewport(context);
}

function clampAxis(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getRawCanvasPanBounds(context: CanvasPanContext): CanvasPanBounds {
  const { width: imageWidth, height: imageHeight } = getScaledImageSize(context);

  const viewLeft = context.padding;
  const viewTop = context.padding;
  const viewRight = context.stageWidth - context.padding;
  const viewBottom = context.stageHeight - context.padding;

  return {
    minPanX: viewRight - context.fitOffset.x - imageWidth,
    maxPanX: viewLeft - context.fitOffset.x,
    minPanY: viewBottom - context.fitOffset.y - imageHeight,
    maxPanY: viewTop - context.fitOffset.y,
  };
}

export function getCanvasPanBounds(context: CanvasPanContext): CanvasPanBounds {
  const raw = getRawCanvasPanBounds(context);
  const shadow = CANVAS_IMAGE_SHADOW_BLUR;

  return {
    minPanX: raw.minPanX - shadow,
    maxPanX: raw.maxPanX,
    minPanY: raw.minPanY - shadow,
    maxPanY: raw.maxPanY,
  };
}

function clampPanAxis(
  value: number,
  boundA: number,
  boundB: number,
  overflows: boolean,
): number {
  if (!overflows) return 0;
  const { low, high } = getPanAxisRange(boundA, boundB);
  return clampAxis(value, low, high);
}

export function clampCanvasPan(
  pan: { x: number; y: number },
  context: CanvasPanContext,
): { x: number; y: number } {
  if (!canPanCanvas(context)) {
    return { x: 0, y: 0 };
  }

  const { minPanX, maxPanX, minPanY, maxPanY } = getCanvasPanBounds(context);

  return {
    x: clampPanAxis(pan.x, minPanX, maxPanX, horizontalOverflows(context)),
    y: clampPanAxis(pan.y, minPanY, maxPanY, verticalOverflows(context)),
  };
}
