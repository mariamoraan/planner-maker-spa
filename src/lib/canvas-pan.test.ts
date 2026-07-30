import { describe, expect, it } from 'vitest';
import { canPanCanvas, clampCanvasPan, type CanvasPanContext } from './canvas-pan';

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
  it('returns false at or below 100% zoom', () => {
    expect(canPanCanvas({ ...baseContext, zoom: 1 })).toBe(false);
    expect(canPanCanvas({ ...baseContext, zoom: 0.8 })).toBe(false);
  });

  it('returns true above 100% zoom', () => {
    expect(canPanCanvas({ ...baseContext, zoom: 1.01 })).toBe(true);
  });
});

describe('clampCanvasPan', () => {
  it('forces pan to zero when zoom is 100% or less', () => {
    expect(clampCanvasPan({ x: 120, y: -80 }, { ...baseContext, zoom: 1 })).toEqual({ x: 0, y: 0 });
    expect(clampCanvasPan({ x: 120, y: -80 }, { ...baseContext, zoom: 0.8 })).toEqual({ x: 0, y: 0 });
  });

  it('clamps pan so the image cannot move beyond the viewport', () => {
    const context = { ...baseContext, zoom: 2 };
    const scale = context.fitScale * context.zoom;
    const imageWidth = context.imageWidth * scale;
    const imageHeight = context.imageHeight * scale;

    const minPanX = 600 - 16 - context.fitOffset.x - imageWidth;
    const maxPanX = 16 - context.fitOffset.x;
    const minPanY = 500 - 16 - context.fitOffset.y - imageHeight;
    const maxPanY = 16 - context.fitOffset.y;

    expect(clampCanvasPan({ x: 9999, y: 9999 }, context)).toEqual({
      x: maxPanX,
      y: maxPanY,
    });
    expect(clampCanvasPan({ x: -9999, y: -9999 }, context)).toEqual({
      x: minPanX,
      y: minPanY,
    });
  });

  it('keeps valid pan values unchanged', () => {
    const context = { ...baseContext, zoom: 2 };
    const pan = clampCanvasPan({ x: -100, y: 50 }, context);
    expect(clampCanvasPan(pan, context)).toEqual(pan);
  });
});
