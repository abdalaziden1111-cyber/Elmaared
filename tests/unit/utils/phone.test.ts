import { describe, it, expect } from 'vitest';
import { normalizeSaudiPhone, isValidSaudiPhone } from '@/lib/utils/phone';

const CANONICAL = '+966512345678';

describe('normalizeSaudiPhone — accepted formats', () => {
  it('returns canonical input untouched', () => {
    expect(normalizeSaudiPhone(CANONICAL)).toBe(CANONICAL);
  });

  it('handles local with leading zero (0512345678)', () => {
    expect(normalizeSaudiPhone('0512345678')).toBe(CANONICAL);
  });

  it('handles local without leading zero (512345678)', () => {
    expect(normalizeSaudiPhone('512345678')).toBe(CANONICAL);
  });

  it('handles 00966 international form', () => {
    expect(normalizeSaudiPhone('00966512345678')).toBe(CANONICAL);
  });

  it('handles 966 without + or 00', () => {
    expect(normalizeSaudiPhone('966512345678')).toBe(CANONICAL);
  });

  it('strips spaces', () => {
    expect(normalizeSaudiPhone('+966 51 234 5678')).toBe(CANONICAL);
  });

  it('strips dashes', () => {
    expect(normalizeSaudiPhone('+966-51-234-5678')).toBe(CANONICAL);
  });

  it('strips parentheses', () => {
    expect(normalizeSaudiPhone('+966(51)234-5678')).toBe(CANONICAL);
  });

  it('handles mixed whitespace', () => {
    expect(normalizeSaudiPhone('  +966 512 345 678  ')).toBe(CANONICAL);
  });
});

describe('normalizeSaudiPhone — rejected', () => {
  it('returns null for empty string', () => {
    expect(normalizeSaudiPhone('')).toBeNull();
  });

  it('returns null for null/undefined', () => {
    expect(normalizeSaudiPhone(null)).toBeNull();
    expect(normalizeSaudiPhone(undefined)).toBeNull();
  });

  it('returns null for too short (< 9 digits after country)', () => {
    expect(normalizeSaudiPhone('+96651234')).toBeNull();
  });

  it('returns null for too long', () => {
    expect(normalizeSaudiPhone('+9665123456789')).toBeNull();
  });

  it('returns null for letters', () => {
    expect(normalizeSaudiPhone('+96651234abcd')).toBeNull();
  });

  it('returns null for non-Saudi country (UAE)', () => {
    // +971 50 1234567 — 9 digits after stripping, but no Saudi prefix detection
    // results in `97150123456` (11 digits), which fails the 9-digit check.
    expect(normalizeSaudiPhone('+971501234567')).toBeNull();
  });

  it('returns null for purely garbage input', () => {
    expect(normalizeSaudiPhone('not a phone')).toBeNull();
  });
});

describe('isValidSaudiPhone', () => {
  it('returns true for canonical format', () => {
    expect(isValidSaudiPhone(CANONICAL)).toBe(true);
  });

  it('returns true for local format', () => {
    expect(isValidSaudiPhone('0512345678')).toBe(true);
  });

  it('returns false for empty', () => {
    expect(isValidSaudiPhone('')).toBe(false);
  });

  it('returns false for null', () => {
    expect(isValidSaudiPhone(null)).toBe(false);
  });
});
