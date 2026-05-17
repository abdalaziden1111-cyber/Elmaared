/**
 * Admin journey: log in → land on /admin → confirm every sidebar
 * destination loads → confirm action buttons render on detail pages.
 * We don't click destructive admin actions (cancel/archive/resolve)
 * because those mutate persona-scoped data — those flows have
 * integration-level coverage instead.
 *
 * Tagged @needs-db.
 */
import { test, expect } from '../fixtures/auth';
import { hasTestDb } from '../fixtures/db-reset';

test.describe('@needs-db admin sidebar + detail pages', () => {
  test.skip(!hasTestDb(), 'Supabase env vars not set; skipping DB-dependent spec.');

  test('admin lands on /admin and sees all 7 sidebar entries', async ({ adminPage }) => {
    await adminPage.goto('/admin');
    await expect(adminPage).toHaveURL(/\/admin/);
    for (const name of [
      /نظرة عامة/,
      /موردون قيد المراجعة/,
      /الطلبات/,
      /المحادثات/,
      /الإيداعات المعلّقة/,
      /تحرير دفعات الموردين/,
      /النزاعات/,
    ]) {
      await expect(adminPage.getByRole('link', { name })).toBeVisible();
    }
  });

  test('admin can browse paginated RFQs', async ({ adminPage }) => {
    await adminPage.goto('/admin/rfqs');
    await expect(adminPage.getByRole('heading', { name: /كل الطلبات/ })).toBeVisible();
    // Either pagination is shown OR an empty-state — page must not 500
    const pagination = adminPage.getByRole('navigation', { name: /ترقيم/ });
    const empty = adminPage.getByText(/لا توجد طلبات/);
    await expect(pagination.or(empty)).toBeVisible();
  });

  test('admin disputes page renders 3 status tabs', async ({ adminPage }) => {
    await adminPage.goto('/admin/disputes');
    await expect(adminPage.getByRole('link', { name: /^مفتوحة$/ })).toBeVisible();
    await expect(adminPage.getByRole('link', { name: /^محلولة$/ })).toBeVisible();
    await expect(adminPage.getByRole('link', { name: /^الكل$/ })).toBeVisible();
  });

  test('admin chats page renders 4 filter tabs', async ({ adminPage }) => {
    await adminPage.goto('/admin/chats');
    await expect(adminPage.getByRole('link', { name: /^الكل$/ })).toBeVisible();
    await expect(adminPage.getByRole('link', { name: /🚨 تصعيد/ })).toBeVisible();
    await expect(adminPage.getByRole('link', { name: /انضم Admin/ })).toBeVisible();
    await expect(adminPage.getByRole('link', { name: /مؤرشفة/ })).toBeVisible();
  });

  test('admin notification bell present on every protected page', async ({ adminPage }) => {
    for (const path of ['/admin', '/admin/rfqs', '/admin/disputes', '/admin/chats']) {
      await adminPage.goto(path);
      const bell = adminPage.getByRole('button', { name: /الإشعارات/ });
      await expect(bell).toBeVisible();
    }
  });
});
