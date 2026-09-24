import { describe, expect, it } from 'vitest';
import {
  advancePageCountWithParity,
  sumPageCountWithParity,
} from './spread-export';

describe('spread-export parity', () => {
  it('inserts a blank before the first spread so L is even', () => {
    // start at 0 → next would be 1 (odd) → blank + L + R = 3
    expect(advancePageCountWithParity(0, 2)).toBe(3);
  });

  it('does not insert a blank when next page is already even', () => {
    // count 1 → next is 2 (even) → L + R = 3 total from here... 1+2=3
    expect(advancePageCountWithParity(1, 2)).toBe(3);
  });

  it('leaves single pages unchanged', () => {
    expect(advancePageCountWithParity(0, 1)).toBe(1);
    expect(advancePageCountWithParity(1, 1)).toBe(2);
  });

  it('accumulates cover + spread correctly', () => {
    // cover (1) then spread: blank + 2 = total 4? 
    // after cover count=1, spread → next even → +2 = 3
    expect(sumPageCountWithParity([1, 2])).toBe(3);
    // two spreads from empty: blank+2 + blank? after first count=3, next=4 even, +2 = 5
    expect(sumPageCountWithParity([2, 2])).toBe(5);
  });
});
