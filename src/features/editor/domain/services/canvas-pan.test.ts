import { describe, expect, it } from 'vitest';
import {
  canPanCanvas,
  clampCanvasPan,
  computeCenteredFitOffset,
  getCanvasPanBounds,
  getPanAxisRange,
  horizontalOverflows,
  type CanvasPanContext,
} from './canvas-pan';

function contextWithCenteredOffset(
  partial: Omit<CanvasPanContext, 'fitOffset'>,
): CanvasPanContext {
  return {
    ...partial,
    fitOffset: computeCenteredFitOffset(partial),
  };
}

const baseParams = {
  zoom: 2,
  fitScale: 0.5,
  imageWidth: 1000,
  imageHeight: 800,
  stageWidth: 600,
  stageHeight: 500,
  padding: 16,
} as const;

const baseContext: CanvasPanContext = contextWithCenteredOffset(baseParams);

describe('computeCenteredFitOffset', () => {
  it('centers the scaled image in the stage at the current zoom', () => {
    const offset = computeCenteredFitOffset(baseParams);

    // scaled size = 1000*0.5*2 x 800*0.5*2 = 1000 x 800
    expect(offset).toEqual({
      x: 16 + (600 - 32 - 1000) / 2,
      y: 16 + (500 - 32 - 800) / 2,
    });
  });

  it('keeps pan=0 centered when zoom changes', () => {
    const atZoom1 = computeCenteredFitOffset({ ...baseParams, zoom: 1 });
    const atZoom2 = computeCenteredFitOffset({ ...baseParams, zoom: 2 });

    const centerX = (offset: { x: number }, scaledWidth: number) => offset.x + scaledWidth / 2;
    expect(centerX(atZoom1, 500)).toBeCloseTo(300);
    expect(centerX(atZoom2, 1000)).toBeCloseTo(300);
  });
});

describe('canPanCanvas', () => {
  it('returns false when the scaled image fits inside the viewport', () => {
    expect(
      canPanCanvas(
        contextWithCenteredOffset({
          zoom: 1.2,
          fitScale: 0.1,
          imageWidth: 100,
          imageHeight: 100,
          stageWidth: 600,
          stageHeight: 500,
          padding: 16,
        }),
      ),
    ).toBe(false);
    expect(canPanCanvas(contextWithCenteredOffset({ ...baseParams, zoom: 1 }))).toBe(false);
    expect(canPanCanvas(contextWithCenteredOffset({ ...baseParams, zoom: 0.8 }))).toBe(false);
  });

  it('returns true when the scaled image overflows the viewport', () => {
    expect(canPanCanvas(contextWithCenteredOffset({ ...baseParams, zoom: 1.2 }))).toBe(true);
    expect(canPanCanvas(baseContext)).toBe(true);
  });
});

describe('getCanvasPanBounds', () => {
  it('exposes pan limits that allow reaching opposite edges', () => {
    const bounds = getCanvasPanBounds(baseContext);
    const scale = baseContext.fitScale * baseContext.zoom;
    const imageWidth = baseContext.imageWidth * scale;
    const imageHeight = baseContext.imageHeight * scale;

    expect(bounds.minPanX).toBe(600 - 16 - baseContext.fitOffset.x - imageWidth - 12);
    expect(bounds.maxPanX).toBe(16 - baseContext.fitOffset.x);
    expect(bounds.minPanY).toBe(500 - 16 - baseContext.fitOffset.y - imageHeight - 12);
    expect(bounds.maxPanY).toBe(16 - baseContext.fitOffset.y);
  });
});

describe('clampCanvasPan', () => {
  it('forces pan to zero when the image fits in the viewport', () => {
    expect(
      clampCanvasPan({ x: 120, y: -80 }, contextWithCenteredOffset({ ...baseParams, zoom: 1 })),
    ).toEqual({ x: 0, y: 0 });
    expect(
      clampCanvasPan(
        { x: 120, y: -80 },
        contextWithCenteredOffset({
          zoom: 1.2,
          fitScale: 0.1,
          imageWidth: 100,
          imageHeight: 100,
          stageWidth: 600,
          stageHeight: 500,
          padding: 16,
        }),
      ),
    ).toEqual({ x: 0, y: 0 });
  });

  it('clamps pan so the image cannot move beyond the viewport', () => {
    const context = baseContext;
    const { minPanX, maxPanX, minPanY, maxPanY } = getCanvasPanBounds(context);
    const panXRange = getPanAxisRange(minPanX, maxPanX);
    const panYRange = getPanAxisRange(minPanY, maxPanY);

    expect(clampCanvasPan({ x: 9999, y: 9999 }, context)).toEqual({
      x: panXRange.high,
      y: panYRange.high,
    });
    expect(clampCanvasPan({ x: -9999, y: -9999 }, context)).toEqual({
      x: panXRange.low,
      y: panYRange.low,
    });
  });

  it('keeps valid pan values unchanged', () => {
    const context = baseContext;
    const pan = clampCanvasPan({ x: -100, y: 50 }, context);
    expect(clampCanvasPan(pan, context)).toEqual(pan);
  });

  it('allows panning from a corner zoom position to the opposite edge', () => {
    const context = baseContext;
    const { minPanX, minPanY } = getCanvasPanBounds(context);
    const cornerPan = clampCanvasPan({ x: minPanX + 10, y: minPanY + 10 }, context);

    expect(clampCanvasPan({ x: cornerPan.x, y: cornerPan.y }, context)).toEqual(cornerPan);
  });

  it('allows horizontal pan when the page is letterboxed vertically (A4 portrait)', () => {
    const containerWidth = 668;
    const containerHeight = 468;
    const imageWidth = 2480;
    const imageHeight = 3508;
    const fitScale = containerHeight / imageHeight;
    const zoom = 2.1;

    const context = contextWithCenteredOffset({
      zoom,
      fitScale,
      imageWidth,
      imageHeight,
      stageWidth: containerWidth + 32,
      stageHeight: containerHeight + 32,
      padding: 16,
    });

    expect(horizontalOverflows(context)).toBe(true);

    const { minPanX, maxPanX } = getCanvasPanBounds(context);
    const panMin = clampCanvasPan({ x: Math.min(minPanX, maxPanX), y: 0 }, context);
    const panMax = clampCanvasPan({ x: Math.max(minPanX, maxPanX), y: 0 }, context);

    expect(panMin.x).not.toBe(0);
    expect(panMax.x).not.toBe(0);
    expect(panMin.x).not.toBe(panMax.x);
  });

  it('keeps pan at zero centered when a letterboxed page overflows horizontally', () => {
    const stageWidth = 1000;
    const stageHeight = 580;
    const zoom = 3;
    const containerWidth = stageWidth - 32;
    const containerHeight = stageHeight - 32;
    const imageWidth = 2480;
    const imageHeight = 3508;
    const fitScale = Math.min(containerWidth / imageWidth, containerHeight / imageHeight);

    const context = contextWithCenteredOffset({
      zoom,
      fitScale,
      imageWidth,
      imageHeight,
      stageWidth,
      stageHeight,
      padding: 16,
    });

    expect(horizontalOverflows(context)).toBe(true);

    const panAtZero = clampCanvasPan({ x: 0, y: 0 }, context);
    const scaledWidth = imageWidth * fitScale * zoom;
    const imageLeft = context.fitOffset.x + panAtZero.x;
    const imageRight = imageLeft + scaledWidth;

    expect(panAtZero).toEqual({ x: 0, y: 0 });
    expect(imageLeft).toBeLessThan(16);
    expect(imageRight).toBeGreaterThan(stageWidth - 16);
    expect((imageLeft + imageRight) / 2).toBeCloseTo(stageWidth / 2);
  });
});
