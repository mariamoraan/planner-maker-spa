import { describe, expect, it } from 'vitest';
import { imageOverflowsViewport, type CanvasPanContext } from './canvas-pan';
import {
  computeWheelZoomFactor,
  isMouseWheelDelta,
  normalizeWheelDelta,
  resolveWheelAction,
  ZOOM_STEP,
} from './canvas-viewport';

const baseContext: CanvasPanContext = {
  zoom: 2,
  fitOffset: { x: 50, y: 40 },
  fitScale: 0.5,
  imageWidth: 1000,
  imageHeight: 800,
  stageWidth: 600,
  stageHeight: 500,
  padding: 16,
};

describe('normalizeWheelDelta', () => {
  it('returns pixel deltas unchanged for DOM_DELTA_PIXEL', () => {
    expect(normalizeWheelDelta(-12, 0)).toBe(-12);
  });

  it('converts line deltas to pixels', () => {
    expect(normalizeWheelDelta(3, 1)).toBe(48);
  });

  it('converts page deltas to pixels', () => {
    expect(normalizeWheelDelta(1, 2)).toBe(800);
  });
});

describe('computeWheelZoomFactor', () => {
  it('returns values greater than 1 when scrolling up (negative deltaY)', () => {
    expect(computeWheelZoomFactor(-10)).toBeGreaterThan(1);
  });

  it('returns values less than 1 when scrolling down (positive deltaY)', () => {
    expect(computeWheelZoomFactor(10)).toBeLessThan(1);
  });

  it('uses discrete steps for mouse wheel sized deltas', () => {
    expect(computeWheelZoomFactor(-120)).toBe(ZOOM_STEP);
    expect(computeWheelZoomFactor(120)).toBeCloseTo(1 / ZOOM_STEP);
  });
});

describe('isMouseWheelDelta', () => {
  it('detects large discrete wheel steps', () => {
    expect(isMouseWheelDelta(120)).toBe(true);
    expect(isMouseWheelDelta(12)).toBe(false);
  });
});

describe('imageOverflowsViewport', () => {
  it('returns false when the scaled image fits inside the viewport', () => {
    expect(
      imageOverflowsViewport({
        ...baseContext,
        zoom: 1.2,
        fitScale: 0.1,
        imageWidth: 100,
        imageHeight: 100,
        stageWidth: 600,
        stageHeight: 500,
      }),
    ).toBe(false);
  });

  it('returns true when the scaled image exceeds the viewport', () => {
    expect(imageOverflowsViewport(baseContext)).toBe(true);
  });
});

describe('resolveWheelAction', () => {
  it('returns zoom when ctrl or meta is pressed', () => {
    expect(
      resolveWheelAction(
        { ctrlKey: true, metaKey: false, deltaX: 0, deltaY: -10, deltaMode: 0 },
        baseContext,
      ),
    ).toEqual({ type: 'zoom', zoomFactor: expect.any(Number) });
  });

  it('returns pan when image overflows and there is wheel delta', () => {
    expect(
      resolveWheelAction(
        { ctrlKey: false, metaKey: false, deltaX: 5, deltaY: -12, deltaMode: 0 },
        baseContext,
      ),
    ).toEqual({ type: 'pan', deltaX: 5, deltaY: -12 });
  });

  it('returns pan only on axes that overflow the viewport', () => {
    const verticalOnly: CanvasPanContext = {
      ...baseContext,
      zoom: 2,
      fitScale: 0.5,
      imageWidth: 100,
      imageHeight: 1000,
      stageWidth: 600,
      stageHeight: 500,
      fitOffset: { x: 250, y: 16 },
    };

    expect(
      resolveWheelAction(
        { ctrlKey: false, metaKey: false, deltaX: 8, deltaY: -12, deltaMode: 0 },
        verticalOnly,
      ),
    ).toEqual({ type: 'pan', deltaX: 0, deltaY: -12 });
  });
});
