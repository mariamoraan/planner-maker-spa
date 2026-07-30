import { describe, it, expect } from 'vitest';
import { computeSnap, computeGroupSnap, computeGroupBounds, GRID_SIZE, normalizeCoord, normalizePoint, normalizeGroupOffset, canonicalGap, sanitizeRectangleGeometry } from '@/lib/canvas-snap';
import type { RectBounds, GroupMember } from '@/lib/canvas-snap';

const scale = 1;

function rect(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
): RectBounds {
  return { id, x, y, width, height };
}

describe('computeSnap', () => {
  it('snaps a fourth block to match 20px horizontal gap in a row', () => {
    const row = [
      rect('a', 0, 0, 40, 40),
      rect('b', 60, 0, 40, 40),
      rect('c', 120, 0, 40, 40),
    ];
    const moving = rect('d', 175, 2, 40, 40);
    const exclude = new Set(['d']);

    const result = computeSnap(moving, 175, 2, [...row, moving], exclude, scale);

    expect(result.x).toBe(180);
    expect(result.guides.some(g => g.type === 'spacing-h' && g.label === '20')).toBe(true);
  });

  it('does not apply horizontal spacing snap across different rows', () => {
    const others = [
      rect('a', 0, 0, 40, 40),
      rect('b', 60, 0, 40, 40),
    ];
    const moving = rect('m', 200, 200, 40, 40);
    const exclude = new Set(['m']);

    const result = computeSnap(moving, 200, 200, [...others, moving], exclude, scale);

    expect(result.guides.filter(g => g.type === 'spacing-h')).toHaveLength(0);
  });

  it('aligns to nearest edge when within threshold', () => {
    const others = [rect('a', 100, 50, 40, 40)];
    const moving = rect('m', 94, 50, 40, 40);
    const exclude = new Set(['m']);

    const result = computeSnap(moving, 94, 50, [...others, moving], exclude, scale);

    expect(result.x).toBe(100);
    expect(result.guides.some(g => g.type === 'align-x')).toBe(true);
  });

  it('snaps group using bbox via snapTarget', () => {
    const others = [rect('ref', 0, 0, 40, 40)];
    const a = rect('a', 100, 0, 40, 40);
    const b = rect('b', 160, 20, 40, 40);
    const exclude = new Set(['a', 'b']);

    const groupBounds = computeGroupBounds([a, b], ['a', 'b']);
    expect(groupBounds).toEqual({ x: 100, y: 0, width: 100, height: 60 });

    const snapTarget = {
      x: 35,
      y: 0,
      width: groupBounds!.width,
      height: groupBounds!.height,
    };

    const result = computeSnap(a, 103, 0, [...others, a, b], exclude, scale, { snapTarget });

    expect(result.x).toBe(40);
    expect(result.y).toBe(0);
  });

  it('shows distance labels to row neighbors after snap', () => {
    const others = [rect('a', 0, 0, 40, 40)];
    const moving = rect('m', 50, 0, 40, 40);
    const exclude = new Set(['m']);

    const result = computeSnap(moving, 50, 0, [...others, moving], exclude, scale);

    expect(result.guides.some(g => g.type === 'distance-h' && g.label === '10')).toBe(true);
  });

  it('prefers spacing snap when within threshold of matching gap', () => {
    const row = [
      rect('a', 0, 0, 40, 40),
      rect('b', 60, 0, 40, 40),
      rect('c', 120, 0, 40, 40),
    ];
    const moving = rect('m', 177, 0, 40, 40);
    const exclude = new Set(['m']);

    const result = computeSnap(moving, 177, 0, [...row, moving], exclude, scale);

    expect(result.x).toBe(180);
  });

  it('spacing guide label matches segment length in image coordinates', () => {
    const row = [
      rect('a', 0, 0, 40, 40),
      rect('b', 60, 0, 40, 40),
      rect('c', 120, 0, 40, 40),
    ];
    const moving = rect('d', 175, 0, 40, 40);
    const exclude = new Set(['d']);

    const result = computeSnap(moving, 175, 0, [...row, moving], exclude, scale);
    const spacingGuide = result.guides.find(g => g.type === 'spacing-h' && g.label);

    expect(spacingGuide).toBeDefined();
    expect(Number(spacingGuide!.label)).toBe(
      Math.round(Math.abs(spacingGuide!.x2! - spacingGuide!.x1!)),
    );
  });

  it('snaps to canvas left edge', () => {
    const moving = rect('m', 4, 50, 40, 40);
    const exclude = new Set(['m']);

    const result = computeSnap(moving, 4, 50, [moving], exclude, scale, {
      canvasBounds: { width: 800, height: 600 },
    });

    expect(result.x).toBe(0);
    expect(result.guides.some(g => g.type === 'align-x')).toBe(true);
  });

  it('snaps to canvas horizontal center', () => {
    const moving = rect('m', 378, 50, 40, 40);
    const exclude = new Set(['m']);

    const result = computeSnap(moving, 378, 50, [moving], exclude, scale, {
      canvasBounds: { width: 800, height: 600 },
    });

    expect(result.x).toBe(380);
    expect(result.guides.some(g => g.type === 'align-x')).toBe(true);
  });

  it('snaps to canvas bottom edge', () => {
    const moving = rect('m', 50, 556, 40, 40);
    const exclude = new Set(['m']);

    const result = computeSnap(moving, 50, 556, [moving], exclude, scale, {
      canvasBounds: { width: 800, height: 600 },
    });

    expect(result.y).toBe(560);
    expect(result.guides.some(g => g.type === 'align-y')).toBe(true);
  });

  it('returns raw position when snap is disabled', () => {
    const others = [rect('a', 100, 50, 40, 40)];
    const moving = rect('m', 94, 50, 40, 40);
    const exclude = new Set(['m']);

    const result = computeSnap(moving, 94, 50, [...others, moving], exclude, scale, {
      enabled: false,
    });

    expect(result.x).toBe(94);
    expect(result.y).toBe(50);
    expect(result.guides).toHaveLength(0);
  });

  it('snaps to grid when snapToGrid is enabled', () => {
    const moving = rect('m', 23, 37, 40, 40);
    const exclude = new Set(['m']);

    const result = computeSnap(moving, 23, 37, [moving], exclude, scale, {
      snapToGrid: true,
      gridSize: GRID_SIZE,
    });

    expect(result.x).toBe(20);
    expect(result.y).toBe(40);
  });

  it('prefers closer element snap over grid snap', () => {
    const others = [rect('a', 100, 50, 40, 40)];
    const moving = rect('m', 94, 38, 40, 40);
    const exclude = new Set(['m']);

    const result = computeSnap(moving, 94, 38, [...others, moving], exclude, scale, {
      snapToGrid: true,
      gridSize: GRID_SIZE,
    });

    expect(result.x).toBe(100);
    expect(result.y).toBe(40);
  });

  it('snaps a fourth block to match 20px vertical gap in a column', () => {
    const column = [
      rect('a', 0, 0, 40, 40),
      rect('b', 0, 60, 40, 40),
      rect('c', 0, 120, 40, 40),
    ];
    const moving = rect('d', 2, 175, 40, 40);
    const exclude = new Set(['d']);

    const result = computeSnap(moving, 2, 175, [...column, moving], exclude, scale);

    expect(result.y).toBe(180);
    expect(result.guides.some(g => g.type === 'spacing-v' && g.label === '20')).toBe(true);
  });

  it('snaps below middle block using local gap in mixed-height column', () => {
    const column = [
      rect('a', 0, 0, 400, 40),
      rect('b', 0, 60, 400, 40),
      rect('c', 0, 500, 400, 40),
    ];
    const moving = rect('m', 0, 115, 400, 40);
    const exclude = new Set(['m']);

    const result = computeSnap(moving, 0, 115, [...column, moving], exclude, scale);

    expect(result.y).toBe(120);
    expect(result.guides.some(g => g.type === 'spacing-v' && g.label === '20')).toBe(true);
  });

  it('does not apply vertical spacing snap across different columns', () => {
    const others = [
      rect('a', 0, 0, 40, 40),
      rect('b', 0, 60, 40, 40),
    ];
    const moving = rect('m', 200, 200, 40, 40);
    const exclude = new Set(['m']);

    const result = computeSnap(moving, 200, 200, [...others, moving], exclude, scale);

    expect(result.guides.filter(g => g.type === 'spacing-v')).toHaveLength(0);
  });

  it('shows at most two distance-v labels to closest vertical neighbors', () => {
    const column = [
      rect('a', 0, 0, 400, 40),
      rect('b', 0, 60, 400, 40),
      rect('c', 0, 500, 400, 40),
    ];
    const moving = rect('m', 0, 200, 400, 40);
    const exclude = new Set(['m']);

    const result = computeSnap(moving, 0, 200, [...column, moving], exclude, scale);

    expect(result.guides.filter(g => g.type === 'distance-v').length).toBeLessThanOrEqual(2);
  });

  it('shows distance-v label when flush against block above after edge snap', () => {
    const others = [rect('a', 0, 0, 400, 80)];
    const moving = rect('m', 0, 85, 400, 40);
    const exclude = new Set(['m']);

    const result = computeSnap(moving, 0, 85, [...others, moving], exclude, scale);

    expect(result.y).toBe(80);
    expect(result.guides.some(g => g.type === 'distance-v' && g.label === '0')).toBe(true);
  });

  it('vertical spacing guide label matches segment length in image coordinates', () => {
    const column = [
      rect('a', 0, 0, 40, 40),
      rect('b', 0, 60, 40, 40),
      rect('c', 0, 120, 40, 40),
    ];
    const moving = rect('d', 0, 175, 40, 40);
    const exclude = new Set(['d']);

    const result = computeSnap(moving, 0, 175, [...column, moving], exclude, scale);
    const spacingGuide = result.guides.find(g => g.type === 'spacing-v' && g.label);

    expect(spacingGuide).toBeDefined();
    expect(Number(spacingGuide!.label)).toBe(
      Math.round(Math.abs(spacingGuide!.y2! - spacingGuide!.y1!)),
    );
  });
});

describe('computeGroupSnap', () => {
  function member(
    id: string,
    startX: number,
    startY: number,
    width: number,
    height: number,
  ): GroupMember {
    return { id, startX, startY, width, height };
  }

  it('snaps left member edge to reference even when group bbox would not align', () => {
    const others = [rect('ref', 0, 0, 40, 40)];
    const a = rect('a', 100, 0, 40, 40);
    const b = rect('b', 160, 20, 40, 40);
    const exclude = new Set(['a', 'b']);

    const members = [
      member('a', 100, 0, 40, 40),
      member('b', 160, 20, 40, 40),
    ];

    // Provisional bbox x=42 would bbox-snap to ref.right (40) with delta -2.
    // Member-a left at 6 snaps to ref.left (0) with delta -6 — only viable align snap.
    const result = computeGroupSnap(members, -94, 0, [...others, a, b], exclude, scale);

    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
  });

  it('preserves relative offsets between group members after snap', () => {
    const others = [rect('ref', 0, 0, 40, 40)];
    const a = rect('a', 100, 0, 40, 40);
    const b = rect('b', 160, 20, 40, 40);
    const exclude = new Set(['a', 'b']);

    const members = [
      member('a', 100, 0, 40, 40),
      member('b', 160, 20, 40, 40),
    ];
    const leaderDx = -94;
    const leaderDy = 0;

    const result = computeGroupSnap(
      members,
      leaderDx,
      leaderDy,
      [...others, a, b],
      exclude,
      scale,
    );

    const deltaX = result.x - 100;
    const deltaY = result.y - 0;

    expect(a.x + deltaX).toBe(0);
    expect(a.y + deltaY).toBe(0);
    expect(b.x + deltaX - (a.x + deltaX)).toBe(60);
    expect(b.y + deltaY - (a.y + deltaY)).toBe(20);
  });

  it('uses bbox spacing when no member edge snap is closer', () => {
    const row = [
      rect('a', 0, 0, 40, 40),
      rect('b', 60, 0, 40, 40),
      rect('c', 120, 0, 40, 40),
    ];
    const left = rect('left', 100, 0, 40, 40);
    const right = rect('right', 160, 0, 40, 40);
    const exclude = new Set(['left', 'right']);

    const members = [
      member('left', 100, 0, 40, 40),
      member('right', 160, 0, 40, 40),
    ];

    const result = computeGroupSnap(members, 75, 0, [...row, left, right], exclude, scale);

    expect(result.x).toBe(180);
    expect(result.guides.some(g => g.type === 'spacing-h' && g.label === '20')).toBe(true);
  });

  it('uses bbox vertical spacing when no member edge snap is closer', () => {
    const column = [
      rect('a', 0, 0, 40, 40),
      rect('b', 0, 60, 40, 40),
      rect('c', 0, 120, 40, 40),
    ];
    const top = rect('top', 0, 100, 40, 40);
    const bottom = rect('bottom', 0, 160, 40, 40);
    const exclude = new Set(['top', 'bottom']);

    const members = [
      member('top', 0, 100, 40, 40),
      member('bottom', 0, 160, 40, 40),
    ];

    const result = computeGroupSnap(members, 0, 75, [...column, top, bottom], exclude, scale);

    expect(result.y).toBe(180);
    expect(result.guides.some(g => g.type === 'spacing-v' && g.label === '20')).toBe(true);
  });

  it('returns raw group position when snap is disabled', () => {
    const a = rect('a', 100, 0, 40, 40);
    const b = rect('b', 160, 20, 40, 40);
    const exclude = new Set(['a', 'b']);

    const members = [
      member('a', 100, 0, 40, 40),
      member('b', 160, 20, 40, 40),
    ];

    const result = computeGroupSnap(members, 10, 5, [a, b], exclude, scale, {
      enabled: false,
    });

    expect(result.x).toBe(110);
    expect(result.y).toBe(5);
    expect(result.guides).toHaveLength(0);
  });

  it('snaps group origin to grid preserving relative offsets', () => {
    const a = rect('a', 100, 0, 40, 40);
    const b = rect('b', 160, 20, 40, 40);
    const exclude = new Set(['a', 'b']);

    const members = [
      member('a', 100, 0, 40, 40),
      member('b', 160, 20, 40, 40),
    ];

    const result = computeGroupSnap(members, 3, 7, [a, b], exclude, scale, {
      snapToGrid: true,
      gridSize: GRID_SIZE,
    });

    expect(result.x).toBe(100);
    expect(result.y).toBe(0);

    const deltaX = result.x - 100;
    const deltaY = result.y - 0;
    expect(a.x + deltaX).toBe(100);
    expect(a.y + deltaY).toBe(0);
    expect(b.x + deltaX - (a.x + deltaX)).toBe(60);
    expect(b.y + deltaY - (a.y + deltaY)).toBe(20);
  });
});

describe('normalizeCoord', () => {
  it('rounds to nearest integer by default', () => {
    expect(normalizeCoord(99.6)).toBe(100);
    expect(normalizeCoord(100.4)).toBe(100);
  });

  it('snaps to grid size when provided', () => {
    expect(normalizeCoord(23, GRID_SIZE)).toBe(20);
    expect(normalizeCoord(31, GRID_SIZE)).toBe(40);
  });

  it('normalizes points', () => {
    expect(normalizePoint(100.2, 50.8)).toEqual({ x: 100, y: 51 });
  });
});

describe('normalizeGroupOffset', () => {
  it('preserves relative gaps after grid snap', () => {
    const positions = [
      { x: 101, y: 0 },
      { x: 161, y: 0 },
      { x: 221, y: 0 },
    ];
    const width = 40;
    const gap = 20;

    const result = normalizeGroupOffset(positions, 0, 0, GRID_SIZE);

    expect(result[1].x - (result[0].x + width)).toBe(gap);
    expect(result[2].x - (result[1].x + width)).toBe(gap);
  });

  it('applies uniform offset when pasting a row', () => {
    const positions = [
      { x: 0, y: 0 },
      { x: 60, y: 0 },
      { x: 120, y: 0 },
    ];

    const firstPaste = normalizeGroupOffset(positions, 23, 0, GRID_SIZE);
    const secondPaste = normalizeGroupOffset(firstPaste, 20, 0, GRID_SIZE);

    expect(secondPaste[1].x - (secondPaste[0].x + 40)).toBe(20);
    expect(secondPaste[2].x - (secondPaste[1].x + 40)).toBe(20);
  });
});

describe('canonicalGap', () => {
  it('returns median gap and resists outliers', () => {
    expect(canonicalGap([19, 20, 20])).toBe(20);
    expect(canonicalGap([21, 20, 19, 20])).toBe(20);
  });

  it('returns 0 when no positive gaps', () => {
    expect(canonicalGap([0, -2])).toBe(0);
  });
});

describe('sanitizeRectangleGeometry', () => {
  it('rounds geometry fields', () => {
    expect(
      sanitizeRectangleGeometry({ x: 10.6, y: 20.4, width: 39.8, height: 40.2 }),
    ).toEqual({ x: 11, y: 20, width: 40, height: 40 });
  });
});

describe('computeGroupBounds', () => {
  it('returns null for empty selection', () => {
    expect(computeGroupBounds([rect('a', 0, 0, 10, 10)], [])).toBeNull();
  });

  it('computes bounding box of selected rects', () => {
    const rects = [
      rect('a', 10, 20, 30, 40),
      rect('b', 50, 60, 20, 10),
    ];
    expect(computeGroupBounds(rects, ['a', 'b'])).toEqual({
      x: 10,
      y: 20,
      width: 60,
      height: 50,
    });
  });
});
