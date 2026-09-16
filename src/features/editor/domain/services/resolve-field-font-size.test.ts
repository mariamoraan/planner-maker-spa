import { describe, it, expect } from 'vitest';
import { resolveFieldFontSize } from './resolve-field-font-size';

describe('resolveFieldFontSize', () => {
  it('uses 70% of height when text fits', () => {
    const fontSize = resolveFieldFontSize(200, 100, '5', () => 20);
    expect(fontSize).toBe(70);
  });

  it('shrinks font so text fits within 90% of width', () => {
    // At 70px, measure returns 180; maxWidth = 100 * 0.9 = 90 → scale to 35
    const fontSize = resolveFieldFontSize(100, 100, 'septiembre', size => (size / 70) * 180);
    expect(fontSize).toBeCloseTo(35, 5);
  });

  it('returns minimum font size for zero dimensions', () => {
    expect(resolveFieldFontSize(0, 100, 'a', () => 10)).toBe(4);
  });

  it('skips measuring empty text', () => {
    let called = false;
    const fontSize = resolveFieldFontSize(100, 100, '', () => {
      called = true;
      return 0;
    });
    expect(called).toBe(false);
    expect(fontSize).toBe(70);
  });
});
