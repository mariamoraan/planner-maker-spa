import type { CanvasPanContext } from './canvas-pan';
import { canPanCanvas, horizontalOverflows, verticalOverflows } from './canvas-pan';

export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 4;
export const ZOOM_STEP = 1.2;

/** Trackpad pinch uses small continuous deltas. */
export const WHEEL_ZOOM_INTENSITY_TRACKPAD = 0.002;

const LINE_HEIGHT_PX = 16;
const PAGE_HEIGHT_PX = 800;

export interface WheelDelta {
  deltaX: number;
  deltaY: number;
  deltaMode: number;
}

export type WheelAction =
  | { type: 'zoom'; zoomFactor: number }
  | { type: 'pan'; deltaX: number; deltaY: number }
  | { type: 'none' };

export function normalizeWheelDelta(deltaY: number, deltaMode: number): number {
  switch (deltaMode) {
    case WheelEvent.DOM_DELTA_LINE:
      return deltaY * LINE_HEIGHT_PX;
    case WheelEvent.DOM_DELTA_PAGE:
      return deltaY * PAGE_HEIGHT_PX;
    default:
      return deltaY;
  }
}

export function isMouseWheelDelta(normalizedDeltaY: number): boolean {
  return Math.abs(normalizedDeltaY) >= 50;
}

export function computeWheelZoomFactor(normalizedDeltaY: number): number {
  if (isMouseWheelDelta(normalizedDeltaY)) {
    return normalizedDeltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
  }

  return Math.exp(-normalizedDeltaY * WHEEL_ZOOM_INTENSITY_TRACKPAD);
}

export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

export function resolveWheelAction(
  event: Pick<WheelEvent, 'ctrlKey' | 'metaKey' | 'deltaX' | 'deltaY' | 'deltaMode'>,
  context: CanvasPanContext,
): WheelAction {
  if (event.ctrlKey || event.metaKey) {
    const normalizedDeltaY = normalizeWheelDelta(event.deltaY, event.deltaMode);
    return { type: 'zoom', zoomFactor: computeWheelZoomFactor(normalizedDeltaY) };
  }

  if (!canPanCanvas(context)) {
    return { type: 'none' };
  }

  const deltaX = horizontalOverflows(context) ? event.deltaX : 0;
  const deltaY = verticalOverflows(context) ? event.deltaY : 0;

  if (deltaX === 0 && deltaY === 0) {
    return { type: 'none' };
  }

  return {
    type: 'pan',
    deltaX,
    deltaY,
  };
}
