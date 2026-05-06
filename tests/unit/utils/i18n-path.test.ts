import { describe, it, expect } from 'vitest';
import {
  getLocaleFromPath,
  stripLocale,
  isPublicPath,
  isInternalPath,
  isProtectedPath,
  withLocale,
} from '@/lib/i18n/path';

describe('getLocaleFromPath', () => {
  it('extracts /ar prefix', () => {
    expect(getLocaleFromPath('/ar/dashboard')).toBe('ar');
  });

  it('extracts /en prefix', () => {
    expect(getLocaleFromPath('/en/login')).toBe('en');
  });

  it('extracts at root', () => {
    expect(getLocaleFromPath('/ar')).toBe('ar');
  });

  it('returns null for unknown locale', () => {
    expect(getLocaleFromPath('/fr/dashboard')).toBeNull();
  });

  it('returns null for /admin (no locale)', () => {
    expect(getLocaleFromPath('/admin/users')).toBeNull();
  });

  it('returns null for empty / null / undefined', () => {
    expect(getLocaleFromPath('')).toBeNull();
    expect(getLocaleFromPath(null)).toBeNull();
    expect(getLocaleFromPath(undefined)).toBeNull();
  });

  it('returns null for paths with locale-like deep segment', () => {
    // /foo/ar/bar is not "the locale is ar" — locale is only at position 1
    expect(getLocaleFromPath('/foo/ar/bar')).toBeNull();
  });

  it('rejects uppercase locale (case-sensitive)', () => {
    expect(getLocaleFromPath('/AR/dashboard')).toBeNull();
  });
});

describe('stripLocale', () => {
  it('strips locale segment', () => {
    expect(stripLocale('/ar/dashboard')).toBe('/dashboard');
  });

  it('strips and returns / for /ar root', () => {
    expect(stripLocale('/ar')).toBe('/');
  });

  it('returns path untouched when no locale', () => {
    expect(stripLocale('/admin/users')).toBe('/admin/users');
  });

  it('returns / for null/undefined/empty', () => {
    expect(stripLocale(null)).toBe('/');
    expect(stripLocale(undefined)).toBe('/');
    expect(stripLocale('')).toBe('/');
  });

  it('handles deep nesting', () => {
    expect(stripLocale('/ar/dashboard/rfqs/abc/compare')).toBe(
      '/dashboard/rfqs/abc/compare'
    );
  });
});

describe('isPublicPath', () => {
  it('treats / as public', () => {
    expect(isPublicPath('/')).toBe(true);
    expect(isPublicPath('/ar')).toBe(true);
    expect(isPublicPath('/en')).toBe(true);
  });

  it('treats marketing paths as public', () => {
    expect(isPublicPath('/ar/for-clients')).toBe(true);
    expect(isPublicPath('/en/pricing')).toBe(true);
    expect(isPublicPath('/ar/how-it-works')).toBe(true);
  });

  it('treats discover and children as public', () => {
    expect(isPublicPath('/ar/discover')).toBe(true);
    expect(isPublicPath('/ar/discover/abc-123')).toBe(true);
  });

  it('treats login/signup/auth flows as public', () => {
    expect(isPublicPath('/ar/login')).toBe(true);
    expect(isPublicPath('/ar/signup')).toBe(true);
    expect(isPublicPath('/ar/signup/client/account')).toBe(true);
    expect(isPublicPath('/ar/forgot-password')).toBe(true);
    expect(isPublicPath('/ar/reset-password')).toBe(true);
  });

  it('treats dashboard as private', () => {
    expect(isPublicPath('/ar/dashboard')).toBe(false);
    expect(isPublicPath('/ar/dashboard/rfqs')).toBe(false);
  });

  it('treats supplier area as private', () => {
    expect(isPublicPath('/ar/supplier')).toBe(false);
    expect(isPublicPath('/ar/supplier/rfqs')).toBe(false);
  });

  it('treats admin as private (no locale prefix)', () => {
    expect(isPublicPath('/admin')).toBe(false);
    expect(isPublicPath('/admin/users')).toBe(false);
  });

  it('returns false for null/empty', () => {
    expect(isPublicPath(null)).toBe(false);
    expect(isPublicPath('')).toBe(false);
  });
});

describe('isInternalPath', () => {
  it('matches /_next bundles', () => {
    expect(isInternalPath('/_next/static/chunks/123.js')).toBe(true);
  });

  it('matches /api routes', () => {
    expect(isInternalPath('/api/auth/callback')).toBe(true);
  });

  it('matches static assets with extensions', () => {
    expect(isInternalPath('/favicon.ico')).toBe(true);
    expect(isInternalPath('/icons/logo.svg')).toBe(true);
    expect(isInternalPath('/og.png')).toBe(true);
  });

  it('does not match clean URLs', () => {
    expect(isInternalPath('/ar/dashboard')).toBe(false);
    expect(isInternalPath('/admin/users')).toBe(false);
  });

  it('returns false for null/empty', () => {
    expect(isInternalPath(null)).toBe(false);
    expect(isInternalPath('')).toBe(false);
  });
});

describe('isProtectedPath', () => {
  it('matches /dashboard', () => {
    expect(isProtectedPath('/ar/dashboard')).toBe(true);
    expect(isProtectedPath('/en/dashboard/rfqs')).toBe(true);
  });

  it('matches /supplier', () => {
    expect(isProtectedPath('/ar/supplier')).toBe(true);
    expect(isProtectedPath('/ar/supplier/rfqs')).toBe(true);
  });

  it('matches /ceo', () => {
    expect(isProtectedPath('/ar/ceo/abc123/rfq/xyz')).toBe(true);
  });

  it('does not match /admin (admin has its own gate, no locale)', () => {
    expect(isProtectedPath('/admin')).toBe(false);
  });

  it('does not match marketing paths', () => {
    expect(isProtectedPath('/ar/for-clients')).toBe(false);
  });

  it('returns false for null/empty', () => {
    expect(isProtectedPath(null)).toBe(false);
    expect(isProtectedPath('')).toBe(false);
  });
});

describe('withLocale', () => {
  it('prepends locale to a leading-slash path', () => {
    expect(withLocale('/dashboard')).toBe('/ar/dashboard');
  });

  it('prepends locale to a no-slash path', () => {
    expect(withLocale('dashboard')).toBe('/ar/dashboard');
  });

  it('honors a different locale', () => {
    expect(withLocale('/login', 'en')).toBe('/en/login');
  });

  it('handles root', () => {
    expect(withLocale('/', 'en')).toBe('/en/');
  });
});
