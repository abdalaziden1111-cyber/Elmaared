import { describe, it, expect } from 'vitest';
import {
  buildPageWindow,
  totalPages,
  hasNextPage,
  hasPrevPage,
  DEFAULT_PER_PAGE,
  MAX_PER_PAGE,
} from '@/lib/utils/pagination';

describe('buildPageWindow — defaults', () => {
  it('uses defaults when no input given', () => {
    const w = buildPageWindow();
    expect(w.page).toBe(1);
    expect(w.perPage).toBe(DEFAULT_PER_PAGE);
    expect(w.offset).toBe(0);
    expect(w.rangeFrom).toBe(0);
    expect(w.rangeTo).toBe(DEFAULT_PER_PAGE - 1);
  });

  it('uses defaults for empty object', () => {
    expect(buildPageWindow({}).page).toBe(1);
  });

  it('uses defaults for null/undefined fields', () => {
    expect(buildPageWindow({ page: null, perPage: null }).page).toBe(1);
    expect(buildPageWindow({ page: undefined, perPage: undefined }).perPage).toBe(
      DEFAULT_PER_PAGE
    );
  });
});

describe('buildPageWindow — string parsing', () => {
  it('parses string page', () => {
    expect(buildPageWindow({ page: '3' }).page).toBe(3);
  });

  it('parses string perPage', () => {
    expect(buildPageWindow({ perPage: '10' }).perPage).toBe(10);
  });

  it('handles whitespace around numbers', () => {
    expect(buildPageWindow({ page: '  5  ' }).page).toBe(5);
  });

  it('falls back when page is non-numeric string', () => {
    expect(buildPageWindow({ page: 'abc' }).page).toBe(1);
  });

  it('falls back when page is empty string', () => {
    expect(buildPageWindow({ page: '' }).page).toBe(1);
  });

  it('falls back for decimal strings', () => {
    expect(buildPageWindow({ page: '1.5' }).page).toBe(1);
  });
});

describe('buildPageWindow — clamping', () => {
  it('clamps page to ≥ 1', () => {
    expect(buildPageWindow({ page: 0 }).page).toBe(1);
    expect(buildPageWindow({ page: -5 }).page).toBe(1);
  });

  it('clamps perPage to ≥ 1', () => {
    expect(buildPageWindow({ perPage: 0 }).perPage).toBe(1);
    expect(buildPageWindow({ perPage: -10 }).perPage).toBe(1);
  });

  it('clamps perPage to MAX_PER_PAGE', () => {
    expect(buildPageWindow({ perPage: 9999 }).perPage).toBe(MAX_PER_PAGE);
  });

  it('rejects NaN/Infinity → defaults', () => {
    expect(buildPageWindow({ page: NaN }).page).toBe(1);
    expect(buildPageWindow({ perPage: Infinity }).perPage).toBe(DEFAULT_PER_PAGE);
  });
});

describe('buildPageWindow — math', () => {
  it('computes offset correctly', () => {
    expect(buildPageWindow({ page: 1, perPage: 20 }).offset).toBe(0);
    expect(buildPageWindow({ page: 2, perPage: 20 }).offset).toBe(20);
    expect(buildPageWindow({ page: 3, perPage: 25 }).offset).toBe(50);
  });

  it('computes rangeTo correctly (Supabase inclusive)', () => {
    const w = buildPageWindow({ page: 2, perPage: 20 });
    expect(w.rangeFrom).toBe(20);
    expect(w.rangeTo).toBe(39);
  });
});

describe('totalPages', () => {
  it('rounds up partial pages', () => {
    expect(totalPages(50, 20)).toBe(3);
    expect(totalPages(40, 20)).toBe(2);
    expect(totalPages(41, 20)).toBe(3);
  });

  it('returns 0 for empty total', () => {
    expect(totalPages(0, 20)).toBe(0);
  });

  it('returns 0 for negative inputs', () => {
    expect(totalPages(-1, 20)).toBe(0);
    expect(totalPages(50, 0)).toBe(0);
    expect(totalPages(50, -5)).toBe(0);
  });

  it('returns 0 for non-finite inputs', () => {
    expect(totalPages(NaN, 20)).toBe(0);
    expect(totalPages(Infinity, 20)).toBe(0);
    expect(totalPages(50, NaN)).toBe(0);
  });
});

describe('hasNextPage / hasPrevPage', () => {
  it('hasNextPage true when more rows exist', () => {
    expect(hasNextPage(1, 20, 100)).toBe(true);
    expect(hasNextPage(2, 20, 100)).toBe(true);
  });

  it('hasNextPage false on last page', () => {
    expect(hasNextPage(5, 20, 100)).toBe(false);
  });

  it('hasNextPage false at or beyond total', () => {
    expect(hasNextPage(10, 20, 100)).toBe(false);
  });

  it('hasPrevPage false on page 1', () => {
    expect(hasPrevPage(1)).toBe(false);
  });

  it('hasPrevPage true on page 2+', () => {
    expect(hasPrevPage(2)).toBe(true);
  });
});
