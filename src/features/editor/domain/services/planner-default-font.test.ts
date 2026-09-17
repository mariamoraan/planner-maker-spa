import { describe, expect, it } from 'vitest';
import type { Rectangle } from '@/features/template';
import {
  applyPlannerFontToRectangle,
  shouldFollowPlannerFont,
} from './planner-default-font';

function makeRect(style?: Rectangle['style']): Rectangle {
  return {
    id: 'r1',
    x: 0,
    y: 0,
    width: 40,
    height: 20,
    fieldType: 'day',
    order: 0,
    style,
  };
}

describe('planner-default-font', () => {
  it('treats missing or matching font as following the planner default', () => {
    expect(shouldFollowPlannerFont(makeRect(), 'gloria')).toBe(true);
    expect(shouldFollowPlannerFont(makeRect({ fontId: 'gloria', color: '#000', bold: false, italic: false, textCase: 'default', textAlign: 'center' }), 'gloria')).toBe(true);
    expect(shouldFollowPlannerFont(makeRect({ fontId: 'lato', color: '#000', bold: false, italic: false, textCase: 'default', textAlign: 'center' }), 'gloria')).toBe(false);
  });

  it('applies the next planner font while preserving other style fields', () => {
    const rect = makeRect({
      fontId: 'gloria',
      color: '#ff0000',
      bold: true,
      italic: false,
      textCase: 'uppercase',
      textAlign: 'left',
    });
    const next = applyPlannerFontToRectangle(rect, 'playfair');
    expect(next.style?.fontId).toBe('playfair');
    expect(next.style?.color).toBe('#ff0000');
    expect(next.style?.bold).toBe(true);
    expect(next.style?.textCase).toBe('uppercase');
    expect(next.style?.textAlign).toBe('left');
  });
});
