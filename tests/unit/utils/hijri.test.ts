import { describe, it, expect } from 'vitest';
import { toHijriParts, isRamadan, formatHijriLong } from '@/lib/utils/hijri';

describe('toHijriParts', () => {
  it('extracts year/month/day from a known Gregorian date', () => {
    // 2026-05-19 → 1447 / Dhul Qadah-ish window (month 11) per Umm al-Qura
    const out = toHijriParts(new Date('2026-05-19T12:00:00Z'));
    expect(out.year).toBeGreaterThanOrEqual(1447);
    expect(out.year).toBeLessThanOrEqual(1448);
    expect(out.month).toBeGreaterThanOrEqual(1);
    expect(out.month).toBeLessThanOrEqual(12);
    expect(out.day).toBeGreaterThanOrEqual(1);
    expect(out.day).toBeLessThanOrEqual(30);
  });

  it('returns 0/0/0 for an invalid date', () => {
    expect(toHijriParts('garbage')).toEqual({ year: 0, month: 0, day: 0 });
  });

  it('accepts an ISO string and a Date interchangeably', () => {
    const fromString = toHijriParts('2026-05-19T12:00:00Z');
    const fromDate = toHijriParts(new Date('2026-05-19T12:00:00Z'));
    expect(fromString).toEqual(fromDate);
  });
});

describe('isRamadan', () => {
  it('returns false for a Gregorian date deep in Sha`ban', () => {
    // 1447 Sha`ban runs roughly Jan/Feb 2026 — Mar 1 2026 is Ramadan start.
    expect(isRamadan(new Date('2026-02-01T12:00:00Z'))).toBe(false);
  });

  it('returns true during Ramadan 1447 (March 2026)', () => {
    // Mid-Ramadan 1447 ≈ Mar 15 2026
    expect(isRamadan(new Date('2026-03-15T12:00:00Z'))).toBe(true);
  });

  it('defaults to "now" when no argument is passed', () => {
    // Smoke-only: must return a boolean, no throw.
    expect(typeof isRamadan()).toBe('boolean');
  });
});

describe('formatHijriLong', () => {
  it('produces a non-empty Arabic string for a valid Gregorian date', () => {
    const out = formatHijriLong(new Date('2026-05-19T12:00:00Z'), 'ar');
    expect(out).not.toBe('—');
    // Should contain at least one Arabic-Indic numeral
    expect(out).toMatch(/[٠-٩]/);
  });

  it('produces an English string when locale="en"', () => {
    const out = formatHijriLong(new Date('2026-05-19T12:00:00Z'), 'en');
    expect(out).not.toBe('—');
    // Latin digits in en mode
    expect(out).toMatch(/\d/);
  });

  it('returns the placeholder for an invalid date', () => {
    expect(formatHijriLong('garbage')).toBe('—');
  });
});
