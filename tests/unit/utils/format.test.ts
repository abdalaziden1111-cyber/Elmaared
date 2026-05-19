import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatDate,
  formatDateShort,
  formatPhone,
  formatRfqNumber,
  timeAgo,
} from '@/lib/utils/format';

describe('formatCurrency', () => {
  it('formats whole numbers', () => {
    expect(formatCurrency(87500)).toBe('87,500 ﷼');
  });

  it('formats decimals up to 2 places', () => {
    expect(formatCurrency(1234.56)).toBe('1,234.56 ﷼');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('0 ﷼');
  });

  it('formats large numbers with grouping', () => {
    expect(formatCurrency(1500000)).toBe('1,500,000 ﷼');
  });

  it('formats negative numbers (still renders)', () => {
    expect(formatCurrency(-100)).toBe('-100 ﷼');
  });

  it('returns placeholder for NaN', () => {
    expect(formatCurrency(NaN)).toBe('— ﷼');
  });

  it('returns placeholder for Infinity', () => {
    expect(formatCurrency(Infinity)).toBe('— ﷼');
  });

  it('returns placeholder for null', () => {
    expect(formatCurrency(null)).toBe('— ﷼');
  });

  it('returns placeholder for undefined', () => {
    expect(formatCurrency(undefined)).toBe('— ﷼');
  });

  it('rounds .005 cleanly with banker-friendly default', () => {
    // Intl follows browser rounding rules; we just want no garbage
    const out = formatCurrency(0.005);
    expect(out).toMatch(/[\d.,]+ ﷼/);
  });
});

describe('formatDate', () => {
  it('formats a Date object', () => {
    const d = new Date('2026-09-15T00:00:00Z');
    const out = formatDate(d, 'en');
    expect(out).toMatch(/2026/);
  });

  it('formats an ISO date string', () => {
    const out = formatDate('2026-09-15', 'en');
    expect(out).toMatch(/2026/);
  });

  it('returns placeholder for invalid string', () => {
    expect(formatDate('not-a-date')).toBe('—');
  });

  it('returns placeholder for null', () => {
    expect(formatDate(null)).toBe('—');
  });

  it('returns placeholder for empty string', () => {
    expect(formatDate('')).toBe('—');
  });
});

describe('formatDateShort', () => {
  it('formats valid date', () => {
    const out = formatDateShort('2026-09-15');
    // Default locale 'ar' uses ar-SA which renders Arabic-Indic numerals
    // (٢٠٢٦). Accept either form so a numerals-toggle later doesn't break.
    expect(out).toMatch(/2026|٢٠٢٦/);
  });

  it('returns placeholder for invalid', () => {
    expect(formatDateShort('garbage')).toBe('—');
  });
});

describe('formatPhone', () => {
  it('formats Saudi phone with leading +966', () => {
    expect(formatPhone('+966512345678')).toBe('+966 51 234 5678');
  });

  it('returns non-Saudi numbers as-is', () => {
    expect(formatPhone('0512345678')).toBe('0512345678');
  });

  it('handles spaces and dashes inside +966 number', () => {
    expect(formatPhone('+966 51 234 5678')).toBe('+966 51 234 5678');
    expect(formatPhone('+966-51-234-5678')).toBe('+966 51 234 5678');
  });

  it('returns placeholder for null', () => {
    expect(formatPhone(null)).toBe('—');
  });

  it('returns placeholder for empty string', () => {
    expect(formatPhone('')).toBe('—');
  });

  it('returns input untouched if too short to format', () => {
    expect(formatPhone('+96651234')).toBe('+96651234');
  });
});

describe('formatRfqNumber', () => {
  it('passes through valid number', () => {
    expect(formatRfqNumber('RFQ-2026-00001')).toBe('RFQ-2026-00001');
  });

  it('returns placeholder for null/undefined', () => {
    expect(formatRfqNumber(null)).toBe('—');
    expect(formatRfqNumber(undefined)).toBe('—');
  });

  it('returns placeholder for empty string', () => {
    expect(formatRfqNumber('')).toBe('—');
  });
});

describe('timeAgo', () => {
  it('returns "الآن" for now', () => {
    expect(timeAgo(new Date(), 'ar')).toBe('الآن');
  });

  it('returns "just now" for now (en)', () => {
    expect(timeAgo(new Date(), 'en')).toBe('just now');
  });

  it('formats minutes (ar)', () => {
    const d = new Date(Date.now() - 5 * 60 * 1000);
    expect(timeAgo(d, 'ar')).toMatch(/منذ 5 دقيقة/);
  });

  it('formats minutes (en)', () => {
    const d = new Date(Date.now() - 5 * 60 * 1000);
    expect(timeAgo(d, 'en')).toBe('5m ago');
  });

  it('formats hours', () => {
    const d = new Date(Date.now() - 3 * 60 * 60 * 1000);
    expect(timeAgo(d, 'en')).toBe('3h ago');
  });

  it('formats days', () => {
    const d = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    expect(timeAgo(d, 'en')).toBe('2d ago');
  });

  it('falls back to formatDate for very old dates', () => {
    const d = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const out = timeAgo(d, 'en');
    expect(out).not.toMatch(/d ago/);
  });

  it('returns "today" for future dates (ar)', () => {
    const d = new Date(Date.now() + 5 * 60 * 1000);
    expect(timeAgo(d, 'ar')).toBe('اليوم');
  });

  it('returns "today" for future dates (en)', () => {
    const d = new Date(Date.now() + 5 * 60 * 1000);
    expect(timeAgo(d, 'en')).toBe('today');
  });

  it('returns placeholder for invalid date', () => {
    expect(timeAgo('not-a-date')).toBe('—');
    expect(timeAgo(null)).toBe('—');
  });
});
