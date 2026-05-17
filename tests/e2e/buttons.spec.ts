import { test, expect, type Page } from '@playwright/test';

// Button-destination tests — click every link/button on the unauthenticated
// surface of the app and assert the navigation lands where it should.
//
// All tests in this file run WITHOUT a seeded database. Anything that needs
// auth, form submission, or DB writes is covered by the existing specs
// (signup-flow @needs-db, etc.) and the static audit in
// scripts/audit-buttons.mjs.
//
// The companion script `node scripts/audit-buttons.mjs` flagged 8 dashboard/
// supplier/admin sidebar links that point at pages that don't exist yet —
// those are intentionally skipped here (clicking them in an authenticated
// session is a separate, DB-gated task).

async function clickAndExpectUrl(page: Page, name: string | RegExp, urlPattern: RegExp) {
  await page.getByRole('link', { name }).first().click();
  await expect(page).toHaveURL(urlPattern);
}

test.describe('marketing CTAs route correctly', () => {
  test('for-clients CTA → client signup', async ({ page }) => {
    await page.goto('/ar/for-clients');
    await clickAndExpectUrl(page, /ابدأ الآن/, /\/signup\/client\/account$/);
  });

  test('for-suppliers CTA → supplier signup', async ({ page }) => {
    await page.goto('/ar/for-suppliers');
    await clickAndExpectUrl(page, /سجّل كمورد/, /\/signup\/supplier\/account$/);
  });
});

test.describe('signup role chooser links', () => {
  test('client card → client account step', async ({ page }) => {
    await page.goto('/ar/signup');
    await page.getByRole('link', { name: /ابدأ كعميل/ }).click();
    await expect(page).toHaveURL(/\/signup\/client\/account$/);
  });

  test('supplier card → supplier account step', async ({ page }) => {
    await page.goto('/ar/signup');
    await page.getByRole('link', { name: /ابدأ كمورد/ }).click();
    await expect(page).toHaveURL(/\/signup\/supplier\/account$/);
  });

  test('"already have an account" → /login', async ({ page }) => {
    await page.goto('/ar/signup');
    await page.getByRole('link', { name: /سجّل دخولك/ }).click();
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe('client signup wizard navigation', () => {
  // Walk all client signup back/next transitions without actually submitting.

  test('account → company (next)', async ({ page }) => {
    await page.goto('/ar/signup/client/account');
    await page.getByLabel('الاسم الكامل').fill('سارة العتيبي');
    await page.getByLabel('البريد الإلكتروني').fill('sara@company.sa');
    await page.getByLabel('رقم الهاتف').fill('+966512345678');
    await page.getByLabel('كلمة المرور').fill('Pass1234!');
    await page.getByRole('button', { name: 'التالي' }).click();
    await expect(page).toHaveURL(/\/signup\/client\/company$/);
  });

  test('company → account (back)', async ({ page }) => {
    // Seed the store by going through account first
    await page.goto('/ar/signup/client/account');
    await page.getByLabel('الاسم الكامل').fill('سارة العتيبي');
    await page.getByLabel('البريد الإلكتروني').fill('sara@company.sa');
    await page.getByLabel('رقم الهاتف').fill('+966512345678');
    await page.getByLabel('كلمة المرور').fill('Pass1234!');
    await page.getByRole('button', { name: 'التالي' }).click();

    await page.getByRole('button', { name: /السابق/ }).click();
    await expect(page).toHaveURL(/\/signup\/client\/account$/);
  });
});

test.describe('supplier signup wizard navigation', () => {
  test('account → company (next)', async ({ page }) => {
    await page.goto('/ar/signup/supplier/account');
    await page.getByLabel('الاسم الكامل').fill('محمد المورد');
    await page.getByLabel('البريد الإلكتروني').fill('m@supplier.sa');
    await page.getByLabel('رقم الهاتف').fill('+966500000000');
    await page.getByLabel('كلمة المرور').fill('Pass1234!');
    await page.getByRole('button', { name: 'التالي' }).click();
    await expect(page).toHaveURL(/\/signup\/supplier\/company$/);
  });

  test('company → account (back)', async ({ page }) => {
    await page.goto('/ar/signup/supplier/company');
    await page.getByRole('button', { name: /السابق/ }).click();
    await expect(page).toHaveURL(/\/signup\/supplier\/account$/);
  });

  test('specializations → company (back)', async ({ page }) => {
    await page.goto('/ar/signup/supplier/specializations');
    await page.getByRole('button', { name: /السابق/ }).click();
    await expect(page).toHaveURL(/\/signup\/supplier\/company$/);
  });

  test('specializations → documents (next, after both selections)', async ({ page }) => {
    await page.goto('/ar/signup/supplier/specializations');
    const next = page.getByRole('button', { name: 'التالي' });
    await expect(next).toBeDisabled();

    await page.getByRole('button', { name: 'تصميم وتنفيذ أجنحة' }).click();
    await page.getByRole('button', { name: 'الرياض' }).click();
    await expect(next).toBeEnabled();

    await next.click();
    await expect(page).toHaveURL(/\/signup\/supplier\/documents$/);
  });

  test('documents → specializations (back)', async ({ page }) => {
    await page.goto('/ar/signup/supplier/documents');
    await page.getByRole('button', { name: /السابق/ }).click();
    await expect(page).toHaveURL(/\/signup\/supplier\/specializations$/);
  });
});

test.describe('login page links', () => {
  test('"forgot password" → /forgot-password', async ({ page }) => {
    await page.goto('/ar/login');
    await page.getByRole('link', { name: /نسيت كلمة المرور/ }).click();
    await expect(page).toHaveURL(/\/forgot-password$/);
  });

  test('"create an account" → /signup', async ({ page }) => {
    await page.goto('/ar/login');
    await page.getByRole('link', { name: /ليس لديك حساب/ }).click();
    await expect(page).toHaveURL(/\/signup$/);
  });
});

test.describe('forgot-password back link', () => {
  test('back-to-login → /login', async ({ page }) => {
    await page.goto('/ar/forgot-password');
    await page.getByRole('link', { name: /العودة لتسجيل الدخول/ }).click();
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe('verify-email back link', () => {
  test('back-to-login from verify-email → /login', async ({ page }) => {
    await page.goto('/ar/auth/verify-email');
    await page.getByRole('link', { name: /العودة لتسجيل الدخول/ }).click();
    await expect(page).toHaveURL(/\/login$/);
  });
});

// NOTE: The locale-aware not-found.tsx ("العودة للرئيسية" button) is not
// rendered for `/ar/<unknown>` — Next.js serves its framework default 404
// shell for those URLs (route-smoke confirms only the 404 status). The link
// is exercised by the static audit in scripts/audit-buttons.mjs instead.

test.describe('discover external website link', () => {
  // The discover index page renders supplier cards from the DB. Without seed
  // data the list is empty, so we only verify the page itself renders. The
  // supplier-card → /discover/[id] navigation is covered by route-smoke and
  // the seeded scenario script.
  test('discover page renders heading', async ({ page }) => {
    await page.goto('/ar/discover');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});

test.describe('locale switch on root', () => {
  test('GET / → /ar (default locale)', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/ar\/?$/);
  });

  test('GET /en renders English locale', async ({ page }) => {
    await page.goto('/en');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
});

// Buttons known to point at missing pages (flagged by scripts/audit-buttons.mjs).
// These need authenticated sessions to be clickable, so we don't drive them
// here — instead we leave a fixme reminder so the report shows them.
test.describe('known-broken destinations (informational)', () => {
  const broken = [
    { source: 'dashboard sidebar', dest: '/dashboard/settings/profile' },
    { source: 'supplier sidebar', dest: '/supplier/proposals' },
    { source: 'supplier sidebar', dest: '/supplier/projects' },
    { source: 'supplier sidebar', dest: '/supplier/earnings' },
    { source: 'supplier sidebar', dest: '/supplier/profile/portfolio' },
    { source: 'admin sidebar', dest: '/admin/rfqs' },
    { source: 'admin sidebar', dest: '/admin/chats' },
    { source: 'admin sidebar', dest: '/admin/disputes' },
  ];
  for (const b of broken) {
    test.fixme(`${b.source} link to ${b.dest} (page does not exist)`, async () => {
      // Intentionally empty — see scripts/audit-buttons.mjs for the source ref.
    });
  }
});
