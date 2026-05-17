/**
 * Client journey: log in → land on dashboard → open RFQs list → click "new"
 * → confirm wizard step 1 renders. We stop at wizard step 1 because the
 * deeper steps need form data the test would have to maintain across
 * migrations. The bigger value here is confirming the auth → dashboard →
 * RFQ creator path is unbroken.
 *
 * Tagged @needs-db — requires seeded personas + a reachable Supabase.
 */
import { test, expect } from '../fixtures/auth';
import { hasTestDb, resetClientData } from '../fixtures/db-reset';

test.describe('@needs-db client → RFQ creator path', () => {
  test.skip(!hasTestDb(), 'Supabase env vars not set; skipping DB-dependent spec.');

  test.beforeAll(async () => {
    await resetClientData();
  });

  test('client lands on dashboard after login', async ({ clientPage }) => {
    await clientPage.goto('/ar/dashboard');
    await expect(clientPage).toHaveURL(/\/ar\/dashboard/);
    // Sidebar nav should show the client's links
    await expect(clientPage.getByRole('link', { name: /طلباتي/i })).toBeVisible();
  });

  test('client sees empty RFQs state after reset', async ({ clientPage }) => {
    await clientPage.goto('/ar/dashboard/rfqs');
    await expect(clientPage).toHaveURL(/\/ar\/dashboard\/rfqs/);
    // Either the empty-state copy or the create button must be visible
    const empty = clientPage.getByText(/لا توجد طلبات/);
    const createBtn = clientPage.getByRole('link', { name: /طلب جديد/i });
    await expect(empty.or(createBtn)).toBeVisible();
  });

  test('client can open the RFQ creator wizard', async ({ clientPage }) => {
    await clientPage.goto('/ar/dashboard/rfqs/new');
    await expect(clientPage).toHaveURL(/\/ar\/dashboard\/rfqs\/new/);
    // The wizard starts with the service-type picker
    await expect(clientPage.getByText(/بوث|هدايا|فعالية|طباعة/)).toBeVisible();
  });

  test('client notification bell renders in the header', async ({ clientPage }) => {
    await clientPage.goto('/ar/dashboard');
    const bell = clientPage.getByRole('button', { name: /الإشعارات/ });
    await expect(bell).toBeVisible();
  });
});
