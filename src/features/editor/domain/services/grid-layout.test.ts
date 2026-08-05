import { describe, it, expect } from 'vitest';
import {
  boundsFromRectangles,
  boundsFromRectanglesWithPadding,
  boundsFromGap,
  boundsFromPitch,
  cellOrigin,
  clampGridPadding,
  clampGridRectSize,
  defaultGridBounds,
  detectGridMeasureAxis,
  expandGridRectIds,
  gapFromPitch,
  gridBoundsFromAnchorBlock,
  gridConfigFromBounds,
  gridDimensionLabels,
  gridLinePositions,
  gridPositionsFromConfig,
  inferGridDimensionsFromCount,
  inferGridFromRectangles,
  inferPaddingFromRects,
  inferPitchFromRectangles,
  layoutGridRectangles,
  orderRectIdsRowMajor,
  pitchFromBounds,
  redistributeGridMoves,
  resizeGridBounds,
  resizeGridPitch,
  translateGridBounds,
  type GridLayoutConfig,
} from './grid-layout';
import { buildGridRectangles } from './grid-rectangle-builder';

const baseConfig: GridLayoutConfig = {
  origin: { x: 145, y: 450 },
  cols: 7,
  rows: 5,
  cellSize: { width: 102, height: 137 },
  rectSize: { width: 48, height: 36 },
  align: 'top-left',
  padding: { x: 12, y: 10 },
};

describe('cellOrigin', () => {
  it('places top-left aligned cells with padding', () => {
    expect(cellOrigin(0, 0, baseConfig)).toEqual({ x: 157, y: 460 });
    expect(cellOrigin(1, 0, baseConfig)).toEqual({ x: 259, y: 460 });
    expect(cellOrigin(0, 1, baseConfig)).toEqual({ x: 157, y: 597 });
  });

  it('centers rects within cells when align is center', () => {
    const centered: GridLayoutConfig = {
      ...baseConfig,
      align: 'center',
      padding: undefined,
    };
    expect(cellOrigin(0, 0, centered)).toEqual({ x: 172, y: 501 });
  });
});

describe('layoutGridRectangles', () => {
  it('creates uniform positions for a 7x5 grid', () => {
    const positions = layoutGridRectangles(35, baseConfig, (index, pos) => ({
      index,
      ...pos,
    }));

    expect(positions).toHaveLength(35);
    expect(positions[0]).toMatchObject({ x: 157, y: 460, col: 0, row: 0 });
    expect(positions[6]).toMatchObject({ x: 769, y: 460, col: 6, row: 0 });
    expect(positions[7]).toMatchObject({ x: 157, y: 597, col: 0, row: 1 });

    const row0Xs = positions.slice(0, 7).map(p => p.x);
    const gaps = row0Xs.slice(1).map((x, i) => x - row0Xs[i]);
    expect(new Set(gaps)).toEqual(new Set([102]));
  });
});

describe('inferGridFromRectangles', () => {
  it('detects cols and pitch from existing rectangles', () => {
    const rects = layoutGridRectangles(6, { ...baseConfig, cols: 3, rows: 2 }, (index, pos) => ({
      id: `r-${index}`,
      x: pos.x,
      y: pos.y,
      width: 48,
      height: 36,
      order: index,
    }));

    const inferred = inferGridFromRectangles(rects);
    expect(inferred).not.toBeNull();
    expect(inferred?.cols).toBe(3);
    expect(inferred?.rows).toBe(2);
    expect(inferred?.cellSize.width).toBe(102);
    expect(inferred?.cellSize.height).toBe(137);
  });

  it('returns null for non-grid layouts', () => {
    expect(
      inferGridFromRectangles([
        { id: 'a', x: 0, y: 0, width: 48, height: 36 },
        { id: 'b', x: 200, y: 50, width: 48, height: 36 },
      ]),
    ).toBeNull();
  });
});

describe('gridPositionsFromConfig', () => {
  it('maps ids to grid positions preserving order', () => {
    const moves = gridPositionsFromConfig(['a', 'b', 'c'], {
      ...baseConfig,
      cols: 3,
      rows: 1,
      padding: { x: 0, y: 0 },
      origin: { x: 100, y: 200 },
    });

    expect(moves).toEqual([
      { id: 'a', x: 100, y: 200 },
      { id: 'b', x: 202, y: 200 },
      { id: 'c', x: 304, y: 200 },
    ]);
  });
});

describe('detectGridMeasureAxis', () => {
  it('detects horizontal and vertical measurements', () => {
    expect(detectGridMeasureAxis(102, 0)).toBe('x');
    expect(detectGridMeasureAxis(0, 137)).toBe('y');
    expect(detectGridMeasureAxis(50, 50)).toBeNull();
  });
});

describe('gridConfigFromBounds', () => {
  it('derives cell size from bounds and grid dimensions', () => {
    const config = gridConfigFromBounds(
      { x: 100, y: 200, width: 714, height: 685 },
      7,
      5,
      { width: 48, height: 36 },
      'top-left',
      { x: 12, y: 10 },
    );

    expect(config.origin).toEqual({ x: 100, y: 200 });
    expect(config.cellSize.width).toBeCloseTo(102, 0);
    expect(config.cellSize.height).toBeCloseTo(137, 0);
    expect(cellOrigin(0, 0, config)).toEqual({ x: 112, y: 210 });
  });
});

describe('buildGridRectangles', () => {
  it('builds rectangles with sequential order and field metadata', () => {
    const config = gridConfigFromBounds(
      { x: 0, y: 0, width: 300, height: 200 },
      3,
      2,
      { width: 48, height: 36 },
    );
    const rects = buildGridRectangles(config, 'day', 5);

    expect(rects).toHaveLength(6);
    expect(rects[0]).toMatchObject({ x: 0, y: 0, width: 48, height: 36, fieldType: 'day', order: 5 });
    expect(rects[5].order).toBe(10);
  });
});

describe('redistributeGridMoves', () => {
  it('reposiciona ids existentes dentro de nuevos bounds', () => {
    const moves = redistributeGridMoves(
      ['a', 'b', 'c'],
      { x: 100, y: 200, width: 306, height: 100 },
      {
        cols: 3,
        rows: 1,
        rectSize: { width: 48, height: 36 },
        align: 'top-left',
      },
    );

    expect(moves).toEqual([
      { id: 'a', x: 100, y: 200 },
      { id: 'b', x: 202, y: 200 },
      { id: 'c', x: 304, y: 200 },
    ]);
  });
});

describe('boundsFromRectangles', () => {
  it('returns bounding box for rectangles', () => {
    expect(
      boundsFromRectangles([
        { x: 10, y: 20, width: 48, height: 36 },
        { x: 120, y: 40, width: 48, height: 36 },
      ]),
    ).toEqual({ x: 10, y: 20, width: 158, height: 56 });
  });
});

describe('boundsFromRectanglesWithPadding', () => {
  it('adds padding around bounding box', () => {
    expect(
      boundsFromRectanglesWithPadding([{ x: 10, y: 20, width: 48, height: 36 }], 6),
    ).toEqual({ x: 4, y: 14, width: 60, height: 48 });
  });
});

describe('gridBoundsFromAnchorBlock', () => {
  it('expands block size by cols and rows', () => {
    expect(gridBoundsFromAnchorBlock({ x: 100, y: 200, width: 48, height: 36 }, 7, 5)).toEqual({
      x: 100,
      y: 200,
      width: 336,
      height: 180,
    });
  });
});

describe('orderRectIdsRowMajor', () => {
  it('orders rectangles top-to-bottom then left-to-right', () => {
    const ids = orderRectIdsRowMajor([
      { id: 'b', x: 120, y: 20, width: 48, height: 36 },
      { id: 'a', x: 10, y: 20, width: 48, height: 36 },
      { id: 'c', x: 10, y: 80, width: 48, height: 36 },
    ]);

    expect(ids).toEqual(['a', 'b', 'c']);
  });
});

describe('inferGridDimensionsFromCount', () => {
  it('derives cols and rows from block count', () => {
    expect(inferGridDimensionsFromCount(6)).toEqual({ cols: 3, rows: 2 });
    expect(inferGridDimensionsFromCount(2)).toEqual({ cols: 2, rows: 1 });
  });
});

describe('expandGridRectIds', () => {
  it('returns slots to create when target grows', () => {
    expect(expandGridRectIds(['a', 'b'], 5)).toEqual({
      keepIds: ['a', 'b'],
      removeIds: [],
      slotsToCreate: 3,
    });
  });

  it('returns remove ids when target shrinks', () => {
    expect(expandGridRectIds(['a', 'b', 'c'], 2)).toEqual({
      keepIds: ['a', 'b'],
      removeIds: ['c'],
      slotsToCreate: 0,
    });
  });
});

describe('translateGridBounds', () => {
  it('moves bounds without changing size', () => {
    expect(translateGridBounds({ x: 10, y: 20, width: 100, height: 80 }, 5, -3)).toEqual({
      x: 15,
      y: 17,
      width: 100,
      height: 80,
    });
  });
});

describe('resizeGridBounds', () => {
  const bounds = { x: 100, y: 200, width: 300, height: 200 };

  it('stretches horizontally from east handle', () => {
    expect(resizeGridBounds(bounds, 'e', { dx: 50, dy: 0 })).toEqual({
      x: 100,
      y: 200,
      width: 350,
      height: 200,
    });
  });

  it('stretches vertically from south handle', () => {
    expect(resizeGridBounds(bounds, 's', { dx: 0, dy: 40 })).toEqual({
      x: 100,
      y: 200,
      width: 300,
      height: 240,
    });
  });

  it('stretches diagonally from south-east corner', () => {
    expect(resizeGridBounds(bounds, 'se', { dx: 50, dy: 40 })).toEqual({
      x: 100,
      y: 200,
      width: 350,
      height: 240,
    });
  });

  it('stretches symmetrically from center when requested', () => {
    const resized = resizeGridBounds(bounds, 'e', { dx: 25, dy: 0 }, { symmetric: true });
    expect(resized.width).toBe(350);
    expect(resized.x).toBe(75);
  });
});

describe('redistributeGridMoves with 2 blocks', () => {
  it('reposiciona 2 bloques en fila', () => {
    const moves = redistributeGridMoves(
      ['a', 'b'],
      { x: 0, y: 0, width: 204, height: 36 },
      {
        cols: 2,
        rows: 1,
        rectSize: { width: 48, height: 36 },
        align: 'top-left',
      },
    );

    expect(moves).toEqual([
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: 102, y: 0 },
    ]);
  });
});

describe('pitchFromBounds / boundsFromPitch', () => {
  it('roundtrips pitch and bounds', () => {
    const bounds = boundsFromPitch({ x: 100, y: 200 }, 3, 2, 102, 137);
    expect(bounds).toEqual({ x: 100, y: 200, width: 306, height: 274 });
    expect(pitchFromBounds(bounds, 3, 2)).toEqual({ pitchX: 102, pitchY: 137 });
  });
});

describe('gapFromPitch', () => {
  it('derives gap between block edges for top-left alignment', () => {
    expect(gapFromPitch({ pitchX: 102, pitchY: 137 }, { width: 48, height: 36 })).toEqual({
      gapX: 54,
      gapY: 101,
    });
  });
});

describe('boundsFromGap', () => {
  it('rebuilds bounds from gap values', () => {
    const bounds = boundsFromGap(
      { x: 0, y: 0, width: 306, height: 274 },
      3,
      2,
      { gapX: 54, gapY: 101 },
      { width: 48, height: 36 },
    );
    expect(pitchFromBounds(bounds, 3, 2)).toEqual({ pitchX: 102, pitchY: 137 });
  });
});

describe('inferPitchFromRectangles', () => {
  it('infers pitch from a 3x2 grid layout', () => {
    const rects = layoutGridRectangles(6, { ...baseConfig, cols: 3, rows: 2 }, (index, pos) => ({
      id: `r-${index}`,
      x: pos.x,
      y: pos.y,
      width: 48,
      height: 36,
    }));

    const inferred = inferPitchFromRectangles(rects, 3, 2);
    expect(inferred?.pitchX).toBe(102);
    expect(inferred?.pitchY).toBe(137);
    expect(inferred?.origin).toEqual({ x: 157, y: 460 });
  });
});

describe('resizeGridPitch', () => {
  it('adjusts only pitchX when axis is x', () => {
    const bounds = boundsFromPitch({ x: 0, y: 0 }, 3, 1, 100, 80);
    const resized = resizeGridPitch(bounds, 3, 1, 'x', 20);
    expect(pitchFromBounds(resized, 3, 1)).toEqual({ pitchX: 120, pitchY: 80 });
  });

  it('adjusts only pitchY when axis is y', () => {
    const bounds = boundsFromPitch({ x: 0, y: 0 }, 3, 1, 100, 80);
    const resized = resizeGridPitch(bounds, 3, 1, 'y', 10);
    expect(pitchFromBounds(resized, 3, 1)).toEqual({ pitchX: 100, pitchY: 90 });
  });
});

describe('defaultGridBounds', () => {
  it('centers a 4x4 grid on the page', () => {
    const bounds = defaultGridBounds(1200, 1600, 4, 4, { width: 48, height: 36 });
    expect(bounds.width).toBe(240);
    expect(bounds.height).toBe(192);
    expect(bounds.x).toBe(480);
    expect(bounds.y).toBe(704);
  });
});

describe('clampGridRectSize', () => {
  const bounds = { x: 100, y: 200, width: 306, height: 411 };
  const settings = { cols: 3, rows: 2 };

  it('clamps to minimum size', () => {
    expect(clampGridRectSize(bounds, settings, { width: 5, height: 10 })).toEqual({
      width: 20,
      height: 20,
    });
  });

  it('clamps width to maximum cell size but not height', () => {
    expect(clampGridRectSize(bounds, settings, { width: 500, height: 500 })).toEqual({
      width: 102,
      height: 500,
    });
  });

  it('keeps valid size unchanged', () => {
    expect(clampGridRectSize(bounds, settings, { width: 48, height: 36 })).toEqual({
      width: 48,
      height: 36,
    });
  });
});

describe('clampGridPadding', () => {
  const bounds = { x: 100, y: 200, width: 306, height: 411 };
  const settings = {
    cols: 3,
    rows: 2,
    rectWidth: 48,
    rectHeight: 36,
    align: 'top-left' as const,
  };

  it('clamps negative values to zero', () => {
    expect(clampGridPadding(bounds, settings, { x: -5, y: -10 })).toEqual({ x: 0, y: 0 });
  });

  it('clamps values that exceed cell interior', () => {
    expect(clampGridPadding(bounds, settings, { x: 500, y: 500 })).toEqual({ x: 54, y: 170 });
  });

  it('keeps valid padding unchanged', () => {
    expect(clampGridPadding(bounds, settings, { x: 12, y: 10 })).toEqual({ x: 12, y: 10 });
  });
});

describe('inferPaddingFromRects', () => {
  it('infers padding from the first rect relative to cell origin', () => {
    const bounds = { x: 145, y: 450, width: 714, height: 685 };
    const settings = {
      cols: 7,
      rows: 5,
      rectWidth: 48,
      rectHeight: 36,
      align: 'top-left' as const,
    };
    const rects = layoutGridRectangles(2, baseConfig, (index, pos) => ({
      id: `r-${index}`,
      x: pos.x,
      y: pos.y,
      width: 48,
      height: 36,
    }));

    expect(inferPaddingFromRects(bounds, settings, rects, ['r-0', 'r-1'])).toEqual({
      x: 12,
      y: 10,
    });
  });

  it('returns zero padding for center alignment', () => {
    const bounds = { x: 0, y: 0, width: 200, height: 160 };
    const settings = {
      cols: 2,
      rows: 2,
      rectWidth: 48,
      rectHeight: 36,
      align: 'center' as const,
    };

    expect(
      inferPaddingFromRects(
        bounds,
        settings,
        [{ id: 'a', x: 26, y: 22, width: 48, height: 36 }],
        ['a'],
      ),
    ).toEqual({ x: 0, y: 0 });
  });
});

describe('redistributeGridMoves with padding', () => {
  it('offsets block positions without changing bounds or rect size', () => {
    const bounds = { x: 145, y: 450, width: 714, height: 685 };
    const moves = redistributeGridMoves(['a', 'b'], bounds, {
      cols: 7,
      rows: 5,
      rectSize: { width: 48, height: 36 },
      align: 'top-left',
      padding: { x: 12, y: 10 },
    });

    expect(moves).toEqual([
      { id: 'a', x: 157, y: 460 },
      { id: 'b', x: 259, y: 460 },
    ]);
  });
});

describe('gridLinePositions / gridDimensionLabels', () => {
  it('aligns grid lines with cellOrigin positions', () => {
    const config: GridLayoutConfig = {
      ...baseConfig,
      cols: 3,
      rows: 2,
      cellSize: { width: 102, height: 137 },
      padding: { x: 12, y: 10 },
    };
    const lines = gridLinePositions(config);

    expect(lines.vertical[0]).toBe(cellOrigin(0, 0, config).x - 12);
    expect(lines.vertical[1]).toBe(Math.round(config.origin.x + config.cellSize.width));
    expect(lines.horizontal[1]).toBe(Math.round(config.origin.y + config.cellSize.height));
  });

  it('centers gap labels in the actual gutter for center alignment', () => {
    const bounds = boundsFromPitch({ x: 0, y: 0 }, 2, 2, 100, 80);
    const config = gridConfigFromBounds(bounds, 2, 2, { width: 48, height: 36 }, 'center');
    const labels = gridDimensionLabels(config, { width: 48, height: 36 });

    const cell00 = cellOrigin(0, 0, config);
    const cell10 = cellOrigin(1, 0, config);
    expect(labels.gapX?.x).toBe((cell00.x + 48 + cell10.x) / 2);
    expect(labels.gapX?.text).toBe('52px');
    expect(labels.pitchX?.text).toBe('100px');
  });
});
