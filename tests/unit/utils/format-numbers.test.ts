import { describe, it, expect, vi, beforeEach } from 'vitest';

// Each test sets up a fresh flag mock before importing format.ts so the
// module's top-level `import { flags }` picks up the right preference.

beforeEach(() => {
  vi.resetModules();
});

describe('formatNumber', () => {
  it('renders Arabic-Indic digits when preference is "arabic-indic"', async () => {
    vi.doMock('@/lib/feature-flags', () => ({
      flags: { ARABIC_NUMERALS: false, HIJRI_DEFAULT: false },
    }));
    const { formatNumber } = await import('@/lib/utils/format');
    expect(formatNumber(123, 'arabic-indic')).toMatch(/[٠-٩]/);
  });

  it('renders Latin digits when preference is "latin"', async () => {
    vi.doMock('@/lib/feature-flags', () => ({
      flags: { ARABIC_NUMERALS: true, HIJRI_DEFAULT: false },
    }));
    const { formatNumber } = await import('@/lib/utils/format');
    expect(formatNumber(123, 'latin')).toBe('123');
  });

  it('follows the FF_NUMERALS flag when preference is "auto" (flag ON → Arabic-Indic)', async () => {
    vi.doMock('@/lib/feature-flags', () => ({
      flags: { ARABIC_NUMERALS: true, HIJRI_DEFAULT: false },
    }));
    const { formatNumber } = await import('@/lib/utils/format');
    expect(formatNumber(42, 'auto')).toMatch(/[٠-٩]/);
  });

  it('follows the FF_NUMERALS flag when preference is "auto" (flag OFF → Latin)', async () => {
    vi.doMock('@/lib/feature-flags', () => ({
      flags: { ARABIC_NUMERALS: false, HIJRI_DEFAULT: false },
    }));
    const { formatNumber } = await import('@/lib/utils/format');
    expect(formatNumber(42, 'auto')).toBe('42');
  });

  it('returns placeholder for null / undefined / NaN / Infinity', async () => {
    vi.doMock('@/lib/feature-flags', () => ({
      flags: { ARABIC_NUMERALS: false, HIJRI_DEFAULT: false },
    }));
    const { formatNumber } = await import('@/lib/utils/format');
    expect(formatNumber(null)).toBe('—');
    expect(formatNumber(undefined)).toBe('—');
    expect(formatNumber(NaN)).toBe('—');
    expect(formatNumber(Infinity)).toBe('—');
  });

  it('forwards NumberFormatOptions (e.g. percent style)', async () => {
    vi.doMock('@/lib/feature-flags', () => ({
      flags: { ARABIC_NUMERALS: false, HIJRI_DEFAULT: false },
    }));
    const { formatNumber } = await import('@/lib/utils/format');
    const out = formatNumber(0.15, 'latin', { style: 'percent' });
    expect(out).toContain('%');
  });
});

describe('formatDate with FF_HIJRI', () => {
  it('renders only the Gregorian Arabic string when FF_HIJRI is OFF', async () => {
    vi.doMock('@/lib/feature-flags', () => ({
      flags: { HIJRI_DEFAULT: false, ARABIC_NUMERALS: false },
    }));
    const { formatDate } = await import('@/lib/utils/format');
    const out = formatDate('2026-05-19', 'ar');
    expect(out).not.toContain('(');
    expect(out).toMatch(/2026|٢٠٢٦/);
  });

  it('renders "Hijri (Gregorian)" when FF_HIJRI is ON and locale is ar', async () => {
    vi.doMock('@/lib/feature-flags', () => ({
      flags: { HIJRI_DEFAULT: true, ARABIC_NUMERALS: false },
    }));
    const { formatDate } = await import('@/lib/utils/format');
    const out = formatDate('2026-05-19', 'ar');
    expect(out).toContain('(');
    expect(out).toContain(')');
    // Parenthetical part is the Gregorian portion — should mention 2026.
    expect(out).toMatch(/2026|٢٠٢٦/);
  });

  it('ignores FF_HIJRI when locale is en (English is always Gregorian)', async () => {
    vi.doMock('@/lib/feature-flags', () => ({
      flags: { HIJRI_DEFAULT: true, ARABIC_NUMERALS: false },
    }));
    const { formatDate } = await import('@/lib/utils/format');
    const out = formatDate('2026-05-19', 'en');
    expect(out).not.toContain('(');
  });
});
