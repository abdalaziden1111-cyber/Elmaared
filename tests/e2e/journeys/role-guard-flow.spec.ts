/**
 * Role-guard journey: each persona tries to visit pages outside their
 * role and gets redirected. Confirms the middleware role-check is wired
 * correctly across all three roles.
 *
 * Tagged @needs-db.
 */
import { test, expect } from '../fixtures/auth';
import { hasTestDb } from '../fixtures/db-reset';

test.describe('@needs-db role guards', () => {
  test.skip(!hasTestDb(), 'Supabase env vars not set; skipping DB-dependent spec.');

  test('supplier cannot access /admin', async ({ supplierPage }) => {
    await supplierPage.goto('/admin');
    // proxy.ts redirects non-admins on /admin to /ar/dashboard
    await expect(supplierPage).toHaveURL(/\/ar\/dashboard|\/ar\/supplier/);
  });

  test('client cannot access /admin', async ({ clientPage }) => {
    await clientPage.goto('/admin');
    await expect(clientPage).toHaveURL(/\/ar\/dashboard/);
  });

  test('client cannot access /supplier', async ({ clientPage }) => {
    await clientPage.goto('/ar/supplier/rfqs');
    // proxy redirects client → /ar/dashboard
    await expect(clientPage).toHaveURL(/\/ar\/dashboard/);
  });

  test('supplier cannot access /dashboard', async ({ supplierPage }) => {
    await supplierPage.goto('/ar/dashboard/rfqs');
    // proxy redirects supplier → /ar/supplier
    await expect(supplierPage).toHaveURL(/\/ar\/supplier/);
  });

  test('admin can reach /admin paths', async ({ adminPage }) => {
    await adminPage.goto('/admin/rfqs');
    await expect(adminPage).toHaveURL(/\/admin\/rfqs/);
  });
});
