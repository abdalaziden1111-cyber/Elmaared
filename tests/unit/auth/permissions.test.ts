import { describe, it, expect } from 'vitest';
import { getDashboardPath, ROLE_ROUTES } from '@/lib/auth/permissions';

describe('ROLE_ROUTES', () => {
  it('maps each role to a distinct route', () => {
    const routes = Object.values(ROLE_ROUTES);
    const unique = new Set(routes);
    expect(unique.size).toBe(routes.length);
  });

  it('admin lands at /admin', () => {
    expect(ROLE_ROUTES.admin).toBe('/admin');
  });

  it('client lands at /dashboard', () => {
    expect(ROLE_ROUTES.client).toBe('/dashboard');
  });

  it('supplier lands at /supplier', () => {
    expect(ROLE_ROUTES.supplier).toBe('/supplier');
  });
});

describe('getDashboardPath', () => {
  it('returns the route for each known role', () => {
    expect(getDashboardPath('admin')).toBe('/admin');
    expect(getDashboardPath('client')).toBe('/dashboard');
    expect(getDashboardPath('supplier')).toBe('/supplier');
  });

  it('falls back to / for unknown role at runtime', () => {
    // @ts-expect-error — testing runtime fallback for unexpected enum
    expect(getDashboardPath('hacker')).toBe('/');
  });

  it('falls back to / for null/undefined', () => {
    // @ts-expect-error — testing runtime fallback
    expect(getDashboardPath(null)).toBe('/');
    // @ts-expect-error — testing runtime fallback
    expect(getDashboardPath(undefined)).toBe('/');
  });
});
