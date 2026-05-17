/**
 * Supplier journey: log in → see sidebar → browse available RFQs → see
 * own proposals/projects/earnings/profile. Validates the supplier
 * sidebar links and detail pages are reachable end-to-end for an
 * approved supplier.
 *
 * Tagged @needs-db.
 */
import { test, expect } from '../fixtures/auth';
import { hasTestDb } from '../fixtures/db-reset';

test.describe('@needs-db supplier discovery + sidebar', () => {
  test.skip(!hasTestDb(), 'Supabase env vars not set; skipping DB-dependent spec.');

  test('supplier sees the available-RFQs page on login', async ({ supplierPage }) => {
    await supplierPage.goto('/ar/supplier');
    // /supplier server-redirects to /supplier/rfqs for an approved supplier
    await expect(supplierPage).toHaveURL(/\/ar\/supplier\/(rfqs|pending)/);
  });

  test('supplier sidebar has all 5 sections', async ({ supplierPage }) => {
    await supplierPage.goto('/ar/supplier/rfqs');
    for (const name of [
      /الطلبات المتاحة/,
      /عروضي/,
      /مشاريعي/,
      /أرباحي/,
      /ملفي/,
    ]) {
      await expect(supplierPage.getByRole('link', { name })).toBeVisible();
    }
  });

  test('supplier can navigate to my-proposals', async ({ supplierPage }) => {
    await supplierPage.goto('/ar/supplier/rfqs');
    await supplierPage.getByRole('link', { name: /عروضي/ }).click();
    await expect(supplierPage).toHaveURL(/\/ar\/supplier\/proposals/);
    // Status filter should be visible
    await expect(supplierPage.getByText(/الحالة/)).toBeVisible();
  });

  test('supplier can open profile portfolio and reach edit', async ({ supplierPage }) => {
    await supplierPage.goto('/ar/supplier/profile/portfolio');
    await expect(supplierPage).toHaveURL(/portfolio/);
    await supplierPage.getByRole('link', { name: /تعديل الملف/ }).click();
    await expect(supplierPage).toHaveURL(/\/ar\/supplier\/profile\/edit/);
    // Documents section is rendered
    await expect(supplierPage.getByText(/المستندات/)).toBeVisible();
  });

  test('supplier sees earnings summary cards', async ({ supplierPage }) => {
    await supplierPage.goto('/ar/supplier/earnings');
    await expect(supplierPage.getByText(/إجمالي مُحرّر/)).toBeVisible();
    await expect(supplierPage.getByText(/بانتظار التحرير/)).toBeVisible();
    await expect(supplierPage.getByText(/المجموع/)).toBeVisible();
  });
});
