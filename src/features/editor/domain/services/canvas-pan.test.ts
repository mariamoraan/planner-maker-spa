import { describe, expect, it } from 'vitest';
import {
  canPanCanvas,
  clampCanvasPan,
  getCanvasPanBounds,
  getPanAxisRange,
  horizontalOverflows,
  type CanvasPanContext,
} from './canvas-pan';

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

describe('canPanCanvas', () => {
  it('returns false when the scaled image fits inside the viewport', () => {
    expect(canPanCanvas({ ...baseContext, zoom: 1.2, fitScale: 0.1, imageWidth: 100, imageHeight: 100 })).toBe(
      false,
    );
    expect(canPanCanvas({ ...baseContext, zoom: 1 })).toBe(false);
    expect(canPanCanvas({ ...baseContext, zoom: 0.8 })).toBe(false);
  });

  it('returns true when the scaled image overflows the viewport', () => {
    expect(canPanCanvas({ ...baseContext, zoom: 1.2 })).toBe(true);
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
    expect(clampCanvasPan({ x: 120, y: -80 }, { ...baseContext, zoom: 1 })).toEqual({ x: 0, y: 0 });
    expect(
      clampCanvasPan({ x: 120, y: -80 }, { ...baseContext, zoom: 1.2, fitScale: 0.1, imageWidth: 100, imageHeight: 100 }),
    ).toEqual({ x: 0, y: 0 });
  });

  it('clamps pan so the image cannot move beyond the viewport', () => {
    const context = { ...baseContext, zoom: 2 };
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
    const context = { ...baseContext, zoom: 2 };
    const pan = clampCanvasPan({ x: -100, y: 50 }, context);
    expect(clampCanvasPan(pan, context)).toEqual(pan);
  });

  it('allows panning from a corner zoom position to the opposite edge', () => {
    const context = { ...baseContext, zoom: 2 };
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
    const fitOffsetX = 16 + (containerWidth - imageWidth * fitScale) / 2;
    const zoom = 2.1;

    const context: CanvasPanContext = {
      zoom,
      fitOffset: { x: fitOffsetX, y: 16 },
      fitScale,
      imageWidth,
      imageHeight,
      stageWidth: containerWidth + 32,
      stageHeight: containerHeight + 32,
      padding: 16,
    };

    expect(horizontalOverflows(context)).toBe(true);

    const { minPanX, maxPanX } = getCanvasPanBounds(context);
    const panMin = clampCanvasPan({ x: Math.min(minPanX, maxPanX), y: 0 }, context);
    const panMax = clampCanvasPan({ x: Math.max(minPanX, maxPanX), y: 0 }, context);

    expect(panMin.x).not.toBe(0);
    expect(panMax.x).not.toBe(0);
    expect(panMin.x).not.toBe(panMax.x);
  });

  it('allows horizontal pan at 249% when a letterboxed page visually overflows horizontally', () => {
    const stageWidth = 1000;
    const stageHeight = 580;
    const zoom = 2.49;
    const containerWidth = stageWidth - 32;
    const containerHeight = stageHeight - 32;
    const imageWidth = 2480;
    const imageHeight = 3508;
    const fitScale = Math.min(containerWidth / imageWidth, containerHeight / imageHeight);
    const fitOffsetX = 16 + (containerWidth - imageWidth * fitScale) / 2;

    const context: CanvasPanContext = {
      zoom,
      fitOffset: { x: fitOffsetX, y: 16 },
      fitScale,
      imageWidth,
      imageHeight,
      stageWidth,
      stageHeight,
      padding: 16,
    };

    expect(horizontalOverflows(context)).toBe(true);

    const panAtZero = clampCanvasPan({ x: 0, y: 0 }, context);
    const scaledWidth = imageWidth * fitScale * zoom;
    const imageRight = fitOffsetX + panAtZero.x + scaledWidth;

    expect(panAtZero.x).not.toBe(0);
    expect(imageRight).toBeLessThanOrEqual(stageWidth - 16 + 1);
  });
});
