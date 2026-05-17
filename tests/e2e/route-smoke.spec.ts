import { test, expect, type Page } from '@playwright/test';

// Smoke test: hit every advertised route and assert it either renders OK
// or redirects to /login (for protected pages). Catches build-time failures
// that unit tests can't see — wrong file paths, missing layouts, broken
// imports, accidentally-static-only routes that need server data.
//
// Auth-gated routes are expected to redirect; we follow the redirect and
// just confirm the destination is /login.
//
// This spec does NOT require a seeded Supabase — it only verifies that
// every route compiles and the auth gate engages. Run with:
//   pnpm test:e2e tests/e2e/route-smoke.spec.ts

const FIXTURE_UUID = '00000000-0000-0000-0000-000000000000';

const PUBLIC_ROUTES = [
  '/ar',
  '/ar/login',
  '/ar/signup',
  '/ar/signup/client/account',
  '/ar/signup/client/company',
  '/ar/signup/supplier/account',
  '/ar/signup/supplier/company',
  '/ar/signup/supplier/specializations',
  '/ar/signup/supplier/documents',
  '/ar/forgot-password',
  '/ar/reset-password',
  '/ar/auth/verify-email',
  '/ar/discover',
  '/ar/for-clients',
  '/ar/for-suppliers',
  '/ar/how-it-works',
  '/ar/pricing',
  '/en',
  '/en/login',
] as const;

// Client (buyer) protected routes
const CLIENT_PROTECTED_ROUTES = [
  '/ar/dashboard',
  '/ar/dashboard/rfqs',
  '/ar/dashboard/rfqs/new',
  `/ar/dashboard/rfqs/${FIXTURE_UUID}`,
  `/ar/dashboard/rfqs/${FIXTURE_UUID}/compare`,
  `/ar/dashboard/rfqs/${FIXTURE_UUID}/agreement`,
  `/ar/dashboard/rfqs/${FIXTURE_UUID}/escrow`,
  `/ar/dashboard/rfqs/${FIXTURE_UUID}/proposals/${FIXTURE_UUID}`,
  `/ar/dashboard/rfqs/${FIXTURE_UUID}/chats/${FIXTURE_UUID}`,
  '/ar/dashboard/notifications',
  '/ar/dashboard/settings/profile',
] as const;

// Supplier protected routes
const SUPPLIER_PROTECTED_ROUTES = [
  '/ar/supplier',
  '/ar/supplier/rfqs',
  '/ar/supplier/pending',
  `/ar/supplier/rfqs/${FIXTURE_UUID}`,
  `/ar/supplier/rfqs/${FIXTURE_UUID}/proposal`,
  `/ar/supplier/chats/${FIXTURE_UUID}`,
  '/ar/supplier/proposals',
  '/ar/supplier/projects',
  '/ar/supplier/earnings',
  '/ar/supplier/profile/portfolio',
  '/ar/supplier/profile/edit',
] as const;

// Admin protected routes (no locale prefix)
const ADMIN_PROTECTED_ROUTES = [
  '/admin',
  '/admin/suppliers/pending',
  `/admin/suppliers/pending/${FIXTURE_UUID}`,
  '/admin/rfqs',
  `/admin/rfqs/${FIXTURE_UUID}`,
  '/admin/chats',
  `/admin/chats/${FIXTURE_UUID}`,
  '/admin/disputes',
  `/admin/disputes/${FIXTURE_UUID}`,
  '/admin/escrow/pending-deposits',
  '/admin/escrow/pending-releases',
] as const;

// Public-page query-param coverage (search/filter/pagination still resolve)
const PARAMETRIZED_ROUTES = [
  '/ar/discover?page=2',
  '/admin/rfqs?page=1&status=open&q=test',
  '/admin/chats?filter=panic',
  '/admin/disputes?tab=resolved',
  '/admin/suppliers/pending?q=co&page=1',
  '/ar/supplier/proposals?status=accepted',
  '/ar/supplier/projects?status=in_progress',
  '/ar/supplier/earnings?status=released',
] as const;

const META_ROUTES = ['/robots.txt', '/sitemap.xml'] as const;

async function statusFor(page: Page, path: string) {
  const res = await page.goto(path, { waitUntil: 'domcontentloaded' });
  return { ok: res?.ok() ?? false, finalUrl: page.url(), status: res?.status() };
}

test.describe('public routes return 200', () => {
  for (const path of PUBLIC_ROUTES) {
    test(`GET ${path}`, async ({ page }) => {
      const { ok } = await statusFor(page, path);
      expect(ok).toBe(true);
    });
  }
});

test.describe('client protected routes redirect to /login', () => {
  for (const path of CLIENT_PROTECTED_ROUTES) {
    test(`GET ${path} → /login`, async ({ page }) => {
      await statusFor(page, path);
      expect(page.url()).toMatch(/\/login/);
    });
  }
});

test.describe('supplier protected routes redirect to /login', () => {
  for (const path of SUPPLIER_PROTECTED_ROUTES) {
    test(`GET ${path} → /login`, async ({ page }) => {
      await statusFor(page, path);
      expect(page.url()).toMatch(/\/login/);
    });
  }
});

test.describe('admin protected routes redirect to /login', () => {
  for (const path of ADMIN_PROTECTED_ROUTES) {
    test(`GET ${path} → /login`, async ({ page }) => {
      await statusFor(page, path);
      expect(page.url()).toMatch(/\/login/);
    });
  }
});

test.describe('routes with query params still resolve', () => {
  for (const path of PARAMETRIZED_ROUTES) {
    test(`GET ${path}`, async ({ page }) => {
      // Public ones return 200, protected ones redirect — either is fine.
      // We're checking the URL handler doesn't throw or 500.
      const res = await page.goto(path, { waitUntil: 'domcontentloaded' });
      const code = res?.status() ?? 0;
      expect(code).toBeLessThan(500);
    });
  }
});

test.describe('meta files', () => {
  for (const path of META_ROUTES) {
    test(`GET ${path}`, async ({ request }) => {
      const res = await request.get(path);
      expect(res.ok()).toBe(true);
      const body = await res.text();
      expect(body.length).toBeGreaterThan(0);
    });
  }
});

test.describe('error rendering', () => {
  test('GET /ar/nonexistent renders 404 page', async ({ page }) => {
    const res = await page.goto('/ar/nonexistent-route-xyz');
    expect(res?.status()).toBe(404);
  });
});

test.describe('health endpoint', () => {
  test('GET /api/health returns ok payload', async ({ request }) => {
    const res = await request.get('/api/health');
    // 200 when DB is reachable, 503 otherwise. Both are valid responses —
    // we just check the contract holds (proper JSON, expected keys).
    expect([200, 503]).toContain(res.status());
    const json = await res.json();
    expect(json).toHaveProperty('status');
    expect(json).toHaveProperty('db');
    expect(json).toHaveProperty('dbMs');
    expect(json).toHaveProperty('commit');
    expect(json).toHaveProperty('timestamp');
    expect(['ok', 'degraded']).toContain(json.status);
    expect(['ok', 'timeout', 'error']).toContain(json.db);
  });

  test('health endpoint sends no-store cache header', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.headers()['cache-control']).toContain('no-store');
  });
});

test.describe('locale prefix auto-redirect', () => {
  test('GET / redirects to /ar', async ({ page }) => {
    await page.goto('/');
    expect(page.url()).toMatch(/\/ar(\/|$)/);
  });

  test('GET /login (no locale) redirects to /ar/login', async ({ page }) => {
    await page.goto('/login');
    expect(page.url()).toMatch(/\/ar\/login/);
  });

  test('GET /dashboard (no locale, no auth) redirects to /ar/login', async ({ page }) => {
    await page.goto('/dashboard');
    expect(page.url()).toMatch(/\/ar\/login/);
  });
});
