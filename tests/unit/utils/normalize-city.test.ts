import { describe, it, expect } from 'vitest';
import { normalizeCityName } from '@/lib/utils/normalize-city';

describe('normalizeCityName (B-012)', () => {
  it('maps the canonical English value to Arabic', () => {
    expect(normalizeCityName('Riyadh')).toBe('الرياض');
  });

  it('is case-insensitive on the English side', () => {
    expect(normalizeCityName('riyadh')).toBe('الرياض');
    expect(normalizeCityName('RIYADH')).toBe('الرياض');
  });

  it('returns the Arabic spelling unchanged', () => {
    expect(normalizeCityName('الرياض')).toBe('الرياض');
  });

  it('folds Jeddah variants', () => {
    expect(normalizeCityName('Jeddah')).toBe('جدة');
    expect(normalizeCityName('jeddah')).toBe('جدة');
    expect(normalizeCityName('جدة')).toBe('جدة');
  });

  it('accepts known alt-spellings', () => {
    expect(normalizeCityName('al-riyadh')).toBe('الرياض');
    expect(normalizeCityName('Al Riyadh')).toBe('الرياض');
  });

  it('passes unknown strings through unchanged (no silent data loss)', () => {
    expect(normalizeCityName('Jubail')).toBe('Jubail');
    expect(normalizeCityName('الجبيل')).toBe('الجبيل');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeCityName('  Riyadh  ')).toBe('الرياض');
  });

  it('returns empty string unchanged', () => {
    expect(normalizeCityName('')).toBe('');
    expect(normalizeCityName('   ')).toBe('');
  });
});
