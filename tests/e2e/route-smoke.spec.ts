import { test, expect, type Page } from '@playwright/test';

// Smoke test: hit every advertised route and assert it either renders OK
// or redirects to /login (for protected pages). Catches build-time failures
// that unit tests can't see — wrong file paths, missing layouts, broken
// imports, accidentally-static-only routes that need server data.
//
// Auth-gated routes are expected to redirect; we follow the redirect and
// just confirm the destination is /login.

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

const PROTECTED_ROUTES = [
  '/ar/dashboard',
  '/ar/dashboard/rfqs',
  '/ar/dashboard/rfqs/new',
  '/ar/dashboard/notifications',
  '/ar/supplier',
  '/ar/supplier/rfqs',
  '/ar/supplier/pending',
  '/admin',
  '/admin/suppliers/pending',
  '/admin/escrow/pending-deposits',
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

test.describe('protected routes redirect to /login', () => {
  for (const path of PROTECTED_ROUTES) {
    test(`GET ${path} → /login`, async ({ page }) => {
      await statusFor(page, path);
      // Final URL should contain /login
      expect(page.url()).toMatch(/\/login/);
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
    // Next.js returns 404 for unmatched dynamic segments inside [locale]
    expect(res?.status()).toBe(404);
  });
});
