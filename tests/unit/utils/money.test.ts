import { describe, it, expect } from 'vitest';
import {
  splitMoneyEvenly,
  percentOf,
  sumMoney,
  moneyEquals,
} from '@/lib/utils/money';

describe('splitMoneyEvenly', () => {
  it('splits 100 into 4 even parts', () => {
    expect(splitMoneyEvenly(100, 4)).toEqual([25, 25, 25, 25]);
  });

  it('splits 10.00 into 3 with first part absorbing remainder', () => {
    const parts = splitMoneyEvenly(10, 3);
    expect(parts).toEqual([3.34, 3.33, 3.33]);
    // Use sumMoney (halala precision) to verify, NOT Array#reduce — naive
    // float accumulation drifts (3.34+3.33+3.33 = 10.000000000000002 in JS).
    expect(sumMoney(parts)).toBe(10);
  });

  it('handles fractional input cleanly', () => {
    const parts = splitMoneyEvenly(99.99, 2);
    expect(sumMoney(parts)).toBe(99.99);
  });

  it('returns single-element array for parts=1', () => {
    expect(splitMoneyEvenly(50, 1)).toEqual([50]);
  });

  it('returns empty array for parts=0', () => {
    expect(splitMoneyEvenly(100, 0)).toEqual([]);
  });

  it('returns empty array for negative parts', () => {
    expect(splitMoneyEvenly(100, -3)).toEqual([]);
  });

  it('returns empty array for non-integer parts', () => {
    expect(splitMoneyEvenly(100, 2.5)).toEqual([]);
  });

  it('returns empty array for non-finite amount', () => {
    expect(splitMoneyEvenly(NaN, 3)).toEqual([]);
    expect(splitMoneyEvenly(Infinity, 3)).toEqual([]);
  });

  it('handles zero amount', () => {
    expect(splitMoneyEvenly(0, 3)).toEqual([0, 0, 0]);
  });

  it('preserves total when amount is a tricky decimal', () => {
    // 87500 / 3 has rounding pain — verify via halala-precision sum
    const parts = splitMoneyEvenly(87500, 3);
    expect(sumMoney(parts)).toBe(87500);
  });
});

describe('percentOf', () => {
  it('computes percentage correctly', () => {
    expect(percentOf(100, 0.05)).toBe(5);
  });

  it('rounds to halala precision', () => {
    expect(percentOf(33.33, 0.15)).toBe(5);
  });

  it('handles zero amount', () => {
    expect(percentOf(0, 0.15)).toBe(0);
  });

  it('handles zero rate', () => {
    expect(percentOf(100, 0)).toBe(0);
  });

  it('handles negative amount/rate', () => {
    expect(percentOf(-100, 0.05)).toBe(-5);
    expect(percentOf(100, -0.05)).toBe(-5);
  });

  it('throws on NaN amount', () => {
    expect(() => percentOf(NaN, 0.05)).toThrow();
  });

  it('throws on Infinity rate', () => {
    expect(() => percentOf(100, Infinity)).toThrow();
  });
});

describe('sumMoney', () => {
  it('sums an array', () => {
    expect(sumMoney([1, 2, 3, 4])).toBe(10);
  });

  it('handles fractional values without drift', () => {
    expect(sumMoney([0.1, 0.2])).toBe(0.3);
  });

  it('handles 100x 0.01 = 1.00', () => {
    const arr = new Array(100).fill(0.01);
    expect(sumMoney(arr)).toBe(1);
  });

  it('returns 0 for empty array', () => {
    expect(sumMoney([])).toBe(0);
  });

  it('returns 0 for non-array input', () => {
    // @ts-expect-error — runtime check
    expect(sumMoney(null)).toBe(0);
  });

  it('skips non-finite values', () => {
    expect(sumMoney([1, NaN, 2, Infinity, 3])).toBe(6);
  });
});

describe('moneyEquals', () => {
  it('treats float-drift values as equal at halala precision', () => {
    // 0.1 + 0.2 = 0.30000000000000004 in JS, but halala rounding yields 30 == 30
    expect(moneyEquals(0.1 + 0.2, 0.3)).toBe(true);
  });

  it('catches genuinely different cents (not float drift)', () => {
    // 1.005 rounds to 100 halalas in JS due to representation,
    // 1.01 rounds to 101 — they really are different
    expect(moneyEquals(1.005, 1.01)).toBe(false);
  });

  it('catches differences at the cent', () => {
    expect(moneyEquals(1.00, 1.01)).toBe(false);
  });

  it('returns false for non-finite operands', () => {
    expect(moneyEquals(NaN, NaN)).toBe(false);
    expect(moneyEquals(Infinity, Infinity)).toBe(false);
  });
});
