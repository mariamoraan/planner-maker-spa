import { describe, it, expect } from 'vitest';
import {
  boundsFromRectangles,
  boundsFromRectanglesWithPadding,
  boundsFromGap,
  boundsFromPitch,
  cellOrigin,
  cellSlotOrigin,
  clampGridPadding,
  clampGridRectSize,
  clampBoundsToMinContent,
  defaultGridBounds,
  detectGridMeasureAxis,
  expandGridRectIds,
  gapFromPitch,
  getGridGap,
  gridBoundsFromAnchorBlock,
  gridConfigFromBounds,
  gridConfigFromGroup,
  gridDimensionLabels,
  gridLinePositions,
  gridPositionsFromConfig,
  inferGridDimensionsFromCount,
  inferGridFromRectangles,
  inferPaddingFromRects,
  inferPitchFromRectangles,
  layoutGridRectangles,
  migrateGridSettingsToGapBetween,
  minBoundsForContent,
  maxBlockSize,
  orderRectIdsRowMajor,
  rectSizeFromGap,
  gapLinePositions,
  paddingFromBlockPosition,
  pitchFromBounds,
  redistributeGridMoves,
  resizeGridBlockFromHandle,
  resizeGridBounds,
  resizeGridPitch,
  scaleGridSettingsForGapChange,
  translateGridBounds,
  type GridLayoutConfig,
} from './grid-layout';
import { normalizeGridSettings } from './grid-edit-types';
import { buildGridRectangles } from './grid-rectangle-builder';

const baseConfig: GridLayoutConfig = {
  origin: { x: 145, y: 450 },
  bounds: { x: 145, y: 450, width: 714, height: 685 },
  cols: 7,
  rows: 5,
  cellSize: { width: 110, height: 157 },
  rectSize: { width: 48, height: 36 },
  gap: { x: 54, y: 101 },
  alignH: 'left',
  alignV: 'top',
  padding: { x: 12, y: 10 },
};

describe('cellOrigin', () => {
  it('places top-left aligned blocks inside cell slots with padding', () => {
    expect(cellOrigin(0, 0, baseConfig)).toEqual({ x: 153, y: 460 });
    expect(cellOrigin(1, 0, baseConfig)).toEqual({ x: 263, y: 460 });
    expect(cellOrigin(0, 1, baseConfig)).toEqual({ x: 153, y: 617 });
  });

  it('centers blocks within each cell when align is center', () => {
    const centered: GridLayoutConfig = {
      ...baseConfig,
      cols: 2,
      rows: 2,
      bounds: { x: 0, y: 0, width: 200, height: 160 },
      origin: { x: 0, y: 0 },
      cellSize: { width: 100, height: 80 },
      gap: { x: 0, y: 0 },
      alignH: 'center',
      alignV: 'center',
      padding: undefined,
    };
    expect(cellOrigin(0, 0, centered)).toEqual({ x: 26, y: 22 });
  });
});

describe('layoutGridRectangles', () => {
  it('creates uniform positions for a 7x5 grid', () => {
    const positions = layoutGridRectangles(35, baseConfig, (index, pos) => ({
      index,
      ...pos,
    }));

    expect(positions).toHaveLength(35);
    expect(positions[0]).toMatchObject({ x: 153, y: 460, col: 0, row: 0 });
    expect(positions[6]).toMatchObject({ x: 813, y: 460, col: 6, row: 0 });
    expect(positions[7]).toMatchObject({ x: 153, y: 617, col: 0, row: 1 });

    const row0Xs = positions.slice(0, 7).map(p => p.x);
    const blockGaps = row0Xs.slice(1).map((x, i) => x - (row0Xs[i]! + 48));
    expect(new Set(blockGaps)).toEqual(new Set([62]));
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
    expect(inferred?.cellSize.width).toBe(256);
    expect(inferred?.cellSize.height).toBe(393);
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
      { id: 'b', x: 356, y: 200 },
      { id: 'c', x: 612, y: 200 },
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
      { x: 54, y: 101 },
    );

    expect(config.origin).toEqual({ x: 100, y: 200 });
    expect(config.cellSize.width).toBeCloseTo(110, 0);
    expect(config.cellSize.height).toBeCloseTo(157, 0);
    expect(cellOrigin(0, 0, config)).toEqual({ x: 108, y: 210 });
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

describe('redistributeGridMoves with 2 blocks', () => {
  it('reposiciona 2 bloques en fila dentro de celdas', () => {
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
  it('rebuilds bounds from gap-between values', () => {
    const bounds = boundsFromGap(
      { x: 0, y: 0, width: 0, height: 0 },
      3,
      2,
      { gapX: 54, gapY: 101 },
      { width: 48, height: 36 },
    );
    expect(bounds).toEqual({ x: 0, y: 0, width: 252, height: 173 });
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
    expect(inferred?.pitchX).toBe(256);
    expect(inferred?.pitchY).toBe(393);
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
  it('centers a 4x4 grid on the page with zero gap by default', () => {
    const rectSize = { width: 48, height: 36 };
    const bounds = defaultGridBounds(1200, 1600, 4, 4, rectSize);
    expect(bounds.width).toBe(192);
    expect(bounds.height).toBe(144);
    expect(bounds.x).toBe(504);
    expect(bounds.y).toBe(728);
    expect(
      getGridGap(bounds, {
        cols: 4,
        rows: 4,
        rectWidth: rectSize.width,
        rectHeight: rectSize.height,
        alignH: 'left',
        alignV: 'top',
      }),
    ).toEqual({ gapX: 0, gapY: 0 });
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

  it('clamps width and height to maximum block size', () => {
    expect(clampGridRectSize(bounds, settings, { width: 500, height: 500 })).toEqual({
      width: 102,
      height: 206,
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

  it('clamps values that exceed free space in bounds', () => {
    expect(clampGridPadding(bounds, { ...settings, gap: { x: 0, y: 0 } }, { x: 500, y: 500 })).toEqual({
      x: 54,
      y: 170,
    });
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
      x: 8,
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
      gap: { x: 54, y: 101 },
    });

    expect(moves).toEqual([
      { id: 'a', x: 153, y: 460 },
      { id: 'b', x: 263, y: 460 },
    ]);
  });
});

describe('gridLinePositions / gridDimensionLabels', () => {
  it('returns only the outer frame lines', () => {
    const config: GridLayoutConfig = {
      ...baseConfig,
      cols: 3,
      rows: 2,
      bounds: { x: 145, y: 450, width: 306, height: 274 },
      padding: { x: 12, y: 10 },
    };
    const lines = gridLinePositions(config);

    expect(lines.vertical).toEqual([145, 451]);
    expect(lines.horizontal).toEqual([450, 724]);
  });

  it('centers gap labels in the actual gutter', () => {
    const bounds = boundsFromPitch({ x: 0, y: 0 }, 2, 2, 100, 80);
    const config = gridConfigFromBounds(
      bounds,
      2,
      2,
      { width: 48, height: 36 },
      'center',
      undefined,
      { x: 52, y: 44 },
    );
    const labels = gridDimensionLabels(config, { width: 48, height: 36 });

    const cell00 = cellOrigin(0, 0, config);
    const cell10 = cellOrigin(1, 0, config);
    expect(labels.gapX?.x).toBe((cell00.x + 48 + cell10.x) / 2);
    expect(labels.gapX?.text).toBe('52px');
    expect(labels.pitchX?.text).toBe('126px');
  });
});

describe('cellSlotOrigin', () => {
  it('returns cell corner without block padding', () => {
    expect(cellSlotOrigin(0, 0, baseConfig)).toEqual({ x: 145, y: 450 });
    expect(cellSlotOrigin(1, 0, baseConfig)).toEqual({ x: 255, y: 450 });
  });
});

describe('normalizeGridSettings', () => {
  it('migrates legacy center align', () => {
    expect(
      normalizeGridSettings({
        cols: 2,
        rows: 2,
        rectWidth: 48,
        rectHeight: 36,
        align: 'center',
      }),
    ).toEqual({
      cols: 2,
      rows: 2,
      rectWidth: 48,
      rectHeight: 36,
      alignH: 'center',
      alignV: 'center',
      padding: { x: 0, y: 0 },
    });
  });

  it('migrates legacy top-left align with padding', () => {
    expect(
      normalizeGridSettings({
        cols: 2,
        rows: 2,
        rectWidth: 48,
        rectHeight: 36,
        align: 'top-left',
        padding: { x: 8, y: 4 },
      }),
    ).toMatchObject({
      alignH: 'left',
      alignV: 'top',
      padding: { x: 8, y: 4 },
    });
  });
});

describe('nine-point alignment padding', () => {
  it('offsets content origin from right and bottom edges', () => {
    const bounds = { x: 0, y: 0, width: 200, height: 160 };
    const config = gridConfigFromBounds(
      bounds,
      2,
      2,
      { width: 48, height: 36 },
      { alignH: 'right', alignV: 'bottom' },
      { x: 10, y: 8 },
      { x: 0, y: 0 },
    );

    expect(cellOrigin(0, 0, config)).toEqual({
      x: 42,
      y: 36,
    });
  });
});

describe('getGridGap / scaleGridSettingsForGapChange', () => {
  it('derives gap from bounds and block size', () => {
    const bounds = { x: 0, y: 0, width: 200, height: 160 };
    const settings = {
      cols: 2,
      rows: 2,
      rectWidth: 48,
      rectHeight: 36,
      alignH: 'left' as const,
      alignV: 'top' as const,
    };

    expect(getGridGap(bounds, settings)).toEqual({ gapX: 52, gapY: 44 });
  });

  it('keeps block size when gap increases', () => {
    const bounds = { x: 0, y: 0, width: 200, height: 160 };
    const settings = {
      cols: 2,
      rows: 2,
      rectWidth: 48,
      rectHeight: 36,
      alignH: 'left' as const,
      alignV: 'top' as const,
      padding: { x: 0, y: 0 },
      gap: { x: 0, y: 0 },
    };

    const result = scaleGridSettingsForGapChange(bounds, settings, { gapX: 60, gapY: 44 });
    expect(result.rectWidth).toBe(48);
    expect(result.rectHeight).toBe(36);
    expect(result.gapX).toBe(60);
    expect(result.gap).toEqual({ x: 60, y: 44 });
  });

  it('clamps gap when block size does not fit', () => {
    const bounds = { x: 0, y: 0, width: 120, height: 100 };
    const settings = {
      cols: 2,
      rows: 2,
      rectWidth: 48,
      rectHeight: 36,
      alignH: 'left' as const,
      alignV: 'top' as const,
      padding: { x: 0, y: 0 },
      gap: { x: 0, y: 0 },
    };

    const result = scaleGridSettingsForGapChange(bounds, settings, { gapX: 60, gapY: 44 });
    expect(result.rectWidth).toBe(48);
    expect(result.gapX).toBe(24);
  });
});

describe('maxBlockSize / minBoundsForContent', () => {
  it('computes max block size from bounds and gap', () => {
    const bounds = { x: 0, y: 0, width: 200, height: 160 };
    expect(maxBlockSize(bounds, 2, 2, { x: 60, y: 44 })).toEqual({
      width: 70,
      height: 58,
    });
  });

  it('computes minimum bounds for content', () => {
    const settings = {
      cols: 2,
      rows: 2,
      rectWidth: 48,
      rectHeight: 36,
      gap: { x: 60, y: 44 },
    };
    expect(minBoundsForContent(settings)).toEqual({ width: 156, height: 116 });
  });
});

describe('independent block size on bounds resize', () => {
  it('recenters blocks without changing rect size when bounds grow', () => {
    const settings = {
      cols: 2,
      rows: 2,
      rectWidth: 48,
      rectHeight: 36,
      alignH: 'center' as const,
      alignV: 'center' as const,
      padding: { x: 0, y: 0 },
      gap: { x: 0, y: 0 },
    };
    const smallBounds = { x: 0, y: 0, width: 96, height: 72 };
    const largeBounds = { x: 0, y: 0, width: 200, height: 160 };

    const smallMoves = redistributeGridMoves(['a', 'b', 'c', 'd'], smallBounds, {
      cols: 2,
      rows: 2,
      rectSize: { width: 48, height: 36 },
      alignH: 'center',
      alignV: 'center',
      gap: { x: 0, y: 0 },
    });
    const largeMoves = redistributeGridMoves(['a', 'b', 'c', 'd'], largeBounds, {
      cols: 2,
      rows: 2,
      rectSize: { width: 48, height: 36 },
      alignH: 'center',
      alignV: 'center',
      gap: { x: 0, y: 0 },
    });

    expect(largeMoves[0]).toEqual({ id: 'a', x: 26, y: 22 });
    expect(largeMoves[1]).toEqual({ id: 'b', x: 126, y: 22 });
    expect(smallMoves[0]).toEqual({ id: 'a', x: 0, y: 0 });
  });

  it('clamps bounds to minimum content size', () => {
    const settings = {
      cols: 2,
      rows: 2,
      rectWidth: 48,
      rectHeight: 36,
      gap: { x: 0, y: 0 },
    };
    const bounds = { x: 10, y: 20, width: 50, height: 40 };
    expect(clampBoundsToMinContent(bounds, settings)).toEqual({
      x: 10,
      y: 20,
      width: 96,
      height: 72,
    });
  });
});

describe('resizeGridBlockFromHandle', () => {
  it('increases block size from south-east handle', () => {
    const bounds = { x: 0, y: 0, width: 200, height: 160 };
    const settings = {
      cols: 2,
      rows: 2,
      rectWidth: 48,
      rectHeight: 36,
      alignH: 'left' as const,
      alignV: 'top' as const,
      padding: { x: 0, y: 0 },
    };
    const block = { x: 0, y: 0, width: 48, height: 36 };

    const result = resizeGridBlockFromHandle(block, 'se', { dx: 10, dy: 8 }, bounds, settings);
    expect(result.settings.rectWidth).toBe(58);
    expect(result.settings.rectHeight).toBe(44);
  });
});

describe('paddingFromBlockPosition', () => {
  it('converts dragged position to top-left padding', () => {
    const bounds = { x: 0, y: 0, width: 200, height: 160 };
    const settings = {
      cols: 2,
      rows: 2,
      rectWidth: 48,
      rectHeight: 36,
      alignH: 'left' as const,
      alignV: 'top' as const,
      padding: { x: 0, y: 0 },
    };

    expect(
      paddingFromBlockPosition(bounds, settings, { x: 12, y: 10 }),
    ).toEqual({
      alignH: 'left',
      alignV: 'top',
      padding: { x: 12, y: 10 },
    });
  });

  it('switches to top-left alignment when dragging from center', () => {
    const bounds = { x: 0, y: 0, width: 200, height: 160 };
    const settings = {
      cols: 2,
      rows: 2,
      rectWidth: 48,
      rectHeight: 36,
      alignH: 'center' as const,
      alignV: 'center' as const,
      padding: { x: 0, y: 0 },
    };

    expect(paddingFromBlockPosition(bounds, settings, { x: 12, y: 10 }).alignH).toBe('left');
    expect(paddingFromBlockPosition(bounds, settings, { x: 12, y: 10 }).alignV).toBe('top');
  });
});

describe('gap-between block layout', () => {
  it('places blocks touching when gap is 0', () => {
    const bounds = { x: 0, y: 0, width: 300, height: 100 };
    const config = gridConfigFromBounds(
      bounds,
      3,
      1,
      { width: 100, height: 100 },
      'top-left',
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    );
    const positions = gridPositionsFromConfig(['a', 'b', 'c'], config);
    expect(positions[1]!.x - positions[0]!.x).toBe(100);
    expect(positions[2]!.x - positions[1]!.x).toBe(100);
  });

  it('leaves exact gap space between blocks', () => {
    const bounds = { x: 0, y: 0, width: 300, height: 100 };
    const gap = { x: 10, y: 0 };
    const rectSize = rectSizeFromGap(bounds, 3, 1, gap);
    expect(rectSize.width).toBe(93);

    const config = gridConfigFromBounds(bounds, 3, 1, rectSize, 'top-left', { x: 0, y: 0 }, gap);
    const positions = gridPositionsFromConfig(['a', 'b', 'c'], config);
    expect(positions[1]!.x - (positions[0]!.x + rectSize.width)).toBe(10);
    expect(positions[2]!.x - (positions[1]!.x + rectSize.width)).toBe(10);
  });

  it('fills bounds with large gap and smaller blocks', () => {
    const bounds = { x: 0, y: 0, width: 300, height: 100 };
    const gap = { x: 100, y: 0 };
    const rectSize = rectSizeFromGap(bounds, 3, 1, gap);
    expect(rectSize.width).toBe(33);
    expect(3 * rectSize.width + 2 * gap.x).toBe(299);
  });

  it('migrates legacy settings to explicit gap', () => {
    const bounds = { x: 0, y: 0, width: 200, height: 160 };
    const migrated = migrateGridSettingsToGapBetween(bounds, {
      cols: 2,
      rows: 2,
      rectWidth: 48,
      rectHeight: 36,
      alignH: 'left',
      alignV: 'top',
    });
    expect(migrated.gap).toEqual({ x: 52, y: 44 });
    expect(migrated.rectWidth).toBe(74);
    expect(migrated.rectHeight).toBe(58);
  });

  it('places gap handles between adjacent blocks', () => {
    const config = gridConfigFromBounds(
      { x: 0, y: 0, width: 300, height: 100 },
      3,
      1,
      { width: 93, height: 100 },
      'top-left',
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    );
    const lines = gapLinePositions(config);
    expect(lines.vertical).toHaveLength(2);
  });
});
