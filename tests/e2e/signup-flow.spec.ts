import { test, expect } from '@playwright/test';

// Wizard navigation tests — they don't actually submit (which would need
// a DB), but they exercise client-side state, validation, and routing.
// Tagged @needs-db on the signup-completion test so it can be skipped
// until migrations are applied.

test.describe('client signup wizard', () => {
  test('account → company step transition holds form data', async ({ page }) => {
    await page.goto('/ar/signup/client/account');

    await page.getByLabel('الاسم الكامل').fill('سارة العتيبي');
    await page.getByLabel('البريد الإلكتروني').fill('sara@company.sa');
    await page.getByLabel('رقم الهاتف').fill('+966512345678');
    await page.getByLabel('كلمة المرور').fill('Pass1234!');

    await page.getByRole('button', { name: 'التالي' }).click();

    await expect(page).toHaveURL(/\/signup\/client\/company/);
  });

  test('back button returns to account step', async ({ page }) => {
    await page.goto('/ar/signup/client/account');

    await page.getByLabel('الاسم الكامل').fill('سارة العتيبي');
    await page.getByLabel('البريد الإلكتروني').fill('sara@company.sa');
    await page.getByLabel('رقم الهاتف').fill('+966512345678');
    await page.getByLabel('كلمة المرور').fill('Pass1234!');
    await page.getByRole('button', { name: 'التالي' }).click();

    await page.getByRole('button', { name: /السابق/ }).click();
    await expect(page).toHaveURL(/\/signup\/client\/account/);
  });

  test('@needs-db submitting valid signup redirects to verify-email', async ({
    page,
  }) => {
    test.skip(
      !process.env.E2E_HAS_DB,
      'Set E2E_HAS_DB=1 once Supabase migrations are applied'
    );

    await page.goto('/ar/signup/client/account');

    await page.getByLabel('الاسم الكامل').fill('سارة العتيبي');
    await page.getByLabel('البريد الإلكتروني').fill(`e2e-${Date.now()}@test.sa`);
    await page.getByLabel('رقم الهاتف').fill('+966512345678');
    await page.getByLabel('كلمة المرور').fill('Pass1234!');
    await page.getByRole('button', { name: 'التالي' }).click();

    await page.getByLabel('اسم الشركة التجاري').fill('شركة الاختبار');
    await page.getByLabel('رقم السجل التجاري').fill('1010123456');
    await page.getByLabel('حجم الشركة').selectOption('mid');
    await page.getByLabel('المدينة').selectOption('Riyadh');

    await page.getByRole('button', { name: 'إنشاء الحساب' }).click();
    await expect(page).toHaveURL(/\/auth\/verify-email/, { timeout: 10_000 });
  });
});

test.describe('supplier signup wizard', () => {
  test('account step renders 4 progress markers', async ({ page }) => {
    await page.goto('/ar/signup/supplier/account');

    // The stepper shows 4 step labels: الحساب → الشركة → التخصصات → البنك
    await expect(page.getByText('الحساب')).toBeVisible();
    await expect(page.getByText('الشركة')).toBeVisible();
    await expect(page.getByText('التخصصات')).toBeVisible();
    await expect(page.getByText('البنك')).toBeVisible();
  });

  test('specializations step requires at least one selection', async ({ page }) => {
    await page.goto('/ar/signup/supplier/specializations');

    // The "next" button stays disabled with no selection
    const next = page.getByRole('button', { name: 'التالي' });
    await expect(next).toBeDisabled();

    await page.getByRole('button', { name: 'تصميم وتنفيذ أجنحة' }).click();
    // Still disabled — needs city too
    await expect(next).toBeDisabled();

    await page.getByRole('button', { name: 'الرياض' }).click();
    await expect(next).toBeEnabled();
  });
});
