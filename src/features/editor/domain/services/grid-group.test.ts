import { describe, it, expect } from 'vitest';
import type { GridGroup, Rectangle } from '@/features/template';
import { redistributeGridMoves } from './grid-layout';
import {
  assignRectsToGroup,
  buildGridGroup,
  canGroupSelection,
  clearGridGroupFromRects,
  expandSelectionToGridGroups,
  getGridGroupForSelection,
  getGridGroupMemberIds,
  isFullGridGroupSelected,
  isSelectionLockedGridGroup,
  removeGridGroup,
  repairGridMetadata,
  resolveGridGroupId,
  translateGridGroupState,
  upsertGridGroup,
} from './grid-group';

const sampleGroup: GridGroup = {
  id: 'grid-1',
  rectIds: ['a', 'b', 'c'],
  cols: 3,
  rows: 1,
  bounds: { x: 0, y: 0, width: 300, height: 100 },
  settings: {
    cols: 3,
    rows: 1,
    align: 'top-left',
    rectWidth: 48,
    rectHeight: 36,
  },
};

const rectangles: Rectangle[] = [
  { id: 'a', x: 0, y: 0, width: 48, height: 36, fieldType: 'day', order: 0, gridGroupId: 'grid-1', gridCellIndex: 0 },
  { id: 'b', x: 100, y: 0, width: 48, height: 36, fieldType: 'day', order: 1, gridGroupId: 'grid-1', gridCellIndex: 1 },
  { id: 'c', x: 200, y: 0, width: 48, height: 36, fieldType: 'day', order: 2, gridGroupId: 'grid-1', gridCellIndex: 2 },
  { id: 'd', x: 0, y: 100, width: 48, height: 36, fieldType: 'day', order: 3 },
];

describe('expandSelectionToGridGroups', () => {
  it('expands partial group selection to full group', () => {
    expect(expandSelectionToGridGroups(['b'], rectangles)).toEqual(['a', 'b', 'c']);
  });

  it('keeps ungrouped ids', () => {
    expect(expandSelectionToGridGroups(['d'], rectangles)).toEqual(['d']);
  });

  it('expands via gridGroups when rect metadata is missing', () => {
    const stripped = rectangles.map(({ gridGroupId: _g, gridCellIndex: _c, ...rect }) => rect);
    const groups = { 'grid-1': sampleGroup };
    expect(expandSelectionToGridGroups(['b'], stripped, groups)).toEqual(['a', 'b', 'c']);
  });
});

describe('repairGridMetadata / resolveGridGroupId', () => {
  it('repairs missing gridGroupId from gridGroups', () => {
    const stripped = rectangles.map(({ gridGroupId: _g, gridCellIndex: _c, ...rect }) => rect);
    const repaired = repairGridMetadata(stripped, { 'grid-1': sampleGroup });
    expect(repaired[0].gridGroupId).toBe('grid-1');
    expect(repaired[0].gridCellIndex).toBe(0);
    expect(repaired[3].gridGroupId).toBeUndefined();
  });

  it('resolves group id from gridGroups fallback', () => {
    const stripped = rectangles.map(({ gridGroupId: _g, gridCellIndex: _c, ...rect }) => rect);
    const groups = { 'grid-1': sampleGroup };
    expect(resolveGridGroupId('b', stripped, groups)).toBe('grid-1');
    expect(getGridGroupMemberIds('grid-1', stripped, groups)).toEqual(['a', 'b', 'c']);
  });
});

describe('getGridGroupForSelection / isFullGridGroupSelected', () => {
  it('returns group when selection matches', () => {
    const groups = { 'grid-1': sampleGroup };
    expect(getGridGroupForSelection(['a', 'b', 'c'], groups)).toEqual(sampleGroup);
    expect(isFullGridGroupSelected(['a', 'b', 'c'], sampleGroup)).toBe(true);
  });

  it('returns null for partial selection', () => {
    const groups = { 'grid-1': sampleGroup };
    expect(getGridGroupForSelection(['a'], groups)).toBeNull();
  });
});

describe('isSelectionLockedGridGroup', () => {
  it('is true for full locked group selection', () => {
    expect(isSelectionLockedGridGroup(['a', 'b', 'c'], rectangles, { 'grid-1': sampleGroup })).toBe(true);
  });
});

describe('assignRectsToGroup / clearGridGroupFromRects', () => {
  it('assigns grid metadata to rects', () => {
    const ungrouped: Rectangle[] = [
      { id: 'a', x: 0, y: 0, width: 48, height: 36, fieldType: 'day', order: 0 },
      { id: 'b', x: 100, y: 0, width: 48, height: 36, fieldType: 'day', order: 1 },
    ];
    const assigned = assignRectsToGroup(ungrouped, { ...sampleGroup, rectIds: ['a', 'b'], cols: 2, rows: 1 });
    expect(assigned[0].gridGroupId).toBe('grid-1');
    expect(assigned[0].gridCellIndex).toBe(0);
    expect(assigned[1].gridCellIndex).toBe(1);
  });

  it('clears grid metadata from rects', () => {
    const cleared = clearGridGroupFromRects(rectangles, 'grid-1');
    expect(cleared[0].gridGroupId).toBeUndefined();
    expect(cleared[3].id).toBe('d');
  });
});

describe('upsertGridGroup / removeGridGroup', () => {
  it('upserts and removes groups', () => {
    const upserted = upsertGridGroup(undefined, sampleGroup);
    expect(upserted['grid-1']).toEqual(sampleGroup);
    expect(removeGridGroup(upserted, 'grid-1')).toBeUndefined();
  });
});

describe('buildGridGroup', () => {
  it('builds metadata from rect ids and settings', () => {
    const group = buildGridGroup(
      ['a', 'b'],
      { x: 0, y: 0, width: 200, height: 36 },
      { cols: 2, rows: 1, align: 'top-left', rectWidth: 48, rectHeight: 36 },
    );
    expect(group.rectIds).toEqual(['a', 'b']);
    expect(group.cols).toBe(2);
  });
});

describe('canGroupSelection', () => {
  it('allows grouping ungrouped multi-select', () => {
    const ungrouped: Rectangle[] = [
      { id: 'x', x: 0, y: 0, width: 48, height: 36, fieldType: 'day', order: 0 },
      { id: 'y', x: 50, y: 0, width: 48, height: 36, fieldType: 'day', order: 1 },
    ];
    expect(canGroupSelection(['x', 'y'], ungrouped)).toBe(true);
  });

  it('disallows grouping when selection includes grouped rects', () => {
    expect(canGroupSelection(['a', 'd'], rectangles)).toBe(false);
  });
});

describe('translateGridGroupState', () => {
  it('translates bounds and member rects together', () => {
    const groups = { 'grid-1': sampleGroup };
    const result = translateGridGroupState(rectangles, groups, 'grid-1', 20, 30);

    expect(result).not.toBeNull();
    expect(result!.gridGroups['grid-1'].bounds).toEqual({
      x: 20,
      y: 30,
      width: 300,
      height: 100,
    });
    expect(result!.rectangles.find(rect => rect.id === 'a')).toMatchObject({ x: 20, y: 30 });
    expect(result!.rectangles.find(rect => rect.id === 'b')).toMatchObject({ x: 120, y: 30 });
    expect(result!.rectangles.find(rect => rect.id === 'c')).toMatchObject({ x: 220, y: 30 });
    expect(result!.rectangles.find(rect => rect.id === 'd')).toMatchObject({ x: 0, y: 100 });
  });

  it('keeps redistributed positions aligned with translated bounds', () => {
    const groups = { 'grid-1': sampleGroup };
    const result = translateGridGroupState(rectangles, groups, 'grid-1', 50, 40);
    const group = result!.gridGroups['grid-1'];
    const moves = redistributeGridMoves(group.rectIds, group.bounds, {
      cols: group.settings.cols,
      rows: group.settings.rows,
      rectSize: {
        width: group.settings.rectWidth,
        height: group.settings.rectHeight,
      },
      align: group.settings.align,
    });

    for (const move of moves) {
      const rect = result!.rectangles.find(item => item.id === move.id);
      expect(rect).toMatchObject({ x: move.x, y: move.y });
    }
  });

  it('returns null for zero delta', () => {
    expect(translateGridGroupState(rectangles, { 'grid-1': sampleGroup }, 'grid-1', 0, 0)).toBeNull();
  });
});
