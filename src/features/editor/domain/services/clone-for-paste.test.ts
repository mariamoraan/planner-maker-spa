import { describe, expect, it } from 'vitest';
import type { Rectangle, TemplateImage } from '@/features/template';
import { preparePastedSelection } from '@/features/editor/domain/services/clone-for-paste';

function makeRect(
  overrides: Partial<Rectangle> & Pick<Rectangle, 'id' | 'fieldType'>,
): Rectangle {
  return {
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    order: 0,
    ...overrides,
  };
}

describe('preparePastedSelection', () => {
  it('creates new grid and binding ids so paste is independent', () => {
    const rects = [0, 1].map(i =>
      makeRect({
        id: `r${i}`,
        fieldType: 'month',
        x: i * 20,
        y: 0,
        order: i,
        gridGroupId: 'grid-1',
        gridCellIndex: i,
        bindingGroupId: 'bind-1',
        sequenceIndex: i,
      }),
    );

    const sourceGridGroups: NonNullable<TemplateImage['gridGroups']> = {
      'grid-1': {
        id: 'grid-1',
        rectIds: ['r0', 'r1'],
        cols: 2,
        rows: 1,
        bounds: { x: 0, y: 0, width: 40, height: 10 },
        settings: {
          cols: 2,
          rows: 1,
          rectWidth: 10,
          rectHeight: 10,
          alignH: 'left',
          alignV: 'top',
        },
        bindingGroupId: 'bind-1',
      },
    };
    const sourceBindingGroups = {
      'bind-1': { id: 'bind-1', source: 'yearMonths' as const },
    };

    const pasted = preparePastedSelection({
      copiedRects: rects,
      offsetX: 50,
      offsetY: 30,
      existingRectCount: 2,
      sourceGridGroups,
      sourceBindingGroups,
      existingBindingGroups: sourceBindingGroups,
      pageType: 'yearly-calendar',
    });

    expect(pasted.rectangles).toHaveLength(2);
    expect(pasted.rectangles[0].id).not.toBe('r0');
    expect(pasted.rectangles[0].gridGroupId).not.toBe('grid-1');
    expect(pasted.rectangles[0].bindingGroupId).not.toBe('bind-1');
    expect(pasted.rectangles[0].gridGroupId).toBe(pasted.rectangles[1].gridGroupId);
    expect(pasted.rectangles[0].bindingGroupId).toBe(
      pasted.rectangles[1].bindingGroupId,
    );
    expect(pasted.rectangles[0].x).toBe(50);
    expect(pasted.rectangles[1].x).toBe(70);

    const newGridId = pasted.rectangles[0].gridGroupId!;
    const newBindId = pasted.rectangles[0].bindingGroupId!;
    expect(pasted.gridGroups[newGridId]).toBeTruthy();
    expect(pasted.gridGroups[newGridId].rectIds).toEqual([
      pasted.rectangles[0].id,
      pasted.rectangles[1].id,
    ]);
    expect(pasted.gridGroups[newGridId].bounds).toEqual({
      x: 50,
      y: 30,
      width: 40,
      height: 10,
    });
    expect(pasted.gridGroups[newGridId].bindingGroupId).toBe(newBindId);
    expect(pasted.bindingGroups[newBindId]?.source).toBe('yearMonths');
  });

  it('assigns a fresh yearMonthIndex when pasting monthDays on yearly', () => {
    const rect = makeRect({
      id: 'd0',
      fieldType: 'day',
      gridGroupId: 'grid-jan',
      bindingGroupId: 'bind-jan',
      sequenceIndex: 0,
    });

    const pasted = preparePastedSelection({
      copiedRects: [rect],
      offsetX: 10,
      offsetY: 10,
      existingRectCount: 0,
      sourceGridGroups: {
        'grid-jan': {
          id: 'grid-jan',
          rectIds: ['d0'],
          cols: 1,
          rows: 1,
          bounds: { x: 0, y: 0, width: 10, height: 10 },
          settings: {
            cols: 1,
            rows: 1,
            rectWidth: 10,
            rectHeight: 10,
            alignH: 'left',
            alignV: 'top',
          },
          bindingGroupId: 'bind-jan',
        },
      },
      sourceBindingGroups: {
        'bind-jan': {
          id: 'bind-jan',
          source: 'monthDays',
          yearMonthIndex: 0,
        },
      },
      existingBindingGroups: {
        'bind-jan': {
          id: 'bind-jan',
          source: 'monthDays',
          yearMonthIndex: 0,
        },
      },
      pageType: 'yearly-calendar',
    });

    const newBindId = pasted.rectangles[0].bindingGroupId!;
    expect(pasted.bindingGroups[newBindId]?.yearMonthIndex).toBe(1);
  });

  it('preserves yearMonthIndex when transferring onto an empty face', () => {
    const rect = makeRect({
      id: 'd0',
      fieldType: 'day',
      gridGroupId: 'grid-jul',
      bindingGroupId: 'bind-jul',
      sequenceIndex: 0,
    });

    const pasted = preparePastedSelection({
      copiedRects: [rect],
      offsetX: 10,
      offsetY: 10,
      existingRectCount: 0,
      sourceGridGroups: {
        'grid-jul': {
          id: 'grid-jul',
          rectIds: ['d0'],
          cols: 1,
          rows: 1,
          bounds: { x: 0, y: 0, width: 10, height: 10 },
          settings: {
            cols: 1,
            rows: 1,
            rectWidth: 10,
            rectHeight: 10,
            alignH: 'left',
            alignV: 'top',
          },
          bindingGroupId: 'bind-jul',
        },
      },
      sourceBindingGroups: {
        'bind-jul': {
          id: 'bind-jul',
          source: 'monthDays',
          yearMonthIndex: 6,
        },
      },
      existingBindingGroups: {},
      siblingBindingGroups: {
        'bind-jan': { id: 'bind-jan', source: 'monthDays', yearMonthIndex: 0 },
      },
      pageType: 'yearly-calendar',
    });

    const newBindId = pasted.rectangles[0].bindingGroupId!;
    expect(pasted.bindingGroups[newBindId]?.yearMonthIndex).toBe(6);
  });

  it('skips preferred index when the sibling face already uses it', () => {
    const rect = makeRect({
      id: 'd0',
      fieldType: 'day',
      bindingGroupId: 'bind-jan',
      sequenceIndex: 0,
    });

    const pasted = preparePastedSelection({
      copiedRects: [rect],
      offsetX: 0,
      offsetY: 0,
      existingRectCount: 0,
      sourceBindingGroups: {
        'bind-jan': {
          id: 'bind-jan',
          source: 'monthDays',
          yearMonthIndex: 0,
        },
      },
      existingBindingGroups: {},
      siblingBindingGroups: {
        'bind-left': { id: 'bind-left', source: 'monthDays', yearMonthIndex: 0 },
      },
      pageType: 'yearly-calendar',
    });

    const newBindId = pasted.rectangles[0].bindingGroupId!;
    expect(pasted.bindingGroups[newBindId]?.yearMonthIndex).toBe(1);
  });
});
