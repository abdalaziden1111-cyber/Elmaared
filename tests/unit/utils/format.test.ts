import { describe, it, expect } from 'vitest';
import { formatCurrency, formatPhone } from '@/lib/utils/format';

describe('formatCurrency', () => {
  it('formats whole numbers', () => {
    expect(formatCurrency(87500)).toBe('87,500 ﷼');
  });

  it('formats decimals', () => {
    expect(formatCurrency(1234.56)).toBe('1,234.56 ﷼');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('0 ﷼');
  });

  it('formats large numbers', () => {
    expect(formatCurrency(1500000)).toBe('1,500,000 ﷼');
  });
});

describe('formatPhone', () => {
  it('formats Saudi phone', () => {
    expect(formatPhone('+966512345678')).toBe('+966 51 234 5678');
  });

  it('returns non-Saudi numbers as-is', () => {
    expect(formatPhone('0512345678')).toBe('0512345678');
  });
});
