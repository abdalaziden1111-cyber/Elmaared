import { test, expect } from '@playwright/test';

// These tests don't need the DB — they exercise public marketing pages
// only, so they run as soon as the build is up.

test.describe('marketing pages', () => {
  test('home redirects to /ar', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/ar/);
  });

  test('home renders Arabic title', async ({ page }) => {
    await page.goto('/ar');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'تطبيق المعارض'
    );
  });

  test('for-clients page renders CTAs', async ({ page }) => {
    await page.goto('/ar/for-clients');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(
      page.getByRole('link', { name: /ابدأ الآن/ })
    ).toBeVisible();
  });

  test('for-suppliers page renders CTAs', async ({ page }) => {
    await page.goto('/ar/for-suppliers');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(
      page.getByRole('link', { name: /سجّل كمورد/ })
    ).toBeVisible();
  });

  test('how-it-works lists 6 steps', async ({ page }) => {
    await page.goto('/ar/how-it-works');
    const steps = page.locator('ol li');
    await expect(steps).toHaveCount(6);
  });

  test('pricing shows 2% and 3% rates', async ({ page }) => {
    await page.goto('/ar/pricing');
    await expect(page.getByText('2%')).toBeVisible();
    await expect(page.getByText('3%')).toBeVisible();
    await expect(page.getByText(/5%/)).toBeVisible();
  });

  test('discover page renders without auth', async ({ page }) => {
    await page.goto('/ar/discover');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'استكشف موردي المنصة'
    );
  });

  test('login page renders form', async ({ page }) => {
    await page.goto('/ar/login');
    await expect(page.getByRole('heading', { name: /سجّل دخولك/ })).toBeVisible();
    await expect(page.getByPlaceholder(/name@/)).toBeVisible();
  });

  test('signup role chooser shows both options', async ({ page }) => {
    await page.goto('/ar/signup');
    await expect(page.getByText('شركة (عميل)')).toBeVisible();
    await expect(page.getByText('مورد')).toBeVisible();
  });

  test('robots.txt is served', async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect(res.ok()).toBe(true);
    const body = await res.text();
    expect(body).toContain('Disallow: /admin');
    expect(body).toContain('Sitemap:');
  });

  test('sitemap.xml includes static pages', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    expect(res.ok()).toBe(true);
    const body = await res.text();
    expect(body).toContain('/ar');
    expect(body).toContain('/ar/for-clients');
  });
});

test.describe('RTL + locale', () => {
  test('html lang and dir set correctly on Arabic locale', async ({ page }) => {
    await page.goto('/ar');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('lang', 'ar');
    await expect(html).toHaveAttribute('dir', 'rtl');
  });

  test('html dir flips to ltr on English locale', async ({ page }) => {
    await page.goto('/en');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('lang', 'en');
    await expect(html).toHaveAttribute('dir', 'ltr');
  });
});
