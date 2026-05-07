import { test, expect } from '@playwright/test';

// Auth gate tests — verify that protected routes redirect unauthenticated
// users to /login. These don't need DB seed data because the gate fires
// before any DB lookup.

test.describe('protected route gates', () => {
  test('dashboard redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/ar/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('dashboard rfqs list redirects', async ({ page }) => {
    await page.goto('/ar/dashboard/rfqs');
    await expect(page).toHaveURL(/\/login/);
  });

  test('supplier area redirects', async ({ page }) => {
    await page.goto('/ar/supplier/rfqs');
    await expect(page).toHaveURL(/\/login/);
  });

  test('admin area redirects', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
  });

  test('admin pending suppliers redirects', async ({ page }) => {
    await page.goto('/admin/suppliers/pending');
    await expect(page).toHaveURL(/\/login/);
  });

  test('admin escrow redirects', async ({ page }) => {
    await page.goto('/admin/escrow/pending-deposits');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('public routes accessible', () => {
  test('home page loads without auth', async ({ page }) => {
    const res = await page.goto('/ar');
    expect(res?.ok()).toBe(true);
  });

  test('discover page loads without auth', async ({ page }) => {
    const res = await page.goto('/ar/discover');
    expect(res?.ok()).toBe(true);
  });

  test('login page loads without auth', async ({ page }) => {
    const res = await page.goto('/ar/login');
    expect(res?.ok()).toBe(true);
  });

  test('forgot-password page loads', async ({ page }) => {
    const res = await page.goto('/ar/forgot-password');
    expect(res?.ok()).toBe(true);
  });
});
