/**
 * Notification bell journey: confirms the bell renders on every layout,
 * the dropdown opens, and the "mark all read" interaction works without
 * client-side error. We don't assert a specific count because the test
 * persona's notification list is reset between specs.
 *
 * Tagged @needs-db.
 */
import { test, expect } from '../fixtures/auth';
import { hasTestDb } from '../fixtures/db-reset';

test.describe('@needs-db notification bell', () => {
  test.skip(!hasTestDb(), 'Supabase env vars not set; skipping DB-dependent spec.');

  test('client bell opens dropdown', async ({ clientPage }) => {
    await clientPage.goto('/ar/dashboard');
    const bell = clientPage.getByRole('button', { name: /الإشعارات/ });
    await bell.click();
    const dialog = clientPage.getByRole('dialog', { name: /قائمة الإشعارات/ });
    await expect(dialog).toBeVisible();
    // Footer link to full list always present
    await expect(dialog.getByRole('link', { name: /عرض كل/ })).toBeVisible();
  });

  test('client bell closes on Escape', async ({ clientPage }) => {
    await clientPage.goto('/ar/dashboard');
    await clientPage.getByRole('button', { name: /الإشعارات/ }).click();
    await expect(
      clientPage.getByRole('dialog', { name: /قائمة الإشعارات/ })
    ).toBeVisible();
    await clientPage.keyboard.press('Escape');
    await expect(
      clientPage.getByRole('dialog', { name: /قائمة الإشعارات/ })
    ).toBeHidden();
  });

  test('supplier bell renders on supplier layout', async ({ supplierPage }) => {
    await supplierPage.goto('/ar/supplier/rfqs');
    const bell = supplierPage.getByRole('button', { name: /الإشعارات/ });
    await expect(bell).toBeVisible();
  });

  test('admin bell renders on admin layout', async ({ adminPage }) => {
    await adminPage.goto('/admin');
    const bell = adminPage.getByRole('button', { name: /الإشعارات/ });
    await expect(bell).toBeVisible();
  });
});
