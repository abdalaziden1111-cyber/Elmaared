import { describe, it, expect } from 'vitest';
import {
  isLocale,
  asLocale,
  isUserRole,
  asUserRole,
  isServiceType,
  asServiceType,
  isUuid,
} from '@/lib/utils/guards';

describe('isLocale / asLocale', () => {
  it('accepts valid locales', () => {
    expect(isLocale('ar')).toBe(true);
    expect(isLocale('en')).toBe(true);
  });

  it('rejects unknown locales', () => {
    expect(isLocale('fr')).toBe(false);
    expect(isLocale('AR')).toBe(false);
    expect(isLocale('')).toBe(false);
  });

  it('rejects non-strings', () => {
    expect(isLocale(null)).toBe(false);
    expect(isLocale(undefined)).toBe(false);
    expect(isLocale(42)).toBe(false);
    expect(isLocale({})).toBe(false);
  });

  it('asLocale falls back to ar by default', () => {
    expect(asLocale('garbage')).toBe('ar');
    expect(asLocale(null)).toBe('ar');
  });

  it('asLocale honors custom fallback', () => {
    expect(asLocale('garbage', 'en')).toBe('en');
  });

  it('asLocale returns valid input untouched', () => {
    expect(asLocale('en')).toBe('en');
  });
});

describe('isUserRole / asUserRole', () => {
  it('accepts each valid role', () => {
    expect(isUserRole('admin')).toBe(true);
    expect(isUserRole('client')).toBe(true);
    expect(isUserRole('supplier')).toBe(true);
  });

  it('rejects unknown role', () => {
    expect(isUserRole('superadmin')).toBe(false);
    expect(isUserRole('Admin')).toBe(false); // case-sensitive
    expect(isUserRole('')).toBe(false);
  });

  it('rejects non-string', () => {
    expect(isUserRole(null)).toBe(false);
    expect(isUserRole({ role: 'admin' })).toBe(false);
  });

  it('asUserRole returns null on invalid', () => {
    expect(asUserRole('hacker')).toBeNull();
    expect(asUserRole(null)).toBeNull();
  });

  it('asUserRole returns role on valid', () => {
    expect(asUserRole('client')).toBe('client');
  });
});

describe('isServiceType / asServiceType', () => {
  it('accepts each service type', () => {
    expect(isServiceType('booth')).toBe(true);
    expect(isServiceType('gifts')).toBe(true);
    expect(isServiceType('event')).toBe(true);
    expect(isServiceType('printing')).toBe(true);
  });

  it('rejects unknown service', () => {
    expect(isServiceType('catering')).toBe(false);
    expect(isServiceType('')).toBe(false);
  });

  it('asServiceType narrows correctly', () => {
    expect(asServiceType('booth')).toBe('booth');
    expect(asServiceType('catering')).toBeNull();
    expect(asServiceType(null)).toBeNull();
  });
});

describe('isUuid', () => {
  it('accepts a valid v4-shaped uuid', () => {
    expect(isUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('accepts uppercase', () => {
    expect(isUuid('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(isUuid('')).toBe(false);
  });

  it('rejects null/undefined', () => {
    expect(isUuid(null)).toBe(false);
    expect(isUuid(undefined)).toBe(false);
  });

  it('rejects non-string', () => {
    expect(isUuid(42)).toBe(false);
    expect(isUuid({})).toBe(false);
  });

  it('rejects URL-like strings', () => {
    expect(isUuid('https://evil.com/550e8400-e29b-41d4-a716-446655440000')).toBe(false);
  });

  it('rejects SQL-injection-shaped strings', () => {
    expect(isUuid("'; DROP TABLE users; --")).toBe(false);
  });

  it('rejects partial uuid', () => {
    expect(isUuid('550e8400-e29b-41d4')).toBe(false);
  });
});
