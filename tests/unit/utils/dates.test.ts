import { describe, it, expect } from 'vitest';
import {
  toValidDate,
  daysBetween,
  isPastDate,
  isFutureDate,
  isWithinNextDays,
  isOlderThanNDays,
  addDays,
  addBusinessDays,
  startOfUtcDay,
  ONE_DAY_MS,
} from '@/lib/utils/dates';

describe('toValidDate', () => {
  it('accepts Date objects', () => {
    const d = new Date('2026-09-15');
    expect(toValidDate(d)).toEqual(d);
  });

  it('accepts ISO strings', () => {
    expect(toValidDate('2026-09-15')?.getUTCFullYear()).toBe(2026);
  });

  it('accepts timestamps (number)', () => {
    expect(toValidDate(0)?.getTime()).toBe(0);
  });

  it('returns null for invalid string', () => {
    expect(toValidDate('garbage')).toBeNull();
  });

  it('returns null for null/undefined/empty', () => {
    expect(toValidDate(null)).toBeNull();
    expect(toValidDate(undefined)).toBeNull();
    expect(toValidDate('')).toBeNull();
  });
});

describe('daysBetween', () => {
  it('returns whole days regardless of direction', () => {
    expect(daysBetween('2026-09-15', '2026-09-20')).toBe(5);
    expect(daysBetween('2026-09-20', '2026-09-15')).toBe(5);
  });

  it('returns 0 for same day', () => {
    expect(daysBetween('2026-09-15', '2026-09-15')).toBe(0);
  });

  it('handles a year apart', () => {
    expect(daysBetween('2025-09-15', '2026-09-15')).toBe(365);
  });

  it('returns null for invalid input', () => {
    expect(daysBetween('garbage', '2026-09-15')).toBeNull();
    expect(daysBetween(null, '2026-09-15')).toBeNull();
  });
});

describe('isPastDate', () => {
  it('returns true for clearly past', () => {
    expect(isPastDate('2020-01-01')).toBe(true);
  });

  it('returns false for clearly future', () => {
    expect(isPastDate('2099-01-01')).toBe(false);
  });

  it('returns false for null/invalid', () => {
    expect(isPastDate(null)).toBe(false);
    expect(isPastDate('garbage')).toBe(false);
  });

  it('respects custom now', () => {
    const now = new Date('2026-06-01');
    expect(isPastDate('2026-05-01', now)).toBe(true);
    expect(isPastDate('2026-07-01', now)).toBe(false);
  });
});

describe('isFutureDate', () => {
  it('returns true for clearly future', () => {
    expect(isFutureDate('2099-01-01')).toBe(true);
  });

  it('returns false for past', () => {
    expect(isFutureDate('2020-01-01')).toBe(false);
  });

  it('returns false for null', () => {
    expect(isFutureDate(null)).toBe(false);
  });
});

describe('isWithinNextDays', () => {
  const now = new Date('2026-06-01T00:00:00Z');

  it('returns true for date inside the window', () => {
    expect(isWithinNextDays('2026-06-03', 5, now)).toBe(true);
  });

  it('returns true at the exact upper bound', () => {
    const target = new Date(now.getTime() + 5 * ONE_DAY_MS);
    expect(isWithinNextDays(target, 5, now)).toBe(true);
  });

  it('returns false beyond the window', () => {
    expect(isWithinNextDays('2026-06-15', 5, now)).toBe(false);
  });

  it('returns false for past dates', () => {
    expect(isWithinNextDays('2026-05-01', 5, now)).toBe(false);
  });

  it('treats negative N as zero', () => {
    expect(isWithinNextDays('2026-06-02', -3, now)).toBe(false);
  });

  it('returns false for non-finite N', () => {
    expect(isWithinNextDays('2026-06-02', NaN, now)).toBe(false);
    expect(isWithinNextDays('2026-06-02', Infinity, now)).toBe(false);
  });
});

describe('isOlderThanNDays', () => {
  const now = new Date('2026-06-15T00:00:00Z');

  it('returns true for clearly older', () => {
    expect(isOlderThanNDays('2026-05-01', 14, now)).toBe(true);
  });

  it('returns false at exactly the cutoff (< not ≤)', () => {
    const target = new Date(now.getTime() - 14 * ONE_DAY_MS);
    expect(isOlderThanNDays(target, 14, now)).toBe(false);
  });

  it('returns false for newer', () => {
    expect(isOlderThanNDays('2026-06-10', 14, now)).toBe(false);
  });

  it('returns false for negative N', () => {
    expect(isOlderThanNDays('2026-05-01', -1, now)).toBe(false);
  });

  it('returns false for non-finite N', () => {
    expect(isOlderThanNDays('2026-05-01', NaN, now)).toBe(false);
  });
});

describe('addDays', () => {
  it('adds positive days', () => {
    expect(addDays('2026-06-01', 5)?.toISOString().slice(0, 10)).toBe('2026-06-06');
  });

  it('subtracts negative days', () => {
    expect(addDays('2026-06-10', -5)?.toISOString().slice(0, 10)).toBe('2026-06-05');
  });

  it('returns null for invalid date', () => {
    expect(addDays('garbage', 5)).toBeNull();
  });

  it('returns null for non-finite N', () => {
    expect(addDays('2026-06-01', NaN)).toBeNull();
    expect(addDays('2026-06-01', Infinity)).toBeNull();
  });
});

describe('addBusinessDays', () => {
  it('skips weekend (Sat-Sun)', () => {
    // 2026-06-05 is a Friday (UTC). +1 business day → Monday 2026-06-08
    const out = addBusinessDays('2026-06-05', 1);
    expect(out?.toISOString().slice(0, 10)).toBe('2026-06-08');
  });

  it('counts Mon-Fri normally', () => {
    // 2026-06-01 is a Monday. +4 business days → Friday 2026-06-05
    const out = addBusinessDays('2026-06-01', 4);
    expect(out?.toISOString().slice(0, 10)).toBe('2026-06-05');
  });

  it('walks backwards with negative N', () => {
    // 2026-06-08 is Monday. -1 business day → Friday 2026-06-05
    const out = addBusinessDays('2026-06-08', -1);
    expect(out?.toISOString().slice(0, 10)).toBe('2026-06-05');
  });

  it('zero is identity', () => {
    const out = addBusinessDays('2026-06-05', 0);
    expect(out?.toISOString().slice(0, 10)).toBe('2026-06-05');
  });

  it('returns null on invalid input', () => {
    expect(addBusinessDays('garbage', 5)).toBeNull();
    expect(addBusinessDays('2026-06-01', NaN)).toBeNull();
  });
});

describe('startOfUtcDay', () => {
  it('zeros out the time', () => {
    const out = startOfUtcDay('2026-06-15T13:45:32Z');
    expect(out?.toISOString()).toBe('2026-06-15T00:00:00.000Z');
  });

  it('returns null for invalid', () => {
    expect(startOfUtcDay('garbage')).toBeNull();
  });
});
